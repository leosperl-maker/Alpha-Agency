"""
Test suite for AI Enhanced (Context-Aware + Actions) and File Manager APIs
Tests the new features:
1. AI Context-Aware - AI can access CRM data
2. AI Actions - AI can create tasks, quotes via conversation
3. File Manager - Folders and file upload functionality
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✅ Login successful - User: {data['user'].get('email')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestAIEnhancedStatus:
    """AI Enhanced Status API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_ai_status(self, auth_headers):
        """Test AI status endpoint returns context_aware feature"""
        response = requests.get(f"{BASE_URL}/api/ai-enhanced/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "enabled" in data
        assert "features" in data
        assert "daily_limit" in data
        assert "remaining" in data
        
        # Verify context_aware feature
        assert data["features"].get("context_aware") == True, "context_aware feature should be True"
        print(f"✅ AI Status - Enabled: {data['enabled']}, Context-Aware: {data['features'].get('context_aware')}")
        print(f"   Daily limit: {data['daily_limit']}, Remaining: {data['remaining']}")


class TestAIContext:
    """AI Context API tests - Verify AI can access CRM data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_context(self, auth_headers):
        """Test /api/ai-enhanced/context returns CRM data summary"""
        response = requests.get(f"{BASE_URL}/api/ai-enhanced/context", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "context" in data
        assert "timestamp" in data
        
        context = data["context"]
        assert len(context) > 0, "Context should not be empty"
        
        # Check for expected sections in context
        print(f"✅ AI Context retrieved successfully")
        print(f"   Context length: {len(context)} characters")
        
        # Check for key data sections
        if "FACTURES" in context:
            print("   ✓ Factures data present")
        if "CONTACTS" in context:
            print("   ✓ Contacts data present")
        if "TÂCHES" in context:
            print("   ✓ Tâches data present")
        if "PIPELINE" in context:
            print("   ✓ Pipeline data present")
        if "DEVIS" in context:
            print("   ✓ Devis data present")


class TestAIActions:
    """AI Actions API tests - Verify AI can execute actions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_execute_create_task_action(self, auth_headers):
        """Test creating a task via execute-action endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ai-enhanced/execute-action",
            headers=auth_headers,
            json={
                "action_type": "create_task",
                "params": {
                    "title": "TEST_Task from AI Action",
                    "description": "Created via AI action test",
                    "priority": "high"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "task_id" in data
        assert "message" in data
        
        print(f"✅ Task created via AI action: {data.get('message')}")
        print(f"   Task ID: {data.get('task_id')}")
        
        # Verify task was actually created
        task_response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert task_response.status_code == 200
        tasks = task_response.json()
        task_found = any(t.get("id") == data.get("task_id") for t in tasks)
        assert task_found, "Created task not found in tasks list"
        print("   ✓ Task verified in database")
    
    def test_execute_create_quote_action(self, auth_headers):
        """Test creating a quote via execute-action endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ai-enhanced/execute-action",
            headers=auth_headers,
            json={
                "action_type": "create_quote",
                "params": {
                    "client_name": "TEST_Client AI",
                    "client_email": "test@ai-action.com",
                    "services": [
                        {
                            "title": "Service Test",
                            "description": "Test service from AI",
                            "quantity": 1,
                            "unit_price": 500
                        }
                    ],
                    "notes": "Created via AI action test"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "quote_id" in data
        assert "quote_number" in data
        assert "total" in data
        
        print(f"✅ Quote created via AI action: {data.get('message')}")
        print(f"   Quote Number: {data.get('quote_number')}")
        print(f"   Total: {data.get('total')}€")


class TestFileManagerStats:
    """File Manager Stats API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_stats(self, auth_headers):
        """Test /api/file-manager/stats returns storage statistics"""
        response = requests.get(f"{BASE_URL}/api/file-manager/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_documents" in data
        assert "total_folders" in data
        assert "total_size" in data
        assert "total_size_formatted" in data
        
        print(f"✅ File Manager Stats retrieved")
        print(f"   Documents: {data['total_documents']}")
        print(f"   Folders: {data['total_folders']}")
        print(f"   Total Size: {data['total_size_formatted']}")


class TestFileManagerFolders:
    """File Manager Folders API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_folder(self, auth_headers):
        """Test creating a folder"""
        folder_name = f"TEST_Folder_{datetime.now().strftime('%H%M%S')}"
        response = requests.post(
            f"{BASE_URL}/api/file-manager/folders",
            headers=auth_headers,
            json={
                "name": folder_name,
                "parent_id": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == folder_name
        
        print(f"✅ Folder created: {folder_name}")
        print(f"   Folder ID: {data['id']}")
        
        # Store for cleanup
        return data["id"]
    
    def test_list_folders(self, auth_headers):
        """Test listing root folders"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager/folders",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Folders listed: {len(data)} root folders")
        
        # Check folder structure
        if data:
            folder = data[0]
            assert "id" in folder
            assert "name" in folder
            print(f"   First folder: {folder.get('name')}")
    
    def test_get_folder_tree(self, auth_headers):
        """Test getting folder tree structure"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager/folders/tree",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Folder tree retrieved: {len(data)} root items")


class TestFileManagerDocuments:
    """File Manager Documents API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_documents(self, auth_headers):
        """Test listing documents"""
        response = requests.get(
            f"{BASE_URL}/api/file-manager",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Documents listed: {len(data)} documents in root")
    
    def test_upload_document(self, auth_headers):
        """Test uploading a document"""
        # Create a simple test file
        test_content = b"Test file content for file manager"
        files = {
            'file': ('test_document.txt', test_content, 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/file-manager/upload",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert data["name"] == "test_document.txt"
        assert "url" in data
        assert "file_type" in data
        
        print(f"✅ Document uploaded: {data['name']}")
        print(f"   Document ID: {data['id']}")
        print(f"   File Type: {data['file_type']}")
        print(f"   Size: {data.get('size_formatted', 'N/A')}")
        
        return data["id"]


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_tasks(self, auth_headers):
        """Clean up TEST_ prefixed tasks"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        if response.status_code == 200:
            tasks = response.json()
            test_tasks = [t for t in tasks if t.get("title", "").startswith("TEST_")]
            for task in test_tasks:
                requests.delete(f"{BASE_URL}/api/tasks/{task['id']}", headers=auth_headers)
            print(f"✅ Cleaned up {len(test_tasks)} test tasks")
    
    def test_cleanup_test_folders(self, auth_headers):
        """Clean up TEST_ prefixed folders"""
        response = requests.get(f"{BASE_URL}/api/file-manager/folders", headers=auth_headers)
        if response.status_code == 200:
            folders = response.json()
            test_folders = [f for f in folders if f.get("name", "").startswith("TEST_")]
            for folder in test_folders:
                requests.delete(
                    f"{BASE_URL}/api/file-manager/folders/{folder['id']}",
                    headers=auth_headers,
                    params={"force": True}
                )
            print(f"✅ Cleaned up {len(test_folders)} test folders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
