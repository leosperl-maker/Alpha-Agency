"""
Instagram Story Module Backend Tests
Tests for:
- Account management (CRUD)
- Story drafts (CRUD)
- Account history
- Account login test (Playwright automation)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInstagramStoryAuth:
    """Test authentication for Instagram Story endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_login_success(self):
        """Test that login works and returns token"""
        assert hasattr(self, 'token')
        assert self.token is not None


class TestInstagramAccounts:
    """Test Instagram account management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_list_accounts_returns_200(self):
        """Test GET /api/instagram-story/accounts returns 200"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts")
        assert response.status_code == 200
        
    def test_list_accounts_returns_accounts_array(self):
        """Test GET /api/instagram-story/accounts returns accounts array"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts")
        data = response.json()
        assert "accounts" in data
        assert isinstance(data["accounts"], list)
        assert "count" in data
        
    def test_add_account_returns_success(self):
        """Test POST /api/instagram-story/accounts creates account"""
        test_username = f"TEST_user_{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "account_id" in data
        assert data.get("username") == test_username
        
        # Cleanup - delete the test account
        account_id = data.get("account_id")
        if account_id:
            self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
    
    def test_add_duplicate_account_fails(self):
        """Test adding duplicate account returns error"""
        test_username = f"TEST_dup_{uuid.uuid4().hex[:8]}"
        
        # Create first account
        response1 = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        account_id = response1.json().get("account_id")
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        
        data = response2.json()
        assert data.get("success") == False
        assert "error" in data
        
        # Cleanup
        if account_id:
            self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
    
    def test_get_account_by_id(self):
        """Test GET /api/instagram-story/accounts/{id} returns account"""
        # First create an account
        test_username = f"TEST_get_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        account_id = create_response.json().get("account_id")
        
        # Get the account
        response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("username") == test_username
        assert data.get("id") == account_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
    
    def test_delete_account(self):
        """Test DELETE /api/instagram-story/accounts/{id} deletes account"""
        # First create an account
        test_username = f"TEST_del_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        account_id = create_response.json().get("account_id")
        
        # Delete the account
        delete_response = self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data.get("success") == True
        
        # Verify account is deleted
        get_response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_account_returns_404(self):
        """Test DELETE /api/instagram-story/accounts/{id} returns 404 for nonexistent"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{fake_id}")
        assert response.status_code == 404


class TestInstagramAccountTest:
    """Test Instagram account login test endpoint (Playwright automation)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_test_account_login_returns_200_not_500(self):
        """Test POST /api/instagram-story/accounts/{id}/test does NOT return 500"""
        # First create a test account
        test_username = f"TEST_login_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        account_id = create_response.json().get("account_id")
        
        # Test the login - should NOT return 500 (may timeout or fail login, but not crash)
        response = self.session.post(
            f"{BASE_URL}/api/instagram-story/accounts/{account_id}/test",
            timeout=60  # Allow time for Playwright
        )
        
        # The key test: should NOT be 500 (server error)
        assert response.status_code != 500, f"Got 500 error: {response.text}"
        assert response.status_code == 200
        
        data = response.json()
        # Should return a proper response (success or failure, but not crash)
        assert "success" in data or "error" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
    
    def test_test_nonexistent_account_returns_404(self):
        """Test POST /api/instagram-story/accounts/{id}/test returns 404 for nonexistent"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts/{fake_id}/test")
        assert response.status_code == 404


class TestInstagramAccountHistory:
    """Test Instagram account history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_account_history_returns_200(self):
        """Test GET /api/instagram-story/accounts/{id}/history returns 200"""
        # First create an account
        test_username = f"TEST_hist_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        account_id = create_response.json().get("account_id")
        
        # Get history
        response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts/{account_id}/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "account" in data
        assert "stories" in data
        assert "stats" in data
        assert data["account"]["id"] == account_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{account_id}")
    
    def test_get_history_nonexistent_account_returns_404(self):
        """Test GET /api/instagram-story/accounts/{id}/history returns 404 for nonexistent"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/instagram-story/accounts/{fake_id}/history")
        assert response.status_code == 404


