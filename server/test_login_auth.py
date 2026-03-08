import os
import django
import sys

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

def test_login(email, password):
    print(f"--- Testing Login for {email} ---")
    try:
        user_obj = User.objects.get(email=email)
        print(f"User found: {user_obj.email}, Active: {user_obj.is_active}")
    except User.DoesNotExist:
        print(f"User {email} NOT FOUND")
        return

    user = authenticate(username=email, password=password)
    if user:
        print(f"AUTHENTICATION SUCCESS: {user.email}")
    else:
        print("AUTHENTICATION FAILED")

if __name__ == "__main__":
    # Test with bale11@gmail.com - I don't know the password, let's reset it to 'password123' for testing
    email = 'bale11@gmail.com'
    try:
        u = User.objects.get(email=email)
        u.set_password('password123')
        u.save()
        print(f"Password reset for {email} to 'password123'")
        test_login(email, 'password123')
    except User.DoesNotExist:
        print(f"User {email} not found to reset password")
