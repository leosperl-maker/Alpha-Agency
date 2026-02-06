"""
Test suite for CRM Alpha Agency - Invoice/Devis PDF and Bulk Delete features
Tests:
1. PDF download (HTTP 200, valid file)
2. Bulk delete of documents
3. Settings button visibility in creation form
4. Settings (conditions, IBAN) loaded from /api/settings/invoice
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://whatsapp-ai-32.preview.emergentagent.com').rstrip('/')

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
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0


class TestInvoiceSettings:
    """Test invoice settings API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_invoice_settings(self, auth_token):
        """Test GET /api/settings/invoice returns settings with conditions and bank details"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=headers)
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "default_conditions" in data, "Missing default_conditions"
        assert "bank_details" in data, "Missing bank_details"
        assert "default_payment_terms" in data, "Missing default_payment_terms"
        
        # Verify bank details contain IBAN
        if data.get("bank_details"):
            assert "IBAN" in data["bank_details"] or "iban" in data["bank_details"].lower(), "Bank details should contain IBAN"
        
        print(f"Settings loaded: conditions={len(data.get('default_conditions', ''))} chars, bank_details={len(data.get('bank_details', ''))} chars")
    
    def test_update_invoice_settings(self, auth_token):
        """Test PUT /api/settings/invoice updates settings"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=headers)
        current_settings = get_response.json()
        
        # Update with same values (to not break anything)
        update_data = {
            "default_conditions": current_settings.get("default_conditions", "Test conditions"),
            "bank_details": current_settings.get("bank_details", "Test IBAN"),
            "default_payment_terms": current_settings.get("default_payment_terms", "30")
        }
        
        response = requests.put(f"{BASE_URL}/api/settings/invoice", headers=headers, json=update_data)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings/invoice", headers=headers)
        assert verify_response.status_code == 200


class TestInvoicePDF:
    """Test PDF generation and download"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_contact(self, auth_token):
        """Create or get a test contact"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get existing contacts
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        contacts = response.json()
        
        if contacts:
            return contacts[0]
        
        # Create a test contact if none exist
        contact_data = {
            "first_name": "TEST_PDF",
            "last_name": "Contact",
            "email": "test_pdf@example.com",
            "company": "Test Company"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_invoice(self, auth_token, test_contact):
        """Create a test invoice for PDF testing"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Create invoice with long description to test truncation
        long_description = "Création d'un site web professionnel avec design responsive, intégration CMS, optimisation SEO, et formation utilisateur. " * 5
        
        invoice_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "Création site web",
                    "description": long_description,
                    "quantity": 1,
                    "unit_price": 2500.00,
                    "discount": 200,
                    "discountType": "fixed"  # Test fixed discount format
                },
                {
                    "title": "Maintenance mensuelle",
                    "description": "Support technique et mises à jour",
                    "quantity": 3,
                    "unit_price": 150.00,
                    "discount": 10,
                    "discountType": "percent"  # Test percent discount
                }
            ],
            "due_date": "2026-02-15",
            "payment_terms": "30",
            "notes": "Test invoice for PDF generation"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=invoice_data)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        
        # Get full invoice data
        invoice_response = requests.get(f"{BASE_URL}/api/invoices/{data['id']}", headers=headers)
        return invoice_response.json()
    
    def test_pdf_download_returns_200(self, auth_token, test_invoice):
        """Test PDF download returns HTTP 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{test_invoice['id']}/pdf",
            headers=headers
        )
        
        assert response.status_code == 200, f"PDF download failed with status {response.status_code}: {response.text}"
        print(f"PDF download returned status 200")
    
    def test_pdf_content_type(self, auth_token, test_invoice):
        """Test PDF has correct content type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{test_invoice['id']}/pdf",
            headers=headers
        )
        
        assert response.status_code == 200
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        print(f"PDF content type: {content_type}")
    
    def test_pdf_has_content(self, auth_token, test_invoice):
        """Test PDF file has content (not empty)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{test_invoice['id']}/pdf",
            headers=headers
        )
        
        assert response.status_code == 200
        content_length = len(response.content)
        assert content_length > 1000, f"PDF seems too small: {content_length} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
        print(f"PDF size: {content_length} bytes, valid PDF header")
    
    def test_pdf_filename_in_header(self, auth_token, test_invoice):
        """Test PDF has correct filename in Content-Disposition header"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{test_invoice['id']}/pdf",
            headers=headers
        )
        
        assert response.status_code == 200
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Missing attachment in Content-Disposition: {content_disposition}"
        assert "facture_" in content_disposition or "FAC-" in content_disposition, f"Filename should contain facture_ or FAC-: {content_disposition}"
        print(f"Content-Disposition: {content_disposition}")


class TestBulkDelete:
    """Test bulk delete functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_contact(self, auth_token):
        """Get a test contact"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        contacts = response.json()
        if contacts:
            return contacts[0]
        # Create one if needed
        contact_data = {
            "first_name": "TEST_BULK",
            "last_name": "Delete",
            "email": "test_bulk@example.com"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        return response.json()
    
    def test_create_multiple_invoices_for_bulk_delete(self, auth_token, test_contact):
        """Create multiple invoices to test bulk delete"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        created_ids = []
        
        for i in range(3):
            invoice_data = {
                "contact_id": test_contact["id"],
                "document_type": "devis",
                "items": [
                    {
                        "title": f"TEST_BULK_DELETE Service {i+1}",
                        "description": f"Test service for bulk delete {i+1}",
                        "quantity": 1,
                        "unit_price": 100.00
                    }
                ],
                "notes": f"Test invoice {i+1} for bulk delete"
            }
            
            response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=invoice_data)
            assert response.status_code == 200, f"Failed to create invoice {i+1}: {response.text}"
            created_ids.append(response.json()["id"])
        
        print(f"Created {len(created_ids)} invoices for bulk delete test")
        return created_ids
    
    def test_delete_single_invoice(self, auth_token, test_contact):
        """Test deleting a single invoice"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Create an invoice to delete
        invoice_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [{"title": "TEST_DELETE_SINGLE", "description": "To be deleted", "quantity": 1, "unit_price": 50.00}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=invoice_data)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Delete the invoice
        delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
        assert get_response.status_code == 404, "Invoice should be deleted (404)"
        print("Single invoice delete: PASS")
    
    def test_bulk_delete_multiple_invoices(self, auth_token, test_contact):
        """Test deleting multiple invoices one by one (simulating bulk delete)"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Create 3 invoices
        created_ids = []
        for i in range(3):
            invoice_data = {
                "contact_id": test_contact["id"],
                "document_type": "devis",
                "items": [{"title": f"TEST_BULK_{i}", "description": f"Bulk test {i}", "quantity": 1, "unit_price": 25.00}]
            }
            response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=invoice_data)
            assert response.status_code == 200
            created_ids.append(response.json()["id"])
        
        print(f"Created {len(created_ids)} invoices for bulk delete")
        
        # Delete all of them (simulating bulk delete)
        deleted_count = 0
        for invoice_id in created_ids:
            delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
            if delete_response.status_code == 200:
                deleted_count += 1
        
        assert deleted_count == len(created_ids), f"Only deleted {deleted_count}/{len(created_ids)} invoices"
        
        # Verify all are deleted
        for invoice_id in created_ids:
            get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
            assert get_response.status_code == 404, f"Invoice {invoice_id} should be deleted"
        
        print(f"Bulk delete: {deleted_count}/{len(created_ids)} invoices deleted successfully")


