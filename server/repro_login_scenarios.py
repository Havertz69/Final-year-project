import os
import django
import sys
import json

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from accounts.views import LoginView

User = get_user_model()

def test_login_scenario(email, password, description):
    print(f"\n--- Scenario: {description} ({email}) ---")
    factory = APIRequestFactory()
    request = factory.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    
    view = LoginView.as_view()
    try:
        response = view(request)
        print(f"Status Code: {response.status_code}")
        print(f"Response Data: {json.dumps(response.data, indent=2)}")
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

if __name__ == "__main__":
    # 1. Successful login (using the password I reset earlier)
    test_login_scenario('bale11@gmail.com', 'password123', 'Correct credentials')
    
    # 2. Wrong password
    test_login_scenario('bale11@gmail.com', 'wrongpassword', 'Wrong password')
    
    # 3. Non-existent user
    test_login_scenario('nonexistent@example.com', 'password', 'Non-existent user')
    
    # 4. Empty email
    test_login_scenario('', 'password', 'Empty email')
    
    # 5. Inactive user
    email_inactive = 'inactive@example.com'
    User.objects.filter(email=email_inactive).delete()
    User.objects.create_user(email=email_inactive, full_name='Inactive User', password='password', is_active=False)
    test_login_scenario(email_inactive, 'password', 'Inactive user')
