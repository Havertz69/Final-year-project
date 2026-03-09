from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from .models import Property, Unit, TenantProfile, Payment, Message, Notification, MaintenanceRequest, PaymentEvidence, LeaseDocument, Lease

User = get_user_model()



class PropertySerializer(serializers.ModelSerializer):
    """Serializer for Property model"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    total_units = serializers.ReadOnlyField()
    occupied_units = serializers.ReadOnlyField()
    vacant_units = serializers.ReadOnlyField()

    class Meta:
        model = Property
        fields = [
            'id', 'name', 'location', 'description', 'created_by', 'created_by_name',
            'total_units', 'occupied_units', 'vacant_units', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Automatically set created_by to current user"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class UnitSerializer(serializers.ModelSerializer):
    """Serializer for Unit model"""
    property_name = serializers.CharField(source='property_obj.name', read_only=True)
    property_location = serializers.CharField(source='property_obj.location', read_only=True)
    current_tenant_name = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id', 'property_obj', 'property_name', 'property_location', 'unit_number',
            'rent_amount', 'is_occupied', 'current_tenant_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_occupied', 'created_at', 'updated_at']

    def get_current_tenant_name(self, obj):
        """Get current tenant name for this unit"""
        tenant = obj.current_tenant
        return tenant.user.full_name if tenant else None

    def validate(self, attrs):
        """Validate that unit_number is unique within the property"""
        property_obj = attrs.get('property_obj')
        unit_number = attrs.get('unit_number')
        
        # Check for existing unit with same number in same property
        existing_unit = Unit.objects.filter(
            property_obj=property_obj,
            unit_number=unit_number
        ).first()
        
        if existing_unit and (not self.instance or existing_unit.id != self.instance.id):
            raise serializers.ValidationError({
                'unit_number': f'Unit number {unit_number} already exists in this property.'
            })
        
        return attrs


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property_obj.name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'title', 'description', 'image', 'image_url', 'status', 'priority', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class MaintenanceRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = ['title', 'description', 'image', 'priority']


class MaintenanceRequestAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = ['status', 'priority']


class PaymentEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = PaymentEvidence
        fields = [
            'id', 'payment', 'uploaded_by', 'uploaded_by_name', 'file', 'file_url',
            'status', 'admin_notes', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'uploaded_by_name', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class PaymentEvidenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentEvidence
        fields = ['payment', 'file']

    def validate_payment(self, value):
        if value.tenant.user != self.context['request'].user:
            raise serializers.ValidationError("You can only upload evidence for your own payments.")
        return value


class PaymentEvidenceAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentEvidence
        fields = ['status', 'admin_notes']


class LeaseDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = LeaseDocument
        fields = ['id', 'tenant', 'file', 'file_url', 'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class LeaseDocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaseDocument
        fields = ['tenant', 'file']

    def validate_tenant(self, value):
        if not value.assigned_unit:
            raise serializers.ValidationError("Tenant must have an assigned unit to upload a lease document.")
        return value


class TenantProfileSerializer(serializers.ModelSerializer):
    """Serializer for TenantProfile model"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    unit_info = serializers.SerializerMethodField()

    class Meta:
        model = TenantProfile
        fields = [
            'id', 'user', 'user_email', 'user_full_name', 'assigned_unit',
            'unit_info', 'move_in_date', 'lease_end_date', 'security_deposit', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_unit_info(self, obj):
        """Get detailed unit information"""
        if obj.assigned_unit:
            return {
                'id': obj.assigned_unit.id,
                'unit_number': obj.assigned_unit.unit_number,
                'property_name': obj.assigned_unit.property_obj.name,
                'property_location': obj.assigned_unit.property_obj.location,
                'rent_amount': obj.assigned_unit.rent_amount
            }
        return None

    def validate(self, attrs):
        """Validate business rules"""
        assigned_unit = attrs.get('assigned_unit')
        
        if assigned_unit and assigned_unit.is_occupied:
            # Check if this unit is already occupied by another tenant
            existing_tenant = TenantProfile.objects.filter(
                assigned_unit=assigned_unit
            ).exclude(id=self.instance.id if self.instance else None).first()
            
            if existing_tenant:
                raise serializers.ValidationError({
                    'assigned_unit': 'This unit is already occupied by another tenant.'
                })
        
        # Validate dates
        move_in_date = attrs.get('move_in_date')
        lease_end_date = attrs.get('lease_end_date')
        
        if move_in_date and lease_end_date:
            if lease_end_date <= move_in_date:
                raise serializers.ValidationError({
                    'lease_end_date': 'Lease end date must be after move-in date.'
                })
        
        return attrs


class TenantAssignmentSerializer(serializers.ModelSerializer):
    """Simplified serializer for assigning tenants to units"""
    user_email = serializers.EmailField(write_only=True)
    unit_id = serializers.IntegerField(write_only=True)
    move_in_date = serializers.DateField(write_only=True)
    lease_end_date = serializers.DateField(write_only=True, required=False)
    security_deposit = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)

    class Meta:
        model = TenantProfile
        fields = ['user_email', 'unit_id', 'move_in_date', 'lease_end_date', 'security_deposit']

    def validate_user_email(self, value):
        """Validate that user exists and is a tenant"""
        try:
            user = User.objects.get(email=value, role='TENANT')
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found or is not a tenant.")

    def validate_unit_id(self, value):
        """Validate that unit exists and is not occupied"""
        try:
            unit = Unit.objects.get(id=value)
            if unit.is_occupied:
                raise serializers.ValidationError("This unit is already occupied.")
            return unit
        except Unit.DoesNotExist:
            raise serializers.ValidationError("Unit not found.")

    def validate(self, attrs):
        """Validate dates"""
        move_in_date = attrs.get('move_in_date')
        lease_end_date = attrs.get('lease_end_date')
        
        if lease_end_date and lease_end_date <= move_in_date:
            raise serializers.ValidationError({
                'lease_end_date': 'Lease end date must be after move-in date.'
            })
        
        return attrs

    def create(self, validated_data):
        """Create or update tenant profile"""
        user = validated_data.pop('user_email')
        unit = validated_data.pop('unit_id')
        
        # Get or create tenant profile
        tenant_profile, created = TenantProfile.objects.get_or_create(
            user=user,
            defaults=validated_data
        )
        
        if not created:
            # Update existing tenant profile
            tenant_profile.assigned_unit = unit
            tenant_profile.move_in_date = validated_data.get('move_in_date')
            tenant_profile.lease_end_date = validated_data.get('lease_end_date')
            
            if 'security_deposit' in validated_data:
                tenant_profile.security_deposit = validated_data.get('security_deposit')
                
            tenant_profile.save()
        
        return tenant_profile


