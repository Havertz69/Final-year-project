from django.db import models
from decimal import Decimal, InvalidOperation
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


class Property(models.Model):
    """
    Property model representing a building or complex
    """
    name = models.CharField(max_length=200, help_text="Property name")
    location = models.CharField(max_length=500, help_text="Full address of the property")
    description = models.TextField(blank=True, help_text="Property description")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_properties',
        limit_choices_to={'role': 'ADMIN'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'properties'
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.location}"

    @property
    def total_units(self):
        return self.units.count()

    @property
    def occupied_units(self):
        return self.units.filter(is_occupied=True).count()

    @property
    def vacant_units(self):
        return self.units.filter(is_occupied=False).count()


class Unit(models.Model):
    """
    Unit model representing individual rental units within a property
    """
    property_obj = models.ForeignKey(
        Property, 
        on_delete=models.CASCADE, 
        related_name='units'
    )
    unit_number = models.CharField(max_length=50, help_text="Unit number (e.g., A101, B205)")
    rent_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Monthly rent amount"
    )
    is_occupied = models.BooleanField(default=False, help_text="Whether the unit is currently occupied")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'units'
        verbose_name = 'Unit'
        verbose_name_plural = 'Units'
        unique_together = ['property_obj', 'unit_number']
        ordering = ['property_obj', 'unit_number']

    def __str__(self):
        return f"{self.property_obj.name} - Unit {self.unit_number}"

    @property
    def current_tenant(self):
        """Get the current tenant profile for this unit"""
        return self.tenant_profiles.filter(move_in_date__lte=timezone.now()).first()


class TenantProfile(models.Model):
    """
    Tenant profile extending the User model with property-specific information
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='tenant_profile',
        limit_choices_to={'role': 'TENANT'}
    )
    assigned_unit = models.ForeignKey(
        Unit, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tenant_profiles'
    )
    move_in_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Date when tenant moved in"
    )
    lease_end_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Lease end date"
    )
    security_deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Security deposit amount"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_profiles'
        verbose_name = 'Tenant Profile'
        verbose_name_plural = 'Tenant Profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.assigned_unit or 'No Unit Assigned'}"

    def clean(self):
        """Validate business rules"""
        if self.assigned_unit and self.assigned_unit.is_occupied:
            # Check if this unit is already occupied by another tenant
            existing_tenant = TenantProfile.objects.filter(
                assigned_unit=self.assigned_unit
            ).exclude(id=self.id).first()
            
            if existing_tenant:
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'assigned_unit': 'This unit is already occupied by another tenant.'
                })

    def save(self, *args, **kwargs):
        self.clean()
        
        # Update unit occupancy status
        if self.assigned_unit:
            if self.pk:  # Existing tenant
                old_profile = TenantProfile.objects.get(pk=self.pk)
                if old_profile.assigned_unit != self.assigned_unit:
                    # Unit changed, update old and new units
                    if old_profile.assigned_unit:
                        old_profile.assigned_unit.is_occupied = False
                        old_profile.assigned_unit.save()
                    self.assigned_unit.is_occupied = True
                    self.assigned_unit.save()
            else:  # New tenant
                self.assigned_unit.is_occupied = True
                self.assigned_unit.save()
        else:
            # No unit assigned, check if tenant had a unit before
            if self.pk:
                old_profile = TenantProfile.objects.get(pk=self.pk)
                if old_profile.assigned_unit:
                    old_profile.assigned_unit.is_occupied = False
                    old_profile.assigned_unit.save()
        
        super().save(*args, **kwargs)


class MaintenanceRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('EMERGENCY', 'Emergency'),
    ]

    tenant = models.ForeignKey(
        TenantProfile,
        on_delete=models.CASCADE,
        related_name='maintenance_requests'
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_requests'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(
        upload_to='maintenance_images/%Y/%m/',
        blank=True,
        null=True,
        help_text="Optional image for the maintenance request"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'maintenance_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"


class LeaseDocument(models.Model):
    tenant = models.OneToOneField(
        TenantProfile,
        on_delete=models.CASCADE,
        related_name='lease_document'
    )
    file = models.FileField(
        upload_to='lease_documents/%Y/%m/',
        help_text="Lease agreement PDF"
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_lease_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lease_documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"Lease document for {self.tenant.user.full_name}"


class Payment(models.Model):
    """
    Payment model for tracking rent payments
    """
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('FAILED', 'Failed'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('CHEQUE', 'Cheque'),
        ('ONLINE', 'Online Payment'),
    ]
    
    tenant = models.ForeignKey(
        TenantProfile, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    unit = models.ForeignKey(
        Unit, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    amount_paid = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    payment_date = models.DateField(default=date.today)
    month_for = models.DateField(help_text="Month for which this payment is made")
    due_date = models.DateField(
        null=True, 
        blank=True, 
        help_text="Explicit due date for this rent payment"
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        default='BANK_TRANSFER'
    )
    status = models.CharField(
        max_length=10, 
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING'
    )
    transaction_reference = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Transaction reference or receipt number"
    )
    receipt_file = models.FileField(
        upload_to='receipts/%Y/%m/',
        blank=True,
        null=True,
        help_text="Auto-generated receipt file"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        unique_together = ['tenant', 'unit', 'month_for']
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.tenant.user.full_name} - KES {self.amount_paid} ({self.status})"

    def clean(self):
        """Validate payment logic"""
        # Validate amount matches unit rent (Optional: could be moved to a warning or just removed)
        # We allow flexible payments now to prevent save() failures during admin approval
        pass
        
        # Prevent duplicate payment for same month
        existing_payment = Payment.objects.filter(
            tenant=self.tenant,
            unit=self.unit,
            month_for=self.month_for,
            status='PAID'
        ).exclude(id=self.id if self.id else None).first()
        
        if existing_payment:
            raise ValidationError({
                'month_for': f'Payment for {self.month_for.strftime("%B %Y")} has already been made for this unit.'
            })

    def save(self, *args, **kwargs):
        self.clean()
        
        # Set default due date to 5th of the month if not provided
        if not self.due_date:
            self.due_date = date(self.month_for.year, self.month_for.month, 5)

        # Auto-update status based on payment date vs due date
        if self.status == 'PENDING':
            today = date.today()
            
            if today > self.due_date:
                self.status = 'OVERDUE'
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if payment is overdue"""
        if self.status == 'PAID':
            return False
        
        today = date.today()
        # Fallback if due_date is somehow missing
        due = self.due_date if self.due_date else date(self.month_for.year, self.month_for.month, 5)
        return today > due

    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue:
            return 0
        
        today = date.today()
        due = self.due_date if self.due_date else date(self.month_for.year, self.month_for.month, 5)
        return (today - due).days