class TestDevisCreation:
    """Test devis (quote) creation with proper prefix"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_contact(self, auth_token):
        """Get a test contact"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        contacts = response.json()
        return contacts[0] if contacts else None
    
    def test_create_devis_returns_dev_prefix(self, auth_token, test_contact):
        """Test creating a devis returns DEV- prefix"""
        if not test_contact:
            pytest.skip("No contact available")
        
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [
                {
                    "title": "TEST_DEVIS_PREFIX",
                    "description": "Test devis for prefix verification",
                    "quantity": 1,
                    "unit_price": 500.00
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        data = response.json()
        invoice_number = data.get("invoice_number", "")
        assert invoice_number.startswith("DEV-"), f"Devis should have DEV- prefix, got: {invoice_number}"
        print(f"Devis created with number: {invoice_number}")
    
    def test_create_facture_returns_fac_prefix(self, auth_token, test_contact):
        """Test creating a facture returns FAC- prefix"""
        if not test_contact:
            pytest.skip("No contact available")
        
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        facture_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "TEST_FACTURE_PREFIX",
                    "description": "Test facture for prefix verification",
                    "quantity": 1,
                    "unit_price": 750.00
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=facture_data)
        assert response.status_code == 200, f"Failed to create facture: {response.text}"
        
        data = response.json()
        invoice_number = data.get("invoice_number", "")
        assert invoice_number.startswith("FAC-"), f"Facture should have FAC- prefix, got: {invoice_number}"
        print(f"Facture created with number: {invoice_number}")


class TestDiscountFormat:
    """Test discount format in invoices (€ vs fixed)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_contact(self, auth_token):
        """Get a test contact"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        contacts = response.json()
        return contacts[0] if contacts else None
    
    def test_fixed_discount_stored_correctly(self, auth_token, test_contact):
        """Test that fixed discount is stored with correct type"""
        if not test_contact:
            pytest.skip("No contact available")
        
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        invoice_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "TEST_DISCOUNT_FORMAT",
                    "description": "Test discount format",
                    "quantity": 1,
                    "unit_price": 1000.00,
                    "discount": 200,
                    "discountType": "fixed"  # Should be stored as "fixed" or "€"
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=headers, json=invoice_data)
        assert response.status_code == 200
        invoice_id = response.json()["id"]
        
        # Get the invoice and verify discount type
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
        assert get_response.status_code == 200
        
        invoice = get_response.json()
        item = invoice["items"][0]
        
        # Verify discount is stored
        assert item.get("discount") == 200, f"Discount should be 200, got: {item.get('discount')}"
        discount_type = item.get("discountType", "")
        assert discount_type in ["fixed", "€"], f"Discount type should be 'fixed' or '€', got: {discount_type}"
        print(f"Discount stored: {item.get('discount')} {discount_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