class PropertyDetailSerializer(PropertySerializer):
    """Detailed property serializer with units"""
    units = UnitSerializer(many=True, read_only=True)

    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ['units']


class UnitDetailSerializer(UnitSerializer):
    """Detailed unit serializer with property and tenant info"""
    property_obj = PropertySerializer(read_only=True)
    current_tenant = TenantProfileSerializer(read_only=True)

    class Meta(UnitSerializer.Meta):
        fields = UnitSerializer.Meta.fields + ['property_obj', 'current_tenant']


# ==================== PAYMENT SERIALIZERS ====================

class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model"""
    tenant_name = serializers.CharField(source='tenant.user.full_name', read_only=True)
    tenant_email = serializers.CharField(source='tenant.user.email', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property_obj.name', read_only=True)
    month_for_formatted = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Payment
        fields = [
            'id', 'tenant', 'tenant_name', 'tenant_email', 'unit', 'unit_number',
            'property_name', 'amount_paid', 'payment_date', 'month_for', 'month_for_formatted',
            'due_date', 'payment_method', 'status', 'transaction_reference', 'is_overdue', 'days_overdue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_month_for_formatted(self, obj):
        """Format month for display"""
        return obj.month_for.strftime('%B %Y')

    def validate(self, attrs):
        """Validate payment logic"""
        unit = attrs.get('unit')
        amount_paid = attrs.get('amount_paid')
        month_for = attrs.get('month_for')
        
        # Validate amount matches unit rent (Relaxed: allow flexible payments)
        # if unit and amount_paid and amount_paid != unit.rent_amount:
        #     raise serializers.ValidationError({
        #         'amount_paid': f'Amount must match unit rent of {unit.rent_amount}'
        #     })
        
        # Prevent duplicate payment for same month (Reduced to warning or keep as is for data integrity)
        if self.instance:
            existing_payment = Payment.objects.filter(
                unit=unit,
                month_for=month_for,
                status='PAID'
            ).exclude(id=self.instance.id).first()
        else:
            existing_payment = Payment.objects.filter(
                unit=unit,
                month_for=month_for,
                status='PAID'
            ).first()
        
        if existing_payment:
            raise serializers.ValidationError({
                'month_for': f'Payment for {month_for.strftime("%B %Y")} has already been made for this unit.'
            })
        
        return attrs


class PaymentCreateSerializer(PaymentSerializer):
    """Serializer for creating payments (admin only)"""
    class Meta(PaymentSerializer.Meta):
        fields = PaymentSerializer.Meta.fields
    
    def create(self, validated_data):
        """Create payment with automatic status calculation"""
        payment = Payment.objects.create(**validated_data)
        return payment


class TenantPaymentSerializer(serializers.ModelSerializer):
    """Simplified payment serializer for tenant views"""
    month_for_formatted = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    evidence = PaymentEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'amount_paid', 'payment_date', 'month_for', 'month_for_formatted', 'due_date',
            'payment_method', 'status', 'transaction_reference', 'is_overdue', 'days_overdue',
            'evidence', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


    def get_month_for_formatted(self, obj):
        """Format month for display"""
        return obj.month_for.strftime('%B %Y')


class PaymentStatsSerializer(serializers.Serializer):
    """Serializer for payment statistics"""
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_payments = serializers.IntegerField()
    pending_payments = serializers.IntegerField()
    overdue_payments = serializers.IntegerField()
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class PaymentFilterSerializer(serializers.Serializer):
    """Serializer for payment filtering"""
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    year = serializers.IntegerField(required=False, min_value=2020, max_value=2030)
    tenant_id = serializers.IntegerField(required=False)
    property_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(
        choices=['PENDING', 'PAID', 'OVERDUE'],
        required=False
    )


# ==================== MESSAGING SERIALIZERS ====================

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    receiver_name = serializers.CharField(source='receiver.full_name', read_only=True)
    receiver_role = serializers.CharField(source='receiver.role', read_only=True)
    is_from_admin = serializers.ReadOnlyField()
    is_to_admin = serializers.ReadOnlyField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'sender_role', 'receiver', 
            'receiver_name', 'receiver_role', 'subject', 'body', 
            'timestamp', 'is_read', 'read_at', 'is_from_admin', 'is_to_admin'
        ]
        read_only_fields = ['id', 'sender', 'timestamp', 'is_read', 'read_at']
    
    def validate(self, attrs):
        """Validate message rules"""
        receiver = attrs.get('receiver')
        sender = self.context.get('request').user
        
        # Tenants can only message admins
        if sender.role == 'TENANT' and receiver.role != 'ADMIN':
            raise serializers.ValidationError({
                'receiver': 'Tenants can only send messages to admins.'
            })
        
        # Prevent self-messaging
        if sender == receiver:
            raise serializers.ValidationError({
                'receiver': 'Cannot send message to yourself.'
            })
        
        return attrs


class MessageCreateSerializer(MessageSerializer):
    """Serializer for creating messages"""
    class Meta(MessageSerializer.Meta):
        fields = [
            'receiver', 'subject', 'body'
        ]
    
    def create(self, validated_data):
        """Create message with sender from request"""
        sender = self.context['request'].user
        validated_data['sender'] = sender
        
        message = Message.objects.create(**validated_data)
        return message


class ConversationSerializer(serializers.Serializer):
    """Serializer for conversation list"""
    partner_id = serializers.IntegerField()
    partner_name = serializers.CharField()
    partner_role = serializers.CharField()
    last_message = MessageSerializer(read_only=True)
    unread_count = serializers.IntegerField()


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'notification_type_display',
            'is_read', 'read_at', 'created_at', 'time_ago',
            'related_payment', 'related_message', 'related_tenant'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        """Get human-readable time ago"""
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class NotificationActionSerializer(serializers.Serializer):
    """Serializer for notification actions"""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read (optional, marks all if not provided)"
    )
    action = serializers.ChoiceField(
        choices=['mark_read', 'mark_all_read'],
        default='mark_read'
    )


class UserSerializer(serializers.ModelSerializer):
    """Simple user serializer for messaging"""
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'role']


class MessageListSerializer(serializers.ModelSerializer):
    """Simplified message serializer for list views"""
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.full_name', read_only=True)
    is_from_me = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender_name', 'receiver_name', 'subject', 
            'timestamp', 'is_read', 'is_from_me'
        ]
    
    def get_is_from_me(self, obj):
        """Check if message is from current user"""
        request = self.context.get('request')
        return obj.sender == request.user if request else False


class LeaseSerializer(serializers.ModelSerializer):
    """Read-only serializer for the Lease model"""
    days_remaining = serializers.ReadOnlyField()
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property_obj.name', read_only=True)
    lease_document_url = serializers.SerializerMethodField()

    class Meta:
        model = Lease
        fields = [
            'id', 'unit_number', 'property_name',
            'start_date', 'end_date', 'rent_amount', 'deposit',
            'lease_document_url', 'days_remaining',
        ]

    def get_lease_document_url(self, obj):
        if obj.lease_document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.lease_document.url)
        return None


class TenantFullProfileSerializer(serializers.ModelSerializer):
    """
    Full profile serializer used by the tenant profile page.
    Returns personal info, unit info, and the active Lease record.
    """
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    unit_info = serializers.SerializerMethodField()
    lease = serializers.SerializerMethodField()

    class Meta:
        model = TenantProfile
        fields = [
            'id', 'email', 'full_name', 'phone_number',
            'move_in_date', 'lease_end_date', 'security_deposit',
            'unit_info', 'lease',
        ]

    def get_unit_info(self, obj):
        u = obj.assigned_unit
        if u:
            return {
                'id': u.id,
                'unit_number': u.unit_number,
                'property_name': u.property_obj.name,
                'property_location': u.property_obj.location,
                'rent_amount': float(u.rent_amount),
            }
        return None

    def get_lease(self, obj):
        """Return the most recent active Lease attached to this profile."""
        lease = obj.leases.order_by('-start_date').first()
        if lease:
            return LeaseSerializer(lease, context=self.context).data
        return None

