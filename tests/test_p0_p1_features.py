"""
Test P0 and P1 features for CRM Alpha Agency:
- P0: PDF generation (facture/devis), Email sending with PDF attachment
- P1: Bulk delete, Settings modal (company_name, company_address, company_siret, company_vat)
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data


class TestInvoiceSettings:
    """Test invoice settings API - P1 feature"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_invoice_settings(self, auth_headers):
        """Test GET /api/settings/invoice returns default settings"""
        response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        assert "company_name" in data or data.get("company_name") is not None or "default_payment_terms" in data
        assert "default_conditions" in data or "default_payment_terms" in data
        print(f"Settings response: {json.dumps(data, indent=2)}")
    
    def test_update_invoice_settings_company_info(self, auth_headers):
        """Test PUT /api/settings/invoice with company_name, company_address, company_siret, company_vat"""
        # Update settings with company info
        update_data = {
            "company_name": "TEST Alpha Agency Updated",
            "company_address": "123 Test Street, Test City",
            "company_siret": "12345678901234",
            "company_vat": "FR12345678901"
        }
        
        response = requests.put(f"{BASE_URL}/api/settings/invoice", 
                               headers=auth_headers, 
                               json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify the update was persisted
        get_response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("company_name") == "TEST Alpha Agency Updated", f"company_name not updated: {data}"
        assert data.get("company_address") == "123 Test Street, Test City", f"company_address not updated: {data}"
        assert data.get("company_siret") == "12345678901234", f"company_siret not updated: {data}"
        assert data.get("company_vat") == "FR12345678901", f"company_vat not updated: {data}"
        
        print(f"Settings updated successfully: {json.dumps(data, indent=2)}")
    
    def test_update_invoice_settings_conditions_bank(self, auth_headers):
        """Test updating default_conditions and bank_details"""
        update_data = {
            "default_conditions": "Test conditions - Payment within 30 days",
            "bank_details": "IBAN: FR76 TEST 0000 0000 0000 0000 000"
        }
        
        response = requests.put(f"{BASE_URL}/api/settings/invoice", 
                               headers=auth_headers, 
                               json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=auth_headers)
        data = get_response.json()
        
        assert "Test conditions" in data.get("default_conditions", ""), f"Conditions not updated: {data}"
        assert "FR76 TEST" in data.get("bank_details", ""), f"Bank details not updated: {data}"


class TestPDFGeneration:
    """Test PDF generation - P0 feature"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_contact(self, auth_headers):
        """Create or get a test contact"""
        # First try to get existing contacts
        response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]
        
        # Create a new contact if none exist
        contact_data = {
            "first_name": "TEST_PDF",
            "last_name": "Client",
            "email": "test_pdf@example.com",
            "phone": "0690123456",
            "company": "Test Company"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", headers=auth_headers, json=contact_data)
        assert response.status_code in [200, 201], f"Failed to create contact: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_invoice(self, auth_headers, test_contact):
        """Create a test invoice for PDF testing"""
        invoice_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "Service de test PDF",
                    "description": "Description longue pour tester la génération PDF avec du texte qui peut s'étendre sur plusieurs lignes et vérifier que le PDF est correctement généré sans erreur 500.",
                    "quantity": 2,
                    "unit_price": 500.00,
                    "discount": 10,
                    "discountType": "%"
                }
            ],
            "due_date": "2026-01-31",
            "notes": "Note de test pour PDF"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        assert "id" in data
        return data
    
    @pytest.fixture(scope="class")
    def test_devis(self, auth_headers, test_contact):
        """Create a test devis for PDF testing"""
        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [
                {
                    "title": "Devis test PDF",
                    "description": "Description du devis pour tester la génération PDF",
                    "quantity": 1,
                    "unit_price": 1500.00,
                    "discount": 200,
                    "discountType": "fixed"
                }
            ],
            "due_date": "2026-02-28"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        data = response.json()
        assert "id" in data
        return data
    
    def test_download_invoice_pdf_no_500_error(self, auth_headers, test_invoice):
        """P0: Test that PDF download does NOT return 500 error"""
        invoice_id = test_invoice["id"]
        
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", headers=auth_headers)
        
        # P0 requirement: No 500 error
        assert response.status_code != 500, f"PDF generation returned 500 error: {response.text}"
        assert response.status_code == 200, f"PDF download failed with status {response.status_code}: {response.text}"
        
        # Verify it's a valid PDF
        assert response.headers.get("Content-Type") == "application/pdf", f"Wrong content type: {response.headers.get('Content-Type')}"
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        print(f"Invoice PDF downloaded successfully, size: {len(response.content)} bytes")
    
    def test_download_devis_pdf_no_500_error(self, auth_headers, test_devis):
        """P0: Test that devis PDF download does NOT return 500 error"""
        devis_id = test_devis["id"]
        
        response = requests.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf", headers=auth_headers)
        
        # P0 requirement: No 500 error
        assert response.status_code != 500, f"Devis PDF generation returned 500 error: {response.text}"
        assert response.status_code == 200, f"Devis PDF download failed with status {response.status_code}"
        
        # Verify it's a valid PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        print(f"Devis PDF downloaded successfully, size: {len(response.content)} bytes")
    
    def test_pdf_with_long_description(self, auth_headers, test_contact):
        """P0: Test PDF generation with very long description (was causing LayoutError)"""
        # Create invoice with very long description
        long_description = """
        Ceci est une description très longue pour tester que le PDF peut gérer des descriptions
        qui s'étendent sur plusieurs lignes et potentiellement plusieurs pages.
        
        Détails du service:
        - Point 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        - Point 2: Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        - Point 3: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
        - Point 4: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.
        - Point 5: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.
        
        Cette description longue permet de vérifier que le système de génération PDF
        ne génère plus d'erreur LayoutError comme c'était le cas auparavant.
        
        Le texte peut maintenant s'étendre sur plusieurs pages si nécessaire,
        grâce à la refonte de la fonction generate_professional_pdf.
        """
        
        invoice_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "Service avec description longue",
                    "description": long_description,
                    "quantity": 1,
                    "unit_price": 2500.00
                }
            ]
        }
        
        # Create invoice
        create_response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Download PDF - should NOT return 500
        pdf_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", headers=auth_headers)
        assert pdf_response.status_code != 500, f"Long description caused 500 error: {pdf_response.text}"
        assert pdf_response.status_code == 200
        assert pdf_response.content[:4] == b'%PDF'
        
        print(f"PDF with long description generated successfully, size: {len(pdf_response.content)} bytes")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)


class TestEmailSending:
    """Test email sending with PDF attachment - P0 feature"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_invoice_for_email(self, auth_headers):
        """Create a test invoice for email testing"""
        # Get a contact first
        contacts_response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        contacts = contacts_response.json()
        contact_id = contacts[0]["id"] if contacts else None
        
        if not contact_id:
            pytest.skip("No contacts available for email test")
        
        invoice_data = {
            "contact_id": contact_id,
            "document_type": "facture",
            "items": [
                {
                    "title": "Service pour test email",
                    "description": "Test d'envoi email avec PDF",
                    "quantity": 1,
                    "unit_price": 100.00
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200
        return response.json()
    
    def test_send_email_api_returns_success(self, auth_headers, test_invoice_for_email):
        """P0: Test that send-email API returns success (not 500)"""
        invoice_id = test_invoice_for_email["id"]
        
        email_data = {
            "recipient_email": "test@example.com",
            "document_type": "facture"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send-email",
            headers=auth_headers,
            json=email_data
        )
        
        # P0 requirement: API should return success
        # Note: If Brevo API key is not configured, it may return 500 with "Service email non configuré"
        # But the PDF generation part should work
        if response.status_code == 500:
            error_detail = response.json().get("detail", "")
            if "email non configuré" in error_detail.lower():
                pytest.skip("Email service not configured (Brevo API key missing)")
            else:
                pytest.fail(f"Email API returned 500: {response.text}")
        
        assert response.status_code == 200, f"Email API failed: {response.text}"
        data = response.json()
        assert "message" in data or "status" in data
        print(f"Email API response: {data}")


class TestBulkDelete:
    """Test bulk delete functionality - P1 feature"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_contact_for_bulk(self, auth_headers):
        """Get a contact for bulk delete tests"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        contacts = response.json()
        if contacts:
            return contacts[0]
        pytest.skip("No contacts available")
    
    def test_create_multiple_invoices_for_bulk_delete(self, auth_headers, test_contact_for_bulk):
        """Create multiple invoices to test bulk delete"""
        created_ids = []
        
        for i in range(3):
            invoice_data = {
                "contact_id": test_contact_for_bulk["id"],
                "document_type": "facture",
                "items": [
                    {
                        "title": f"TEST_BULK_DELETE_{i}",
                        "description": f"Invoice for bulk delete test {i}",
                        "quantity": 1,
                        "unit_price": 100.00
                    }
                ]
            }
            
            response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
            assert response.status_code == 200
            created_ids.append(response.json()["id"])
        
        assert len(created_ids) == 3
        return created_ids
    
    def test_delete_single_invoice(self, auth_headers, test_contact_for_bulk):
        """Test single invoice deletion (used by bulk delete)"""
        # Create an invoice
        invoice_data = {
            "contact_id": test_contact_for_bulk["id"],
            "document_type": "facture",
            "items": [{"title": "TEST_DELETE", "description": "To delete", "quantity": 1, "unit_price": 50}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Invoice should be deleted"
        
        print("Single invoice delete works correctly")
    
    def test_bulk_delete_multiple_invoices(self, auth_headers, test_contact_for_bulk):
        """P1: Test bulk delete of multiple invoices"""
        # Create 3 invoices
        created_ids = []
        for i in range(3):
            invoice_data = {
                "contact_id": test_contact_for_bulk["id"],
                "document_type": "facture",
                "items": [{"title": f"BULK_{i}", "description": "Bulk test", "quantity": 1, "unit_price": 100}]
            }
            response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
            assert response.status_code == 200
            created_ids.append(response.json()["id"])
        
        # Delete all 3 (simulating bulk delete)
        success_count = 0
        for invoice_id in created_ids:
            delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
            if delete_response.status_code == 200:
                success_count += 1
        
        assert success_count == 3, f"Only {success_count}/3 invoices deleted"
        
        # Verify all are deleted
        for invoice_id in created_ids:
            get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
            assert get_response.status_code == 404, f"Invoice {invoice_id} should be deleted"
        
        print("Bulk delete of 3 invoices successful")


class TestInvoiceCreation:
    """Test invoice creation via form"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_facture_with_all_fields(self, auth_headers):
        """Test creating a facture with all fields"""
        # Get a contact
        contacts_response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        contacts = contacts_response.json()
        if not contacts:
            pytest.skip("No contacts available")
        
        contact_id = contacts[0]["id"]
        
        invoice_data = {
            "contact_id": contact_id,
            "document_type": "facture",
            "items": [
                {
                    "title": "Service principal",
                    "description": "Description détaillée du service",
                    "quantity": 2,
                    "unit_price": 750.00,
                    "discount": 5,
                    "discountType": "%"
                },
                {
                    "title": "Service secondaire",
                    "description": "Autre service",
                    "quantity": 1,
                    "unit_price": 250.00,
                    "discount": 50,
                    "discountType": "fixed"
                }
            ],
            "due_date": "2026-03-15",
            "payment_terms": "30",
            "notes": "Notes de test",
            "conditions": "Conditions de test",
            "bank_details": "IBAN test",
            "globalDiscount": 10,
            "globalDiscountType": "%"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("FAC-"), f"Wrong prefix: {data['invoice_number']}"
        
        # Verify the invoice was created correctly
        get_response = requests.get(f"{BASE_URL}/api/invoices/{data['id']}", headers=auth_headers)
        assert get_response.status_code == 200
        invoice = get_response.json()
        
        assert invoice["document_type"] == "facture"
        assert len(invoice["items"]) == 2
        assert invoice["globalDiscount"] == 10
        
        print(f"Created facture: {data['invoice_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{data['id']}", headers=auth_headers)


# Cleanup fixture to restore original settings
@pytest.fixture(scope="session", autouse=True)
def cleanup_settings():
    """Restore original settings after all tests"""
    yield
    
    # Login and restore settings
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Restore original company info
        restore_data = {
            "company_name": "Alpha Agency",
            "company_address": "Immeuble Carat, Jarry, 97122 Baie-Mahault",
            "company_siret": "91253383100015",
            "company_vat": "FR47912553831"
        }
        requests.put(f"{BASE_URL}/api/settings/invoice", headers=headers, json=restore_data)
