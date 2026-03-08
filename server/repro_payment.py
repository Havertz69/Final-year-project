import os
import django
import sys
from datetime import date

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import TenantProfile, Payment
from django.core.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate
from properties.views import tenant_submit_payment

User = get_user_model()

def repro_payment_failure():
    print("=== Reproducing Payment Submission Issue ===")
    
    # Get a tenant user
    try:
        user = User.objects.get(email='bale11@gmail.com')
        print(f"Found user: {user.email}")
    except User.DoesNotExist:
        print("User bale11@gmail.com not found.")
        return

    factory = APIRequestFactory()
    
    # Test 1: Submit payment with correct amount
    print("\nTest 1: Normal payment submission")
    month_str = '2026-04-01'
    data = {
        'amount_paid': '1.00', # Wait, what is the rent for A1?
        'month_for': month_str,
        'payment_method': 'BANK_TRANSFER',
        'transaction_reference': 'TEST12345'
    }
    
    # Try to get rent amount from profile
    profile = TenantProfile.objects.get(user=user)
    if profile.assigned_unit:
        data['amount_paid'] = str(profile.assigned_unit.rent_amount)
        print(f"Using actual rent: {data['amount_paid']}")
    
    request = factory.post('/api/my-payments/submit/', data)
    force_authenticate(request, user=user)
    
    response = tenant_submit_payment(request)
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")

    # Test 2: Submit payment with wrong amount
    print("\nTest 2: Wrong amount submission")
    data['amount_paid'] = '999999.99'
    data['month_for'] = '2026-05-01'
    request = factory.post('/api/my-payments/submit/', data)
    force_authenticate(request, user=user)
    response = tenant_submit_payment(request)
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")

if __name__ == "__main__":
    repro_payment_failure()
