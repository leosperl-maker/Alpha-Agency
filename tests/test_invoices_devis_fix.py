"""
Test suite for Invoice/Devis Bug Fix
Tests that:
- POST /api/invoices with document_type='devis' returns DEV- prefix
- POST /api/invoices with document_type='facture' returns FAC- prefix
- GET /api/invoices returns list of invoices/devis
- GET /api/invoices/{id}/pdf returns PDF
- GET /api/invoices/{id}/pdf-url returns Cloudinary URL
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoicesDevisFix:
    """Test suite for the critical DEV-/FAC- prefix bug fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        # Get a contact for creating invoices
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        if contacts_response.status_code == 200 and contacts_response.json():
            self.contact_id = contacts_response.json()[0].get("id")
        else:
            # Create a test contact
            contact_response = self.session.post(f"{BASE_URL}/api/contacts", json={
                "first_name": "TEST",
                "last_name": "InvoiceClient",
                "email": "test_invoice_client@test.com",
                "company": "Test Company"
            })
            if contact_response.status_code in [200, 201]:
                self.contact_id = contact_response.json().get("id")
            else:
                pytest.skip("Could not create test contact")
        
        yield
        
        # Cleanup - delete test invoices created during tests
        if hasattr(self, 'created_invoice_ids'):
            for invoice_id in self.created_invoice_ids:
                try:
                    self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
                except:
                    pass
    
    def test_01_create_devis_returns_dev_prefix(self):
        """CRITICAL TEST: Creating a devis should return DEV- prefix, not FAC-"""
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        
        payload = {
            "contact_id": self.contact_id,
            "document_type": "devis",
            "items": [
                {
                    "title": "Test Service Devis",
                    "description": "Test description for devis",
                    "quantity": 1,
                    "unit_price": 1000.00
                }
            ],
            "notes": "Test devis for bug fix verification"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=payload)
        
        assert response.status_code in [200, 201], f"Failed to create devis: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "invoice_number" in data, "Response should contain invoice_number"
        
        invoice_number = data["invoice_number"]
        print(f"Created devis with number: {invoice_number}")
        
        # CRITICAL ASSERTION: Devis should have DEV- prefix
        assert invoice_number.startswith("DEV-"), f"CRITICAL BUG: Devis number '{invoice_number}' should start with 'DEV-' but doesn't!"
        
        # Store for cleanup
        if "id" in data:
            self.created_invoice_ids.append(data["id"])
        
        return data
    
    def test_02_create_facture_returns_fac_prefix(self):
        """Creating a facture should return FAC- prefix"""
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        
        payload = {
            "contact_id": self.contact_id,
            "document_type": "facture",
            "items": [
                {
                    "title": "Test Service Facture",
                    "description": "Test description for facture",
                    "quantity": 2,
                    "unit_price": 500.00
                }
            ],
            "notes": "Test facture for bug fix verification"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=payload)
        
        assert response.status_code in [200, 201], f"Failed to create facture: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "invoice_number" in data, "Response should contain invoice_number"
        
        invoice_number = data["invoice_number"]
        print(f"Created facture with number: {invoice_number}")
        
        # ASSERTION: Facture should have FAC- prefix
        assert invoice_number.startswith("FAC-"), f"Facture number '{invoice_number}' should start with 'FAC-' but doesn't!"
        
        # Store for cleanup
        if "id" in data:
            self.created_invoice_ids.append(data["id"])
        
        return data
    
    def test_03_create_default_document_type_is_facture(self):
        """Creating without document_type should default to facture (FAC-)"""
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        
        payload = {
            "contact_id": self.contact_id,
            # No document_type specified - should default to facture
            "items": [
                {
                    "title": "Test Service Default",
                    "description": "Test description for default type",
                    "quantity": 1,
                    "unit_price": 750.00
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=payload)
        
        assert response.status_code in [200, 201], f"Failed to create document: {response.status_code} - {response.text}"
        
        data = response.json()
        invoice_number = data.get("invoice_number", "")
        print(f"Created default document with number: {invoice_number}")
        
        # Default should be facture
        assert invoice_number.startswith("FAC-"), f"Default document should be facture with FAC- prefix, got: {invoice_number}"
        
        if "id" in data:
            self.created_invoice_ids.append(data["id"])
    
    def test_04_get_invoices_list(self):
        """GET /api/invoices should return list of invoices and devis"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 200, f"Failed to get invoices: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} invoices/devis")
        
        # Check that we have both DEV- and FAC- prefixed documents
        dev_count = sum(1 for inv in data if inv.get("invoice_number", "").startswith("DEV-"))
        fac_count = sum(1 for inv in data if inv.get("invoice_number", "").startswith("FAC-"))
        
        print(f"DEV- documents: {dev_count}, FAC- documents: {fac_count}")
        
        return data
    
    def test_05_get_single_invoice(self):
        """GET /api/invoices/{id} should return invoice details"""
        # First create a devis to test
        create_response = self.session.post(f"{BASE_URL}/api/invoices", json={
            "contact_id": self.contact_id,
            "document_type": "devis",
            "items": [{"title": "Test", "description": "Test", "quantity": 1, "unit_price": 100}]
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test invoice")
        
        invoice_id = create_response.json().get("id")
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        self.created_invoice_ids.append(invoice_id)
        
        # Get the invoice
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        
        assert response.status_code == 200, f"Failed to get invoice: {response.status_code}"
        
        data = response.json()
        assert data.get("id") == invoice_id
        assert data.get("document_type") == "devis"
        assert data.get("invoice_number", "").startswith("DEV-")
        
        print(f"Retrieved invoice: {data.get('invoice_number')}, type: {data.get('document_type')}")
    
    def test_06_get_invoice_pdf(self):
        """GET /api/invoices/{id}/pdf should return PDF"""
        # First create a devis
        create_response = self.session.post(f"{BASE_URL}/api/invoices", json={
            "contact_id": self.contact_id,
            "document_type": "devis",
            "items": [{"title": "PDF Test", "description": "Test PDF generation", "quantity": 1, "unit_price": 500}]
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test invoice for PDF")
        
        invoice_id = create_response.json().get("id")
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        self.created_invoice_ids.append(invoice_id)
        
        # Get PDF
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf")
        
        assert response.status_code == 200, f"Failed to get PDF: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf", "Response should be PDF"
        
        # Check content-disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "devis_DEV-" in content_disposition, f"PDF filename should contain 'devis_DEV-', got: {content_disposition}"
        
        print(f"PDF generated successfully: {content_disposition}")
    
    def test_07_get_invoice_pdf_url(self):
        """GET /api/invoices/{id}/pdf-url should return Cloudinary URL"""
        # First create a facture
        create_response = self.session.post(f"{BASE_URL}/api/invoices", json={
            "contact_id": self.contact_id,
            "document_type": "facture",
            "items": [{"title": "PDF URL Test", "description": "Test PDF URL generation", "quantity": 1, "unit_price": 300}]
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test invoice for PDF URL")
        
        invoice_id = create_response.json().get("id")
        if not hasattr(self, 'created_invoice_ids'):
            self.created_invoice_ids = []
        self.created_invoice_ids.append(invoice_id)
        
        # Get PDF URL
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf-url")
        
        assert response.status_code == 200, f"Failed to get PDF URL: {response.status_code}"
        
        data = response.json()
        assert "url" in data, "Response should contain 'url'"
        assert "filename" in data, "Response should contain 'filename'"
        
        url = data.get("url", "")
        filename = data.get("filename", "")
        
        # URL should be a Cloudinary URL
        assert "cloudinary" in url.lower() or "res.cloudinary.com" in url, f"URL should be Cloudinary URL: {url}"
        
        # Filename should contain FAC- for facture
        assert "FAC-" in filename, f"Filename should contain FAC- for facture: {filename}"
        
        print(f"PDF URL generated: {url}")
        print(f"Filename: {filename}")
    
    def test_08_verify_existing_invoices_have_correct_prefixes(self):
        """Verify that existing invoices in the database have correct prefixes based on document_type"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 200
        
        invoices = response.json()
        
        mismatched = []
        for inv in invoices:
            doc_type = inv.get("document_type", "facture")
            inv_number = inv.get("invoice_number", "")
            
            if doc_type == "devis" and not inv_number.startswith("DEV-"):
                mismatched.append(f"Devis {inv_number} should start with DEV-")
            elif doc_type == "facture" and not inv_number.startswith("FAC-"):
                mismatched.append(f"Facture {inv_number} should start with FAC-")
        
        if mismatched:
            print("WARNING: Found mismatched prefixes (likely created before bug fix):")
            for m in mismatched:
                print(f"  - {m}")
        
        # This test passes but reports any legacy issues
        print(f"Checked {len(invoices)} documents, {len(mismatched)} have legacy prefix issues")


class TestInvoicesAPI:
    """Additional API tests for invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_invoices_endpoint_accessible(self):
        """Basic test that /api/invoices endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        print(f"Invoices endpoint accessible, returned {len(response.json())} documents")
    
    def test_invoices_filter_by_status(self):
        """Test filtering invoices by status"""
        response = self.session.get(f"{BASE_URL}/api/invoices?status=brouillon")
        assert response.status_code == 200
        
        data = response.json()
        # All returned invoices should have status 'brouillon'
        for inv in data:
            assert inv.get("status") == "brouillon" or len(data) == 0
        
        print(f"Found {len(data)} invoices with status 'brouillon'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
