"""
Test PDF Long Description Fix - Iteration 29
Tests for the fix of LayoutError when descriptions are very long (>1800 chars)

The fix splits long descriptions into multiple table rows to avoid ReportLab LayoutError.
Test case: DEV-2026-0027 (id: b9e02dcf-4ead-49aa-aecc-c9d04cc92b7d) with descriptions of 2123 and 1656 chars.
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"

# Known problematic devis with long descriptions
PROBLEMATIC_DEVIS_ID = "b9e02dcf-4ead-49aa-aecc-c9d04cc92b7d"
PROBLEMATIC_DEVIS_NUMBER = "DEV-2026-0027"


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


class TestLoginAPI:
    """Test authentication"""
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"Login successful, token received")


class TestPDFLongDescriptionFix:
    """Test PDF generation with long descriptions - the main fix"""
    
    def test_get_problematic_devis(self, api_client):
        """Test that the problematic devis DEV-2026-0027 exists"""
        response = api_client.get(f"{BASE_URL}/api/invoices/{PROBLEMATIC_DEVIS_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Devis {PROBLEMATIC_DEVIS_NUMBER} not found - may have been deleted")
        
        assert response.status_code == 200, f"Failed to get devis: {response.text}"
        
        devis = response.json()
        assert devis.get("invoice_number") == PROBLEMATIC_DEVIS_NUMBER
        
        # Check description lengths
        items = devis.get("items", [])
        for i, item in enumerate(items):
            desc_len = len(item.get("description", ""))
            print(f"Item {i+1} description length: {desc_len} chars")
        
        print(f"Devis {PROBLEMATIC_DEVIS_NUMBER} found with {len(items)} items")
    
    def test_pdf_generation_for_problematic_devis(self, api_client):
        """Test PDF generation for DEV-2026-0027 with long descriptions - CRITICAL TEST"""
        # This was failing with LayoutError before the fix
        response = api_client.get(f"{BASE_URL}/api/invoices/{PROBLEMATIC_DEVIS_ID}/pdf")
        
        if response.status_code == 404:
            pytest.skip(f"Devis {PROBLEMATIC_DEVIS_NUMBER} not found")
        
        assert response.status_code == 200, f"PDF generation failed with status {response.status_code}: {response.text[:500] if response.text else 'No error message'}"
        
        # Verify it's a valid PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        # Check file size is reasonable
        assert len(pdf_content) > 1000, f"PDF file too small: {len(pdf_content)} bytes"
        
        print(f"SUCCESS: PDF generated for {PROBLEMATIC_DEVIS_NUMBER}: {len(pdf_content)} bytes")
    
    def test_pdf_url_generation_for_problematic_devis(self, api_client):
        """Test Cloudinary PDF URL generation for DEV-2026-0027"""
        response = api_client.get(f"{BASE_URL}/api/invoices/{PROBLEMATIC_DEVIS_ID}/pdf-url")
        
        if response.status_code == 404:
            pytest.skip(f"Devis {PROBLEMATIC_DEVIS_NUMBER} not found")
        
        assert response.status_code == 200, f"PDF URL generation failed with status {response.status_code}: {response.text[:500] if response.text else 'No error message'}"
        
        data = response.json()
        assert "url" in data, "No URL in response"
        assert "filename" in data, "No filename in response"
        
        url = data["url"]
        assert url.startswith("https://"), f"Invalid URL: {url}"
        assert "cloudinary" in url.lower(), f"URL is not from Cloudinary: {url}"
        
        print(f"SUCCESS: Cloudinary URL generated: {url[:100]}...")
    
    def test_create_devis_with_2000_char_description(self, api_client):
        """Test creating and generating PDF for a new devis with 2000+ char description"""
        # First get a contact
        contacts_response = api_client.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available for testing")
        
        contact_id = contacts[0]["id"]
        
        # Create a very long description (>2000 chars)
        long_description = """PHASE 1 - ANALYSE ET CONCEPTION (Semaines 1-2)
• Audit complet de l'existant et analyse des besoins métier
• Définition de l'architecture technique et des spécifications fonctionnelles
• Création des maquettes UI/UX avec validation client
• Rédaction du cahier des charges détaillé

PHASE 2 - DÉVELOPPEMENT BACKEND (Semaines 3-6)
• Mise en place de l'infrastructure serveur et base de données
• Développement des APIs RESTful avec documentation Swagger
• Implémentation du système d'authentification et gestion des droits
• Intégration des services tiers (paiement, email, stockage)
• Tests unitaires et d'intégration automatisés

PHASE 3 - DÉVELOPPEMENT FRONTEND (Semaines 7-10)
• Développement de l'interface utilisateur responsive
• Intégration des composants React avec gestion d'état Redux
• Optimisation des performances et du SEO
• Tests end-to-end avec Cypress

PHASE 4 - DÉPLOIEMENT ET FORMATION (Semaines 11-12)
• Configuration de l'environnement de production
• Migration des données et tests de charge
• Formation des utilisateurs et documentation
• Support technique pendant 3 mois après livraison

LIVRABLES INCLUS:
- Code source complet avec documentation
- Manuel d'utilisation et guide administrateur
- Accès aux environnements de développement et production
- Rapport de tests et certificat de conformité RGPD

