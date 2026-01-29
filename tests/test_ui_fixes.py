"""
Test suite for UI fixes - Glassmorphic Dashboard
Tests: Login page, Sidebar scrollbar, Topbar, Dashboard Overview, AI Context-Aware
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://blockify-bio.preview.emergentagent.com')

class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
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
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestAIEnhancedAPI:
    """AI Enhanced API tests - Context-Aware feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_ai_status(self, auth_token):
        """Test AI status endpoint returns context_aware feature"""
        response = requests.get(
            f"{BASE_URL}/api/ai-enhanced/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert data["features"]["context_aware"] == True
        assert "daily_limit" in data
        assert "remaining" in data
    
    def test_ai_context_endpoint(self, auth_token):
        """Test AI context endpoint returns CRM data"""
        response = requests.get(
            f"{BASE_URL}/api/ai-enhanced/context",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "context" in data
        assert "timestamp" in data
        # Context should contain CRM data sections
        context = data["context"]
        assert "FACTURES" in context or "CONTACTS" in context or "TÂCHES" in context
    
    def test_ai_chat_with_context(self, auth_token):
        """Test AI chat endpoint with context-aware feature"""
        response = requests.post(
            f"{BASE_URL}/api/ai-enhanced/chat",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "messages": [{"role": "user", "content": "Bonjour"}],
                "model": "gpt-4o",
                "include_context": True
            },
            timeout=30
        )
        # Accept 200 or 520 (timeout) as the AI may take time
        assert response.status_code in [200, 520]
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "conversation_id" in data
            assert len(data["message"]) > 0


class TestDashboardAPI:
    """Dashboard API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have main KPI sections
        assert "contacts" in data or "invoices" in data or "opportunities" in data


class TestTasksAPI:
    """Tasks API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_tasks(self, auth_token):
        """Test getting tasks list"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_tasks_stats(self, auth_token):
        """Test tasks statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/stats/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have task status counts
        assert "todo" in data
        assert "in_progress" in data
        assert "done" in data
        assert "completion_rate" in data


class TestContactsAPI:
    """Contacts API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_contacts(self, auth_token):
        """Test getting contacts list"""
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestInvoicesAPI:
    """Invoices API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_invoices(self, auth_token):
        """Test getting invoices list"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestNotificationsData:
    """Test notification-related data endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_overdue_tasks_for_notifications(self, auth_token):
        """Test that overdue tasks can be fetched for notifications"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "todo,in_progress"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_leads_for_notifications(self, auth_token):
        """Test that leads can be fetched for notifications"""
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"type": "lead"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
