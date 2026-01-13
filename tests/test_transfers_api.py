"""
Backend API Tests for Transfers Module (WeTransfer-like functionality)
Tests: /api/transfers/mine, /api/transfers/stats, /api/transfers/public/{id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://invoice-export-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestAuthAndTransfers:
    """Test authentication and transfers API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_transfers_mine_endpoint(self, auth_headers):
        """Test GET /api/transfers/mine - returns list of user's transfers"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/mine",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ /api/transfers/mine returned {len(data['data'])} transfers")
    
    def test_transfers_stats_endpoint(self, auth_headers):
        """Test GET /api/transfers/stats - returns transfer statistics"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "total_transfers" in data
        assert "active_transfers" in data
        assert "expired_transfers" in data
        assert "total_downloads" in data
        
        # Verify data types
        assert isinstance(data["total_transfers"], int)
        assert isinstance(data["active_transfers"], int)
        assert isinstance(data["expired_transfers"], int)
        assert isinstance(data["total_downloads"], int)
        
        print(f"✓ /api/transfers/stats returned: {data}")
    
    def test_transfers_public_invalid_id(self):
        """Test GET /api/transfers/public/{id} with invalid ID - returns 404"""
        response = requests.get(f"{BASE_URL}/api/transfers/public/invalid-test-id")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower() or "Transfer not found" in data["detail"]
        print("✓ /api/transfers/public/invalid-id correctly returns 404")
    
    def test_transfers_mine_requires_auth(self):
        """Test that /api/transfers/mine requires authentication"""
        response = requests.get(f"{BASE_URL}/api/transfers/mine")
        assert response.status_code == 401
        print("✓ /api/transfers/mine correctly requires authentication")
    
    def test_transfers_stats_requires_auth(self):
        """Test that /api/transfers/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/transfers/stats")
        assert response.status_code == 401
        print("✓ /api/transfers/stats correctly requires authentication")


class TestBudgetAPI:
    """Test Budget API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_budget_summary(self, auth_headers):
        """Test GET /api/budget/summary"""
        response = requests.get(
            f"{BASE_URL}/api/budget/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ /api/budget/summary endpoint works")


class TestInvoicesAPI:
    """Test Invoices API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_invoices_list(self, auth_headers):
        """Test GET /api/invoices"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ /api/invoices returned {len(data)} invoices")


class TestAIAssistantAPI:
    """Test AI Assistant API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_ai_status(self, auth_headers):
        """Test GET /api/ai-enhanced/status"""
        response = requests.get(
            f"{BASE_URL}/api/ai-enhanced/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ /api/ai-enhanced/status returned: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
