"""
Test suite for Invoice Payments functionality
Tests: POST /api/invoices/{id}/payments, GET /api/invoices/{id}/payments, DELETE /api/invoices/{id}/payments/{payment_id}
Tests automatic status updates: partiellement_payée, payée
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://socialsync-21.preview.emergentagent.com')

class TestInvoicePayments:
    """Test suite for invoice payment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - authenticate and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get existing invoices
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        assert invoices_response.status_code == 200
        self.invoices = invoices_response.json()
        
        # Get contacts for creating test invoice
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        self.contacts = contacts_response.json()
    
    def test_01_get_existing_invoices(self):
        """Test that we can retrieve existing invoices"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        invoices = response.json()
        assert isinstance(invoices, list)
        print(f"✓ Found {len(invoices)} invoices")
        
        # Check for FAC-2025-0001 with existing payment
        fac_2025 = next((inv for inv in invoices if inv.get('invoice_number') == 'FAC-2025-0001'), None)
        if fac_2025:
            print(f"✓ FAC-2025-0001 found with status: {fac_2025.get('status')}")
            print(f"  Total: {fac_2025.get('total')}, Paid: {fac_2025.get('total_paid', 0)}, Remaining: {fac_2025.get('remaining', fac_2025.get('total'))}")
            assert fac_2025.get('status') == 'partiellement_payée', f"Expected partiellement_payée, got {fac_2025.get('status')}"
    
    def test_02_get_payments_for_invoice(self):
        """Test GET /api/invoices/{id}/payments - List payments for an invoice"""
        # Find invoice with payments (FAC-2025-0001)
        fac_2025 = next((inv for inv in self.invoices if inv.get('invoice_number') == 'FAC-2025-0001'), None)
        
        if fac_2025:
            response = self.session.get(f"{BASE_URL}/api/invoices/{fac_2025['id']}/payments")
            assert response.status_code == 200
            payments = response.json()
            assert isinstance(payments, list)
            print(f"✓ GET payments returned {len(payments)} payment(s)")
            
            if payments:
                payment = payments[0]
                assert 'id' in payment
                assert 'amount' in payment
                assert 'payment_date' in payment
                assert 'payment_method' in payment
                print(f"  Payment: {payment.get('amount')}€ via {payment.get('payment_method')} on {payment.get('payment_date')}")
        else:
            pytest.skip("FAC-2025-0001 not found")
    
    def test_03_get_payments_for_nonexistent_invoice(self):
        """Test GET payments for non-existent invoice returns 404"""
        response = self.session.get(f"{BASE_URL}/api/invoices/nonexistent-id/payments")
        assert response.status_code == 404
        print("✓ GET payments for non-existent invoice returns 404")
    
    def test_04_create_test_invoice_for_payment_tests(self):
        """Create a test invoice for payment testing"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        
        # Create a new invoice
        invoice_data = {
            "contact_id": contact_id,
            "items": [
                {"description": "TEST_Service de test pour paiements", "quantity": 1, "unit_price": 1000}
            ],
            "due_date": "2026-02-15",
            "notes": "TEST_Invoice for payment testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        
        self.test_invoice_id = result['id']
        print(f"✓ Created test invoice: {result.get('invoice_number', result['id'])}")
        
        # Verify invoice was created with correct status
        get_response = self.session.get(f"{BASE_URL}/api/invoices/{self.test_invoice_id}")
        assert get_response.status_code == 200
        invoice = get_response.json()
        assert invoice['status'] == 'brouillon'
        print(f"  Initial status: {invoice['status']}")
        
        # Store for cleanup
        pytest.test_invoice_id = self.test_invoice_id
        return self.test_invoice_id
    
    def test_05_add_payment_to_invoice(self):
        """Test POST /api/invoices/{id}/payments - Add a payment"""
        # First create a test invoice or use existing one
        if not hasattr(pytest, 'test_invoice_id'):
            self.test_04_create_test_invoice_for_payment_tests()
        
        invoice_id = pytest.test_invoice_id
        
        # Get invoice total
        invoice_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert invoice_response.status_code == 200
        invoice = invoice_response.json()
        total = invoice.get('total', 1085)  # 1000 + 8.5% TVA
        
        # Add partial payment (50%)
        payment_data = {
            "amount": total / 2,
            "payment_date": "2026-01-08",
            "payment_method": "virement",
            "notes": "TEST_Acompte 50%"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/payments", json=payment_data)
        assert response.status_code == 200
        result = response.json()
        
        assert 'payment_id' in result
        assert 'total_paid' in result
        assert 'remaining' in result
        assert 'status' in result
        
        print(f"✓ Added payment: {payment_data['amount']}€")
        print(f"  Total paid: {result['total_paid']}€, Remaining: {result['remaining']}€")
        print(f"  New status: {result['status']}")
        
        # Verify status is partiellement_payée
        assert result['status'] == 'partiellement_payée', f"Expected partiellement_payée, got {result['status']}"
        
        pytest.first_payment_id = result['payment_id']
    
    def test_06_verify_partial_payment_status(self):
        """Verify invoice status is partiellement_payée after partial payment"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert response.status_code == 200
        invoice = response.json()
        
        assert invoice['status'] == 'partiellement_payée'
        assert invoice.get('total_paid', 0) > 0
        assert invoice.get('remaining', invoice['total']) > 0
        print(f"✓ Invoice status correctly set to partiellement_payée")
        print(f"  Payments array has {len(invoice.get('payments', []))} payment(s)")
    
    def test_07_add_second_payment_to_complete(self):
        """Test adding second payment to complete the invoice"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        # Get current remaining amount
        invoice_response = self.session.get(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert invoice_response.status_code == 200
        invoice = invoice_response.json()
        remaining = invoice.get('remaining', invoice['total'])
        
        # Add payment for remaining amount
        payment_data = {
            "amount": remaining,
            "payment_date": "2026-01-09",
            "payment_method": "carte",
            "notes": "TEST_Solde final"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}/payments", json=payment_data)
        assert response.status_code == 200
        result = response.json()
        
        print(f"✓ Added final payment: {remaining}€")
        print(f"  Total paid: {result['total_paid']}€, Remaining: {result['remaining']}€")
        print(f"  New status: {result['status']}")
        
        # Verify status is now payée
        assert result['status'] == 'payée', f"Expected payée, got {result['status']}"
        assert result['remaining'] == 0 or result['remaining'] < 0.01  # Allow for floating point
        
        pytest.second_payment_id = result['payment_id']
    
    def test_08_verify_paid_status(self):
        """Verify invoice status is payée after full payment"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert response.status_code == 200
        invoice = response.json()
        
        assert invoice['status'] == 'payée'
        print(f"✓ Invoice status correctly set to payée")
        print(f"  Total: {invoice['total']}€, Paid: {invoice.get('total_paid', 0)}€")
    
    def test_09_delete_payment(self):
        """Test DELETE /api/invoices/{id}/payments/{payment_id}"""
        if not hasattr(pytest, 'test_invoice_id') or not hasattr(pytest, 'second_payment_id'):
            pytest.skip("No test invoice or payment created")
        
        # Delete the second payment
        response = self.session.delete(
            f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}/payments/{pytest.second_payment_id}"
        )
        assert response.status_code == 200
        result = response.json()
        
        print(f"✓ Deleted payment {pytest.second_payment_id}")
        print(f"  New status: {result.get('status')}")
        
        # Status should revert to partiellement_payée
        assert result['status'] == 'partiellement_payée', f"Expected partiellement_payée after delete, got {result['status']}"
    
    def test_10_verify_status_after_payment_deletion(self):
        """Verify status reverts correctly after payment deletion"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert response.status_code == 200
        invoice = response.json()
        
        assert invoice['status'] == 'partiellement_payée'
        assert invoice.get('remaining', 0) > 0
        print(f"✓ Status correctly reverted to partiellement_payée after payment deletion")
        print(f"  Remaining: {invoice.get('remaining')}€")
    
    def test_11_add_payment_to_nonexistent_invoice(self):
        """Test adding payment to non-existent invoice returns 404"""
        payment_data = {
            "amount": 100,
            "payment_date": "2026-01-08",
            "payment_method": "virement"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices/nonexistent-id/payments", json=payment_data)
        assert response.status_code == 404
        print("✓ Adding payment to non-existent invoice returns 404")
    
    def test_12_payment_methods_validation(self):
        """Test different payment methods are accepted"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        # Test with different payment methods
        methods = ["virement", "chèque", "carte", "espèces"]
        
        for method in methods:
            payment_data = {
                "amount": 10,
                "payment_date": "2026-01-08",
                "payment_method": method,
                "notes": f"TEST_Payment via {method}"
            }
            
            response = self.session.post(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}/payments", json=payment_data)
            # Should succeed (200) - we're just testing the method is accepted
            assert response.status_code == 200, f"Payment method {method} failed: {response.text}"
            print(f"✓ Payment method '{method}' accepted")
    
    def test_13_cleanup_test_invoice(self):
        """Cleanup: Delete test invoice"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice to cleanup")
        
        response = self.session.delete(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert response.status_code == 200
        print(f"✓ Cleaned up test invoice {pytest.test_invoice_id}")


class TestExistingInvoicePayments:
    """Test payments on existing invoices (FAC-2025-0001)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_fac_2025_0001_has_payment(self):
        """Verify FAC-2025-0001 has existing payment of 1000€"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        invoices = response.json()
        
        fac_2025 = next((inv for inv in invoices if inv.get('invoice_number') == 'FAC-2025-0001'), None)
        assert fac_2025 is not None, "FAC-2025-0001 not found"
        
        assert fac_2025.get('status') == 'partiellement_payée'
        assert fac_2025.get('total_paid') == 1000
        assert fac_2025.get('total') == 2712.5
        assert fac_2025.get('remaining') == 1712.5
        
        payments = fac_2025.get('payments', [])
        assert len(payments) == 1
        assert payments[0]['amount'] == 1000
        
        print(f"✓ FAC-2025-0001 verified:")
        print(f"  Status: {fac_2025['status']}")
        print(f"  Total: {fac_2025['total']}€, Paid: {fac_2025['total_paid']}€, Remaining: {fac_2025['remaining']}€")
    
    def test_fac_2026_0002_status(self):
        """Verify FAC-2026-0002 has status payee (old spelling)"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        invoices = response.json()
        
        fac_2026 = next((inv for inv in invoices if inv.get('invoice_number') == 'FAC-2026-0002'), None)
        assert fac_2026 is not None, "FAC-2026-0002 not found"
        
        # This invoice has old status 'payee' without accent
        assert fac_2026.get('status') == 'payee'
        print(f"✓ FAC-2026-0002 has status: {fac_2026['status']} (old spelling without accent)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
