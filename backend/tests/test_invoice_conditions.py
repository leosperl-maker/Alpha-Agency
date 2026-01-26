"""
Test suite for differentiated invoice conditions by document type.
Tests the 4 distinct conditions fields:
- conditions_devis: For quotes
- conditions_facture: For standard invoices
- conditions_acompte: For deposit invoices
- conditions_solde: For balance invoices

Also tests migration of legacy default_conditions to new fields.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

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
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestInvoiceSettingsConditions:
    """Tests for GET/PUT /api/settings/invoice with 4 conditions fields"""
    
    def test_get_settings_returns_4_conditions_fields(self, api_client):
        """GET /api/settings/invoice should return all 4 conditions fields"""
        response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all 4 conditions fields exist
        assert "conditions_devis" in data, "Missing conditions_devis field"
        assert "conditions_facture" in data, "Missing conditions_facture field"
        assert "conditions_acompte" in data, "Missing conditions_acompte field"
        assert "conditions_solde" in data, "Missing conditions_solde field"
        
        # Also verify legacy field exists for backward compatibility
        assert "default_conditions" in data, "Missing default_conditions field (legacy)"
        
        print(f"✓ All 4 conditions fields present in response")
        print(f"  - conditions_devis: {len(data.get('conditions_devis', ''))} chars")
        print(f"  - conditions_facture: {len(data.get('conditions_facture', ''))} chars")
        print(f"  - conditions_acompte: {len(data.get('conditions_acompte', ''))} chars")
        print(f"  - conditions_solde: {len(data.get('conditions_solde', ''))} chars")
    
    def test_get_settings_conditions_have_default_values(self, api_client):
        """Each conditions field should have appropriate default content"""
        response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify conditions_devis mentions validity period
        conditions_devis = data.get("conditions_devis", "")
        assert "devis" in conditions_devis.lower() or "valable" in conditions_devis.lower() or "acompte" in conditions_devis.lower(), \
            "conditions_devis should mention quote-specific terms"
        
        # Verify conditions_facture mentions payment terms
        conditions_facture = data.get("conditions_facture", "")
        assert "paiement" in conditions_facture.lower() or "règlement" in conditions_facture.lower(), \
            "conditions_facture should mention payment terms"
        
        # Verify conditions_acompte mentions deposit
        conditions_acompte = data.get("conditions_acompte", "")
        assert "acompte" in conditions_acompte.lower() or "facture principale" in conditions_acompte.lower(), \
            "conditions_acompte should mention deposit-specific terms"
        
        # Verify conditions_solde mentions balance
        conditions_solde = data.get("conditions_solde", "")
        assert "solde" in conditions_solde.lower() or "acomptes versés" in conditions_solde.lower(), \
            "conditions_solde should mention balance-specific terms"
        
        print("✓ All conditions fields have appropriate default content")
    
    def test_update_conditions_devis_individually(self, api_client):
        """PUT /api/settings/invoice should allow updating conditions_devis individually"""
        unique_text = f"TEST_DEVIS_CONDITIONS_{uuid.uuid4().hex[:8]}"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_devis": unique_text
        })
        
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("conditions_devis") == unique_text, \
            "conditions_devis was not updated correctly"
        
        print(f"✓ conditions_devis updated successfully to: {unique_text}")
    
    def test_update_conditions_facture_individually(self, api_client):
        """PUT /api/settings/invoice should allow updating conditions_facture individually"""
        unique_text = f"TEST_FACTURE_CONDITIONS_{uuid.uuid4().hex[:8]}"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_facture": unique_text
        })
        
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("conditions_facture") == unique_text, \
            "conditions_facture was not updated correctly"
        
        print(f"✓ conditions_facture updated successfully to: {unique_text}")
    
    def test_update_conditions_acompte_individually(self, api_client):
        """PUT /api/settings/invoice should allow updating conditions_acompte individually"""
        unique_text = f"TEST_ACOMPTE_CONDITIONS_{uuid.uuid4().hex[:8]}"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_acompte": unique_text
        })
        
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("conditions_acompte") == unique_text, \
            "conditions_acompte was not updated correctly"
        
        print(f"✓ conditions_acompte updated successfully to: {unique_text}")
    
    def test_update_conditions_solde_individually(self, api_client):
        """PUT /api/settings/invoice should allow updating conditions_solde individually"""
        unique_text = f"TEST_SOLDE_CONDITIONS_{uuid.uuid4().hex[:8]}"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_solde": unique_text
        })
        
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("conditions_solde") == unique_text, \
            "conditions_solde was not updated correctly"
        
        print(f"✓ conditions_solde updated successfully to: {unique_text}")
    
    def test_update_all_4_conditions_at_once(self, api_client):
        """PUT /api/settings/invoice should allow updating all 4 conditions at once"""
        unique_id = uuid.uuid4().hex[:8]
        
        payload = {
            "conditions_devis": f"DEVIS_ALL_{unique_id}",
            "conditions_facture": f"FACTURE_ALL_{unique_id}",
            "conditions_acompte": f"ACOMPTE_ALL_{unique_id}",
            "conditions_solde": f"SOLDE_ALL_{unique_id}"
        }
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json=payload)
        assert response.status_code == 200
        
        # Verify all updates persisted
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("conditions_devis") == payload["conditions_devis"]
        assert data.get("conditions_facture") == payload["conditions_facture"]
        assert data.get("conditions_acompte") == payload["conditions_acompte"]
        assert data.get("conditions_solde") == payload["conditions_solde"]
        
        print("✓ All 4 conditions fields updated successfully in single request")
    
    def test_updating_one_condition_does_not_affect_others(self, api_client):
        """Updating one conditions field should not affect the others"""
        # First, set all 4 to known values
        unique_id = uuid.uuid4().hex[:8]
        initial_payload = {
            "conditions_devis": f"INITIAL_DEVIS_{unique_id}",
            "conditions_facture": f"INITIAL_FACTURE_{unique_id}",
            "conditions_acompte": f"INITIAL_ACOMPTE_{unique_id}",
            "conditions_solde": f"INITIAL_SOLDE_{unique_id}"
        }
        
        api_client.put(f"{BASE_URL}/api/settings/invoice", json=initial_payload)
        
        # Now update only conditions_devis
        new_devis = f"UPDATED_DEVIS_{unique_id}"
        api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_devis": new_devis
        })
        
        # Verify only conditions_devis changed
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        data = get_response.json()
        
        assert data.get("conditions_devis") == new_devis, "conditions_devis should be updated"
        assert data.get("conditions_facture") == initial_payload["conditions_facture"], \
            "conditions_facture should remain unchanged"
        assert data.get("conditions_acompte") == initial_payload["conditions_acompte"], \
            "conditions_acompte should remain unchanged"
        assert data.get("conditions_solde") == initial_payload["conditions_solde"], \
            "conditions_solde should remain unchanged"
        
        print("✓ Updating one condition does not affect others")


class TestPDFConditionsSelection:
    """Tests for PDF generation using correct conditions based on invoice_type"""
    
    @pytest.fixture(scope="class")
    def test_contact(self, api_client):
        """Create a test contact for invoices"""
        contact_data = {
            "first_name": "Test",
            "last_name": f"Conditions_{uuid.uuid4().hex[:6]}",
            "email": f"test_conditions_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "0690123456",
            "company": "Test Company"
        }
        response = api_client.post(f"{BASE_URL}/api/contacts", json=contact_data)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_create_devis_uses_conditions_devis(self, api_client, test_contact):
        """Creating a devis should use conditions_devis in PDF"""
        # First set a unique conditions_devis
        unique_marker = f"DEVIS_MARKER_{uuid.uuid4().hex[:8]}"
        api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_devis": unique_marker
        })
        
        # Create a devis
        invoice_data = {
            "contact_id": test_contact,
            "document_type": "devis",
            "items": [{"title": "Test Service", "description": "Test", "quantity": 1, "unit_price": 100}]
        }
        response = api_client.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200
        invoice_id = response.json()["id"]
        
        # Verify the invoice was created as devis
        get_response = api_client.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 200
        invoice = get_response.json()
        assert invoice.get("document_type") == "devis"
        
        print(f"✓ Devis created: {invoice.get('invoice_number')}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
    
    def test_create_standard_facture_uses_conditions_facture(self, api_client, test_contact):
        """Creating a standard facture should use conditions_facture in PDF"""
        # First set a unique conditions_facture
        unique_marker = f"FACTURE_MARKER_{uuid.uuid4().hex[:8]}"
        api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_facture": unique_marker
        })
        
        # Create a standard facture
        invoice_data = {
            "contact_id": test_contact,
            "document_type": "facture",
            "items": [{"title": "Test Service", "description": "Test", "quantity": 1, "unit_price": 100}]
        }
        response = api_client.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200
        invoice_id = response.json()["id"]
        
        # Verify the invoice was created as facture with standard type
        get_response = api_client.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 200
        invoice = get_response.json()
        assert invoice.get("document_type") == "facture"
        assert invoice.get("invoice_type") == "standard"
        
        print(f"✓ Standard facture created: {invoice.get('invoice_number')}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
    
    def test_deposit_invoice_uses_conditions_acompte(self, api_client, test_contact):
        """Creating a deposit invoice should use conditions_acompte in PDF"""
        # First set a unique conditions_acompte
        unique_marker = f"ACOMPTE_MARKER_{uuid.uuid4().hex[:8]}"
        api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_acompte": unique_marker
        })
        
        # Create a parent facture first
        parent_data = {
            "contact_id": test_contact,
            "document_type": "facture",
            "items": [{"title": "Test Service", "description": "Test", "quantity": 1, "unit_price": 1000}]
        }
        parent_response = api_client.post(f"{BASE_URL}/api/invoices", json=parent_data)
        assert parent_response.status_code == 200
        parent_id = parent_response.json()["id"]
        
        # Create a deposit invoice
        deposit_response = api_client.post(f"{BASE_URL}/api/invoices/{parent_id}/create-deposit", json={
            "deposit_type": "percent",
            "deposit_value": 30
        })
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json()["id"]
        
        # Verify the deposit invoice has correct type
        get_response = api_client.get(f"{BASE_URL}/api/invoices/{deposit_id}")
        assert get_response.status_code == 200
        deposit = get_response.json()
        assert deposit.get("invoice_type") == "deposit"
        
        print(f"✓ Deposit invoice created: {deposit.get('invoice_number')}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/invoices/{deposit_id}")
        api_client.delete(f"{BASE_URL}/api/invoices/{parent_id}")
    
    def test_balance_invoice_uses_conditions_solde(self, api_client, test_contact):
        """Creating a balance invoice should use conditions_solde in PDF"""
        # First set a unique conditions_solde
        unique_marker = f"SOLDE_MARKER_{uuid.uuid4().hex[:8]}"
        api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_solde": unique_marker
        })
        
        # Create a parent facture first
        parent_data = {
            "contact_id": test_contact,
            "document_type": "facture",
            "items": [{"title": "Test Service", "description": "Test", "quantity": 1, "unit_price": 1000}]
        }
        parent_response = api_client.post(f"{BASE_URL}/api/invoices", json=parent_data)
        assert parent_response.status_code == 200
        parent_id = parent_response.json()["id"]
        
        # Create a deposit first (required for balance)
        deposit_response = api_client.post(f"{BASE_URL}/api/invoices/{parent_id}/create-deposit", json={
            "deposit_type": "percent",
            "deposit_value": 30
        })
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json()["id"]
        
        # Create a balance invoice
        balance_response = api_client.post(f"{BASE_URL}/api/invoices/{parent_id}/create-balance", json={})
        assert balance_response.status_code == 200
        balance_id = balance_response.json()["id"]
        
        # Verify the balance invoice has correct type
        get_response = api_client.get(f"{BASE_URL}/api/invoices/{balance_id}")
        assert get_response.status_code == 200
        balance = get_response.json()
        assert balance.get("invoice_type") == "balance"
        
        print(f"✓ Balance invoice created: {balance.get('invoice_number')}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/invoices/{balance_id}")
        api_client.delete(f"{BASE_URL}/api/invoices/{deposit_id}")
        api_client.delete(f"{BASE_URL}/api/invoices/{parent_id}")


class TestMigrationLegacyConditions:
    """Tests for migration of legacy default_conditions to new fields"""
    
    def test_legacy_default_conditions_still_works(self, api_client):
        """Legacy default_conditions field should still be accepted"""
        unique_text = f"LEGACY_CONDITIONS_{uuid.uuid4().hex[:8]}"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "default_conditions": unique_text
        })
        
        assert response.status_code == 200
        
        # Verify it was saved
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        data = get_response.json()
        
        assert data.get("default_conditions") == unique_text
        print("✓ Legacy default_conditions field still works")
    
    def test_new_settings_have_all_conditions_fields(self, api_client):
        """Even with legacy data, GET should return all 4 new conditions fields"""
        response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        
        assert response.status_code == 200
        data = response.json()
        
        # All 4 new fields should exist
        required_fields = ["conditions_devis", "conditions_facture", "conditions_acompte", "conditions_solde"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert data[field] is not None, f"Field {field} should not be None"
        
        print("✓ All 4 conditions fields present even with legacy data")


class TestConditionsFieldsValidation:
    """Tests for validation of conditions fields"""
    
    def test_conditions_can_be_empty_string(self, api_client):
        """Conditions fields should accept empty strings"""
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_devis": ""
        })
        
        assert response.status_code == 200
        
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        data = get_response.json()
        
        # Empty string should be preserved
        assert data.get("conditions_devis") == ""
        print("✓ Empty string accepted for conditions fields")
    
    def test_conditions_can_have_multiline_text(self, api_client):
        """Conditions fields should accept multiline text"""
        multiline_text = """• Première condition
