"""
Service layer for business logic and smart features
"""
from datetime import date, timedelta
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
        from .models import Unit
        payments = Payment.objects.filter(month_for__year=year, month_for__month=month)
        
        total_revenue = payments.filter(status='PAID').aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0
        
        expected_revenue = payments.aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0
        
        total_pending = payments.filter(status__in=['PENDING', 'OVERDUE']).aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0

        # Occupancy stats
        total_units = Unit.objects.count()
        occupied_units = Unit.objects.filter(is_occupied=True).count()
        vacant_units = total_units - occupied_units
        occupancy_rate = round((occupied_units / total_units * 100) if total_units > 0 else 0, 2)

        return {
            'period': f"{year}-{month:02d}",
            'total_revenue': float(total_revenue),
            'expected_revenue': float(expected_revenue),
            'total_pending': float(total_pending),
            'paid_count': payments.filter(status='PAID').count(),
            'pending_count': payments.filter(status='PENDING').count(),
            'overdue_count': payments.filter(status='OVERDUE').count(),
            'collection_rate': round(
                (payments.filter(status='PAID').count() / payments.count() * 100) 
                if payments.count() > 0 else 0, 2
            ),
            'total_units': total_units,
            'occupied_units': occupied_units,
            'vacant_units': vacant_units,
            'occupancy_rate': occupancy_rate,
            # Keep legacy keys
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
        from dateutil.relativedelta import relativedelta
        today = date.today()
        trends = []
        for i in range(months - 1, -1, -1):
            period_date = (today.replace(day=1) - relativedelta(months=i))
            qs = Payment.objects.filter(
                month_for__year=period_date.year,
                month_for__month=period_date.month,
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
        return response
