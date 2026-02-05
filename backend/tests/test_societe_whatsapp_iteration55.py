"""
Test Suite for MoltBot CRM - Iteration 55
Tests:
- Societe.com API search company
- Societe.com API company details
- WhatsApp webhook accessibility
- Contacts API
- Login API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crm-intelligence-13.preview.emergentagent.com')

class TestAuthentication:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@alphagency.fr"
        print(f"SUCCESS: Login works - User: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "wrong@example.com",
                "password": "wrongpass"
            }
        )
        assert response.status_code in [401, 400, 404]
        print("SUCCESS: Invalid credentials rejected correctly")


class TestSocieteComAPI:
    """Societe.com API integration tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_search_company_by_name(self, auth_token):
        """Test searching company by name via Societe.com API"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/societe/search/company",
            params={"q": "Alpha"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "companies" in data
        assert "count" in data
        
        # Verify we got results
        assert data["count"] > 0, "No companies found"
        assert len(data["companies"]) > 0
        
        # Verify company structure
        first_company = data["companies"][0]
        assert "siren" in first_company
        assert "nom" in first_company
        
        print(f"SUCCESS: Found {data['count']} companies for 'Alpha'")
        print(f"First company: {first_company.get('nom')} (SIREN: {first_company.get('siren')})")
    
    def test_search_company_with_ville(self, auth_token):
        """Test searching company with city filter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/societe/search/company",
            params={"q": "Alpha", "ville": "Paris"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"SUCCESS: Search with city filter works - Found {data.get('count', 0)} companies")
    
    def test_get_company_details_by_siren(self, auth_token):
        """Test getting company details by SIREN"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First search for a company to get a valid SIREN
        search_response = requests.get(
            f"{BASE_URL}/api/societe/search/company",
            params={"q": "Alpha"},
            headers=headers
        )
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            if search_data.get("companies") and len(search_data["companies"]) > 0:
                siren = search_data["companies"][0].get("siren")
                
                if siren:
                    # Get company details
                    response = requests.get(
                        f"{BASE_URL}/api/societe/company/{siren}",
                        headers=headers
                    )
                    
                    assert response.status_code == 200, f"Company details failed: {response.text}"
                    data = response.json()
                    
                    assert "success" in data
                    assert "company" in data
                    
                    print(f"SUCCESS: Company details retrieved for SIREN {siren}")
                    print(f"Company: {data.get('company', {}).get('nom', 'N/A')}")
                    return
        
        print("INFO: Could not test company details - no valid SIREN found")
    
    def test_search_company_unauthorized(self):
        """Test that search requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/societe/search/company",
            params={"q": "Alpha"}
        )
        
        assert response.status_code in [401, 403], "Should require authentication"
        print("SUCCESS: Societe.com API requires authentication")


class TestWhatsAppWebhook:
    """WhatsApp webhook accessibility tests"""
    
    def test_webhook_post_accessible(self):
        """Test that WhatsApp webhook POST endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json={
                "phone_number": "33612345678",
                "message": "test"
            }
        )
        
        # Webhook should accept the request (200) or return validation error (422)
        # but NOT 404 (not found) or 500 (server error)
        assert response.status_code in [200, 422, 401, 403], f"Webhook not accessible: {response.status_code}"
        print(f"SUCCESS: WhatsApp webhook POST is accessible (status: {response.status_code})")
    
    def test_webhook_get_not_allowed(self):
        """Test that GET method is not allowed on webhook"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/webhook")
        
        # GET should return 405 Method Not Allowed
        assert response.status_code == 405, f"Expected 405, got {response.status_code}"
        print("SUCCESS: WhatsApp webhook correctly rejects GET requests")
    
    def test_whatsapp_status_endpoint(self):
        """Test WhatsApp status endpoint"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        
        assert response.status_code == 200, f"Status endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "connected" in data or "status" in data
        print(f"SUCCESS: WhatsApp status endpoint works - Response: {data}")


class TestContactsAPI:
    """Contacts API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_contacts_list(self, auth_token):
        """Test getting contacts list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers=headers
        )
        
        assert response.status_code == 200, f"Contacts list failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Expected list of contacts"
        
        if len(data) > 0:
            # Verify contact structure
            first_contact = data[0]
            assert "first_name" in first_contact or "id" in first_contact
            print(f"SUCCESS: Retrieved {len(data)} contacts")
        else:
            print("INFO: No contacts found (empty list)")
    
    def test_contacts_unauthorized(self):
        """Test that contacts require authentication"""
        response = requests.get(f"{BASE_URL}/api/contacts")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Contacts API requires authentication")


class TestMoltBotAPI:
    """MoltBot API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_moltbot_stats(self, auth_token):
        """Test MoltBot stats endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/moltbot/stats",
            headers=headers
        )
        
        assert response.status_code == 200, f"MoltBot stats failed: {response.text}"
        data = response.json()
        
        # Verify response has expected fields
        assert "revenue" in data or "contacts" in data or "tasks" in data
        print(f"SUCCESS: MoltBot stats endpoint works - Data: {data}")
    
    def test_moltbot_public_faq(self):
        """Test MoltBot public FAQ endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/moltbot/public/faq")
        
        assert response.status_code == 200, f"Public FAQ failed: {response.text}"
        print("SUCCESS: MoltBot public FAQ endpoint works")


class TestPDFGeneration:
    """PDF generation tests for quotes"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@alphagency.fr",
                "password": "Test123!"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_invoices_list(self, auth_token):
        """Test getting invoices/quotes list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers=headers
        )
        
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        data = response.json()
        
        # Should return a list or dict with invoices
        if isinstance(data, list):
            print(f"SUCCESS: Retrieved {len(data)} invoices/quotes")
        elif isinstance(data, dict) and "invoices" in data:
            print(f"SUCCESS: Retrieved {len(data['invoices'])} invoices/quotes")
        else:
            print(f"INFO: Invoices response structure: {type(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
