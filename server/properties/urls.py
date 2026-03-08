from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import viewsets

app_name = 'properties'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'messages', viewsets.MessageViewSet, basename='message')
router.register(r'notifications', viewsets.NotificationViewSet, basename='notification')

urlpatterns = [
    # Property URLs
    path('properties/', views.PropertyListCreateView.as_view(), name='property-list-create'),
    path('properties/<int:pk>/', views.PropertyDetailView.as_view(), name='property-detail'),
    path('properties/<int:property_id>/units/', views.PropertyUnitsView.as_view(), name='property-units'),
    
    # Unit URLs
    path('units/', views.UnitListCreateView.as_view(), name='unit-list-create'),
    path('units/<int:pk>/', views.UnitDetailView.as_view(), name='unit-detail'),
    
    # Tenant URLs
    path('tenants/', views.TenantListCreateView.as_view(), name='tenant-list-create'),
    path('tenants/<int:pk>/', views.TenantDetailView.as_view(), name='tenant-detail'),
    
    # Assignment URLs (Admin only)
    path('assign-tenant/', views.assign_tenant_to_unit, name='assign-tenant'),
    path('unassign-tenant/<int:tenant_id>/', views.unassign_tenant_from_unit, name='unassign-tenant'),
    
    # Tenant-specific URLs
    path('my-unit/', views.tenant_assigned_unit, name='tenant-unit'),
    path('my-property/', views.tenant_property_details, name='tenant-property'),
    
    # Payment URLs
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list-create'),
    path('payments/<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('payments/<int:payment_id>/confirm/', views.confirm_payment, name='confirm-payment'),
    path('payments/statistics/', views.payment_statistics, name='payment-statistics'),
    
    # Tenant payment URLs
    path('my-payments/', views.tenant_payment_history, name='tenant-payments'),
    path('my-rent-status/', views.tenant_current_rent_status, name='tenant-rent-status'),
    
    # Smart Features URLs
    path('smart/trigger-overdue-check/', views.trigger_overdue_check, name='trigger-overdue-check'),
    path('smart/trigger-rent-reminders/', views.trigger_rent_due_reminders, name='trigger-rent-reminders'),
    path('smart/monthly-report/', views.generate_monthly_report, name='monthly-report'),
    path('smart/property-report/<int:property_id>/', views.generate_property_report, name='property-report'),
    path('smart/dashboard/', views.dashboard_summary, name='dashboard-summary'),
    path('smart/health-check/', views.system_health_check, name='health-check'),
    
    # Download Receipt
    path('payments/<int:pk>/receipt/', views.download_payment_receipt, name='download-payment-receipt'),

    # Maintenance Requests
    path('my-maintenance/', views.TenantMaintenanceRequestListCreateView.as_view(), name='tenant-maintenance'),
    path('maintenance/', views.AdminMaintenanceRequestListView.as_view(), name='admin-maintenance-list'),
    path('maintenance/<int:pk>/', views.AdminMaintenanceRequestUpdateView.as_view(), name='admin-maintenance-update'),

    # Payment Evidence
    path('my-payment-evidence/', views.TenantPaymentEvidenceListCreateView.as_view(), name='tenant-payment-evidence'),
    path('payment-evidence/', views.AdminPaymentEvidenceListView.as_view(), name='admin-payment-evidence-list'),
    path('payment-evidence/<int:pk>/', views.AdminPaymentEvidenceUpdateView.as_view(), name='admin-payment-evidence-update'),
    path('payments/<int:payment_id>/evidence/', views.tenant_payment_evidence, name='tenant-payment-evidence-detail'),
    path('admin/payments/<int:payment_id>/evidence/', views.admin_payment_evidence, name='admin-payment-evidence-detail'),

    # Lease Documents
    path('my-lease-document/', views.tenant_lease_document, name='tenant-lease-document'),
    path('lease-documents/', views.AdminLeaseDocumentListView.as_view(), name='admin-lease-documents'),
    path('lease-documents/create/', views.AdminLeaseDocumentCreateView.as_view(), name='admin-lease-document-create'),

    # Notifications
    path('my-notifications/', views.tenant_notifications, name='tenant-notifications'),
    path('my-notifications/mark-read/', views.mark_notifications_read, name='mark-notifications-read'),

    # Profile Management
    path('my-profile/update/', views.tenant_update_profile, name='tenant-update-profile'),
    path('my-profile/change-password/', views.tenant_change_password, name='tenant-change-password'),
    
    # ViewSet URLs (for messaging and notifications)
    path('', include(router.urls)),
    
    # Admin dashboard (legacy)
    path('dashboard-stats/', views.admin_dashboard_stats, name='dashboard-stats'),

    # Reports & Analytics (Admin)
    path('reports/revenue-trends/', views.revenue_trends, name='revenue-trends'),
    path('reports/export-csv/', views.export_payments_csv, name='export-payments-csv'),

    # ==================== TENANT PORTAL V2 ====================
    # Dashboard
    path('tenant/dashboard/', views.TenantDashboardAPIView.as_view(), name='tenant-dashboard-v2'),

    # Payments V2
    path('tenant/payments/', views.TenantPaymentListView.as_view(), name='tenant-payments-v2'),
    path('tenant/payments/<int:pk>/', views.TenantPaymentDetailView.as_view(), name='tenant-payment-detail-v2'),
    path('tenant/payments/<int:pk>/receipt/', views.download_payment_receipt, name='tenant-payment-receipt-v2'),
    path('tenant/payments/pay/', views.tenant_pay_payment, name='tenant-pay-payment'),
    path('tenant/payments/submit/', views.tenant_submit_payment, name='tenant-submit-payment'),
    
    # Legacy Tenant Payments
    path('my-payments/submit/', views.tenant_submit_payment, name='tenant-submit-payment-legacy'),

    # Lease V2
    path('tenant/lease/', views.TenantLeaseView.as_view(), name='tenant-lease-v2'),
    path('tenant/lease/document/', views.tenant_lease_document, name='tenant-lease-document-v2'),

    # Maintenance V2
    path('tenant/maintenance/', views.TenantMaintenanceRequestListCreateView.as_view(), name='tenant-maintenance-v2'),
    path('tenant/maintenance/<int:pk>/', views.TenantMaintenanceDetailView.as_view(), name='tenant-maintenance-detail-v2'),

    # Notifications V2
    path('tenant/notifications/', views.tenant_notifications, name='tenant-notifications-v2'),
    path('tenant/notifications/<int:pk>/read/', views.tenant_notification_read, name='tenant-notification-read-v2'),

    # Profile V2 — returns profile + unit + active lease
    path('tenant/profile/', views.tenant_full_profile, name='tenant-profile-v2'),
]


