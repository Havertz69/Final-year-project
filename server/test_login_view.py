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

def test_login_view(email, password):
    print(f"--- Testing LoginView for {email} ---")
    factory = APIRequestFactory()
    request = factory.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    
    view = LoginView.as_view()
    response = view(request)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")

if __name__ == "__main__":
    email = 'bale11@gmail.com'
    test_login_view(email, 'password123')
    
    # Also test with a non-existent user
    test_login_view('nonexistent@example.com', 'somepassword')
