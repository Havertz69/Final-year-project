import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"

payload = {
    "contents": [{
        "parts": [{
            "text": "Hello, this is a connectivity test."
        }]
    }]
}

print(f"Testing connectivity to: {url.split('?')[0]}")
print(f"API Key exists: {api_key is not None}")

try:
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! AI responded.")
        print(response.json())
    else:
        print(f"Error Response: {response.text}")
except Exception as e:
    print(f"Connectivity Test Failed: {str(e)}")
