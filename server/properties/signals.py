from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Unit, TenantProfile, MaintenanceRequest, Notification, PaymentEvidence, Payment



@receiver(post_save, sender=TenantProfile)
def update_unit_occupancy_on_tenant_save(sender, instance, created, **kwargs):
    """
    Update unit occupancy when tenant profile is saved
    """
    if instance.assigned_unit:
        instance.assigned_unit.is_occupied = True
        instance.assigned_unit.save(update_fields=['is_occupied'])


@receiver(post_delete, sender=TenantProfile)
def update_unit_occupancy_on_tenant_delete(sender, instance, **kwargs):
    """
    Update unit occupancy when tenant profile is deleted
    """
    if instance.assigned_unit:
        instance.assigned_unit.is_occupied = False
        instance.assigned_unit.save(update_fields=['is_occupied'])


# ---- Store the previous status before save ----
@receiver(pre_save, sender=MaintenanceRequest)
def store_old_maintenance_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = MaintenanceRequest.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except MaintenanceRequest.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=MaintenanceRequest)
def notify_maintenance_status_change(sender, instance, created, **kwargs):
    """
    Notify tenant when maintenance request status changes
    """
    if created:
        Notification.create_notification(
            user=instance.tenant.user,
            title="Maintenance Request Submitted",
            message=f"Your request '{instance.title}' has been submitted and is pending review.",
            notification_type='MAINTENANCE_REQUEST',
        )
    else:
        old_status = getattr(instance, '_old_status', None)
        if old_status and old_status != instance.status:
            status_labels = {
                'IN_PROGRESS': 'is now in progress',
                'RESOLVED': 'has been resolved',
                'PENDING': 'has been reset to pending',
            }
            label = status_labels.get(instance.status, f'changed to {instance.status}')
            Notification.create_notification(
                user=instance.tenant.user,
                title="Maintenance Update",
                message=f"Your request '{instance.title}' {label}.",
                notification_type='MAINTENANCE_REQUEST',
            )



@receiver(pre_save, sender=PaymentEvidence)
def store_old_evidence_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = PaymentEvidence.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except PaymentEvidence.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=PaymentEvidence)
def handle_payment_evidence_review(sender, instance, created, **kwargs):
    """
    Update payment status when evidence is approved and notify tenant
    """
    if not created:
        old_status = getattr(instance, '_old_status', None)
        if old_status != instance.status:
            if instance.status == 'APPROVED':
                # Mark payment as PAID
                payment = instance.payment
                payment.status = 'PAID'
                payment.save(update_fields=['status'])
                
                # Notify tenant
                Notification.create_notification(
                    user=instance.uploaded_by,
                    title="Payment Approved",
                    message=f"Your payment evidence for {payment.month_for.strftime('%B %Y')} has been approved.",
                    notification_type='PAYMENT_RECEIVED',
                    related_payment=payment
                )
            elif instance.status == 'REJECTED':
                # Notify tenant
                Notification.create_notification(
                    user=instance.uploaded_by,
                    title="Payment Evidence Rejected",
                    message=f"Your payment proof for {instance.payment.month_for.strftime('%B %Y')} was rejected. Reason: {instance.admin_notes or 'No reason provided'}",
                    notification_type='PAYMENT_FAILED',
                    related_payment=instance.payment
                )

