import os
import django
import sys
from decimal import Decimal

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ploti_backend.settings')
django.setup()

from properties.models import Unit

def test_decimal_comparison():
    print("=== Testing Decimal Comparison ===")
    # Get a unit
    unit = Unit.objects.first()
    if not unit:
        print("No unit found.")
        return
    
    rent = unit.rent_amount
    print(f"Unit rent: {rent} ({type(rent)})")
    
    # Test cases
    test_values = [
        Decimal(str(rent)),
        float(rent),
        str(rent),
        Decimal(float(rent)),
        "5500.00" if str(rent) != "5500.00" else "100.00"
    ]
    
    for val in test_values:
        print(f"\nComparing {val} ({type(val)}) with {rent} ({type(rent)})")
        try:
            is_equal = (val == rent)
            print(f"Result: {is_equal}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    test_decimal_comparison()
