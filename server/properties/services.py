"""
Service layer for business logic and smart features
"""
from datetime import date, timedelta, datetime
from django.utils import timezone
from django.db import models
from django.db.models import Q
from .models import Payment, Notification, TenantProfile, User, Message, Lease


class NotificationService:
    """Service for managing notifications"""
    
    @staticmethod
    def create_overdue_notifications():
        """Create notifications for overdue payments (cron job ready)"""
        today = date.today()
        
        # Find payments that are now overdue
        overdue_payments = Payment.objects.filter(
            status='PENDING',
            month_for__lte=today.replace(day=1) - timedelta(days=1)
        ).filter(
            Q(notifications__isnull=True) | ~Q(notifications__notification_type='OVERDUE_RENT')
        )
        
        for payment in overdue_payments:
            if payment.is_overdue:
                Notification.create_notification(
                    user=payment.tenant.user,
                    title="Rent Overdue",
                    message=f"Your rent payment for {payment.month_for.strftime('%B %Y')} is overdue by {payment.days_overdue} days.",
                    notification_type='OVERDUE_RENT',
                    related_payment=payment
                )
    
    @staticmethod
    def create_rent_due_reminders():
        """Create rent due reminders (cron job ready)"""
        today = date.today()
        
        # Find payments due in next 7 days
        due_soon = today + timedelta(days=7)
        
        upcoming_payments = Payment.objects.filter(
            status='PENDING',
            month_for__month=due_soon.month,
            month_for__year=due_soon.year
        ).filter(
            Q(notifications__isnull=True) | ~Q(notifications__notification_type='RENT_DUE')
        )
        
        for payment in upcoming_payments:
            Notification.create_notification(
                user=payment.tenant.user,
                title="Rent Due Soon",
                message=f"Your rent payment of {payment.amount_paid} for {payment.month_for.strftime('%B %Y')} is due on {due_soon.strftime('%B %d, %Y')}.",
                notification_type='RENT_DUE',
                related_payment=payment
            )
    
    @staticmethod
    def mark_notifications_as_read(user, notification_ids=None):
        """Mark notifications as read"""
        queryset = Notification.objects.filter(user=user, is_read=False)
        
        if notification_ids:
            queryset = queryset.filter(id__in=notification_ids)
        
        for notification in queryset:
            notification.mark_as_read()
        
        return queryset.count()

    @staticmethod
    def create_lease_expiry_reminders():
        """
        Notify tenants when their lease is expiring within 30 days.
        Designed to be triggered by a cron job.
        """
        today = date.today()
        warning_date = today + timedelta(days=30)

        expiring_leases = Lease.objects.filter(
            end_date__lte=warning_date,
            end_date__gte=today,
        ).select_related('tenant__user')

        for lease in expiring_leases:
            days_left = (lease.end_date - today).days
            # Avoid duplicate notifications — check if one was already sent today
            already_notified = Notification.objects.filter(
                user=lease.tenant.user,
                notification_type='SYSTEM_ANNOUNCEMENT',
                created_at__date=today,
                title__startswith='Lease Expiring'
            ).exists()
            if not already_notified:
                Notification.create_notification(
                    user=lease.tenant.user,
                    title=f"Lease Expiring in {days_left} Days",
                    message=(
                        f"Your lease for unit {lease.unit.unit_number} expires on "
                        f"{lease.end_date.strftime('%B %d, %Y')}. "
                        f"Please contact your property manager to discuss renewal."
                    ),
                    notification_type='SYSTEM_ANNOUNCEMENT',
                )


class PaymentService:
    """Service for payment operations"""
    
    @staticmethod
    def get_tenant_payment_summary(tenant_profile):
        """Get comprehensive payment summary for tenant"""
        payments = Payment.objects.filter(tenant=tenant_profile).order_by('-month_for')
        
        # Current month
        current_month = date.today().replace(day=1)
        current_payment = payments.filter(month_for=current_month).first()
        
        # Overdue payments
        overdue_payments = payments.filter(status='OVERDUE')
        
        # Total paid
        total_paid = payments.filter(status='PAID').aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0
        
        # Last 6 months payment history
        six_months_ago = (current_month - timedelta(days=180)).replace(day=1)
        recent_payments = payments.filter(month_for__gte=six_months_ago)
        
        return {
            'current_month': {
                'status': current_payment.status if current_payment else 'NOT_DUE',
                'amount': current_payment.amount_paid if current_payment else 0,
                'due_date': current_payment.payment_date if current_payment else None
            },
            'overdue_count': overdue_payments.count(),
            'overdue_amount': overdue_payments.aggregate(
                total=models.Sum('amount_paid')
            )['total'] or 0,
            'total_paid': total_paid,
            'recent_payments': recent_payments
        }
    
    @staticmethod
    def get_admin_payment_stats(property_id=None, month=None, year=None):
        """Get payment statistics for admin dashboard"""
        queryset = Payment.objects.all()
        
        if property_id:
            queryset = queryset.filter(unit__property_obj_id=property_id)
        
        if month and year:
            queryset = queryset.filter(month_for__month=month, month_for__year=year)
        
        # Calculate statistics
        total_income = queryset.filter(status='PAID').aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0
        
        paid_count = queryset.filter(status='PAID').count()
        pending_count = queryset.filter(status='PENDING').count()
        overdue_count = queryset.filter(status='OVERDUE').count()
        
        return {
            'total_income': total_income,
            'paid_count': paid_count,
            'pending_count': pending_count,
            'overdue_count': overdue_count,
            'total_count': queryset.count()
        }


