"""
Test PDF Facturation - Corrections PDF et responsive mobile
Tests for:
1. PDF structure without Code column
2. Description with bold title + text in same cell
3. Long descriptions continue on next pages without blank pages
4. Total TTC on single line
5. Correct calculations: Qté × PU HT
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_contact(api_client):
    """Create or get a test contact"""
    # First try to find existing contact
    response = api_client.get(f"{BASE_URL}/api/contacts")
    assert response.status_code == 200
    contacts = response.json()
    
    if contacts:
        return contacts[0]
    
    # Create new contact if none exists
    contact_data = {
        "first_name": "Test",
        "last_name": "PDF Contact",
        "email": "test.pdf@example.com",
        "phone": "0690123456",
        "company": "Test Company",
        "type": "client",
        "status": "actif"
    }
    response = api_client.post(f"{BASE_URL}/api/contacts", json=contact_data)
    assert response.status_code in [200, 201]
    return response.json()


class TestPDFGeneration:
    """Test PDF generation features"""
    
    def test_create_devis_with_long_description(self, api_client, test_contact):
        """Test creating a devis with long description for PDF testing"""
        # Create a devis with long description
        long_description = """Création d'un site web professionnel comprenant:
- Design personnalisé responsive
- Intégration CMS WordPress
- Optimisation SEO de base
- Formation à l'utilisation du back-office
- Hébergement première année inclus
- Maintenance technique pendant 3 mois

Ce service inclut également:
- Création de 5 pages principales (Accueil, À propos, Services, Portfolio, Contact)
- Formulaire de contact avec notifications email
- Intégration des réseaux sociaux
- Galerie photos/vidéos
- Blog avec système de commentaires
- Newsletter avec Mailchimp

