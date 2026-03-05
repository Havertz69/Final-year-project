#!/usr/bin/env python
"""
Test authentication flow
"""
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
from accounts.serializers import UserLoginSerializer

def test_auth():
    print("=== Testing Authentication Flow ===")
    
    # Test data
    test_data = {
        'email': 'eric@gmail.com',
        'password': 'TestPass123'
    }
    
    print(f"Test data: {test_data}")
    
    # Test serializer
    serializer = UserLoginSerializer(data=test_data)
    
    if serializer.is_valid():
        print("✅ Serializer is valid")
        user = serializer.validated_data['user']
        print(f"✅ Authenticated user: {user.email}")
        print(f"✅ User role: {user.role}")
        print(f"✅ User active: {user.is_active}")
    else:
        print("❌ Serializer validation failed:")
        print(serializer.errors)
    
    # Test direct authentication
    user = authenticate(username='eric@gmail.com', password='TestPass123')
    print(f"Direct auth result: {user}")
    
    if user:
        print("✅ Direct authentication works")
    else:
        print("❌ Direct authentication failed")

if __name__ == '__main__':
    test_auth()