class MessageService:
    """Service for messaging operations"""
    
    @staticmethod
    def get_user_conversations(user):
        """Get all conversations for a user"""
        if user.role == 'ADMIN':
            # Admin sees all conversations
            messages = Message.objects.filter(
                Q(sender=user) | Q(receiver=user)
            ).select_related('sender', 'receiver').order_by('-timestamp')
        else:
            # Tenant only sees conversations with admins
            messages = Message.objects.filter(
                Q(sender=user, receiver__role='ADMIN') | 
                Q(receiver=user, sender__role='ADMIN')
            ).select_related('sender', 'receiver').order_by('-timestamp')
        
        # Group by conversation partner
        conversations = {}
        for message in messages:
            partner = message.receiver if message.sender == user else message.sender
            if partner.id not in conversations:
                conversations[partner.id] = {
                    'partner': partner,
                    'last_message': message,
                    'unread_count': 0
                }
            
            if message.receiver == user and not message.is_read:
                conversations[partner.id]['unread_count'] += 1
        
        return list(conversations.values())
    
    @staticmethod
    def get_conversation_messages(user, partner_id):
        """Get messages between user and partner"""
        try:
            partner = User.objects.get(id=partner_id)
            
            # Validate conversation rules
            if user.role == 'TENANT' and partner.role != 'ADMIN':
                return None
            
            messages = Message.objects.filter(
                (Q(sender=user) & Q(receiver=partner)) |
                (Q(sender=partner) & Q(receiver=user))
            ).select_related('sender', 'receiver').order_by('timestamp')
            
            # Mark messages as read
            messages.filter(receiver=user, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
            
            return messages
            
        except User.DoesNotExist:
            return None
    
    @staticmethod
    def send_message(sender, receiver_id, subject, body):
        """Send a message with validation"""
        try:
            receiver = User.objects.get(id=receiver_id)
            
            message = Message(
                sender=sender,
                receiver=receiver,
                subject=subject,
                body=body
            )
            message.save()
            
            return message
            
        except User.DoesNotExist:
            return None


class ReportService:
    """Service for generating reports"""
    
    @staticmethod
    def generate_monthly_report(year, month):
        """Generate monthly financial report"""
        from .models import Unit, TenantProfile, Property
        
        # Occupancy stats
        total_units = Unit.objects.count()
        occupied_units_qs = Unit.objects.filter(is_occupied=True)
        occupied_units = occupied_units_qs.count()
        vacant_units = total_units - occupied_units
        occupancy_rate = round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)
        
        # Calculate expected revenue based on all occupied units' rent
        expected_revenue = occupied_units_qs.aggregate(
            total=models.Sum('rent_amount')
        )['total'] or 0
        
        payments = Payment.objects.filter(month_for__year=year, month_for__month=month)
        
        total_revenue = payments.filter(status='PAID').aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0
        
        total_pending = payments.filter(status__in=['PENDING', 'OVERDUE']).aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0

        # Data for the new AdminFinancialReport.jsx
        monthly_revenue_trends = ReportService.get_revenue_trends(months=3)
        
        property_occupancy = []
        for prop in Property.objects.all():
            p_units = Unit.objects.filter(property_obj=prop)
            p_total = p_units.count()
            p_occupied = p_units.filter(is_occupied=True).count()
            property_occupancy.append({
                'name': prop.name,
                'total': p_total,
                'occupied': p_occupied,
                'occupancy': round((p_occupied / p_total * 100) if p_total > 0 else 0, 1)
            })

        recent_payments = []
        for p in payments.select_related('tenant__user', 'unit__property_obj').order_by('-payment_date')[:10]:
            recent_payments.append({
                'id': p.id,
                'tenant': p.tenant.user.full_name,
                'unit': p.unit.unit_number,
                'property': p.unit.property_obj.name,
                'amount': float(p.amount_paid or 0),
                'mpesa_ref': p.transaction_reference or 'N/A',
                'date': p.payment_date.strftime('%d %b %Y') if p.payment_date else 'N/A',
                'status': p.status.lower()
            })

        return {
            'period': f"{year}-{month:02d}",
            'report_month': date(year, month, 1).strftime('%B %Y'),
            'generated_date': timezone.now().strftime('%d %b %Y'),
            'metrics': {
                'total_collected': float(total_revenue),
                'outstanding': float(total_pending),
                'outstanding_tenants': payments.filter(status__in=['PENDING', 'OVERDUE']).values('tenant').distinct().count(),
                'occupancy_rate': float(occupancy_rate),
                'occupied_units': occupied_units,
                'total_units': total_units,
                'pending_approvals': payments.filter(status='PENDING').count()
            },
            'monthly_revenue': [
                {
                    'month': d['month'].split(' ')[0], 
                    'collected': d['revenue'], 
                    'outstanding': float(Payment.objects.filter(
                        month_for__year=datetime.strptime(d['month'], '%b %Y').year,
                        month_for__month=datetime.strptime(d['month'], '%b %Y').month,
                        status__in=['PENDING', 'OVERDUE']
                    ).aggregate(sum=models.Sum('amount_paid'))['sum'] or 0)
                } for d in monthly_revenue_trends
            ],
            'properties': property_occupancy,
            'payments': recent_payments,
            # Legacy fields for backward compatibility
            'total_revenue': float(total_revenue),
            'expected_revenue': float(expected_revenue),
            'total_pending': float(total_pending),
            'paid_count': payments.filter(status='PAID').count(),
            'pending_count': payments.filter(status='PENDING').count(),
            'overdue_count': payments.filter(status='OVERDUE').count(),
            'total_tenants': TenantProfile.objects.count(),
            'collection_rate': round(
                (payments.filter(status='PAID').count() / payments.count() * 100) 
                if payments.count() > 0 else 0, 2
            ),
            'total_units': total_units,
            'occupied_units': occupied_units,
            'vacant_units': vacant_units,
            'occupancy_rate': occupancy_rate,
            'total_income': float(total_revenue),
            'expected_income': float(expected_revenue),
        }
    
    @staticmethod
    def generate_property_report(property_id, start_date=None, end_date=None):
        """Generate property-specific report"""
        from .models import Property, Unit
        
        try:
            property_obj = Property.objects.get(id=property_id)
            units = Unit.objects.filter(property_obj=property_obj)
            
            queryset = Payment.objects.filter(unit__in=units)
            
            if start_date:
                queryset = queryset.filter(payment_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(payment_date__lte=end_date)
            
            return {
                'property': property_obj.name,
                'total_units': units.count(),
                'occupied_units': units.filter(is_occupied=True).count(),
                'vacancy_rate': round(
                    (units.filter(is_occupied=False).count() / units.count() * 100) 
                    if units.count() > 0 else 0, 2
                ),
                'total_income': queryset.filter(status='PAID').aggregate(
                    total=models.Sum('amount_paid')
                )['total'] or 0,
                'payment_breakdown': {
                    'paid': queryset.filter(status='PAID').count(),
                    'pending': queryset.filter(status='PENDING').count(),
                    'overdue': queryset.filter(status='OVERDUE').count()
                }
            }
            
        except Property.DoesNotExist:
            return None

    @staticmethod
    def get_revenue_trends(months=12):
        """Return monthly revenue for the last N months (newest last)."""
        today = date.today()
        trends = []
        
        # Calculate start month without relativedelta
        curr_month = today.month
        curr_year = today.year
        
        for i in range(months - 1, -1, -1):
            # Calculate target year and month
            target_month = curr_month - i
            target_year = curr_year
            
            while target_month <= 0:
                target_month += 12
                target_year -= 1
                
            period_date = date(target_year, target_month, 1)
            
            qs = Payment.objects.filter(
                month_for__year=target_year,
                month_for__month=target_month,
            )
            total = qs.filter(status='PAID').aggregate(
                total=models.Sum('amount_paid')
            )['total'] or 0
            
            trends.append({
                'month': period_date.strftime('%b %Y'),
                'period': period_date.strftime('%b %Y'), # for compatibility
                'revenue': float(total),
                'total_income': float(total), # for compatibility
                'paid_count': qs.filter(status='PAID').count(),
                'pending_count': qs.filter(status='PENDING').count(),
                'overdue_count': qs.filter(status='OVERDUE').count(),
            })
        return trends

    @staticmethod
    def export_payments_to_csv(year=None, month=None):
        """Generate a CSV HttpResponse for payment records."""
        import csv
        from django.http import HttpResponse

        qs = Payment.objects.select_related(
            'tenant__user', 'unit__property_obj'
        ).order_by('-payment_date')

        if year:
            qs = qs.filter(month_for__year=year)
        if month:
            qs = qs.filter(month_for__month=month)

        filename = f"payments_{year or 'all'}_{month or 'all'}.csv"
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Tenant Name', 'Tenant Email',
            'Unit', 'Property', 'Amount (KES)',
            'Month For', 'Payment Date', 'Method', 'Status',
            'Transaction Ref',
        ])
        for p in qs:
            writer.writerow([
                p.id,
                p.tenant.user.full_name,
                p.tenant.user.email,
                p.unit.unit_number,
                p.unit.property_obj.name,
                p.amount_paid,
                p.month_for.strftime('%B %Y'),
                p.payment_date,
                p.get_payment_method_display(),
                p.status,
                p.transaction_reference or '',
            ])