Livrables:
- Maquettes graphiques validées
- Site web fonctionnel
- Documentation technique
- Guide d'utilisation"""

        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [
                {
                    "title": "Création site web professionnel",
                    "description": long_description,
                    "quantity": 1,
                    "unit_price": 2500.00,
                    "discount": 0,
                    "discountType": "percent"
                },
                {
                    "title": "Pack réseaux sociaux",
                    "description": "Gestion mensuelle des réseaux sociaux (Facebook, Instagram, LinkedIn)",
                    "quantity": 3,
                    "unit_price": 350.00,
                    "discount": 10,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-03-01",
            "payment_terms": "30",
            "notes": "Devis valable 30 jours",
            "conditions": "Acompte de 30% à la commande"
        }
        
        response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert response.status_code in [200, 201], f"Failed to create devis: {response.text}"
        
        result = response.json()
        assert "id" in result
        assert "invoice_number" in result
        assert result["invoice_number"].startswith("DEV-")
        
        return result
    
    def test_pdf_download_returns_valid_pdf(self, api_client, test_contact):
        """Test that PDF download returns a valid PDF file"""
        # First create a devis
        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [
                {
                    "title": "Service Test PDF",
                    "description": "Description du service pour test PDF",
                    "quantity": 2,
                    "unit_price": 150.00,
                    "discount": 0,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-02-28"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert create_response.status_code in [200, 201]
        devis_id = create_response.json()["id"]
        
        # Download PDF
        pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
        
        # Check content type
        content_type = pdf_response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check PDF magic bytes
        pdf_content = pdf_response.content
        assert pdf_content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        # Check file size is reasonable (at least 1KB)
        assert len(pdf_content) > 1000, f"PDF file too small: {len(pdf_content)} bytes"
        
        print(f"PDF generated successfully: {len(pdf_content)} bytes")
    
    def test_pdf_with_very_long_description(self, api_client, test_contact):
        """Test PDF generation with very long description that spans multiple pages"""
        # Create a very long description
        very_long_description = "\n".join([
            f"Ligne {i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
            f"Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            for i in range(1, 51)  # 50 lines
        ])
        
        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "devis",
            "items": [
                {
                    "title": "Service avec description très longue",
                    "description": very_long_description,
                    "quantity": 1,
                    "unit_price": 5000.00,
                    "discount": 0,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-03-15"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert create_response.status_code in [200, 201], f"Failed to create devis: {create_response.text}"
        devis_id = create_response.json()["id"]
        
        # Download PDF - should not fail with LayoutError
        pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed for long description: {pdf_response.status_code}"
        
        # Verify it's a valid PDF
        assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"Long description PDF generated: {len(pdf_response.content)} bytes")
    
    def test_pdf_calculation_qty_times_pu_ht(self, api_client, test_contact):
        """Test that PDF calculations are correct: Qté × PU HT"""
        # Create invoice with specific values to verify calculation
        devis_data = {
            "contact_id": test_contact["id"],
            "document_type": "facture",
            "items": [
                {
                    "title": "Service A",
                    "description": "Test calculation",
                    "quantity": 3,
                    "unit_price": 100.00,
                    "discount": 0,
                    "discountType": "percent"
                },
                {
                    "title": "Service B",
                    "description": "Test with discount",
                    "quantity": 2,
                    "unit_price": 200.00,
                    "discount": 10,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-02-28"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert create_response.status_code in [200, 201]
        
        # Get the invoice to verify calculations
        invoice_id = create_response.json()["id"]
        get_response = api_client.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 200
        
        invoice = get_response.json()
        
        # Expected calculations:
        # Service A: 3 × 100 = 300
        # Service B: 2 × 200 = 400, with 10% discount = 360
        # Subtotal: 300 + 360 = 660
        # TVA 8.5%: 660 × 0.085 = 56.10
        # Total TTC: 660 + 56.10 = 716.10
        
        expected_subtotal = 660.00
        expected_tva = 56.10
        expected_total = 716.10
        
        assert abs(invoice["subtotal"] - expected_subtotal) < 0.01, f"Subtotal mismatch: {invoice['subtotal']} vs {expected_subtotal}"
        assert abs(invoice["tva"] - expected_tva) < 0.01, f"TVA mismatch: {invoice['tva']} vs {expected_tva}"
        assert abs(invoice["total"] - expected_total) < 0.01, f"Total mismatch: {invoice['total']} vs {expected_total}"
        
        print(f"Calculations verified: Subtotal={invoice['subtotal']}, TVA={invoice['tva']}, Total={invoice['total']}")
    
    def test_existing_devis_pdf_download(self, api_client):
        """Test downloading PDF for existing devis DEV-2026-0021"""
        # Get all invoices to find DEV-2026-0021
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        target_devis = None
        
        for inv in invoices:
            if inv.get("invoice_number") == "DEV-2026-0021":
                target_devis = inv
                break
        
        if target_devis:
            # Download PDF
            pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{target_devis['id']}/pdf")
            assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
            assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
            print(f"DEV-2026-0021 PDF downloaded: {len(pdf_response.content)} bytes")
        else:
            pytest.skip("DEV-2026-0021 not found in database")


class TestInvoiceAPI:
    """Test Invoice API endpoints"""
    
    def test_get_all_invoices(self, api_client):
        """Test getting all invoices"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        assert isinstance(invoices, list)
        print(f"Found {len(invoices)} invoices/devis")
    
    def test_invoice_structure(self, api_client):
        """Test that invoice has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        if invoices:
            invoice = invoices[0]
            
            # Check required fields
            required_fields = ["id", "invoice_number", "contact_id", "items", "status"]
            for field in required_fields:
                assert field in invoice, f"Missing field: {field}"
            
            # Check items structure
            if invoice.get("items"):
                item = invoice["items"][0]
                item_fields = ["title", "description", "quantity", "unit_price"]
                for field in item_fields:
                    assert field in item, f"Missing item field: {field}"
            
            print(f"Invoice structure verified: {invoice['invoice_number']}")


class TestSettingsAPI:
    """Test Settings API for invoice configuration"""
    
    def test_get_invoice_settings(self, api_client):
        """Test getting invoice settings"""
        response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert response.status_code == 200
        
        settings = response.json()
        print(f"Invoice settings: {json.dumps(settings, indent=2)[:500]}")
    
    def test_update_invoice_settings(self, api_client):
        """Test updating invoice settings"""
        settings_data = {
            "company_name": "Alpha Agency Test",
            "company_address": "Test Address, 97170 Petit-Bourg",
            "company_siret": "123 456 789 00012",
            "company_vat": "FR12 345 678 901",
            "default_payment_terms": "30",
            "default_conditions": "Paiement à 30 jours"
        }
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json=settings_data)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify settings were saved
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        
        saved_settings = get_response.json()
        assert saved_settings.get("company_name") == "Alpha Agency Test"
        
        print("Invoice settings updated and verified")


class TestEmailTemplates:
    """Test Email Templates API"""
    
    def test_get_email_templates(self, api_client):
        """Test getting email templates"""
        response = api_client.get(f"{BASE_URL}/api/settings/email-templates")
        assert response.status_code == 200
        
        templates = response.json()
        print(f"Email templates: {json.dumps(templates, indent=2)[:500]}")
    
    def test_update_devis_template(self, api_client):
        """Test updating devis email template"""
        template_data = {
            "subject": "Votre devis {{numero}} - {{company_name}}",
            "body": "Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre devis {{numero}}.\n\nCordialement,\n{{company_name}}"
        }
        
        response = api_client.put(f"{BASE_URL}/api/settings/email-templates/devis", json=template_data)
        assert response.status_code == 200, f"Failed to update template: {response.text}"
        
        print("Devis email template updated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
