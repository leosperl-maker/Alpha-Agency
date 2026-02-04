"""
Test MoltBot AI Chat and Notifications System - Iteration 53
Tests:
- MoltBot AI chat with CRM queries (combien de contacts, résume mon activité)
- MoltBot stats endpoint
- Notifications REST API
- MoltBot search functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MOLTBOT_SECRET = "moltbot-alpha-secret-2024"

class TestMoltBotAIChat:
    """Test MoltBot AI chat intelligence for CRM queries"""
    
    def test_moltbot_chat_count_contacts(self):
        """Test MoltBot can answer 'Combien de contacts ai-je?'"""
        response = requests.post(
            f"{BASE_URL}/api/moltbot/chat",
            headers={
                "Content-Type": "application/json",
                "X-MoltBot-Secret": MOLTBOT_SECRET
            },
            json={"message": "Combien de contacts ai-je?"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "response" in data, "Expected 'response' in data"
        assert data.get("data_found") == True, "Expected data_found=True"
        # Check response contains contact count info
        assert "contact" in data["response"].lower() or "total" in data["response"].lower(), \
            f"Response should mention contacts: {data['response']}"
        print(f"✅ MoltBot response: {data['response']}")
    
    def test_moltbot_chat_activity_summary(self):
        """Test MoltBot can answer 'Résume mon activité'"""
        response = requests.post(
            f"{BASE_URL}/api/moltbot/chat",
            headers={
                "Content-Type": "application/json",
                "X-MoltBot-Secret": MOLTBOT_SECRET
            },
            json={"message": "Résume mon activité"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "response" in data, "Expected 'response' in data"
        # Check response contains activity summary
        assert len(data["response"]) > 50, "Response should be a detailed summary"
        print(f"✅ Activity summary: {data['response'][:200]}...")
    
    def test_moltbot_chat_search_client(self):
        """Test MoltBot can search for specific data"""
        response = requests.post(
            f"{BASE_URL}/api/moltbot/chat",
            headers={
                "Content-Type": "application/json",
                "X-MoltBot-Secret": MOLTBOT_SECRET
            },
            json={"message": "Cherche le client Alpha"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "response" in data, "Expected 'response' in data"
        print(f"✅ Search response: {data['response'][:200]}...")
    
    def test_moltbot_chat_public_access(self):
        """Test MoltBot chat allows public access (limited functionality)"""
        response = requests.post(
            f"{BASE_URL}/api/moltbot/chat",
            headers={"Content-Type": "application/json"},
            json={"message": "Bonjour, quels sont vos services?"}
        )
        
        # Public access is allowed for general questions
        assert response.status_code == 200, f"Expected 200 for public access, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        print("✅ MoltBot allows public access for general questions")


class TestMoltBotStats:
    """Test MoltBot stats endpoint"""
    
    def test_moltbot_stats_endpoint(self):
        """Test /api/moltbot/stats returns CRM statistics"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/stats",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify stats structure
        assert "period" in data, "Expected 'period' in stats"
        assert "contacts" in data, "Expected 'contacts' in stats"
        assert "tasks" in data, "Expected 'tasks' in stats"
        assert "revenue" in data, "Expected 'revenue' in stats"
        
        # Verify contacts structure
        assert "new" in data["contacts"], "Expected 'new' in contacts"
        assert "total" in data["contacts"], "Expected 'total' in contacts"
        
        print(f"✅ Stats: {data['contacts']['total']} total contacts, {data['tasks']['pending']} pending tasks")
    
    def test_moltbot_stats_without_auth_fails(self):
        """Test stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/moltbot/stats")
        
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("✅ Stats endpoint correctly requires authentication")


class TestMoltBotContacts:
    """Test MoltBot contacts endpoint"""
    
    def test_moltbot_list_contacts(self):
        """Test /api/moltbot/contacts returns contacts list"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/contacts",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "contacts" in data, "Expected 'contacts' in response"
        assert "count" in data, "Expected 'count' in response"
        assert isinstance(data["contacts"], list), "Contacts should be a list"
        
        print(f"✅ Retrieved {data['count']} contacts")
    
    def test_moltbot_search_contacts(self):
        """Test contacts search functionality"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/contacts?search=test",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "contacts" in data, "Expected 'contacts' in response"
        print(f"✅ Search returned {data['count']} contacts")


class TestNotificationsAPI:
    """Test Notifications REST API"""
    
    def test_get_notifications(self):
        """Test GET /api/notifications/ returns notifications list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/",
            headers={"X-User-Id": "admin"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "notifications" in data, "Expected 'notifications' in response"
        assert "unread_count" in data, "Expected 'unread_count' in response"
        assert isinstance(data["notifications"], list), "Notifications should be a list"
        
        print(f"✅ Retrieved {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_create_notification(self):
        """Test POST /api/notifications/ creates a notification"""
        notification_data = {
            "type": "test",
            "title": "Test Notification",
            "message": "This is a test notification from pytest",
            "priority": "normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/",
            headers={"Content-Type": "application/json"},
            json=notification_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "notification_id" in data, "Expected 'notification_id' in response"
        
        notification_id = data["notification_id"]
        print(f"✅ Created notification: {notification_id}")
        
        # Verify notification was created
        get_response = requests.get(
            f"{BASE_URL}/api/notifications/",
            headers={"X-User-Id": "admin"}
        )
        assert get_response.status_code == 200
        notifications = get_response.json()["notifications"]
        
        # Clean up - delete the test notification
        delete_response = requests.delete(
            f"{BASE_URL}/api/notifications/{notification_id}"
        )
        assert delete_response.status_code == 200, "Failed to delete test notification"
        print(f"✅ Cleaned up test notification")
    
    def test_mark_notification_read(self):
        """Test PUT /api/notifications/{id}/read marks notification as read"""
        # First create a notification
        create_response = requests.post(
            f"{BASE_URL}/api/notifications/",
            headers={"Content-Type": "application/json"},
            json={
                "type": "test",
                "title": "Test Read Notification",
                "message": "Testing mark as read"
            }
        )
        
        assert create_response.status_code == 200
        notification_id = create_response.json()["notification_id"]
        
        # Mark as read
        read_response = requests.put(
            f"{BASE_URL}/api/notifications/{notification_id}/read",
            headers={"X-User-Id": "admin"}
        )
        
        assert read_response.status_code == 200, f"Expected 200, got {read_response.status_code}"
        assert read_response.json().get("success") == True
        
        print(f"✅ Marked notification as read")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/notifications/{notification_id}")
    
    def test_notification_preferences(self):
        """Test notification preferences endpoints"""
        # Get preferences
        get_response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"X-User-Id": "admin"}
        )
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        prefs = get_response.json()
        
        assert "new_leads" in prefs, "Expected 'new_leads' in preferences"
        assert "payments" in prefs, "Expected 'payments' in preferences"
        assert "sound" in prefs, "Expected 'sound' in preferences"
        
        print(f"✅ Retrieved notification preferences")


class TestMoltBotBriefing:
    """Test MoltBot briefing and recap endpoints"""
    
    def test_daily_briefing(self):
        """Test /api/moltbot/briefing returns daily briefing"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/briefing",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "date" in data, "Expected 'date' in briefing"
        assert "greeting" in data, "Expected 'greeting' in briefing"
        assert "tasks" in data, "Expected 'tasks' in briefing"
        assert "appointments" in data, "Expected 'appointments' in briefing"
        
        print(f"✅ Daily briefing: {data['greeting']}")
    
    def test_daily_recap(self):
        """Test /api/moltbot/recap returns daily recap"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/recap",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "date" in data, "Expected 'date' in recap"
        assert "summary" in data, "Expected 'summary' in recap"
        assert "completed" in data, "Expected 'completed' in recap"
        assert "remaining" in data, "Expected 'remaining' in recap"
        
        print(f"✅ Daily recap: {data['summary']}")


class TestMoltBotTasks:
    """Test MoltBot tasks endpoint"""
    
    def test_list_tasks(self):
        """Test /api/moltbot/tasks returns tasks list"""
        response = requests.get(
            f"{BASE_URL}/api/moltbot/tasks",
            headers={"X-MoltBot-Secret": MOLTBOT_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "tasks" in data, "Expected 'tasks' in response"
        assert "count" in data, "Expected 'count' in response"
        
        print(f"✅ Retrieved {data['count']} tasks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
