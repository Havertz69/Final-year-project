from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(post_save, sender=User)
def set_user_staff_status(sender, instance, created, **kwargs):
    """
    Automatically set is_staff to True for ADMIN users
    """
    if instance.role == 'ADMIN' and not instance.is_staff:
        instance.is_staff = True
        instance.save(update_fields=['is_staff'])