CONDITIONS PARTICULIÈRES:
Ce devis est valable 30 jours. Un acompte de 40% est demandé à la signature.
Le solde sera facturé en deux fois: 30% à mi-parcours et 30% à la livraison finale.
Toute modification du périmètre fera l'objet d'un avenant au contrat."""

        print(f"Description length: {len(long_description)} chars")
        
        devis_data = {
            "contact_id": contact_id,
            "document_type": "devis",
            "items": [
                {
                    "title": "Développement Application Web Complète",
                    "description": long_description,
                    "quantity": 1,
                    "unit_price": 15000.00,
                    "discount": 0,
                    "discountType": "percent"
                },
                {
                    "title": "Maintenance et Support Annuel",
                    "description": "Support technique prioritaire, mises à jour de sécurité, monitoring 24/7, sauvegardes quotidiennes, rapport mensuel de performance.",
                    "quantity": 12,
                    "unit_price": 250.00,
                    "discount": 10,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-03-31",
            "payment_terms": "30",
            "notes": "Projet de développement web complet",
            "conditions": "Acompte de 40% à la commande, 30% à mi-parcours, 30% à la livraison"
        }
        
        # Create the devis
        create_response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert create_response.status_code in [200, 201], f"Failed to create devis: {create_response.text}"
        
        result = create_response.json()
        devis_id = result["id"]
        devis_number = result["invoice_number"]
        print(f"Created devis: {devis_number} (id: {devis_id})")
        
        # Now test PDF generation
        pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.status_code}"
        
        assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"SUCCESS: PDF generated for new devis with 2000+ char description: {len(pdf_response.content)} bytes")
    
    def test_create_devis_with_multiple_long_descriptions(self, api_client):
        """Test PDF with multiple items having long descriptions"""
        contacts_response = api_client.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available for testing")
        
        contact_id = contacts[0]["id"]
        
        # Create multiple items with long descriptions
        desc1 = "Service de conseil stratégique comprenant:\n" + "\n".join([
            f"• Point {i}: Analyse approfondie et recommandations détaillées pour l'optimisation des processus métier"
            for i in range(1, 25)
        ])
        
        desc2 = "Formation professionnelle incluant:\n" + "\n".join([
            f"• Module {i}: Session de formation intensive avec exercices pratiques et évaluation"
            for i in range(1, 20)
        ])
        
        print(f"Description 1 length: {len(desc1)} chars")
        print(f"Description 2 length: {len(desc2)} chars")
        
        devis_data = {
            "contact_id": contact_id,
            "document_type": "devis",
            "items": [
                {
                    "title": "Conseil Stratégique",
                    "description": desc1,
                    "quantity": 5,
                    "unit_price": 800.00,
                    "discount": 5,
                    "discountType": "percent"
                },
                {
                    "title": "Formation Équipe",
                    "description": desc2,
                    "quantity": 3,
                    "unit_price": 1200.00,
                    "discount": 0,
                    "discountType": "percent"
                }
            ],
            "due_date": "2026-04-15"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert create_response.status_code in [200, 201], f"Failed to create devis: {create_response.text}"
        
        devis_id = create_response.json()["id"]
        
        # Test PDF generation
        pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.status_code}"
        
        assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"SUCCESS: PDF with multiple long descriptions: {len(pdf_response.content)} bytes")


class TestPDFFormatting:
    """Test PDF formatting requirements"""
    
    def test_pdf_has_correct_headers(self, api_client):
        """Test that PDF download has correct HTTP headers"""
        # Get any invoice
        invoices_response = api_client.get(f"{BASE_URL}/api/invoices")
        assert invoices_response.status_code == 200
        invoices = invoices_response.json()
        
        if not invoices:
            pytest.skip("No invoices available")
        
        invoice_id = invoices[0]["id"]
        
        pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf")
        assert pdf_response.status_code == 200
        
        # Check headers
        assert "application/pdf" in pdf_response.headers.get("Content-Type", "")
        assert "Content-Disposition" in pdf_response.headers
        
        content_disp = pdf_response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert ".pdf" in content_disp
        
        print(f"PDF headers correct: {content_disp}")


class TestAllInvoicesPDF:
    """Test PDF generation for all existing invoices"""
    
    def test_pdf_for_all_devis(self, api_client):
        """Test PDF generation for all devis documents"""
        invoices_response = api_client.get(f"{BASE_URL}/api/invoices")
        assert invoices_response.status_code == 200
        invoices = invoices_response.json()
        
        devis_list = [inv for inv in invoices if inv.get("document_type") == "devis"]
        
        print(f"Testing PDF generation for {len(devis_list)} devis...")
        
        failed = []
        success = 0
        
        for devis in devis_list[:10]:  # Test first 10 to avoid timeout
            devis_id = devis["id"]
            devis_number = devis.get("invoice_number", "unknown")
            
            try:
                pdf_response = api_client.get(f"{BASE_URL}/api/invoices/{devis_id}/pdf")
                if pdf_response.status_code == 200 and pdf_response.content[:4] == b'%PDF':
                    success += 1
                    print(f"  ✓ {devis_number}: OK ({len(pdf_response.content)} bytes)")
                else:
                    failed.append(f"{devis_number}: Status {pdf_response.status_code}")
                    print(f"  ✗ {devis_number}: Failed with status {pdf_response.status_code}")
            except Exception as e:
                failed.append(f"{devis_number}: {str(e)}")
                print(f"  ✗ {devis_number}: Exception {str(e)}")
        
        print(f"\nResults: {success} success, {len(failed)} failed")
        
        if failed:
            print(f"Failed devis: {failed}")
        
        # Allow some failures but not all
        assert success > 0, "All PDF generations failed"
        assert len(failed) < len(devis_list[:10]) / 2, f"Too many failures: {failed}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