class PaymentEvidence(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='evidence'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_payment_evidence'
    )
    file = models.FileField(
        upload_to='payment_evidence/%Y/%m/',
        help_text="Payment screenshot or document"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Admin approval or rejection notes"
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_payment_evidence'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When admin reviewed the evidence"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_evidence'
        ordering = ['-created_at']

    def __str__(self):
        return f"Evidence for payment {self.payment.id} ({self.status})"


class Message(models.Model):
    """
    Message model for admin-tenant communication
    """
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_messages'
    )
    subject = models.CharField(max_length=200, help_text="Message subject")
    body = models.TextField(help_text="Message content")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'messages'
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['-timestamp']

    def __str__(self):
        return f"From {self.sender.full_name} to {self.receiver.full_name}: {self.subject}"

    def clean(self):
        """Validate message rules"""
        # Tenants can only message admins
        if self.sender.role == 'TENANT' and self.receiver.role != 'ADMIN':
            raise ValidationError({
                'receiver': 'Tenants can only send messages to admins.'
            })
        
        # Admins can message anyone
        if self.sender.role == 'ADMIN':
            pass  # Admins can message anyone
        
        # Prevent self-messaging
        if self.sender == self.receiver:
            raise ValidationError({
                'receiver': 'Cannot send message to yourself.'
            })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    @property
    def is_from_admin(self):
        """Check if message is from admin"""
        return self.sender.role == 'ADMIN'

    @property
    def is_to_admin(self):
        """Check if message is to admin"""
        return self.receiver.role == 'ADMIN'


