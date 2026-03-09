from decimal import Decimal, InvalidOperation
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import date, timedelta
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
from .services import NotificationService, PaymentService, ReportService

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
        import io
        from django.http import FileResponse
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
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
        # Admin access
        payment = get_object_or_404(Payment, id=pk)
        
    # Check if actually paid
    if payment.status != 'PAID':
        return Response({'error': 'Receipts are only available for completely paid records.'}, status=status.HTTP_400_BAD_REQUEST)

    # 2. Build PDF
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    p.setFont("Helvetica-Bold", 18)
    p.drawString(100, 750, "Property Pulse - Rent Receipt")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 730, f"Receipt No: {payment.transaction_reference or payment.id}")
    p.drawString(100, 715, f"Date generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
    
    p.line(100, 700, 500, 700)
    
    # Details
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, 675, "Tenant Details:")
    p.setFont("Helvetica", 12)
    p.drawString(120, 655, f"Name: {payment.tenant.user.full_name}")
    p.drawString(120, 640, f"Unit: {payment.unit.unit_number} - {payment.unit.property_obj.name}")
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, 605, "Payment Details:")
    p.setFont("Helvetica", 12)
    p.drawString(120, 585, f"Amount Paid: KES {payment.amount_paid}")
    p.drawString(120, 570, f"Rent Month: {payment.month_for.strftime('%B %Y')}")
    p.drawString(120, 555, f"Date Paid: {payment.payment_date}")
    p.drawString(120, 540, f"Method: {payment.get_payment_method_display()}")
    
    # Footer
    p.line(100, 510, 500, 510)
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(100, 490, "Thank you for your timely payment!")
    
    p.showPage()
    p.save()
    
    # 3. Return as attachment
    buffer.seek(0)
    filename = f"Receipt_{payment.month_for.strftime('%b-%Y')}_{payment.unit.unit_number}.pdf"
    return FileResponse(buffer, as_attachment=True, filename=filename)


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
        import io
        from django.http import FileResponse
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
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

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    p.setFont("Helvetica-Bold", 18)
    p.drawString(100, 750, f"Property Pulse - Monthly Report ({month}/{year})")
    p.setFont("Helvetica", 12)
    p.drawString(100, 730, f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
    p.line(100, 715, 500, 715)
    
    # Financial Overview
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, 685, "1. Financial Overview")
    p.setFont("Helvetica", 12)
    p.drawString(120, 660, f"Total Expected Revenue: KES {report['expected_revenue']}")
    p.drawString(120, 640, f"Total Collected Revenue: KES {report['total_revenue']}")
    p.drawString(120, 620, f"Total Pending Revenue: KES {report['total_pending']}")
    
    collection_rate = report['collection_rate']
    p.drawString(120, 600, f"Collection Rate: {collection_rate:.1f}%")

    # Occupancy Overview
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, 560, "2. Occupancy Overview")
    p.setFont("Helvetica", 12)
    p.drawString(120, 535, f"Total Units: {report['total_units']}")
    p.drawString(120, 515, f"Occupied Units: {report['occupied_units']}")
    p.drawString(120, 495, f"Vacant Units: {report['vacant_units']}")
    p.drawString(120, 475, f"Occupancy Rate: {report['occupancy_rate']}%")

    # Payment Statuses
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, 435, "3. Payment Breakdown")
    p.setFont("Helvetica", 12)
    p.drawString(120, 410, f"Paid Count: {report['paid_count']}")
    p.drawString(120, 390, f"Pending Count: {report['pending_count']}")
    p.drawString(120, 370, f"Overdue Count: {report['overdue_count']}")

    p.line(100, 340, 500, 340)
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(100, 320, "End of report.")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    filename = f"Property_Report_{year}_{month:02d}.pdf"
    return FileResponse(buffer, as_attachment=True, filename=filename)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_summary(request):
    """
    Get comprehensive dashboard summary for both admin and tenant
    """
    user = request.user
    
    if user.role == 'ADMIN':
        # Admin dashboard
        total_properties = Property.objects.count()
        total_units = Unit.objects.count()
        occupied_units = Unit.objects.filter(is_occupied=True).count()
        vacant_units = total_units - occupied_units
        total_tenants = TenantProfile.objects.count()
        
        # Payment stats
        payment_stats = PaymentService.get_admin_payment_stats()
        
        # Revenue trends
        revenue_trends = ReportService.get_revenue_trends(months=6)
        
        # Recent notifications
        recent_notifications = Notification.objects.filter(
            user=user
        ).order_by('-created_at')[:5]
        
        return Response({
            'role': 'ADMIN',
            'property_stats': {
                'total_properties': total_properties,
                'total_units': total_units,
                'occupied_units': occupied_units,
                'vacant_units': vacant_units,
                'total_tenants': total_tenants,
                'occupancy_rate': round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)
            },
            'payment_stats': payment_stats,
            'revenue_trends': revenue_trends,
            'recent_notifications': [
                {
                    'id': n.id,
                    'title': n.title,
                    'message': n.message,
                    'created_at': n.created_at.isoformat(),
                    'is_read': n.is_read
                } for n in recent_notifications
            ]
        })
    
    else:
        # Tenant dashboard
        try:
            tenant_profile = TenantProfile.objects.get(user=user)
            payment_summary = PaymentService.get_tenant_payment_summary(tenant_profile)
            
            # Days remaining in lease
            days_remaining = None
            if tenant_profile.lease_end_date:
                days_remaining = max(0, (tenant_profile.lease_end_date - date.today()).days)

            # Next due date (first of next month if current not paid)
            next_due_date = None
            current_month = date.today().replace(day=1)
            current_payment = Payment.objects.filter(
                tenant=tenant_profile,
                month_for=current_month
            ).first()
            if not current_payment or current_payment.status != 'PAID':
                next_due_date = current_month

            # Unread notifications count
            unread_notifications = Notification.objects.filter(
                user=user,
                is_read=False
            ).count()

            # Recent notifications
            recent_notifications = Notification.objects.filter(
                user=user
            ).order_by('-created_at')[:5]
            
            # Unit info
            unit_info = None
            if tenant_profile.assigned_unit:
                unit_info = {
                    'unit_number': tenant_profile.assigned_unit.unit_number,
                    'property_name': tenant_profile.assigned_unit.property_obj.name,
                    'rent_amount': tenant_profile.assigned_unit.rent_amount
                }
            
            return Response({
                'role': 'TENANT',
                'unit_info': unit_info,
                'payment_summary': {
                    'current_month': payment_summary['current_month'],
                    'overdue_count': payment_summary['overdue_count'],
                    'overdue_amount': payment_summary['overdue_amount'],
                    'total_paid': payment_summary['total_paid']
                },
                'outstanding_balance': payment_summary['overdue_amount'],
                'next_due_date': next_due_date.isoformat() if next_due_date else None,
                'days_remaining': days_remaining,
                'unread_notifications': unread_notifications,
                'recent_notifications': [
                    {
                        'id': n.id,
                        'title': n.title,
                        'message': n.message,
                        'created_at': n.created_at,
                        'is_read': n.is_read
                    } for n in recent_notifications
                ]
            })
            
        except TenantProfile.DoesNotExist:
            return Response({
                'error': 'Tenant profile not found'
            }, status=status.HTTP_404_NOT_FOUND)


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
    except:
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
    Submit a manual payment (with optional evidence)
    """
    print(">>> tenant_submit_payment hit")
    try:
        profile = TenantProfile.objects.get(user=request.user)
        print(">>> Profile fetched:", profile)
        
        raw_amount = request.data.get('amount_paid')
        try:
            amount_paid = Decimal(str(raw_amount))
        except (TypeError, ValueError, InvalidOperation):
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)
        month_for = request.data.get('month_for')
        payment_method = request.data.get('payment_method', 'BANK_TRANSFER')
        transaction_reference = request.data.get('transaction_reference', '')
        evidence_file = request.FILES.get('evidence')

        print(f">>> Payload data: amount_paid={amount_paid}, month_for={month_for}, method={payment_method}, ref={transaction_reference}")

        if not amount_paid or not month_for:
            print(">>> Missing amount or month")
            return Response({'error': 'Amount and Month are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse month_for date
        try:
            month_date = timezone.datetime.strptime(month_for, '%Y-%m-%d').date()
            # Normalize to first of the month
            month_date = month_date.replace(day=1)
            print(">>> Parsed month_date:", month_date)
        except ValueError:
            print(">>> ValueError parsing date")
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if payment for this month already exists
        existing_payment = Payment.objects.filter(
            tenant=profile,
            month_for=month_date
        ).first()

        if existing_payment:
            print(">>> Existing payment found:", existing_payment.id)
            if existing_payment.status == 'PAID':
                print(">>> Existent is PAID. Halting.")
                return Response({'error': f'Payment for {month_date.strftime("%B %Y")} has already been confirmed.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Update existing pending/overdue payment
                print(">>> Updating existing payment")
                payment = existing_payment
                payment.amount_paid = amount_paid
                payment.payment_method = payment_method
                payment.transaction_reference = transaction_reference
                payment.payment_date = timezone.now().date()
                payment.status = 'PENDING'
                payment.save()
        else:
            print(">>> No existing payment. Creating one.")
            if not profile.assigned_unit:
                print(">>> Profile has no assigned unit")
                return Response({'error': 'No unit assigned to your profile.'}, status=status.HTTP_400_BAD_REQUEST)
                
            payment = Payment.objects.create(
                tenant=profile,
                unit=profile.assigned_unit,
                amount_paid=amount_paid,
                month_for=month_date,
                payment_date=timezone.now().date(),
                payment_method=payment_method,
                transaction_reference=transaction_reference,
                status='PENDING'
            )
            print(">>> Payment created:", payment.id)

        # Attach evidence if provided
        if evidence_file:
            print(">>> Attaching evidence")
            PaymentEvidence.objects.create(
                payment=payment,
                uploaded_by=request.user,
                file=evidence_file,
                status='PENDING'
            )
            print(">>> Evidence attached")

        return Response({
            'message': 'Payment submitted successfully',
            'payment': TenantPaymentSerializer(payment).data
        }, status=status.HTTP_201_CREATED)

    except TenantProfile.DoesNotExist:
        print(">>> Tenant profile not found!")
        return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        # Django model ValidationError
        error_messages = []
        if hasattr(e, 'message_dict'):
            for field, messages in e.message_dict.items():
                error_messages.extend(messages)
        elif hasattr(e, 'messages'):
            error_messages = e.messages
        else:
            error_messages = [str(e)]
        
        err_msg = " ".join(error_messages)
        print(">>> Validation Error:", err_msg)
        return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print(">>> EXCEPTION IN tenant_submit_payment:")
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    return ReportService.export_payments_to_csv(year=year, month=month)
