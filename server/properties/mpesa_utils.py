"""
M-Pesa Daraja API Integration Utility
Handles the Lipa Na M-Pesa Online (STK Push) flow for the sandbox environment.
"""
import base64
import logging
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)

# Sandbox URLs
MPESA_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
MPESA_STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

# Sandbox defaults
# Business shortcode for Lipa Na M-Pesa sandbox
MPESA_SHORTCODE = "174379"
# Lipa Na M-Pesa passkey for sandbox (provided by Safaricom)
MPESA_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"


class MpesaClient:
    """
    Client for interacting with the Safaricom Daraja API.
    """

    @staticmethod
    def _get_access_token() -> str:
        """
        Retrieve a fresh OAuth access token using the consumer key and secret.
        """
        consumer_key = settings.MPESA_CONSUMER_KEY
        consumer_secret = settings.MPESA_CONSUMER_SECRET

        # Strip common label prefixes if the user accidentally copied them into .env
        for prefix in ["CO:", "Consumer Key:", "ConsumerKey:"]:
            if consumer_key.startswith(prefix):
                consumer_key = consumer_key[len(prefix):].strip()
            if consumer_secret.startswith(prefix):
                consumer_secret = consumer_secret[len(prefix):].strip()
        
        # Final trim for safety
        consumer_key = consumer_key.strip()
        consumer_secret = consumer_secret.strip()

        credentials = f"{consumer_key}:{consumer_secret}"
        encoded = base64.b64encode(credentials.encode()).decode("utf-8")

        try:
            response = requests.get(
                MPESA_AUTH_URL,
                headers={"Authorization": f"Basic {encoded}"},
                timeout=15,
            )
            response.raise_for_status()
            token = response.json().get("access_token")
            if not token:
                raise ValueError("No access_token in response: " + str(response.json()))
            logger.info("M-Pesa access token retrieved successfully.")
            return token
        except requests.RequestException as e:
            logger.error("Failed to get M-Pesa access token: %s", e)
            raise

    @staticmethod
    def _generate_password(timestamp: str) -> str:
        """
        Generate the STK Push password (shortcode + passkey + timestamp, base64 encoded).
        """
        raw = f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}"
        return base64.b64encode(raw.encode()).decode("utf-8")

    @classmethod
    def initiate_stk_push(
        cls,
        phone_number: str,
        amount: int,
        account_reference: str,
        transaction_description: str,
        callback_url: str,
    ) -> dict:
        """
        Send an STK Push request to the customer's phone.

        Args:
            phone_number: Safaricom phone number (e.g., 254712345678)
            amount: Amount in KES (integer)
            account_reference: Shown on customer's phone (e.g., "Unit A101 - Feb 2026")
            transaction_description: Short description
            callback_url: URL Safaricom will POST the result to

        Returns:
            Safaricom API response dict with `CheckoutRequestID` on success.

        Raises:
            Exception on any network or API error.
        """
        # Normalize phone number to 2547XXXXXXXX format
        phone = str(phone_number).strip().replace("+", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]

        now = datetime.now()
        timestamp = now.strftime("%Y%m%d%H%M%S")
        password = cls._generate_password(timestamp)

        access_token = cls._get_access_token()

        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference[:12],   # M-Pesa limits this to 12 chars
            "TransactionDesc": transaction_description[:13],  # and this to 13 chars
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                MPESA_STK_PUSH_URL,
                json=payload,
                headers=headers,
                timeout=20,
            )
            response.raise_for_status()
            result = response.json()
            logger.info("STK Push initiated. CheckoutRequestID: %s", result.get("CheckoutRequestID"))
            return result
        except requests.RequestException as e:
            logger.error("STK Push request failed: %s", e)
            raise
