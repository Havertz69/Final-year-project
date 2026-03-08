import os
import django
import sys

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from accounts.models import User
from django.db import IntegrityError, connection

def repro():
    print("Attempting to create user...")
    try:
        user = User.objects.create_user(
            email='test_repro@example.com',
            full_name='Test Repro',
            password='Password123'
        )
        print(f"User created: {user.email}, username: {user.username}")
    except IntegrityError as e:
        print(f"Caught expected IntegrityError: {e}")
        # Print the last query
        print("Last SQL queries:")
        for q in connection.queries:
            print(q['sql'])
    except Exception as e:
        print(f"Caught unexpected Exception: {e}")

if __name__ == "__main__":
    repro()
