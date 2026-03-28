import logging
from decimal import Decimal, InvalidOperation
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

logger = logging.getLogger(__name__)
from django.shortcuts import get_object_or_404, render
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.http import FileResponse
import io
from datetime import date, timedelta
from rest_framework_simplejwt.authentication import JWTAuthentication
from accounts.permissions import AdminOnly, TenantOnly
from django.core.exceptions import ValidationError
from .models import Property, Unit, TenantProfile, Payment, Message, Notification, MaintenanceRequest, PaymentEvidence, LeaseDocument, Lease
from .serializers import (
    PropertySerializer, PropertyDetailSerializer,
    UnitSerializer, UnitDetailSerializer,
    TenantProfileSerializer, TenantAssignmentSerializer,
    PaymentSerializer, PaymentCreateSerializer, TenantPaymentSerializer,
    PaymentStatsSerializer, PaymentFilterSerializer,
    MaintenanceRequestSerializer, MaintenanceRequestCreateSerializer,
    MaintenanceRequestAdminUpdateSerializer,
    PaymentEvidenceSerializer, PaymentEvidenceCreateSerializer,
    PaymentEvidenceAdminUpdateSerializer,
    LeaseDocumentSerializer, LeaseDocumentCreateSerializer,
    TenantFullProfileSerializer, NotificationSerializer
)
from .services import NotificationService, PaymentService, ReportService, LeaseService
from .chatbot_service import ChatbotService
from .mpesa_utils import MpesaClient


User = get_user_model()


# ==================== PROPERTY VIEWS ====================

class PropertyListCreateView(generics.ListCreateAPIView):
    """
    List all properties or create a new property (Admin only)
    """
    queryset = Property.objects.all().prefetch_related('units')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        return PropertySerializer
    
    def perform_create(self, serializer):
        """Automatically set created_by to current user"""
        serializer.save(created_by=self.request.user)


class PropertyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a property (Admin only for write operations)
    """
    queryset = Property.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        return PropertyDetailSerializer


# ==================== UNIT VIEWS ====================

class UnitListCreateView(generics.ListCreateAPIView):
    """
    List all units or create a new unit (Admin only for creation)
    """
    queryset = Unit.objects.select_related('property_obj').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        return UnitSerializer


class UnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a unit (Admin only for write operations)
    """
    queryset = Unit.objects.select_related('property_obj').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        return UnitDetailSerializer


class PropertyUnitsView(generics.ListAPIView):
    """
    List all units for a specific property
    """
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        property_id = self.kwargs['property_id']
        return Unit.objects.filter(property_obj_id=property_id)


# ==================== TENANT VIEWS ====================

class TenantListCreateView(generics.ListCreateAPIView):
    """
    List all tenants (Admin only) or create tenant profile
    """
    queryset = TenantProfile.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [AdminOnly()]
    
    def get_serializer_class(self):
        return TenantProfileSerializer


class TenantDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update tenant profile
    """
    queryset = TenantProfile.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TenantProfileSerializer
    
    def get_object(self):
        """Tenants can only view their own profile"""
        if self.request.user.role == 'TENANT':
            return get_object_or_404(TenantProfile, user=self.request.user)
        return super().get_object()


# ==================== ASSIGNMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([AdminOnly])
def assign_tenant_to_unit(request):
    """
    Assign a tenant to a unit (Admin only)
    """
    serializer = TenantAssignmentSerializer(data=request.data)
    
    if serializer.is_valid():
        tenant_profile = serializer.save()
        
        return Response({
            'message': 'Tenant assigned successfully',
            'tenant': TenantProfileSerializer(tenant_profile).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AdminOnly])
def unassign_tenant_from_unit(request, tenant_id):
    """
    Unassign a tenant from their unit (Admin only)
    """
    try:
        tenant_profile = TenantProfile.objects.get(id=tenant_id)
        
        if not tenant_profile.assigned_unit:
            return Response({
                'error': 'Tenant is not assigned to any unit'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update unit occupancy
        unit = tenant_profile.assigned_unit
        unit.is_occupied = False
        unit.save()
        
        # Clear tenant assignment
        tenant_profile.assigned_unit = None
        tenant_profile.move_in_date = None
        tenant_profile.lease_end_date = None
        tenant_profile.save()
        
        return Response({
            'message': 'Tenant unassigned successfully',
            'tenant': TenantProfileSerializer(tenant_profile).data
        }, status=status.HTTP_200_OK)
        
    except TenantProfile.DoesNotExist:
        return Response({
            'error': 'Tenant not found'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== TENANT-SPECIFIC VIEWS ====================

@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_assigned_unit(request):
    """
    Get tenant's assigned unit details
    """
    try:
        tenant_profile = TenantProfile.objects.get(user=request.user)
        
        if not tenant_profile.assigned_unit:
            return Response({
                'message': 'No unit assigned',
                'unit': None
            }, status=status.HTTP_200_OK)
        
        unit = tenant_profile.assigned_unit
        return Response({
            'unit': UnitDetailSerializer(unit).data,
            'tenant_profile': TenantProfileSerializer(tenant_profile).data
        }, status=status.HTTP_200_OK)
        
    except TenantProfile.DoesNotExist:
        return Response({
            'error': 'Tenant profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_property_details(request):
    """
    Get property details for tenant's assigned unit
    """
    try:
        tenant_profile = TenantProfile.objects.get(user=request.user)
        
        if not tenant_profile.assigned_unit:
            return Response({
                'error': 'No unit assigned'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        property_obj = tenant_profile.assigned_unit.property_obj
        return Response({
            'property': PropertyDetailSerializer(property_obj).data,
            'unit': UnitSerializer(tenant_profile.assigned_unit).data
        }, status=status.HTTP_200_OK)
        
    except TenantProfile.DoesNotExist:
        return Response({
            'error': 'Tenant profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== ADMIN DASHBOARD VIEWS ====================

@api_view(['GET'])
@permission_classes([AdminOnly])
def admin_dashboard_stats(request):
    """
    Get dashboard statistics for admin
    """
    total_properties = Property.objects.count()
    total_units = Unit.objects.count()
    occupied_units = Unit.objects.filter(is_occupied=True).count()
    vacant_units = total_units - occupied_units
    total_tenants = TenantProfile.objects.count()
    
    return Response({
        'total_properties': total_properties,
        'total_units': total_units,
        'occupied_units': occupied_units,
        'vacant_units': vacant_units,
        'total_tenants': total_tenants,
        'occupancy_rate': round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)
    })


# ==================== PAYMENT VIEWS ====================

class PaymentListCreateView(generics.ListCreateAPIView):
    """
    List all payments or create a new payment (Admin only for creation)
    """
    queryset = Payment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'tenant__user__full_name', 'tenant__user__email',
        'unit__unit_number', 'unit__property_obj__name',
        'transaction_reference'
    ]
    ordering_fields = ['payment_date', 'created_at', 'amount_paid']
    ordering = ['-payment_date']
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PaymentCreateSerializer
        return PaymentSerializer
    
    def get_queryset(self):
        """Filter payments based on query parameters"""
        queryset = Payment.objects.select_related(
            'tenant__user', 'unit__property_obj'
        )
        
        # Apply filters
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        tenant_id = self.request.query_params.get('tenant_id')
        property_id = self.request.query_params.get('property_id')
        status_filter = self.request.query_params.get('status')
        
        if month and year:
            queryset = queryset.filter(month_for__month=month, month_for__year=year)
        elif year:
            queryset = queryset.filter(month_for__year=year)
            
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
            
        if property_id:
            queryset = queryset.filter(unit__property_obj_id=property_id)
            
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Tenants can only see their own payments
        if self.request.user.role == 'TENANT':
            try:
                tenant_profile = TenantProfile.objects.get(user=self.request.user)
                queryset = queryset.filter(tenant=tenant_profile)
            except TenantProfile.DoesNotExist:
                queryset = queryset.none()
        
        return queryset


class PaymentDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update a payment (Admin only for updates)
    """
    queryset = Payment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [AdminOnly()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        return PaymentSerializer
    
    def get_object(self):
        """Tenants can only view their own payments"""
        if self.request.user.role == 'TENANT':
            try:
                tenant_profile = TenantProfile.objects.get(user=self.request.user)
                return get_object_or_404(Payment, id=self.kwargs['pk'], tenant=tenant_profile)
            except TenantProfile.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("Payment not found")
        return super().get_object()


@api_view(['GET'])
@permission_classes([AdminOnly])
def payment_statistics(request):
    """
    Get payment statistics for admin dashboard
    """
    # Get filter parameters
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    property_id = request.query_params.get('property_id')
    
    # Base queryset with optimization
    payments_queryset = Payment.objects.select_related('tenant__user', 'unit__property_obj')
    
    # Apply filters
    if month and year:
        payments_queryset = payments_queryset.filter(month_for__month=month, month_for__year=year)
    elif year:
        payments_queryset = payments_queryset.filter(month_for__year=year)
        
    if property_id:
        payments_queryset = payments_queryset.filter(unit__property_obj_id=property_id)
    
    # Calculate statistics
    total_income = payments_queryset.filter(status='PAID').aggregate(
        total=Sum('amount_paid')
    )['total'] or 0
    
    paid_payments = payments_queryset.filter(status='PAID').count()
    pending_payments = payments_queryset.filter(status='PENDING').count()
    overdue_payments = payments_queryset.filter(status='OVERDUE').count()
    
    # Unit statistics
    total_units = Unit.objects.count()
    occupied_units = Unit.objects.filter(is_occupied=True).count()
    vacant_units = total_units - occupied_units
    occupancy_rate = round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)
    
    return Response({
        'total_income': total_income,
        'paid_payments': paid_payments,
        'pending_payments': pending_payments,
        'overdue_payments': overdue_payments,
        'total_units': total_units,
        'occupied_units': occupied_units,
        'vacant_units': vacant_units,
        'occupancy_rate': occupancy_rate
    })


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_payment_history(request):
    """
    Get payment history for the current tenant
    """
    try:
        tenant_profile = TenantProfile.objects.get(user=request.user)

        month = request.query_params.get('month')
        year = request.query_params.get('year')

        payments = Payment.objects.filter(tenant=tenant_profile).order_by('-payment_date')

        if month and year:
            payments = payments.filter(month_for__month=int(month), month_for__year=int(year))
        elif year:
            payments = payments.filter(month_for__year=int(year))

        serializer = TenantPaymentSerializer(payments, many=True)

        total_paid = payments.filter(status='PAID').aggregate(total=Sum('amount_paid'))['total'] or 0
        current_month = date.today().replace(day=1)
        current_month_payment = payments.filter(month_for=current_month).first()

        return Response({
            'payments': serializer.data,
            'summary': {
                'total_paid': total_paid,
                'current_month_status': current_month_payment.status if current_month_payment else 'NOT_DUE',
                'current_month_amount': current_month_payment.amount_paid if current_month_payment else 0,
                'overdue_count': payments.filter(status='OVERDUE').count()
            }
        })
        
    except TenantProfile.DoesNotExist:
        return Response({
            'error': 'Tenant profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_payment_receipt(request, pk):
    """
    Generate and download a PDF receipt for a specific payment.
    Tenants can only download their own. Admins can download any.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import inch
        from django.http import HttpResponse
    except ImportError:
        return Response({
            'error': 'PDF generation library (reportlab) is not installed on the server. Please run "pip install reportlab" and restart the server.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 1. Fetch Payment securely
    if request.user.role == 'TENANT':
        try:
            tenant_profile = TenantProfile.objects.get(user=request.user)
            payment = get_object_or_404(Payment, id=pk, tenant=tenant_profile)
        except TenantProfile.DoesNotExist:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        payment = get_object_or_404(Payment, id=pk)
        
    # Check if actually paid
    if payment.status != 'PAID':
        return Response({'error': 'Receipts are only available for completely paid records.'}, status=status.HTTP_400_BAD_REQUEST)

    # 2. Build PDF using Platypus for professional layout
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        navy_blue = colors.HexColor("#0C447C")
        mid_blue = colors.HexColor("#185FA5")
        border_grey = colors.HexColor("#E2E8F0")
        elements = []
        
        # Header
        header_data = [[
            Paragraph("<font color='white' size='16'><b>Property Pulse PMS</b></font><br/><font color='white' size='10'>Official Rent Payment Receipt</font>", styles['Normal']),
            Paragraph(f"<font color='white' size='12'><b>RECEIPT #RCP-{payment.id}</b></font>", styles['Normal'])
        ]]
        header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), navy_blue),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('RIGHTPADDING', (0, 0), (-1, -1), 20),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(header_table)
        
        # Status Bar
        pay_date_str = payment.payment_date.strftime('%d %b %Y') if payment.payment_date else 'N/A'
        status_row = [[f"Payment Status: Approved   |   Date: {pay_date_str}"]]
        status_table = Table(status_row, colWidths=[7 * inch])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), mid_blue),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(status_table)
        elements.append(Spacer(1, 20))
        
        # Amount
        amount_style = ParagraphStyle('AmountStyle', fontSize=28, textColor=navy_blue, alignment=1, spaceAfter=5, fontName='Helvetica-Bold')
        elements.append(Paragraph("Amount Paid", styles['Normal']))
        elements.append(Paragraph(f"KES {(payment.amount_paid or 0):,.2f}", amount_style))
        period_str = payment.month_for.strftime('%B %Y') if payment.month_for else 'N/A'
        elements.append(Paragraph(f"For Rent Period: {period_str}", styles['Normal']))
        elements.append(Spacer(1, 30))
        
        # Details Grid
        tenant_name = payment.tenant.user.full_name if payment.tenant and payment.tenant.user else 'N/A'
        unit_str = f"Unit {payment.unit.unit_number} - {payment.unit.property_obj.name}" if payment.unit and payment.unit.property_obj else 'N/A'
        method_str = payment.get_payment_method_display() if hasattr(payment, 'get_payment_method_display') else payment.payment_method
        
        details_data = [
            [Paragraph("<b>TENANT</b>", styles['Normal']), Paragraph("<b>UNIT / PROPERTY</b>", styles['Normal'])],
            [Paragraph(tenant_name, styles['Normal']), Paragraph(unit_str, styles['Normal'])],
            [Spacer(1, 8), Spacer(1, 8)],
            [Paragraph("<b>PAYMENT DATE</b>", styles['Normal']), Paragraph("<b>PAYMENT METHOD</b>", styles['Normal'])],
            [Paragraph(pay_date_str, styles['Normal']), Paragraph(method_str, styles['Normal'])],
        ]
        details_table = Table(details_data, colWidths=[3.5 * inch, 3.5 * inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 20))
        
        # M-Pesa Reference
        ref = payment.transaction_reference or 'N/A'
        mpesa_table = Table([[Paragraph(f"<b>M-Pesa Reference:</b> {ref}", styles['Normal'])]], colWidths=[7 * inch])
        mpesa_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('GRID', (0, 0), (-1, -1), 0.5, border_grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(mpesa_table)
        elements.append(Spacer(1, 25))
        
        # Summary Table
        rent_amt = (payment.unit.rent_amount or 0) if payment.unit else 0
        paid_amt = payment.amount_paid or 0
        summary_data = [
            ["DESCRIPTION", "RENT (KES)", "PAID (KES)"],
            [f"Rent — {period_str}", f"{rent_amt:,.2f}", f"{paid_amt:,.2f}"],
            ["", "NET AMOUNT PAID", f"KES {paid_amt:,.2f}"],
        ]
        s_table = Table(summary_data, colWidths=[3 * inch, 2 * inch, 2 * inch])
        s_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, navy_blue),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
        ]))
        elements.append(s_table)
        elements.append(Spacer(1, 60))
        
        # Footer
        elements.append(Paragraph(
            f"<font size='8' color='#64748b'>Thank you for using Property Pulse PMS. This is an auto-generated receipt. Generated: {timezone.now().strftime('%d %b %Y %H:%M')}</font>",
            styles['Normal']
        ))
        
        doc.build(elements)
        buffer.seek(0)
        
        # Return as HTTP response — compatible with both DRF and plain Django
        filename = f"Receipt_{period_str.replace(' ', '_')}_{payment.id}.pdf"
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        import traceback
        logger.error(f"PDF receipt build failed: {traceback.format_exc()}")
        return Response({
            'error': 'PDF Build failed',
            'detail': str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def view_rent_receipt(request, pk):
    """
    Render the professional HTML receipt.
    Supports JWT authentication via 'token' query parameter for new-tab access.
    """
    user = request.user
    token = request.query_params.get('token')

    # Manual JWT authentication if token is in query params
    if not user.is_authenticated and token:
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated_token)
        except Exception:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user or not user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Permission check
    if user.role == 'TENANT':
        try:
            tenant_profile = TenantProfile.objects.get(user=user)
            payment = get_object_or_404(Payment, id=pk, tenant=tenant_profile)
        except TenantProfile.DoesNotExist:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Admin access
        payment = get_object_or_404(Payment, id=pk)

    if payment.status != 'PAID':
        return Response({'error': 'Receipts are only available for paid records.'}, status=status.HTTP_400_BAD_REQUEST)

    context = {
        'company_name': "Property Pulse PMS",
        'receipt_no': payment.transaction_reference or f"RCP-{payment.id}",
        'approval_date': payment.payment_date.strftime('%d %b %Y %H:%M') if payment.payment_date else "N/A",
        'amount': f"{payment.amount_paid:,.2f}",
        'tenant_name': payment.tenant.user.full_name,
        'unit_no': payment.unit.unit_number,
        'property_name': payment.unit.property_obj.name,
        'period': payment.month_for.strftime('%B %Y'),
        'mpesa_ref': payment.transaction_reference or "N/A",
        'payment_date': payment.payment_date.strftime('%d %B %Y') if payment.payment_date else "N/A",
        'rent_amount': f"{payment.unit.rent_amount:,.2f}",
        'total_amount': f"{payment.amount_paid:,.2f}",
        'qr_code_url': f"https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=RECEIPT-{payment.id}"
    }

    return render(request, 'properties/rent_receipt.html', context)


# ==================== MAINTENANCE REQUEST VIEWS ====================


class TenantMaintenanceRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [TenantOnly]

    def get_queryset(self):
        tenant_profile = getattr(self.request.user, 'tenant_profile', None)
        if not tenant_profile:
            return MaintenanceRequest.objects.none()
        return MaintenanceRequest.objects.filter(tenant=tenant_profile).select_related('unit__property_obj')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MaintenanceRequestCreateSerializer
        return MaintenanceRequestSerializer

    def perform_create(self, serializer):
        tenant_profile = getattr(self.request.user, 'tenant_profile', None)
        if not tenant_profile:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Tenant profile not found'})
        serializer.save(tenant=tenant_profile, unit=tenant_profile.assigned_unit)


class AdminMaintenanceRequestListView(generics.ListAPIView):
    permission_classes = [AdminOnly]
    serializer_class = MaintenanceRequestSerializer

    def get_queryset(self):
        qs = MaintenanceRequest.objects.all().select_related('tenant__user', 'unit__property_obj')
        priority = self.request.query_params.get('priority')
        status_filter = self.request.query_params.get('status')
        property_id = self.request.query_params.get('property_id')
        search = self.request.query_params.get('search')
        if priority:
            qs = qs.filter(priority=priority)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if property_id:
            qs = qs.filter(unit__property_obj_id=property_id)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(tenant__user__full_name__icontains=search) |
                Q(unit__unit_number__icontains=search)
            )
        return qs


class AdminMaintenanceRequestUpdateView(generics.UpdateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = MaintenanceRequestAdminUpdateSerializer
    queryset = MaintenanceRequest.objects.all()


# ==================== PAYMENT EVIDENCE VIEWS ====================

class TenantPaymentEvidenceListCreateView(generics.ListCreateAPIView):
    permission_classes = [TenantOnly]

    def get_queryset(self):
        tenant_profile = getattr(self.request.user, 'tenant_profile', None)
        if not tenant_profile:
            return PaymentEvidence.objects.none()
        return PaymentEvidence.objects.filter(uploaded_by=self.request.user).select_related('payment__tenant__user', 'payment__unit__property_obj')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PaymentEvidenceCreateSerializer
        return PaymentEvidenceSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AdminPaymentEvidenceListView(generics.ListAPIView):
    permission_classes = [AdminOnly]
    serializer_class = PaymentEvidenceSerializer
    queryset = PaymentEvidence.objects.all().select_related('uploaded_by', 'payment__tenant__user', 'payment__unit__property_obj')


class AdminPaymentEvidenceUpdateView(generics.UpdateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = PaymentEvidenceAdminUpdateSerializer
    queryset = PaymentEvidence.objects.all()

    def perform_update(self, serializer):
        instance = self.get_object()
        serializer.save(
            reviewed_by=self.request.user,
            reviewed_at=timezone.now()
        )
        # Auto-approve payment if evidence is approved
        if serializer.validated_data.get('status') == 'APPROVED':
            payment = instance.payment
            if payment.status != 'PAID':
                payment.status = 'PAID'
                payment.save()
                # Trigger notification
                Notification.create_notification(
                    user=payment.tenant.user,
                    title="Payment Approved",
                    message=f"Your payment for {payment.month_for.strftime('%B %Y')} has been approved.",
                    notification_type='PAYMENT_CONFIRMED',
                    related_payment=payment
                )
        elif serializer.validated_data.get('status') == 'REJECTED':
            payment = instance.payment
            # Trigger notification for rejection
            Notification.create_notification(
                user=payment.tenant.user,
                title="Payment Evidence Rejected",
                message=f"Your payment proof for {payment.month_for.strftime('%B %Y')} was rejected. Note: {serializer.validated_data.get('admin_notes', 'No notes provided.')}",
                notification_type='SYSTEM_ANNOUNCEMENT',
                related_payment=payment
            )


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_payment_evidence(request, payment_id):
    """
    Get evidence for a specific payment (tenant only for their own payments)
    """
    try:
        tenant_profile = getattr(request.user, 'tenant_profile', None)
        if not tenant_profile:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        payment = get_object_or_404(Payment, id=payment_id, tenant=tenant_profile)
        evidence = PaymentEvidence.objects.filter(payment=payment).order_by('-created_at')
        serializer = PaymentEvidenceSerializer(evidence, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AdminOnly])
def admin_payment_evidence(request, payment_id):
    """
    Get evidence for a specific payment (admin only)
    """
    try:
        payment = get_object_or_404(Payment, id=payment_id)
        evidence = PaymentEvidence.objects.filter(payment=payment).order_by('-created_at')
        serializer = PaymentEvidenceSerializer(evidence, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ==================== LEASE DOCUMENT VIEWS ====================

@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_lease_document(request):
    """
    Get tenant's lease document
    """
    try:
        tenant_profile = getattr(request.user, 'tenant_profile', None)
        if not tenant_profile:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            lease_doc = LeaseDocument.objects.get(tenant=tenant_profile)
            serializer = LeaseDocumentSerializer(lease_doc, context={'request': request})
            return Response(serializer.data)
        except LeaseDocument.DoesNotExist:
            return Response({'error': 'Lease document not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminLeaseDocumentListView(generics.ListAPIView):
    permission_classes = [AdminOnly]
    serializer_class = LeaseDocumentSerializer
    queryset = LeaseDocument.objects.all().select_related('tenant__user', 'uploaded_by')


class AdminLeaseDocumentCreateView(generics.CreateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = LeaseDocumentCreateSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_notifications(request):
    """
    Get notifications for the tenant
    """
    try:
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([TenantOnly])
def mark_notifications_read(request):
    """
    Mark notifications as read
    """
    try:
        notification_ids = request.data.get('notification_ids', [])
        if not notification_ids:
            return Response({'error': 'No notification IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated = Notification.objects.filter(
            id__in=notification_ids,
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({'message': f'{updated} notifications marked as read'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([TenantOnly])
def tenant_update_profile(request):
    """
    Update tenant profile (email, phone)
    """
    try:
        tenant_profile = getattr(request.user, 'tenant_profile', None)
        if not tenant_profile:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        email = request.data.get('email')
        phone = request.data.get('phone')

        if email:
            # Check if email is already taken by another user
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({'error': 'Email already in use'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        if phone:
            user.phone_number = phone

        user.save()
        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'email': user.email,
                'phone': user.phone_number,
                'full_name': user.full_name,
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([TenantOnly])
def tenant_change_password(request):
    """
    Change tenant password
    """
    try:
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Old and new passwords are required'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_current_rent_status(request):
    """
    Get current rent status for the tenant
    """
    try:
        tenant_profile = TenantProfile.objects.get(user=request.user)
        
        if not tenant_profile.assigned_unit:
            return Response({
                'error': 'No unit assigned'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        current_month = date.today().replace(day=1)
        
        # Get current month payment
        current_payment = Payment.objects.filter(
            tenant=tenant_profile,
            month_for=current_month
        ).first()
        
        # Get overdue payments
        overdue_payments = Payment.objects.filter(
            tenant=tenant_profile,
            status='OVERDUE'
        ).order_by('-payment_date')
        
        # Get payment history for last 6 months
        six_months_ago = (current_month - timedelta(days=180)).replace(day=1)
        recent_payments = Payment.objects.filter(
            tenant=tenant_profile,
            month_for__gte=six_months_ago
        ).order_by('-month_for')
        
        return Response({
            'current_month': {
                'month': current_month.strftime('%B %Y'),
                'rent_amount': tenant_profile.assigned_unit.rent_amount,
                'status': current_payment.status if current_payment else 'NOT_DUE',
                'payment_date': current_payment.payment_date if current_payment else None,
                'payment_method': current_payment.payment_method if current_payment else None,
                'transaction_reference': current_payment.transaction_reference if current_payment else None,
            },
            'overdue_payments': TenantPaymentSerializer(overdue_payments, many=True).data,
            'recent_payments': TenantPaymentSerializer(recent_payments, many=True).data,
            'unit_info': {
                'unit_number': tenant_profile.assigned_unit.unit_number,
                'property_name': tenant_profile.assigned_unit.property_obj.name,
                'rent_amount': tenant_profile.assigned_unit.rent_amount
            }
        })
        
    except TenantProfile.DoesNotExist:
        return Response({
            'error': 'Tenant profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AdminOnly])
def confirm_payment(request, payment_id):
    """
    Confirm a payment (Admin only)
    """
    try:
        payment = Payment.objects.get(id=payment_id)
        
        if payment.status == 'PAID':
            return Response({
                'error': 'Payment is already confirmed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment.status = 'PAID'
        payment.save()
        
        return Response({
            'message': 'Payment confirmed successfully',
            'payment': PaymentSerializer(payment).data
        }, status=status.HTTP_200_OK)
        
    except Payment.DoesNotExist:
        return Response({
            'error': 'Payment not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AdminOnly])
def decline_payment(request, payment_id):
    """
    Decline a payment (Admin only)
    """
    try:
        payment = Payment.objects.get(id=payment_id)
        
        if payment.status == 'PAID':
            return Response({
                'error': 'Cannot decline an already paid payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment.status = 'FAILED'
        payment.save()
        
        # Notify tenant
        Notification.create_notification(
            user=payment.tenant.user,
            title="Payment Declined",
            message=f"Your payment for {payment.month_for.strftime('%B %Y')} has been declined by the administrator.",
            notification_type='SYSTEM_ANNOUNCEMENT',
            related_payment=payment
        )
        
        return Response({
            'message': 'Payment declined successfully',
            'payment': PaymentSerializer(payment).data
        }, status=status.HTTP_200_OK)
        
    except Payment.DoesNotExist:
        return Response({
            'error': 'Payment not found'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== SMART FEATURES VIEWS ====================

@api_view(['POST'])
@permission_classes([AdminOnly])
def trigger_overdue_check(request):
    """
    Manually trigger overdue payment check (cron job ready)
    """
    NotificationService.create_overdue_notifications()
    
    return Response({
        'message': 'Overdue payment check completed successfully',
        'timestamp': timezone.now()
    })


@api_view(['POST'])
@permission_classes([AdminOnly])
def trigger_rent_due_reminders(request):
    """
    Manually trigger rent due reminders (cron job ready)
    """
    NotificationService.create_rent_due_reminders()
    
    return Response({
        'message': 'Rent due reminders sent successfully',
        'timestamp': timezone.now()
    })


@api_view(['GET'])
@permission_classes([AdminOnly])
def generate_monthly_report(request):
    """
    Generate monthly financial report
    """
    year = request.query_params.get('year', date.today().year)
    month = request.query_params.get('month', date.today().month)
    
    try:
        year = int(year)
        month = int(month)
        
        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12")
        
        report = ReportService.generate_monthly_report(year, month)
        
        return Response({
            'report': report,
            'generated_at': timezone.now()
        })
        
    except (ValueError, TypeError):
        return Response({
            'error': 'Invalid year or month parameter'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AdminOnly])
def generate_property_report(request, property_id):
    """
    Generate property-specific report
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    # Parse dates if provided
    if start_date:
        try:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Invalid start_date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    if end_date:
        try:
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Invalid end_date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    report = ReportService.generate_property_report(property_id, start_date, end_date)
    
    if report is None:
        return Response({
            'error': 'Property not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'report': report,
        'generated_at': timezone.now()
    })


@api_view(['GET'])
@permission_classes([AdminOnly])
def export_report_pdf(request):
    """
    Export monthly report as PDF for admin
    """
    try:
        import io as _io
        from django.http import HttpResponse
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import inch
    except ImportError:
        return Response({
            'error': 'PDF generation library (reportlab) is not installed on the server. Please run "pip install reportlab" and restart the server.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    year = request.query_params.get('year', date.today().year)
    month = request.query_params.get('month', date.today().month)
    
    try:
        year = int(year)
        month = int(month)
        report = ReportService.generate_monthly_report(year, month)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid year or month parameter'}, status=status.HTTP_400_BAD_REQUEST)

    # Build PDF using Platypus for professional layout
    try:
        buffer = _io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        # Define custom colors
        navy_blue = colors.HexColor("#0C447C")
        mid_blue = colors.HexColor("#185FA5")
        border_grey = colors.HexColor("#E2E8F0")

        # Custom Paragraph Styles
        title_style = ParagraphStyle('ReportTitle', fontSize=22, textColor=navy_blue, alignment=0, spaceAfter=2, fontName='Helvetica-Bold')
        subtitle_style = ParagraphStyle('ReportSubtitle', fontSize=10, textColor=colors.HexColor("#64748B"), spaceAfter=20)
        section_title = ParagraphStyle('SectionTitle', fontSize=14, textColor=navy_blue, fontName='Helvetica-Bold', spaceBefore=20, spaceAfter=10)

        elements = []
        
        # Header
        elements.append(Paragraph(f"Financial Report — {report.get('report_month', 'N/A')}", title_style))
        elements.append(Paragraph(f"Property Pulse PMS · Generated {report.get('generated_date', 'N/A')}", subtitle_style))
        
        # KPI Metrics Row
        metrics = report.get('metrics', {})
        kpi_data = [[
            Paragraph(f"<font color='#64748B' size='8'>TOTAL COLLECTED</font><br/><font size='14'><b>KES {metrics.get('total_collected', 0):,}</b></font>", styles['Normal']),
            Paragraph(f"<font color='#64748B' size='8'>OUTSTANDING</font><br/><font size='14'><b>KES {metrics.get('outstanding', 0):,}</b></font>", styles['Normal']),
            Paragraph(f"<font color='#64748B' size='8'>OCCUPANCY RATE</font><br/><font size='14'><b>{metrics.get('occupancy_rate', 0)}%</b></font>", styles['Normal']),
            Paragraph(f"<font color='#64748B' size='8'>PENDING APPROVALS</font><br/><font size='14'><b>{metrics.get('pending_approvals', 0)}</b></font>", styles['Normal']),
        ]]
        kpi_table = Table(kpi_data, colWidths=[1.75 * inch] * 4)
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAF9")),
            ('GRID', (0, 0), (-1, -1), 1, border_grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(kpi_table)
        
        # Property Occupancy Section
        elements.append(Paragraph("Property Occupancy Breakdown", section_title))
        occ_data = [["PROPERTY NAME", "UNITS", "OCCUPANCY %"]]
        for prop in report.get('properties', []):
            occ_data.append([
                prop.get('name', 'N/A'),
                f"{prop.get('occupied', '?')} / {prop.get('total', '?')}",
                f"{prop.get('occupancy', 0)}%"
            ])
        
        occ_table = Table(occ_data, colWidths=[3.5 * inch, 1.75 * inch, 1.75 * inch])
        occ_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), navy_blue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, border_grey),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(occ_table)
        
        # Recent Payment Activity Section
        elements.append(Paragraph("Recent Payment Activity", section_title))
        pay_data = [["TENANT", "UNIT", "AMOUNT (KES)", "DATE", "STATUS"]]
        for pay in report.get('payments', []):
            pay_data.append([
                pay.get('tenant', 'N/A'),
                pay.get('unit', 'N/A'),
                f"{pay.get('amount', 0):,}",
                pay.get('date', 'N/A'),
                str(pay.get('status', 'N/A')).upper()
            ])
        
        pay_table = Table(pay_data, colWidths=[1.8 * inch, 1.2 * inch, 1.5 * inch, 1.3 * inch, 1.2 * inch])
        pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), mid_blue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, border_grey),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(pay_table)
        
        # Footer
        elements.append(Spacer(1, 40))
        elements.append(Paragraph(
            f"<font size='8' color='#64748b'>Property Pulse PMS - Financial Reporting System. Generated on {timezone.now().strftime('%d %b %Y %H:%M')}</font>",
            styles['Normal']
        ))

        doc.build(elements)
        buffer.seek(0)
        
        # Return as HttpResponse — compatible with DRF @api_view
        filename = f"Financial_Report_{year}_{month:02d}.pdf"
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        import traceback
        logger.error(f"Report PDF build failed: {traceback.format_exc()}")
        return Response({
            'error': 'PDF Build failed',
            'detail': str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AdminOnly])
def dashboard_summary(request):
    """
    Returns a comprehensive dashboard summary for the admin portal.
    Replaces the legacy redirect with a direct data response matching the frontend's "Smart" expectations.
    """
    # 1. Property Stats
    total_units = Unit.objects.count()
    occupied_units = Unit.objects.filter(is_occupied=True).count()
    vacant_units = total_units - occupied_units
    total_tenants = TenantProfile.objects.count()
    
    property_stats = {
        'total_units': total_units,
        'occupied_units': occupied_units,
        'vacant_units': vacant_units,
        'total_tenants': total_tenants,
        'total_properties': Property.objects.count(),
        'occupancy_rate': round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)
    }

    # 2. Payment Stats (Current Month)
    today = date.today()
    report = ReportService.generate_monthly_report(today.year, today.month)
    
    payment_stats = {
        'total_income': report['total_revenue'],
        'expected_income': report['expected_revenue'],
        'paid_count': report['paid_count'],
        'pending_count': report['pending_count'],
        'overdue_count': report['overdue_count'],
        'collection_rate': report['collection_rate']
    }

    # 3. Revenue Trends (Last 6 months)
    revenue_trends_data = ReportService.get_revenue_trends(months=6)

    return Response({
        'role': 'ADMIN',
        'property_stats': property_stats,
        'payment_stats': payment_stats,
        'revenue_trends': revenue_trends_data
    })