class Notification(models.Model):
    """
    Notification model for system notifications
    """
    NOTIFICATION_TYPES = [
        ('OVERDUE_RENT', 'Overdue Rent'),
        ('MESSAGE_RECEIVED', 'Message Received'),
        ('UNIT_ASSIGNED', 'Unit Assigned'),
        ('RENT_DUE', 'Rent Due'),
        ('PAYMENT_CONFIRMED', 'Payment Confirmed'),
        ('MAINTENANCE_REQUEST', 'Maintenance Request'),
        ('SYSTEM_ANNOUNCEMENT', 'System Announcement'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPES,
        default='SYSTEM_ANNOUNCEMENT'
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional related objects
    related_payment = models.ForeignKey(
        Payment, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='notifications'
    )
    related_message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='notifications'
    )
    related_tenant = models.ForeignKey(
        'TenantProfile', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='notifications'
    )

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name}: {self.title}"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    @classmethod
    def create_notification(cls, user, title, message, notification_type='SYSTEM_ANNOUNCEMENT', 
                         related_payment=None, related_message=None, related_tenant=None):
        """Create a notification"""
        return cls.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            related_payment=related_payment,
            related_message=related_message,
            related_tenant=related_tenant
        )


# ==================== SIGNALS FOR AUTOMATIC NOTIFICATIONS ====================

@receiver(post_save, sender=Message)
def create_message_notification(sender, instance, created, **kwargs):
    """Create notification when message is sent"""
    if created:
        Notification.create_notification(
            user=instance.receiver,
            title=f"New Message from {instance.sender.full_name}",
            message=f"Subject: {instance.subject}",
            notification_type='MESSAGE_RECEIVED',
            related_message=instance
        )


@receiver(post_save, sender=Payment)
def create_payment_notification(sender, instance, created, **kwargs):
    """Create notification when payment status changes or is created"""
    if created and instance.status == 'PENDING':
        # Notify all admins about the new payment
        admins = User.objects.filter(role='ADMIN')
        for admin in admins:
            Notification.create_notification(
                user=admin,
                title="New Payment Submission",
                message=f"Tenant {instance.tenant.user.full_name} has submitted a payment of KES {instance.amount_paid} for {instance.month_for.strftime('%B %Y')}.",
                notification_type='SYSTEM_ANNOUNCEMENT',
                related_payment=instance
            )
            
    if instance.status == 'OVERDUE':
        Notification.create_notification(
            user=instance.tenant.user,
            title="Rent Overdue",
            message=f"Your rent payment for {instance.month_for.strftime('%B %Y')} is overdue by {instance.days_overdue} days.",
            notification_type='OVERDUE_RENT',
            related_payment=instance
        )
    elif instance.status == 'PAID' and created:
        Notification.create_notification(
            user=instance.tenant.user,
            title="Payment Confirmed",
            message=f"Your rent payment for {instance.month_for.strftime('%B %Y')} has been confirmed.",
            notification_type='PAYMENT_CONFIRMED',
            related_payment=instance
        )


@receiver(post_save, sender=TenantProfile)
def create_tenant_assignment_notification(sender, instance, created, **kwargs):
    """Create notification when tenant is assigned to unit"""
    if not created and instance.assigned_unit:
        # Check if this is a new assignment
        try:
            old_instance = TenantProfile.objects.get(pk=instance.pk)
            if old_instance.assigned_unit != instance.assigned_unit:
                Notification.create_notification(
                    user=instance.user,
                    title="Unit Assignment",
                    message=f"You have been assigned to {instance.assigned_unit.unit_number} at {instance.assigned_unit.property_obj.name}.",
                    notification_type='UNIT_ASSIGNED',
                    related_tenant=instance
                )
        except TenantProfile.DoesNotExist:
            # This is a new tenant profile with assignment
            if instance.assigned_unit:
                Notification.create_notification(
                    user=instance.user,
                    title="Unit Assignment",
                    message=f"You have been assigned to {instance.assigned_unit.unit_number} at {instance.assigned_unit.property_obj.name}.",
                    notification_type='UNIT_ASSIGNED',
                    related_tenant=instance
                )


class Lease(models.Model):
    """
    Explicit Lease model representing the contract
    """
    tenant = models.ForeignKey(
        TenantProfile,
        on_delete=models.CASCADE,
        related_name='leases'
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='leases'
    )
    start_date = models.DateField(help_text="Lease start date")
    end_date = models.DateField(help_text="Lease end date")
    rent_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)]
    )
    lease_document = models.FileField(
        upload_to='leases/%Y/%m/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_leases'
        ordering = ['-start_date']

    def __str__(self):
        return f"Lease - {self.tenant.user.full_name} ({self.unit.unit_number})"

    @property
    def days_remaining(self):
        if not self.end_date:
            return 0
        from datetime import date
        today = date.today()
        days = (self.end_date - today).days
        return max(0, days)
