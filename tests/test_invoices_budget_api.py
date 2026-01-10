"""
Test suite for Invoices and Budget APIs
Tests: /api/invoices, /api/invoices/{id}/pdf, /api/invoices/{id}/payments, /api/budget, /api/budget/stats/summary
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        return data["token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@alphagency.fr"
        assert data["user"]["role"] == "super_admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestInvoicesAPI:
    """Invoice CRUD and related operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_contact_id(self, auth_headers):
        """Create a test contact for invoice tests"""
        contact_data = {
            "first_name": "TEST_Invoice",
            "last_name": "Contact",
            "email": f"test_invoice_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "0690000000",
            "company": "Test Company"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_invoices_list(self, auth_headers):
        """Test GET /api/invoices - list all invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
    
    def test_create_invoice(self, auth_headers, test_contact_id):
        """Test POST /api/invoices - create new invoice"""
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [
                {
                    "title": "Service de test",
                    "description": "Description du service de test",
                    "quantity": 2,
                    "unit_price": 500.0,
                    "discount": 10,
                    "discountType": "%"
                }
            ],
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "payment_terms": "30",
            "notes": "Test invoice notes",
            "document_type": "facture",
            "globalDiscount": 5,
            "globalDiscountType": "%"
        }
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        assert response.status_code == 200, f"Create invoice failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("FAC-")
        print(f"Created invoice: {data['invoice_number']}")
        return data["id"]
    
    def test_get_single_invoice(self, auth_headers, test_contact_id):
        """Test GET /api/invoices/{id} - get single invoice"""
        # First create an invoice
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [{"description": "Test item", "quantity": 1, "unit_price": 100.0}],
            "document_type": "facture"
        }
        create_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        invoice_id = create_response.json()["id"]
        
        # Get the invoice
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == invoice_id
        assert data["contact_id"] == test_contact_id
        assert "items" in data
        assert "total" in data
    
    def test_update_invoice(self, auth_headers, test_contact_id):
        """Test PUT /api/invoices/{id} - update invoice"""
        # Create invoice
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [{"description": "Original item", "quantity": 1, "unit_price": 100.0}],
            "document_type": "facture"
        }
        create_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        invoice_id = create_response.json()["id"]
        
        # Update invoice
        update_data = {
            "items": [{"description": "Updated item", "quantity": 2, "unit_price": 200.0}],
            "notes": "Updated notes"
        }
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        data = get_response.json()
        assert data["notes"] == "Updated notes"
        assert data["items"][0]["description"] == "Updated item"
    
    def test_update_invoice_status(self, auth_headers, test_contact_id):
        """Test PUT /api/invoices/{id}/status - update invoice status"""
        # Create invoice
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [{"description": "Status test", "quantity": 1, "unit_price": 100.0}],
            "document_type": "facture"
        }
        create_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        invoice_id = create_response.json()["id"]
        
        # Update status
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}/status", 
                               json={"status": "envoyee"}, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify status
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert get_response.json()["status"] == "envoyee"
    
    def test_delete_invoice(self, auth_headers, test_contact_id):
        """Test DELETE /api/invoices/{id} - delete invoice"""
        # Create invoice
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [{"description": "To delete", "quantity": 1, "unit_price": 100.0}],
            "document_type": "facture"
        }
        create_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        invoice_id = create_response.json()["id"]
        
        # Delete invoice
        response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_invoice_not_found(self, auth_headers):
        """Test 404 for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/invoices/non-existent-id", headers=auth_headers)
        assert response.status_code == 404


class TestInvoicePDF:
    """Invoice PDF generation tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_contact_id(self, auth_headers):
        contact_data = {
            "first_name": "TEST_PDF",
            "last_name": "Contact",
            "email": f"test_pdf_{uuid.uuid4().hex[:8]}@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, 
                                headers={**auth_headers, "Content-Type": "application/json"})
        return response.json()["id"]
    
    def test_download_invoice_pdf(self, auth_headers, test_contact_id):
        """Test GET /api/invoices/{id}/pdf - download PDF"""
        # Create invoice
        invoice_data = {
            "contact_id": test_contact_id,
            "items": [
                {"title": "Service Web", "description": "Création site web", "quantity": 1, "unit_price": 1500.0}
            ],
            "document_type": "facture"
        }
        create_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, 
                                       headers={**auth_headers, "Content-Type": "application/json"})
        invoice_id = create_response.json()["id"]
        
        # Download PDF
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 0
        print(f"PDF size: {len(response.content)} bytes")


class TestInvoicePayments:
    """Invoice payments management tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_invoice(self, auth_headers):
        """Create a test invoice for payment tests"""
        # Create contact first
        contact_data = {
            "first_name": "TEST_Payment",
            "last_name": "Contact",
            "email": f"test_payment_{uuid.uuid4().hex[:8]}@test.com"
        }
        contact_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=auth_headers)
        contact_id = contact_response.json()["id"]
        
        # Create invoice
        invoice_data = {
            "contact_id": contact_id,
            "items": [{"description": "Payment test service", "quantity": 1, "unit_price": 1000.0}],
            "document_type": "facture"
        }
        invoice_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        return invoice_response.json()["id"]
    
    def test_add_payment(self, auth_headers, test_invoice):
        """Test POST /api/invoices/{id}/payments - add payment"""
        payment_data = {
            "amount": 500.0,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_method": "virement",
            "notes": "Acompte 50%"
        }
        response = requests.post(f"{BASE_URL}/api/invoices/{test_invoice}/payments", 
                                json=payment_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "payment_id" in data
        assert data["total_paid"] == 500.0
        assert data["status"] == "partiellement_payée"
        print(f"Payment added: {data['payment_id']}, status: {data['status']}")
    
    def test_get_payments(self, auth_headers, test_invoice):
        """Test GET /api/invoices/{id}/payments - list payments"""
        response = requests.get(f"{BASE_URL}/api/invoices/{test_invoice}/payments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} payments")
    
    def test_full_payment_marks_paid(self, auth_headers):
        """Test that full payment marks invoice as paid"""
        # Create new invoice
        contact_data = {
            "first_name": "TEST_FullPay",
            "last_name": "Contact",
            "email": f"test_fullpay_{uuid.uuid4().hex[:8]}@test.com"
        }
        contact_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=auth_headers)
        contact_id = contact_response.json()["id"]
        
        invoice_data = {
            "contact_id": contact_id,
            "items": [{"description": "Full payment test", "quantity": 1, "unit_price": 100.0}],
            "document_type": "facture"
        }
        invoice_response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        invoice_id = invoice_response.json()["id"]
        
        # Get invoice total (with TVA)
        invoice = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers).json()
        total = invoice["total"]
        
        # Pay full amount
        payment_data = {
            "amount": total,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_method": "carte"
        }
        response = requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/payments", 
                                json=payment_data, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "payée"