@api_view(['GET'])
@permission_classes([AdminOnly])
def system_health_check(request):
    """
    System health check for monitoring
    """
    from django.db import connection
    
    # Database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check for overdue payments
    overdue_count = Payment.objects.filter(status='OVERDUE').count()
    
    # Check for unread admin messages
    unread_messages = Message.objects.filter(
        receiver__role='ADMIN', 
        is_read=False
    ).count()
    
    return Response({
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': timezone.now(),
        'database': db_status,
        'metrics': {
            'overdue_payments': overdue_count,
            'unread_admin_messages': unread_messages,
            'total_users': User.objects.count(),
            'total_properties': Property.objects.count(),
            'total_units': Unit.objects.count()
        }
    })


# ==================== TENANT PORTAL V2 ENDPOINTS ====================

class TenantDashboardAPIView(generics.GenericAPIView):
    permission_classes = [TenantOnly]
    
    def get(self, request, *args, **kwargs):
        try:
            profile = TenantProfile.objects.select_related(
                'assigned_unit__property_obj'
            ).prefetch_related(
                'leases'
            ).get(user=request.user)
            
            unit = profile.assigned_unit
            
            # Unit Info
            unit_info = None
            if unit:
                unit_info = {
                    'unit_number': unit.unit_number,
                    'property_name': unit.property_obj.name,
                    'rent_amount': float(unit.rent_amount)
                }
                
            # Lease Info
            lease = profile.leases.first()
            lease_info = None
            if lease:
                lease_info = {
                    'start_date': lease.start_date.isoformat(),
                    'end_date': lease.end_date.isoformat(),
                    'rent_amount': float(lease.rent_amount),
                    'deposit': float(lease.deposit),
                    'days_remaining': lease.days_remaining
                }
                
            # Payment Summary
            payments = Payment.objects.filter(tenant=profile)
            total_paid = payments.filter(status='PAID').aggregate(total=Sum('amount_paid'))['total'] or 0
            overdue_payments = payments.filter(status='OVERDUE')
            outstanding_balance = overdue_payments.aggregate(total=Sum('amount_paid'))['total'] or 0
            
            current_month = date.today().replace(day=1)
            current_payment = payments.filter(month_for=current_month).first()
            
            payment_summary = {
                'total_paid': float(total_paid),
                'outstanding_balance': float(outstanding_balance),
                'overdue_count': overdue_payments.count(),
                'current_month': {
                    'status': current_payment.status if current_payment else 'NOT_DUE',
                    'due_date': current_payment.due_date.isoformat() if current_payment and current_payment.due_date else None
                }
            }
            
            # Notifications
            recent_notifications = list(Notification.objects.filter(
                user=request.user
            ).order_by('-created_at')[:5].values('id', 'title', 'message', 'is_read', 'created_at'))
            
            return Response({
                'unit_info': unit_info,
                'payment_summary': payment_summary,
                'lease_info': lease_info,
                'recent_notifications': recent_notifications
            })
            
        except TenantProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Tenant profile not found')