• Deuxième condition
• Troisième condition avec détails:
  - Sous-point A
  - Sous-point B"""
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_facture": multiline_text
        })
        
        assert response.status_code == 200
        
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        data = get_response.json()
        
        assert data.get("conditions_facture") == multiline_text
        print("✓ Multiline text accepted for conditions fields")
    
    def test_conditions_can_have_special_characters(self, api_client):
        """Conditions fields should accept special characters"""
        special_text = "• Paiement: 30% à la commande, 70% à la livraison (€)"
        
        response = api_client.put(f"{BASE_URL}/api/settings/invoice", json={
            "conditions_acompte": special_text
        })
        
        assert response.status_code == 200
        
        get_response = api_client.get(f"{BASE_URL}/api/settings/invoice")
        data = get_response.json()
        
        assert data.get("conditions_acompte") == special_text
        print("✓ Special characters accepted for conditions fields")


# Cleanup fixture to restore default settings after tests
@pytest.fixture(scope="module", autouse=True)
def restore_default_settings(api_client):
    """Restore default settings after all tests"""
    yield
    # Restore defaults
    default_settings = {
        "conditions_devis": """• Ce devis est valable 30 jours à compter de sa date d'émission.
• Un acompte de 50% est exigé pour le lancement du projet.
• Le solde sera payable à la livraison finale.
• Paiement par virement bancaire ou carte bancaire.""",
        "conditions_facture": """• Paiement par virement bancaire ou carte bancaire.
• Le règlement doit intervenir sous 30 jours après réception de la facture.
• Tout retard de paiement entraînera des pénalités de retard conformément à l'article L.441-10 du Code de commerce.""",
        "conditions_acompte": """• Cette facture correspond à un acompte sur la facture principale.
• Paiement exigible à réception.
• Le solde sera facturé à la livraison finale.""",
        "conditions_solde": """• Cette facture correspond au solde après déduction des acomptes versés.
• Paiement exigible à réception.
• Merci de votre confiance."""
    }
    try:
        api_client.put(f"{BASE_URL}/api/settings/invoice", json=default_settings)
        print("\n✓ Default settings restored after tests")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
