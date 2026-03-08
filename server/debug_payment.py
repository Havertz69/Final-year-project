import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from properties.models import Payment, TenantProfile
from django.utils import timezone

try:
    p = TenantProfile.objects.first()
    print("Testing payment creation for:", p)
    res = Payment.objects.create(
        tenant=p,
        unit=p.assigned_unit,
        amount_paid=15000,
        month_for=timezone.now().date(),
        payment_method="CASH",
        status="PENDING"
    )
    print("Success! Created payment:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
