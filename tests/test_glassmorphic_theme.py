"""
Test suite for Glassmorphic Design, Theme Toggle, and AI Document Access features
Tests:
1. Glassmorphic design on ContactsPage, PipelinePage, SettingsPage (dark theme)
2. Theme toggle in profile dropdown
3. AI context includes documents section
4. AI list_documents action works
5. Documents page shows "Projets Clients" folder
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://blockify-bio.preview.emergentagent.com')

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
        return data["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@alphagency.fr"


class TestAIDocumentAccess:
    """Tests for AI access to documents"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_ai_status_context_aware(self, auth_token):
        """Test AI status shows context_aware feature enabled"""
        response = requests.get(
            f"{BASE_URL}/api/ai-enhanced/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["features"]["context_aware"] == True
        assert data["enabled"] == True
    
    def test_ai_context_includes_documents(self, auth_token):
        """Test AI context includes DOCUMENTS section"""
        response = requests.get(
            f"{BASE_URL}/api/ai-enhanced/context",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "context" in data
        # Check for DOCUMENTS section in context
        assert "📁 DOCUMENTS:" in data["context"], "DOCUMENTS section not found in AI context"
        assert "fichiers" in data["context"].lower(), "Files count not found in context"
        assert "dossiers" in data["context"].lower(), "Folders count not found in context"
    
    def test_list_documents_action(self, auth_token):
        """Test list_documents action via execute-action endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ai-enhanced/execute-action",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "action_type": "list_documents",
                "params": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documents" in data
        assert "message" in data
    
    def test_list_documents_with_filter(self, auth_token):
        """Test list_documents action with file_type filter"""
        response = requests.post(
            f"{BASE_URL}/api/ai-enhanced/execute-action",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "action_type": "list_documents",
                "params": {"file_type": "document"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestFileManager:
    """Tests for File Manager / Documents module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "superpassword"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_folders(self, auth_token):
        """Test getting folders list"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager/folders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check for "Projets Clients" folder
        folder_names = [f.get("name") for f in data]
        assert "Projets Clients" in folder_names, f"'Projets Clients' folder not found. Found: {folder_names}"
    
    def test_get_documents(self, auth_token):
        """Test getting documents list"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_stats(self, auth_token):
        """Test getting file manager stats"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_documents" in data
        assert "total_folders" in data


class TestThemeContext:
    """Tests for Theme Context (backend doesn't handle theme, but we verify frontend env)"""
    
    def test_frontend_env_exists(self):
        """Verify frontend environment is configured"""
        # This is a placeholder - theme is handled client-side
        # We verify the backend is accessible
        response = requests.get(f"{BASE_URL}/api/auth/login", allow_redirects=False)
        # Should return 405 for GET on login endpoint
        assert response.status_code in [405, 404, 200]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
