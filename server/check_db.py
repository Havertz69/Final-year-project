import os
import django
import sys

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from django.db import connection

def check_username_column():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, is_nullable, column_default, data_type
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'username';
        """)
        row = cursor.fetchone()
        if row:
            print(f"Column: {row[0]}")
            print(f"Is Nullable: {row[1]}")
            print(f"Default: {row[2]}")
            print(f"Type: {row[3]}")
        else:
            print("Column 'username' not found in table 'users'")

if __name__ == "__main__":
    check_username_column()