class TestBudgetAPI:
    """Budget CRUD and statistics tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_budget_entries(self, auth_headers):
        """Test GET /api/budget - list budget entries"""
        response = requests.get(f"{BASE_URL}/api/budget", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} budget entries")
    
    def test_create_revenue_entry(self, auth_headers):
        """Test POST /api/budget - create revenue entry"""
        entry_data = {
            "type": "revenue",
            "amount": 5000.0,
            "category": "Services Web",
            "description": "TEST_Revenue entry",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "recurring": False
        }
        response = requests.post(f"{BASE_URL}/api/budget", json=entry_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"Created revenue entry: {data['id']}")
        return data["id"]
    
    def test_create_expense_entry(self, auth_headers):
        """Test POST /api/budget - create expense entry"""
        entry_data = {
            "type": "expense",
            "amount": 1500.0,
            "category": "Marketing",
            "description": "TEST_Expense entry",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "recurring": True,
            "recurring_frequency": "monthly"
        }
        response = requests.post(f"{BASE_URL}/api/budget", json=entry_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"Created expense entry: {data['id']}")
        return data["id"]
    
    def test_get_single_budget_entry(self, auth_headers):
        """Test GET /api/budget/{id} - get single entry"""
        # Create entry first
        entry_data = {
            "type": "revenue",
            "amount": 1000.0,
            "category": "Consulting",
            "description": "TEST_Single entry",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = requests.post(f"{BASE_URL}/api/budget", json=entry_data, headers=auth_headers)
        entry_id = create_response.json()["id"]
        
        # Get entry
        response = requests.get(f"{BASE_URL}/api/budget/{entry_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entry_id
        assert data["type"] == "revenue"
        assert data["amount"] == 1000.0
    
    def test_update_budget_entry(self, auth_headers):
        """Test PUT /api/budget/{id} - update entry"""
        # Create entry
        entry_data = {
            "type": "expense",
            "amount": 500.0,
            "category": "Office",
            "description": "TEST_Update entry",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = requests.post(f"{BASE_URL}/api/budget", json=entry_data, headers=auth_headers)
        entry_id = create_response.json()["id"]
        
        # Update entry
        update_data = {
            "amount": 750.0,
            "description": "TEST_Updated entry"
        }
        response = requests.put(f"{BASE_URL}/api/budget/{entry_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/budget/{entry_id}", headers=auth_headers)
        data = get_response.json()
        assert data["amount"] == 750.0
        assert data["description"] == "TEST_Updated entry"
    
    def test_delete_budget_entry(self, auth_headers):
        """Test DELETE /api/budget/{id} - delete entry"""
        # Create entry
        entry_data = {
            "type": "expense",
            "amount": 100.0,
            "category": "Misc",
            "description": "TEST_Delete entry",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = requests.post(f"{BASE_URL}/api/budget", json=entry_data, headers=auth_headers)
        entry_id = create_response.json()["id"]
        
        # Delete entry
        response = requests.delete(f"{BASE_URL}/api/budget/{entry_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/budget/{entry_id}", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_budget_summary_stats(self, auth_headers):
        """Test GET /api/budget/stats/summary - get budget statistics"""
        response = requests.get(f"{BASE_URL}/api/budget/stats/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_revenue" in data
        assert "total_expense" in data
        assert "net_balance" in data
        assert "revenue_by_category" in data
        assert "expense_by_category" in data
        print(f"Budget summary: Revenue={data['total_revenue']}, Expense={data['total_expense']}, Net={data['net_balance']}")
    
    def test_budget_filter_by_type(self, auth_headers):
        """Test GET /api/budget with type filter"""
        response = requests.get(f"{BASE_URL}/api/budget?type=revenue", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for entry in data:
            assert entry["type"] == "revenue"
    
    def test_budget_categories_list(self, auth_headers):
        """Test GET /api/budget/categories/list - get all categories"""
        response = requests.get(f"{BASE_URL}/api/budget/categories/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "revenue_categories" in data
        assert "expense_categories" in data


class TestLeadAPI:
    """Public lead submission API tests (contact form)"""
    
    def test_submit_lead(self):
        """Test POST /api/lead - submit contact form (public endpoint)"""
        lead_data = {
            "first_name": "TEST_Lead",
            "last_name": "Submission",
            "email": f"test_lead_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "0690123456",
            "company": "Test Company",
            "project_type": "site_vitrine",
            "budget": "5000-10000€",
            "message": "Test message from automated testing"
        }
        response = requests.post(f"{BASE_URL}/api/lead", json=lead_data)
        assert response.status_code == 200, f"Lead submission failed: {response.text}"
        data = response.json()
        assert "id" in data or "message" in data
        print(f"Lead submitted successfully")


# Cleanup fixture to remove test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup would go here if needed
    print("Test session completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
