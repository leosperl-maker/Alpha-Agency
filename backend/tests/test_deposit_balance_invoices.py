"""
Test suite for Deposit (Acompte) and Balance (Solde) Invoice functionality.
Tests the complete workflow: create deposits, validate limits, create balance, payment sync.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestDepositBalanceInvoices:
    """Test deposit and balance invoice creation and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("token")
        assert token, "No token received"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created invoice IDs for cleanup
        self.created_invoice_ids = []
        
        yield
        
        # Cleanup: Delete test invoices
        for invoice_id in self.created_invoice_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
            except:
                pass
    
    def create_test_invoice(self, total_amount=1000):
        """Helper to create a test parent invoice"""
        # First get a contact
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available for testing")
        
        contact_id = contacts[0].get("id")
        
        # Create invoice
        invoice_data = {
            "contact_id": contact_id,
            "document_type": "facture",
            "items": [
                {
                    "title": "Test Service for Deposit Testing",
                    "description": "Service de test pour les acomptes",
                    "quantity": 1,
                    "unit_price": round(total_amount / 1.085, 2),  # HT amount
                    "discount": 0,
                    "discountType": "%"
                }
            ],
            "payment_terms": "30"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        
        invoice_id = response.json().get("id")
        self.created_invoice_ids.append(invoice_id)
        
        return invoice_id
    
    # ==================== DEPOSIT INVOICE TESTS ====================
    
    def test_create_deposit_invoice_percent(self):
        """Test creating a deposit invoice with percentage"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create 30% deposit
        deposit_data = {
            "deposit_type": "percent",
            "deposit_value": 30
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json=deposit_data
        )
        
        assert response.status_code == 200, f"Failed to create deposit: {response.text}"
        
        result = response.json()
        assert "invoice_number" in result
        assert "-A1" in result["invoice_number"], "Deposit number should end with -A1"
        assert result.get("deposit_percent") == 30
        
        # Store deposit ID for cleanup
        if result.get("id"):
            self.created_invoice_ids.append(result["id"])
        
        print(f"✓ Created deposit invoice: {result['invoice_number']} ({result['deposit_percent']}%)")
    
    def test_create_deposit_invoice_fixed_amount(self):
        """Test creating a deposit invoice with fixed amount"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create fixed amount deposit of 250€
        deposit_data = {
            "deposit_type": "amount",
            "deposit_value": 250
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json=deposit_data
        )
        
        assert response.status_code == 200, f"Failed to create deposit: {response.text}"
        
        result = response.json()
        assert "invoice_number" in result
        assert result.get("deposit_amount") == 250
        
        if result.get("id"):
            self.created_invoice_ids.append(result["id"])
        
        print(f"✓ Created fixed deposit invoice: {result['invoice_number']} ({result['deposit_amount']}€)")
    
    def test_create_multiple_deposits(self):
        """Test creating multiple deposit invoices for same parent"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create first deposit (30%)
        deposit1_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit1_response.status_code == 200
        result1 = deposit1_response.json()
        assert "-A1" in result1["invoice_number"]
        if result1.get("id"):
            self.created_invoice_ids.append(result1["id"])
        
        # Create second deposit (30%)
        deposit2_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit2_response.status_code == 200
        result2 = deposit2_response.json()
        assert "-A2" in result2["invoice_number"]
        if result2.get("id"):
            self.created_invoice_ids.append(result2["id"])
        
        print(f"✓ Created multiple deposits: {result1['invoice_number']}, {result2['invoice_number']}")
    
    def test_deposit_validation_exceeds_100_percent(self):
        """Test that deposits cannot exceed 100% of parent total"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create first deposit (60%)
        deposit1_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 60}
        )
        assert deposit1_response.status_code == 200
        result1 = deposit1_response.json()
        if result1.get("id"):
            self.created_invoice_ids.append(result1["id"])
        
        # Try to create second deposit (50%) - should fail
        deposit2_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 50}
        )
        
        assert deposit2_response.status_code == 400, "Should reject deposit exceeding 100%"
        error_detail = deposit2_response.json().get("detail", "")
        assert "dépasse" in error_detail.lower() or "excède" in error_detail.lower() or "disponible" in error_detail.lower()
        
        print(f"✓ Correctly rejected deposit exceeding 100%: {error_detail}")
    
    def test_deposit_on_non_facture_fails(self):
        """Test that deposits cannot be created on devis"""
        # Get a contact
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        contacts = contacts_response.json()
        if not contacts:
            pytest.skip("No contacts available")
        
        # Create a devis
        devis_data = {
            "contact_id": contacts[0]["id"],
            "document_type": "devis",
            "items": [{"title": "Test", "description": "Test", "quantity": 1, "unit_price": 100}]
        }
        devis_response = self.session.post(f"{BASE_URL}/api/invoices", json=devis_data)
        assert devis_response.status_code == 200
        devis_id = devis_response.json().get("id")
        self.created_invoice_ids.append(devis_id)
        
        # Try to create deposit on devis
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{devis_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        
        assert deposit_response.status_code == 400, "Should reject deposit on devis"
        print("✓ Correctly rejected deposit on devis")
    
    def test_deposit_on_deposit_fails(self):
        """Test that deposits cannot be created on another deposit invoice"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create first deposit
        deposit1_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit1_response.status_code == 200
        deposit1_id = deposit1_response.json().get("id")
        self.created_invoice_ids.append(deposit1_id)
        
        # Try to create deposit on the deposit invoice
        deposit2_response = self.session.post(
            f"{BASE_URL}/api/invoices/{deposit1_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        
        assert deposit2_response.status_code == 400, "Should reject deposit on deposit invoice"
        print("✓ Correctly rejected deposit on deposit invoice")
    
    # ==================== BALANCE INVOICE TESTS ====================
    
    def test_create_balance_invoice(self):
        """Test creating a balance invoice after deposits"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create deposit first
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json().get("id")
        self.created_invoice_ids.append(deposit_id)
        
        # Create balance invoice
        balance_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        
        assert balance_response.status_code == 200, f"Failed to create balance: {balance_response.text}"
        
        result = balance_response.json()
        assert "invoice_number" in result
        assert "-S" in result["invoice_number"], "Balance number should end with -S"
        
        if result.get("id"):
            self.created_invoice_ids.append(result["id"])
        
        print(f"✓ Created balance invoice: {result['invoice_number']} ({result['balance_amount']}€)")
    
    def test_balance_without_deposits_requires_force(self):
        """Test that balance without deposits requires force flag"""
        invoice_id = self.create_test_invoice(1000)
        
        # Try to create balance without deposits (should fail)
        balance_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        
        assert balance_response.status_code == 400, "Should reject balance without deposits"
        
        # Now try with force flag
        balance_response_forced = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={"force_without_deposits": True}
        )
        
        assert balance_response_forced.status_code == 200, f"Should allow forced balance: {balance_response_forced.text}"
        
        result = balance_response_forced.json()
        if result.get("id"):
            self.created_invoice_ids.append(result["id"])
        
        print(f"✓ Created forced balance invoice: {result['invoice_number']}")
    
    def test_only_one_balance_per_parent(self):
        """Test that only one balance invoice can be created per parent"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create deposit
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json().get("id")
        self.created_invoice_ids.append(deposit_id)
        
        # Create first balance
        balance1_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        assert balance1_response.status_code == 200
        balance1_id = balance1_response.json().get("id")
        self.created_invoice_ids.append(balance1_id)
        
        # Try to create second balance (should fail)
        balance2_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        
        assert balance2_response.status_code == 400, "Should reject second balance invoice"
        error_detail = balance2_response.json().get("detail", "")
        assert "existe déjà" in error_detail.lower()
        
        print(f"✓ Correctly rejected second balance invoice: {error_detail}")
    
    # ==================== RELATED INVOICES TESTS ====================
    
    def test_get_related_invoices(self):
        """Test getting related invoices (deposits + balance)"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create two deposits
        for i in range(2):
            deposit_response = self.session.post(
                f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
                json={"deposit_type": "percent", "deposit_value": 30}
            )
            assert deposit_response.status_code == 200
            self.created_invoice_ids.append(deposit_response.json().get("id"))
        
        # Create balance
        balance_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        assert balance_response.status_code == 200
        self.created_invoice_ids.append(balance_response.json().get("id"))
        
        # Get related invoices
        related_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}/related")
        
        assert related_response.status_code == 200, f"Failed to get related: {related_response.text}"
        
        result = related_response.json()
        assert "parent" in result
        assert "deposits" in result
        assert "balance" in result
        assert "summary" in result
        
        assert len(result["deposits"]) == 2, "Should have 2 deposits"
        assert result["balance"] is not None, "Should have balance invoice"
        assert result["summary"]["deposits_count"] == 2
        
        print(f"✓ Got related invoices: {len(result['deposits'])} deposits, balance: {result['balance']['invoice_number']}")
    
    def test_get_related_from_child_invoice(self):
        """Test getting related invoices from a deposit/balance invoice"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create deposit
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json().get("id")
        self.created_invoice_ids.append(deposit_id)
        
        # Get related from deposit invoice (should return parent's related)
        related_response = self.session.get(f"{BASE_URL}/api/invoices/{deposit_id}/related")
        
        assert related_response.status_code == 200
        result = related_response.json()
        
        assert result["parent"]["id"] == invoice_id, "Should return parent invoice info"
        print("✓ Got related invoices from child invoice")
    
    # ==================== NUMBERING TESTS ====================
    
    def test_deposit_numbering_format(self):
        """Test that deposit invoices follow FAC-YYYY-XXXX-A1, A2 format"""
        invoice_id = self.create_test_invoice(1000)
        
        # Get parent invoice number
        parent_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert parent_response.status_code == 200
        parent_number = parent_response.json().get("invoice_number")
        
        # Create deposits
        deposit1_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 20}
        )
        assert deposit1_response.status_code == 200
        deposit1_number = deposit1_response.json().get("invoice_number")
        self.created_invoice_ids.append(deposit1_response.json().get("id"))
        
        deposit2_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 20}
        )
        assert deposit2_response.status_code == 200
        deposit2_number = deposit2_response.json().get("invoice_number")
        self.created_invoice_ids.append(deposit2_response.json().get("id"))
        
        # Verify numbering
        assert deposit1_number == f"{parent_number}-A1", f"Expected {parent_number}-A1, got {deposit1_number}"
        assert deposit2_number == f"{parent_number}-A2", f"Expected {parent_number}-A2, got {deposit2_number}"
        
        print(f"✓ Deposit numbering correct: {deposit1_number}, {deposit2_number}")
    
    def test_balance_numbering_format(self):
        """Test that balance invoice follows FAC-YYYY-XXXX-S format"""
        invoice_id = self.create_test_invoice(1000)
        
        # Get parent invoice number
        parent_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert parent_response.status_code == 200
        parent_number = parent_response.json().get("invoice_number")
        
        # Create deposit first
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        self.created_invoice_ids.append(deposit_response.json().get("id"))
        
        # Create balance
        balance_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        assert balance_response.status_code == 200
        balance_number = balance_response.json().get("invoice_number")
        self.created_invoice_ids.append(balance_response.json().get("id"))
        
        # Verify numbering
        assert balance_number == f"{parent_number}-S", f"Expected {parent_number}-S, got {balance_number}"
        
        print(f"✓ Balance numbering correct: {balance_number}")
    
    # ==================== PAYMENT SYNC TESTS ====================
    
    def test_payment_on_deposit_syncs_parent(self):
        """Test that payment on deposit invoice syncs to parent"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create deposit
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json().get("id")
        deposit_amount = deposit_response.json().get("deposit_amount")
        self.created_invoice_ids.append(deposit_id)
        
        # Get parent status before payment
        parent_before = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}").json()
        assert parent_before.get("total_paid", 0) == 0
        
        # Make payment on deposit
        payment_data = {
            "amount": deposit_amount,
            "payment_date": "2026-01-26",
            "payment_method": "virement"
        }
        
        payment_response = self.session.post(
            f"{BASE_URL}/api/invoices/{deposit_id}/payments",
            json=payment_data
        )
        assert payment_response.status_code == 200, f"Payment failed: {payment_response.text}"
        
        # Check parent was updated
        parent_after = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}").json()
        
        assert parent_after.get("total_paid", 0) > 0, "Parent total_paid should be updated"
        assert parent_after.get("status") in ["partiellement_payée", "partiel"], f"Parent status should be partial, got {parent_after.get('status')}"
        
        print(f"✓ Payment synced to parent: total_paid={parent_after['total_paid']}, status={parent_after['status']}")
    
    # ==================== INVOICE TYPE BADGE TESTS ====================
    
    def test_deposit_invoice_has_correct_type(self):
        """Test that deposit invoice has invoice_type='deposit'"""
        invoice_id = self.create_test_invoice(1000)
        
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        deposit_id = deposit_response.json().get("id")
        self.created_invoice_ids.append(deposit_id)
        
        # Get deposit invoice details
        deposit_invoice = self.session.get(f"{BASE_URL}/api/invoices/{deposit_id}").json()
        
        assert deposit_invoice.get("invoice_type") == "deposit"
        assert deposit_invoice.get("parent_invoice_id") == invoice_id
        
        print(f"✓ Deposit invoice has correct type: {deposit_invoice['invoice_type']}")
    
    def test_balance_invoice_has_correct_type(self):
        """Test that balance invoice has invoice_type='balance'"""
        invoice_id = self.create_test_invoice(1000)
        
        # Create deposit first
        deposit_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        assert deposit_response.status_code == 200
        self.created_invoice_ids.append(deposit_response.json().get("id"))
        
        # Create balance
        balance_response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/create-balance",
            json={}
        )
        assert balance_response.status_code == 200
        balance_id = balance_response.json().get("id")
        self.created_invoice_ids.append(balance_id)
        
        # Get balance invoice details
        balance_invoice = self.session.get(f"{BASE_URL}/api/invoices/{balance_id}").json()
        
        assert balance_invoice.get("invoice_type") == "balance"
        assert balance_invoice.get("parent_invoice_id") == invoice_id
        
        print(f"✓ Balance invoice has correct type: {balance_invoice['invoice_type']}")


class TestDepositBalanceEdgeCases:
    """Edge case tests for deposit/balance functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_invoice_ids = []
        
        yield
        
        for invoice_id in self.created_invoice_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
            except:
                pass
    
    def test_deposit_on_nonexistent_invoice(self):
        """Test creating deposit on non-existent invoice"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{fake_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent invoice")
    
    def test_balance_on_nonexistent_invoice(self):
        """Test creating balance on non-existent invoice"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{fake_id}/create-balance",
            json={}
        )
        
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent invoice")
    
    def test_related_on_nonexistent_invoice(self):
        """Test getting related invoices for non-existent invoice"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{fake_id}/related")
        
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent invoice")
    
    def test_deposit_without_auth(self):
        """Test that deposit creation requires authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        fake_id = str(uuid.uuid4())
        response = unauth_session.post(
            f"{BASE_URL}/api/invoices/{fake_id}/create-deposit",
            json={"deposit_type": "percent", "deposit_value": 30}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Correctly requires authentication for deposit creation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