class TenantPaymentListView(generics.ListAPIView):
    permission_classes = [TenantOnly]
    serializer_class = TenantPaymentSerializer

    def get_queryset(self):
        try:
            profile = TenantProfile.objects.get(user=self.request.user)
            return Payment.objects.filter(tenant=profile).order_by('-payment_date')
        except TenantProfile.DoesNotExist:
            return Payment.objects.none()

class TenantPaymentDetailView(generics.RetrieveAPIView):
    permission_classes = [TenantOnly]
    serializer_class = TenantPaymentSerializer

    def get_object(self):
        try:
            profile = TenantProfile.objects.get(user=self.request.user)
            return get_object_or_404(Payment, id=self.kwargs['pk'], tenant=profile)
        except TenantProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Tenant profile not found')

@api_view(['POST'])
@permission_classes([TenantOnly])
def tenant_pay_payment(request):
    """
    Initiate or simulate a payment
    """
    try:
        profile = TenantProfile.objects.get(user=request.user)
        payment_id = request.data.get('payment_id')
        payment = get_object_or_404(Payment, id=payment_id, tenant=profile)
        
        if payment.status == 'PAID':
            return Response({'error': 'Already paid'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Normally integrate Stripe/M-Pesa here. For now, mark PENDING.
        payment.payment_method = 'ONLINE'
        payment.save()
        
        return Response({'message': 'Payment initiated', 'status': payment.status})
    except TenantProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([TenantOnly])
def tenant_submit_payment(request):
    """
    Disabled: Manual payment submission is no longer supported for tenants.
    All payments must be made via the M-Pesa STK Push flow.
    """
    return Response(
        {'error': 'Manual payment submission is disabled. Please use the "Pay with M-Pesa" option in the portal.'},
        status=status.HTTP_400_BAD_REQUEST
    )

class TenantLeaseView(generics.RetrieveAPIView):
    permission_classes = [TenantOnly]
    
    def get(self, request, *args, **kwargs):
        try:
            profile = TenantProfile.objects.get(user=request.user)
            lease = profile.leases.first()
            if not lease:
                return Response({'error': 'No active lease'}, status=status.HTTP_404_NOT_FOUND)
                
            return Response({
                'id': lease.id,
                'start_date': lease.start_date,
                'end_date': lease.end_date,
                'rent_amount': float(lease.rent_amount),
                'deposit': float(lease.deposit),
                'days_remaining': lease.days_remaining
            })
        except TenantProfile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

class TenantMaintenanceDetailView(generics.RetrieveAPIView):
    permission_classes = [TenantOnly]
    serializer_class = MaintenanceRequestSerializer

    def get_object(self):
        try:
            profile = TenantProfile.objects.get(user=self.request.user)
            return get_object_or_404(MaintenanceRequest, id=self.kwargs['pk'], tenant=profile)
        except TenantProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Tenant profile not found')

@api_view(['PATCH'])
@permission_classes([TenantOnly])
def tenant_notification_read(request, pk):
    try:
        notification = get_object_or_404(Notification, id=pk, user=request.user)
        notification.mark_as_read()
        return Response({'message': 'Marked as read'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([TenantOnly])
def tenant_full_profile(request):
    """
    Returns the authenticated tenant's profile, unit, and active lease details.
    GET /api/tenant/profile/
    """
    try:
        profile = TenantProfile.objects.select_related(
            'user',
            'assigned_unit__property_obj',
        ).prefetch_related(
            'leases__unit__property_obj',
        ).get(user=request.user)

        serializer = TenantFullProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    except TenantProfile.DoesNotExist:
        return Response(
            {'error': 'Tenant profile not found. Please contact your administrator.'},
            status=status.HTTP_404_NOT_FOUND
        )


# ==================== ANALYTICS & REPORT EXPORT VIEWS ====================

@api_view(['GET'])
@permission_classes([AdminOnly])
def revenue_trends(request):
    """
    GET /api/reports/revenue-trends/?months=12
    Returns monthly revenue data for the last N months.
    """
    try:
        months = int(request.query_params.get('months', 12))
        months = max(1, min(months, 24))  # clamp between 1 and 24
    except (ValueError, TypeError):
        months = 12

    trends = ReportService.get_revenue_trends(months=months)
    return Response({'trends': trends, 'months': months})


@api_view(['GET'])
@permission_classes([AdminOnly])
def export_payments_csv(request):
    """
    GET /api/reports/export-csv/?year=2026&month=3
    Streams a CSV file of payment records.
    """
    year = request.query_params.get('year')
    month = request.query_params.get('month')

    try:
        year = int(year) if year else None
        month = int(month) if month else None
    except (ValueError, TypeError):
        return Response({'error': 'Invalid year or month'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_lease_pdf(request, pk):
    """
    Export lease as PDF.
    Accessible by Admins or the Tenant who owns the lease.
    """
    lease = get_object_or_404(Lease, pk=pk)
    
    # Permission check
    if request.user.role != 'ADMIN' and lease.tenant.user != request.user:
        return Response({'error': 'You do not have permission to access this lease document.'}, status=status.HTTP_403_FORBIDDEN)
        
    buffer = LeaseService.generate_lease_pdf(lease)
    
    from django.http import FileResponse
    filename = f"Lease_Agreement_{lease.unit.unit_number}_{lease.tenant.user.full_name.replace(' ', '_')}.pdf"
    
    return FileResponse(buffer, as_attachment=True, filename=filename, content_type='application/pdf')


# ==================== CHATBOT VIEW ====================

class ChatbotAPIView(generics.GenericAPIView):
    """
    POST /api/chatbot/
    { "message": "What is the occupancy?" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        chatbot = ChatbotService()
        history = request.data.get('history', [])
        
        reply = chatbot.get_response(request.user, message, history)
        
        return Response({
            'reply': reply,
            'message': reply # For compatibility with old frontend
        })


# ==================== MPESA INTEGRATION VIEWS ====================

@api_view(['POST'])
@permission_classes([TenantOnly])
def mpesa_stk_push_view(request):
    """
    Trigger an M-Pesa STK Push for the logged-in tenant.
    POST /api/properties/tenant/payments/mpesa-stk-push/
    { "amount": 1000, "phone_number": "254712345678", "month_for": "2026-03-01" }
    """
    try:
        tenant_profile = TenantProfile.objects.get(user=request.user)
        amount = request.data.get('amount')
        phone_number = request.data.get('phone_number') or request.user.phone_number
        month_for = request.data.get('month_for')

        if not amount or not month_for:
            return Response({'error': 'Amount and month_for are required'}, status=status.HTTP_400_BAD_REQUEST)

        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize month_for
        try:
            month_date = timezone.datetime.strptime(month_for, '%Y-%m-%d').date().replace(day=1)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Prepare STK Push
        account_ref = f"Rent-{month_date.strftime('%b%y')}"
        trans_desc = f"Payment for {month_date.strftime('%B %Y')}"
        
        # In a real scenario, you'd use a real public callback URL.
        # For sandbox, any URL works, but we'll use our own callback endpoint.
        callback_url = f"{settings.MPESA_CALLBACK_BASE_URL}/api/properties/mpesa/callback/"

        try:
            response = MpesaClient.initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=account_ref,
                transaction_description=trans_desc,
                callback_url=callback_url
            )
            
            # Create a PENDING payment record with the CheckoutRequestID as reference
            # This will be updated once the callback is received.
            Payment.objects.create(
                tenant=tenant_profile,
                unit=tenant_profile.assigned_unit,
                amount_paid=amount,
                month_for=month_date,
                payment_date=timezone.now().date(),
                payment_method='MOBILE_MONEY',
                transaction_reference=response.get('CheckoutRequestID'),
                status='PENDING'
            )

            return Response({
                'message': 'STK Push initiated successfully. Please check your phone.',
                'CheckoutRequestID': response.get('CheckoutRequestID')
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"M-Pesa STK Push error: {str(e)}")
            return Response({'error': f"Failed to initiate M-Pesa payment: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except TenantProfile.DoesNotExist:
        return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mpesa_callback_view(request):
    """
    Receive and process M-Pesa payment callbacks from Safaricom.
    POST /api/properties/mpesa/callback/
    """
    logger.info("M-Pesa Callback received: %s", request.data)
    
    # Safaricom sends data in a specific structure: { "Body": { "stkCallback": { ... } } }
    body = request.data.get('Body', {})
    stk_callback = body.get('stkCallback', {})
    result_code = stk_callback.get('ResultCode')
    checkout_request_id = stk_callback.get('CheckoutRequestID')

    if result_code == 0:
        # Success!
        logger.info("M-Pesa payment successful for CheckoutRequestID: %s", checkout_request_id)
        
        # Find the payment record
        payment = Payment.objects.filter(transaction_reference=checkout_request_id).first()
        if payment:
            # Extract M-Pesa receipt number from CallbackMetadata
            metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            receipt_number = ""
            for item in metadata:
                if item.get('Name') == 'MpesaReceiptNumber':
                    receipt_number = item.get('Value')
                    break
            
            payment.status = 'PAID'
            payment.transaction_reference = receipt_number or checkout_request_id
            payment.save()
            
            # Trigger notification
            Notification.create_notification(
                user=payment.tenant.user,
                title="Payment Confirmed",
                message=f"Your M-Pesa payment for {payment.month_for.strftime('%B %Y')} has been confirmed. Receipt: {payment.transaction_reference}",
                notification_type='PAYMENT_CONFIRMED',
                related_payment=payment
            )
            
            # Notify admins
            admins = User.objects.filter(role='ADMIN')
            for admin in admins:
                Notification.create_notification(
                    user=admin,
                    title="M-Pesa Payment Received",
                    message=f"Tenant {payment.tenant.user.full_name} has paid KES {payment.amount_paid} via M-Pesa.",
                    notification_type='SYSTEM_ANNOUNCEMENT',
                    related_payment=payment
                )
        else:
            logger.warning("Payment record not found for CheckoutRequestID: %s", checkout_request_id)
    else:
        # Failure
        result_desc = stk_callback.get('ResultDesc', 'Unknown error')
        logger.warning("M-Pesa payment failed for CheckoutRequestID: %s. Code: %s, Desc: %s", 
                       checkout_request_id, result_code, result_desc)
        
        payment = Payment.objects.filter(transaction_reference=checkout_request_id).first()
        if payment:
            payment.status = 'FAILED'
            payment.save()

    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
