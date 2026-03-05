from django.contrib import admin
from .models import Property, Unit, TenantProfile, Payment, Message, Notification, Lease, MaintenanceRequest


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'created_by', 'total_units', 'occupied_units', 'created_at')
    list_filter = ('created_at', 'created_by')
    search_fields = ('name', 'location', 'description')
    readonly_fields = ('created_at', 'updated_at')
    
    def total_units(self, obj):
        return obj.units.count()
    total_units.short_description = 'Total Units'
    
    def occupied_units(self, obj):
        return obj.units.filter(is_occupied=True).count()
    occupied_units.short_description = 'Occupied Units'


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'property_obj', 'rent_amount', 'is_occupied', 'current_tenant', 'created_at')
    list_filter = ('is_occupied', 'property_obj', 'created_at')
    search_fields = ('unit_number', 'property_obj__name', 'property_obj__location')
    readonly_fields = ('created_at', 'updated_at')
    
    def current_tenant(self, obj):
        tenant = obj.current_tenant
        return tenant.user.full_name if tenant else 'Vacant'
    current_tenant.short_description = 'Current Tenant'


@admin.register(TenantProfile)
class TenantProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'assigned_unit', 'move_in_date', 'lease_end_date', 'created_at')
    list_filter = ('move_in_date', 'lease_end_date', 'assigned_unit__property_obj')
    search_fields = ('user__email', 'user__full_name', 'assigned_unit__unit_number')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'assigned_unit', 'assigned_unit__property_obj')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('tenant_name', 'unit_number', 'amount_paid', 'month_for', 'status', 'payment_date', 'payment_method')
    list_filter = ('status', 'payment_method', 'payment_date', 'month_for', 'unit__property_obj')
    search_fields = ('tenant__user__full_name', 'tenant__user__email', 'unit__unit_number', 'transaction_reference')
    readonly_fields = ('created_at', 'updated_at')
    
    def tenant_name(self, obj):
        return obj.tenant.user.full_name
    tenant_name.short_description = 'Tenant'
    
    def unit_number(self, obj):
        return f"{obj.unit.unit_number} - {obj.unit.property_obj.name}"
    unit_number.short_description = 'Unit'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'tenant__user', 'unit__property_obj'
        )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'subject', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp', 'sender__role', 'receiver__role')
    search_fields = ('subject', 'body', 'sender__full_name', 'receiver__full_name')
    readonly_fields = ('timestamp', 'read_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('sender', 'receiver')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter = ('is_read', 'notification_type', 'created_at')
    search_fields = ('title', 'message', 'user__full_name', 'user__email')
    readonly_fields = ('created_at', 'read_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'start_date', 'end_date', 'rent_amount', 'deposit', 'days_remaining')
    list_filter = ('start_date', 'end_date', 'unit__property_obj')
    search_fields = ('tenant__user__full_name', 'unit__unit_number')
    readonly_fields = ('created_at', 'updated_at')

    def days_remaining(self, obj):
        return obj.days_remaining
    days_remaining.short_description = 'Days Left'


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'tenant', 'unit', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'unit__property_obj')
    search_fields = ('title', 'description', 'tenant__user__full_name')
    readonly_fields = ('created_at', 'updated_at')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('tenant__user', 'unit__property_obj')