class LeaseService:
    """Service for lease document operations"""
    
    @staticmethod
    def generate_lease_pdf(lease):
        """
        Generate a professional lease agreement PDF.
        """
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem
        from reportlab.lib.units import inch
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle(
            'LeaseTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor("#1e293b"),
            alignment=1,
            spaceAfter=30
        )
        
        section_style = ParagraphStyle(
            'LeaseSection',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor("#334155"),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'LeaseBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            spaceAfter=10
        )
        
        elements = []
        
        # 1. Header
        elements.append(Paragraph("RESIDENTIAL LEASE AGREEMENT", title_style))
        elements.append(Paragraph(f"This Residential Lease Agreement (\"Agreement\") is made and entered into on {date.today().strftime('%B %d, %Y')}, by and between the Landlord and Tenant identified below.", body_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # 2. Parties and Property
        elements.append(Paragraph("1. PARTIES AND PROPERTY", section_style))
        parties_data = [
            ["LANDLORD:", "Property Pulse Management"],
            ["TENANT:", lease.tenant.user.full_name],
            ["PROPERTY:", lease.unit.property_obj.name],
            ["LOCATION:", lease.unit.property_obj.location],
            ["UNIT NUMBER:", lease.unit.unit_number]
        ]
        
        t = Table(parties_data, colWidths=[1.5 * inch, 4.5 * inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.2 * inch))
        
        # 3. Term and Rent
        elements.append(Paragraph("2. LEASE TERM AND RENT", section_style))
        term_data = [
            ["START DATE:", lease.start_date.strftime('%B %d, %Y')],
            ["END DATE:", lease.end_date.strftime('%B %d, %Y')],
            ["MONTHLY RENT:", f"KES {float(lease.rent_amount):,.2f}"],
            ["SECURITY DEPOSIT:", f"KES {float(lease.deposit):,.2f}"]
        ]
        
        t2 = Table(term_data, colWidths=[1.5 * inch, 4.5 * inch])
        t2.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 0.2 * inch))
        
        # 4. Terms and Conditions
        elements.append(Paragraph("3. TERMS AND CONDITIONS", section_style))
        clauses = [
            "The Tenant shall use the premises for residential purposes only.",
            "Rent is due on the 5th day of every month. Late payments may incur penalties.",
            "The Tenant is responsible for keeping the unit in a clean and sanitary condition.",
            "No alterations to the property shall be made without prior written consent from the Landlord.",
            "The Landlord reserves the right to enter the premises for inspection or repairs with reasonable notice."
        ]
        
        items = [ListItem(Paragraph(c, body_style)) for c in clauses]
        elements.append(ListFlowable(items, bulletType='bullet'))
        elements.append(Spacer(1, 0.4 * inch))
        
        # 5. Signatures
        elements.append(Paragraph("4. SIGNATURES", section_style))
        sig_data = [
            ["__________________________", "__________________________"],
            ["Landlord Signature", "Tenant Signature"],
            ["Date: ____________________", "Date: ____________________"]
        ]
        
        ts = Table(sig_data, colWidths=[3 * inch, 3 * inch])
        ts.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, 0), 40),
            ('FONTSIZE', (0, 1), (-1, 1), 9),
        ]))
        elements.append(ts)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
