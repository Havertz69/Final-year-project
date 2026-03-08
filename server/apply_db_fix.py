import os
import django
import sys

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.db import connection

def fix_username_constraint():
    print("Attempting to drop NOT NULL constraint on users.username...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE users ALTER COLUMN username DROP NOT NULL;")
        print("✅ Successfully dropped NOT NULL constraint.")
    except Exception as e:
        print(f"❌ Failed to drop constraint: {e}")

if __name__ == "__main__":
    fix_username_constraint()
