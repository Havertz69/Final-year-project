import google.generativeai as genai
import os
from django.conf import settings
from .models import Property, Unit, TenantProfile, Payment, MaintenanceRequest

from dotenv import load_dotenv
load_dotenv()

class ChatbotService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None

    def get_admin_context(self):
        """Gather global statistics and data for Admin context"""
        total_properties = Property.objects.count()
        total_units = Unit.objects.count()
        occupied_units = Unit.objects.filter(is_occupied=True).count()
        total_tenants = TenantProfile.objects.count()
        total_revenue = Payment.objects.filter(status='PAID').count() # Simplified
        pending_maintenance = MaintenanceRequest.objects.filter(status='PENDING').count()

        context = f"""
        System Overview (Admin View):
        - Total Properties: {total_properties}
        - Total Units: {total_units}
        - Occupied Units: {occupied_units}
        - Vacant Units: {total_units - occupied_units}
        - Total Tenants: {total_tenants}
        - Pending Maintenance Requests: {pending_maintenance}
        """
        return context

    def get_tenant_context(self, user):
        """Gather specific data for the logged-in Tenant"""
        try:
            profile = TenantProfile.objects.get(user=user)
            unit = profile.assigned_unit
            payments = Payment.objects.filter(tenant=profile).order_by('-payment_date')[:5]
            maintenance = MaintenanceRequest.objects.filter(tenant=profile).order_by('-created_at')[:5]

            context = f"""
            Tenant Profile (Personal View):
            - Name: {user.full_name}
            - Unit: {unit.unit_number if unit else 'Not Assigned'}
            - Property: {unit.property_obj.name if unit else 'N/A'}
            - Rent: {unit.rent_amount if unit else 0}
            - Move-in Date: {profile.move_in_date}
            
            Recent Payments:
            {chr(10).join([f"- {p.payment_date}: {p.amount_paid} ({p.status})" for p in payments])}
            
            Recent Maintenance:
            {chr(10).join([f"- {m.title}: {m.status}" for m in maintenance])}
            """
            return context
        except TenantProfile.DoesNotExist:
            return "Tenant profile not found."

    def get_response(self, user, message, history=[]):
        if not self.model:
            return "Gemini API key is not configured. Please contact the administrator."

        if user.role == 'ADMIN':
            context = self.get_admin_context()
            system_prompt = f"You are a Property Management Assistant for an Admin. Use this data context to answer: {context}"
        else:
            context = self.get_tenant_context(user)
            system_prompt = f"You are a Property Management Assistant for a Tenant. Use this data context to answer: {context}"

        # Combine history and context for a full prompt
        # For simplicity, we'll just prepend the system prompt
        full_prompt = f"{system_prompt}\n\nUser Question: {message}"
        
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"Error communicating with AI: {str(e)}"
