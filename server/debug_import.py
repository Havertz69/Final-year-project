import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

try:
    from properties.models import Payment, Notification
    print("Models imported successfully")
except Exception as e:
    print(f"Error importing models: {e}")

try:
    from properties.services import ReportService
    print("Services imported successfully")
except Exception as e:
    print(f"Error importing services: {e}")

try:
    from properties.views import dashboard_summary
    print("Views imported successfully")
except Exception as e:
    print(f"Error importing views: {e}")
