import os
import django
import sys

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import TenantProfile, Payment

User = get_user_model()

def check_data():
    print("--- Users ---")
    users = User.objects.all()
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Name: {u.full_name}")

    print("\n--- Tenant Profiles ---")
    profiles = TenantProfile.objects.all()
    for p in profiles:
        print(f"ID: {p.id}, User: {p.user.email}, Unit: {p.assigned_unit}")

    print("\n--- Recent Payments ---")
    payments = Payment.objects.all().order_by('-created_at')[:10]
    for p in payments:
        print(f"ID: {p.id}, Tenant: {p.tenant.user.email}, Amount: {p.amount_paid}, Month: {p.month_for}, Status: {p.status}")

if __name__ == "__main__":
    check_data()
