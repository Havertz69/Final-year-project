
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from properties.models import Lease
from properties.services import LeaseService

def test_pdf_gen():
    lease = Lease.objects.first()
    if not lease:
        print("No lease found in DB")
        return
    
    try:
        buffer = LeaseService.generate_lease_pdf(lease)
        with open('test_lease.pdf', 'wb') as f:
            f.write(buffer.getvalue())
        print("PDF generated successfully: test_lease.pdf")
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_gen()