class TestInstagramDrafts:
    """Test Instagram story drafts endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
        
        # Create a test account for drafts
        test_username = f"TEST_draft_acc_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/accounts", json={
            "username": test_username,
            "password": "test_password_123"
        })
        self.test_account_id = create_response.json().get("account_id")
    
    def teardown_method(self, method):
        """Cleanup test account after each test"""
        if hasattr(self, 'test_account_id') and self.test_account_id:
            self.session.delete(f"{BASE_URL}/api/instagram-story/accounts/{self.test_account_id}")
    
    def test_list_drafts_returns_200(self):
        """Test GET /api/instagram-story/drafts returns 200"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/drafts")
        assert response.status_code == 200
        
        data = response.json()
        assert "drafts" in data
        assert isinstance(data["drafts"], list)
        assert "count" in data
    
    def test_create_draft_returns_success(self):
        """Test POST /api/instagram-story/drafts creates draft"""
        response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image",
            "background_color": "#FF5733",
            "text_overlay": "Test Story Text"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "draft_id" in data
        assert data.get("status") == "draft"
        
        # Cleanup draft
        draft_id = data.get("draft_id")
        if draft_id:
            self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
    
    def test_create_draft_with_poll(self):
        """Test creating draft with poll sticker"""
        response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image",
            "background_color": "#000000",
            "poll": {
                "question": "Test Poll Question?",
                "options": ["Yes", "No"]
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify draft has poll
        draft_id = data.get("draft_id")
        get_response = self.session.get(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
        draft_data = get_response.json()
        assert draft_data.get("elements", {}).get("poll") is not None
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
    
    def test_create_draft_with_question(self):
        """Test creating draft with question sticker"""
        response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image",
            "background_color": "#000000",
            "question": {
                "question": "Ask me anything!"
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Cleanup
        draft_id = data.get("draft_id")
        if draft_id:
            self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
    
    def test_create_draft_with_invalid_account_returns_404(self):
        """Test creating draft with invalid account returns 404"""
        fake_account_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": fake_account_id,
            "media_type": "image"
        })
        
        assert response.status_code == 404
    
    def test_get_draft_by_id(self):
        """Test GET /api/instagram-story/drafts/{id} returns draft"""
        # Create a draft
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image",
            "text_overlay": "Test Get Draft"
        })
        draft_id = create_response.json().get("draft_id")
        
        # Get the draft
        response = self.session.get(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("id") == draft_id
        assert data.get("account_id") == self.test_account_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
    
    def test_delete_draft(self):
        """Test DELETE /api/instagram-story/drafts/{id} deletes draft"""
        # Create a draft
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image"
        })
        draft_id = create_response.json().get("draft_id")
        
        # Delete the draft
        delete_response = self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data.get("success") == True
        
        # Verify draft is deleted
        get_response = self.session.get(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")
        assert get_response.status_code == 404
    
    def test_list_drafts_with_account_filter(self):
        """Test GET /api/instagram-story/drafts with account_id filter"""
        # Create a draft
        create_response = self.session.post(f"{BASE_URL}/api/instagram-story/drafts", json={
            "account_id": self.test_account_id,
            "media_type": "image"
        })
        draft_id = create_response.json().get("draft_id")
        
        # List drafts filtered by account
        response = self.session.get(f"{BASE_URL}/api/instagram-story/drafts?account_id={self.test_account_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "drafts" in data
        # All returned drafts should belong to this account
        for draft in data["drafts"]:
            assert draft.get("account_id") == self.test_account_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/instagram-story/drafts/{draft_id}")


class TestInstagramStoryElements:
    """Test Instagram story elements info endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_elements_returns_200(self):
        """Test GET /api/instagram-story/elements returns 200"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/elements")
        assert response.status_code == 200
        
        data = response.json()
        assert "elements" in data
        assert isinstance(data["elements"], list)
        
    def test_get_elements_contains_required_types(self):
        """Test elements endpoint returns all required sticker types"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/elements")
        data = response.json()
        
        element_types = [e["type"] for e in data["elements"]]
        required_types = ["poll", "question", "mention", "link", "text"]
        
        for req_type in required_types:
            assert req_type in element_types, f"Missing element type: {req_type}"


class TestInstagramStoryAnalytics:
    """Test Instagram story analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_analytics_returns_200(self):
        """Test GET /api/instagram-story/analytics returns 200"""
        response = self.session.get(f"{BASE_URL}/api/instagram-story/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "total_stories" in data
        assert "stories" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
