"""
Test suite for Contact History functionality
Tests: GET /api/contacts/{id}/history - retrieves quotes, invoices, tasks, and summary
Tests: POST /api/quotes/{id}/convert-to-invoice - converts quote to invoice
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taskflow-revamp-3.preview.emergentagent.com')


class TestContactHistory:
    """Test suite for contact history API endpoint"""
    
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
        
        # Get existing contacts
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        self.contacts = contacts_response.json()
    
    def test_01_get_contacts_list(self):
        """Test that we can retrieve contacts list"""
        response = self.session.get(f"{BASE_URL}/api/contacts")
        assert response.status_code == 200
        contacts = response.json()
        assert isinstance(contacts, list)
        print(f"✓ Found {len(contacts)} contacts")
        
        if contacts:
            contact = contacts[0]
            print(f"  First contact: {contact.get('first_name')} {contact.get('last_name')}")
    
    def test_02_get_contact_history_endpoint_exists(self):
        """Test that GET /api/contacts/{id}/history endpoint exists"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        
        # Should return 200, not 404
        assert response.status_code == 200, f"History endpoint returned {response.status_code}: {response.text}"
        print(f"✓ GET /api/contacts/{contact_id}/history endpoint exists and returns 200")
    
    def test_03_contact_history_response_structure(self):
        """Test that history response has correct structure"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        
        # Check required fields
        assert 'quotes' in history, "Missing 'quotes' field"
        assert 'invoices' in history, "Missing 'invoices' field"
        assert 'tasks' in history, "Missing 'tasks' field"
        assert 'summary' in history, "Missing 'summary' field"
        
        # Check summary structure
        summary = history['summary']
        assert 'total_quotes' in summary, "Missing 'total_quotes' in summary"
        assert 'total_invoices' in summary, "Missing 'total_invoices' in summary"
        assert 'total_tasks' in summary, "Missing 'total_tasks' in summary"
        assert 'total_quoted' in summary, "Missing 'total_quoted' in summary"
        assert 'total_invoiced' in summary, "Missing 'total_invoiced' in summary"
        assert 'total_paid' in summary, "Missing 'total_paid' in summary"
        assert 'total_remaining' in summary, "Missing 'total_remaining' in summary"
        
        print(f"✓ History response has correct structure")
        print(f"  Quotes: {summary['total_quotes']}, Invoices: {summary['total_invoices']}, Tasks: {summary['total_tasks']}")
        print(f"  Total quoted: {summary['total_quoted']}€, Total invoiced: {summary['total_invoiced']}€")
        print(f"  Total paid: {summary['total_paid']}€, Remaining: {summary['total_remaining']}€")
    
    def test_04_contact_history_quotes_array(self):
        """Test that quotes array contains valid quote objects"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        quotes = history.get('quotes', [])
        
        assert isinstance(quotes, list), "quotes should be a list"
        print(f"✓ Quotes array is valid list with {len(quotes)} items")
        
        if quotes:
            quote = quotes[0]
            # Check quote structure
            assert 'id' in quote, "Quote missing 'id'"
            assert 'quote_number' in quote, "Quote missing 'quote_number'"
            assert 'status' in quote, "Quote missing 'status'"
            assert 'total' in quote, "Quote missing 'total'"
            print(f"  First quote: {quote.get('quote_number')} - {quote.get('status')} - {quote.get('total')}€")
    
    def test_05_contact_history_invoices_array(self):
        """Test that invoices array contains valid invoice objects"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        invoices = history.get('invoices', [])
        
        assert isinstance(invoices, list), "invoices should be a list"
        print(f"✓ Invoices array is valid list with {len(invoices)} items")
        
        if invoices:
            invoice = invoices[0]
            # Check invoice structure
            assert 'id' in invoice, "Invoice missing 'id'"
            assert 'invoice_number' in invoice, "Invoice missing 'invoice_number'"
            assert 'status' in invoice, "Invoice missing 'status'"
            assert 'total' in invoice, "Invoice missing 'total'"
            print(f"  First invoice: {invoice.get('invoice_number')} - {invoice.get('status')} - {invoice.get('total')}€")
    
    def test_06_contact_history_tasks_array(self):
        """Test that tasks array contains valid task objects"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        tasks = history.get('tasks', [])
        
        assert isinstance(tasks, list), "tasks should be a list"
        print(f"✓ Tasks array is valid list with {len(tasks)} items")
        
        if tasks:
            task = tasks[0]
            # Check task structure
            assert 'id' in task, "Task missing 'id'"
            assert 'title' in task, "Task missing 'title'"
            print(f"  First task: {task.get('title')}")
    
    def test_07_contact_history_nonexistent_contact(self):
        """Test that history for non-existent contact returns 404"""
        response = self.session.get(f"{BASE_URL}/api/contacts/nonexistent-id/history")
        assert response.status_code == 404
        print("✓ History for non-existent contact returns 404")
    
    def test_08_contact_history_summary_calculations(self):
        """Test that summary calculations are correct"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        response = self.session.get(f"{BASE_URL}/api/contacts/{contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        summary = history['summary']
        
        # Verify counts match array lengths
        assert summary['total_quotes'] == len(history['quotes']), "total_quotes doesn't match quotes array length"
        assert summary['total_invoices'] == len(history['invoices']), "total_invoices doesn't match invoices array length"
        assert summary['total_tasks'] == len(history['tasks']), "total_tasks doesn't match tasks array length"
        
        # Verify total_quoted calculation
        calculated_quoted = sum(q.get('total', 0) for q in history['quotes'])
        assert summary['total_quoted'] == calculated_quoted, f"total_quoted mismatch: {summary['total_quoted']} vs {calculated_quoted}"
        
        # Verify total_invoiced calculation
        calculated_invoiced = sum(i.get('total', 0) for i in history['invoices'])
        assert summary['total_invoiced'] == calculated_invoiced, f"total_invoiced mismatch: {summary['total_invoiced']} vs {calculated_invoiced}"
        
        print("✓ Summary calculations are correct")


class TestQuoteToInvoiceConversion:
    """Test suite for quote to invoice conversion"""
    
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
        
        # Get contacts
        contacts_response = self.session.get(f"{BASE_URL}/api/contacts")
        assert contacts_response.status_code == 200
        self.contacts = contacts_response.json()
    
    def test_01_create_test_quote_for_conversion(self):
        """Create a test quote for conversion testing"""
        if not self.contacts:
            pytest.skip("No contacts available")
        
        contact_id = self.contacts[0]['id']
        
        # Create a new quote
        quote_data = {
            "contact_id": contact_id,
            "items": [
                {"title": "TEST_Service", "description": "Service de test pour conversion", "quantity": 1, "unit_price": 500}
            ],
            "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "TEST_Quote for conversion testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/quotes", json=quote_data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        
        pytest.test_quote_id = result['id']
        pytest.test_quote_number = result.get('quote_number', '')
        print(f"✓ Created test quote: {pytest.test_quote_number}")
        
        # Verify quote was created with brouillon status
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}")
        assert get_response.status_code == 200
        quote = get_response.json()
        assert quote['status'] == 'brouillon'
        print(f"  Initial status: {quote['status']}")
    
    def test_02_send_quote_to_change_status(self):
        """Send quote to change status to 'envoyé'"""
        if not hasattr(pytest, 'test_quote_id'):
            pytest.skip("No test quote created")
        
        # Send the quote
        response = self.session.post(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}/send")
        assert response.status_code == 200
        print("✓ Quote sent successfully")
        
        # Verify status changed to envoyé
        get_response = self.session.get(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}")
        assert get_response.status_code == 200
        quote = get_response.json()
        assert quote['status'] == 'envoyé', f"Expected 'envoyé', got '{quote['status']}'"
        print(f"  New status: {quote['status']}")
    
    def test_03_convert_quote_to_invoice(self):
        """Test POST /api/quotes/{id}/convert-to-invoice"""
        if not hasattr(pytest, 'test_quote_id'):
            pytest.skip("No test quote created")
        
        # Convert quote to invoice
        response = self.session.post(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}/convert-to-invoice")
        assert response.status_code == 200, f"Conversion failed: {response.text}"
        
        result = response.json()
        assert 'invoice_id' in result, "Response missing 'invoice_id'"
        assert 'invoice_number' in result, "Response missing 'invoice_number'"
        
        pytest.test_invoice_id = result['invoice_id']
        pytest.test_invoice_number = result['invoice_number']
        
        print(f"✓ Quote converted to invoice: {pytest.test_invoice_number}")
    
    def test_04_verify_quote_status_after_conversion(self):
        """Verify quote status changed to 'accepté' after conversion"""
        if not hasattr(pytest, 'test_quote_id'):
            pytest.skip("No test quote created")
        
        response = self.session.get(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}")
        assert response.status_code == 200
        quote = response.json()
        
        assert quote['status'] == 'accepté', f"Expected 'accepté', got '{quote['status']}'"
        print(f"✓ Quote status correctly changed to 'accepté'")
    
    def test_05_verify_invoice_created_from_quote(self):
        """Verify invoice was created with correct data from quote"""
        if not hasattr(pytest, 'test_invoice_id'):
            pytest.skip("No test invoice created")
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
        assert response.status_code == 200
        invoice = response.json()
        
        # Verify invoice has correct data
        assert invoice['quote_id'] == pytest.test_quote_id, "Invoice should reference original quote"
        assert invoice['status'] == 'en_attente', f"Expected 'en_attente', got '{invoice['status']}'"
        assert len(invoice.get('items', [])) > 0, "Invoice should have items from quote"
        
        print(f"✓ Invoice created correctly from quote")
        print(f"  Invoice number: {invoice['invoice_number']}")
        print(f"  Status: {invoice['status']}")
        print(f"  Total: {invoice.get('total', 0)}€")
        print(f"  Items: {len(invoice.get('items', []))}")
    
    def test_06_convert_nonexistent_quote(self):
        """Test converting non-existent quote returns 404"""
        response = self.session.post(f"{BASE_URL}/api/quotes/nonexistent-id/convert-to-invoice")
        assert response.status_code == 404
        print("✓ Converting non-existent quote returns 404")
    
    def test_07_cleanup_test_data(self):
        """Cleanup: Delete test quote and invoice"""
        # Delete test invoice
        if hasattr(pytest, 'test_invoice_id'):
            response = self.session.delete(f"{BASE_URL}/api/invoices/{pytest.test_invoice_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test invoice {pytest.test_invoice_id}")
        
        # Delete test quote
        if hasattr(pytest, 'test_quote_id'):
            response = self.session.delete(f"{BASE_URL}/api/quotes/{pytest.test_quote_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test quote {pytest.test_quote_id}")


class TestContactWithHistory:
    """Test contact history with actual data - create contact with quotes/invoices/tasks"""
    
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
    
    def test_01_create_test_contact(self):
        """Create a test contact for history testing"""
        contact_data = {
            "first_name": "TEST_History",
            "last_name": "Contact",
            "email": "test_history@example.com",
            "phone": "0690123456",
            "company": "TEST Company",
            "note": "Test contact for history testing",
            "infos_sup": "Additional info for testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/contacts", json=contact_data)
        assert response.status_code == 200
        result = response.json()
        
        pytest.history_contact_id = result['id']
        print(f"✓ Created test contact: {pytest.history_contact_id}")
    
    def test_02_create_quote_for_contact(self):
        """Create a quote for the test contact"""
        if not hasattr(pytest, 'history_contact_id'):
            pytest.skip("No test contact created")
        
        quote_data = {
            "contact_id": pytest.history_contact_id,
            "items": [
                {"title": "Service A", "description": "Description A", "quantity": 2, "unit_price": 500},
                {"title": "Service B", "description": "Description B", "quantity": 1, "unit_price": 1000}
            ],
            "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "TEST_Quote for history"
        }
        
        response = self.session.post(f"{BASE_URL}/api/quotes", json=quote_data)
        assert response.status_code == 200
        result = response.json()
        
        pytest.history_quote_id = result['id']
        print(f"✓ Created quote for contact: {result.get('quote_number')}")
    
    def test_03_create_invoice_for_contact(self):
        """Create an invoice for the test contact"""
        if not hasattr(pytest, 'history_contact_id'):
            pytest.skip("No test contact created")
        
        invoice_data = {
            "contact_id": pytest.history_contact_id,
            "items": [
                {"title": "Service C", "description": "Description C", "quantity": 1, "unit_price": 750}
            ],
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "TEST_Invoice for history"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200
        result = response.json()
        
        pytest.history_invoice_id = result['id']
        print(f"✓ Created invoice for contact: {result.get('invoice_number')}")
    
    def test_04_create_task_for_contact(self):
        """Create a task for the test contact"""
        if not hasattr(pytest, 'history_contact_id'):
            pytest.skip("No test contact created")
        
        task_data = {
            "title": "TEST_Task for history",
            "description": "Task description for testing",
            "contact_id": pytest.history_contact_id,
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "priority": "high",
            "status": "todo"
        }
        
        response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert response.status_code == 200
        result = response.json()
        
        pytest.history_task_id = result['id']
        print(f"✓ Created task for contact: {result['id']}")
    
    def test_05_verify_contact_history_with_data(self):
        """Verify contact history contains created data"""
        if not hasattr(pytest, 'history_contact_id'):
            pytest.skip("No test contact created")
        
        response = self.session.get(f"{BASE_URL}/api/contacts/{pytest.history_contact_id}/history")
        assert response.status_code == 200
        
        history = response.json()
        
        # Verify quotes
        assert len(history['quotes']) >= 1, "Should have at least 1 quote"
        quote_ids = [q['id'] for q in history['quotes']]
        assert pytest.history_quote_id in quote_ids, "Created quote should be in history"
        
        # Verify invoices
        assert len(history['invoices']) >= 1, "Should have at least 1 invoice"
        invoice_ids = [i['id'] for i in history['invoices']]
        assert pytest.history_invoice_id in invoice_ids, "Created invoice should be in history"
        
        # Verify tasks
        assert len(history['tasks']) >= 1, "Should have at least 1 task"
        task_ids = [t['id'] for t in history['tasks']]
        assert pytest.history_task_id in task_ids, "Created task should be in history"
        
        # Verify summary
        summary = history['summary']
        assert summary['total_quotes'] >= 1
        assert summary['total_invoices'] >= 1
        assert summary['total_tasks'] >= 1
        assert summary['total_quoted'] > 0
        assert summary['total_invoiced'] > 0
        
        print(f"✓ Contact history contains all created data")
        print(f"  Quotes: {summary['total_quotes']}, Invoices: {summary['total_invoices']}, Tasks: {summary['total_tasks']}")
        print(f"  Total quoted: {summary['total_quoted']}€, Total invoiced: {summary['total_invoiced']}€")
    
    def test_06_cleanup_test_data(self):
        """Cleanup: Delete all test data"""
        # Delete task
        if hasattr(pytest, 'history_task_id'):
            response = self.session.delete(f"{BASE_URL}/api/tasks/{pytest.history_task_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test task")
        
        # Delete invoice
        if hasattr(pytest, 'history_invoice_id'):
            response = self.session.delete(f"{BASE_URL}/api/invoices/{pytest.history_invoice_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test invoice")
        
        # Delete quote
        if hasattr(pytest, 'history_quote_id'):
            response = self.session.delete(f"{BASE_URL}/api/quotes/{pytest.history_quote_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test quote")
        
        # Delete contact
        if hasattr(pytest, 'history_contact_id'):
            response = self.session.delete(f"{BASE_URL}/api/contacts/{pytest.history_contact_id}")
            if response.status_code == 200:
                print(f"✓ Cleaned up test contact")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
