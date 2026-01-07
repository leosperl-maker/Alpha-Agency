#!/usr/bin/env python3
"""
Quick test for invoice update functionality
"""

import requests
import json

# Test credentials
base_url = "https://agency-portfolio-22.preview.emergentagent.com"
admin_email = "admin@alphagency.fr"
admin_password = "superpassword"

# Login
login_response = requests.post(f"{base_url}/api/auth/login", json={
    "email": admin_email,
    "password": admin_password
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

token = login_response.json()['token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Create a test contact first
contact_data = {
    "first_name": "Test",
    "last_name": "Update",
    "email": "test.update@example.com",
    "phone": "0690123456",
    "company": "Test Company"
}

contact_response = requests.post(f"{base_url}/api/contacts", json=contact_data, headers=headers)
if contact_response.status_code != 200:
    print(f"Contact creation failed: {contact_response.text}")
    exit(1)

contact_id = contact_response.json()['id']
print(f"Created contact: {contact_id}")

# Create a test invoice
invoice_data = {
    "contact_id": contact_id,
    "document_type": "facture",
    "items": [
        {
            "description": "Test Service",
            "quantity": 1,
            "unit_price": 100.0
        }
    ],
    "notes": "Test invoice for update"
}

invoice_response = requests.post(f"{base_url}/api/invoices", json=invoice_data, headers=headers)
if invoice_response.status_code != 200:
    print(f"Invoice creation failed: {invoice_response.text}")
    exit(1)

invoice_id = invoice_response.json()['id']
print(f"Created invoice: {invoice_id}")

# Test invoice update
update_data = {
    "items": [
        {
            "description": "Updated Test Service",
            "quantity": 2,
            "unit_price": 150.0
        }
    ],
    "notes": "Updated test invoice"
}

update_response = requests.put(f"{base_url}/api/invoices/{invoice_id}", json=update_data, headers=headers)
print(f"Update response: {update_response.status_code}")
print(f"Update response body: {update_response.text}")

# Clean up
requests.delete(f"{base_url}/api/invoices/{invoice_id}", headers=headers)
requests.delete(f"{base_url}/api/contacts/{contact_id}", headers=headers)
print("Cleanup completed")