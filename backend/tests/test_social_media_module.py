"""
Social Media Module Backend Tests
Testing the refactored Social Media module (Agorapulse-style)

Features tested:
- POST /api/social/posts - création de brouillon sans scheduled_at (doit retourner status=draft)
- POST /api/social/posts - création de post programmé avec scheduled_at (doit retourner status=scheduled)
- GET /api/social/entities - récupération des entités
- POST /api/social/entities - création d'une nouvelle entité
- GET /api/social/accounts - récupération des comptes sociaux
- POST /api/social/sync-meta-accounts - synchronisation des comptes Meta
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is not set")

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test successful login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert len(data["token"]) > 0, "Token is empty"
        return data["token"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSocialPostsEndpoint:
    """Test POST /api/social/posts endpoint - the main endpoint in server.py"""
    
    def test_create_draft_post_without_scheduled_at(self, auth_headers):
        """
        Test: POST /api/social/posts - création de brouillon sans scheduled_at
        Expected: status=draft
        """
        payload = {
            "content": "TEST_Draft post without scheduled_at",
            "media_urls": [],
            "post_type": "text",
            "platforms": ["facebook"],
            "account_ids": [],
            "hashtags": ["#test"],
            "is_draft": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create draft post: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Post ID not in response"
        assert "status" in data, "Status not in response"
        assert "content" in data, "Content not in response"
        
        # Verify status is draft
        assert data["status"] == "draft", f"Expected status=draft, got status={data['status']}"
        assert data["content"] == payload["content"], "Content mismatch"
        
        # Store post_id for cleanup
        return data["id"]
    
    def test_create_draft_post_without_is_draft_flag(self, auth_headers):
        """
        Test: POST /api/social/posts - création sans scheduled_at et sans is_draft
        Expected: status=draft (default when no schedule)
        """
        payload = {
            "content": "TEST_Post without scheduled_at and without is_draft flag",
            "media_urls": [],
            "post_type": "text",
            "platforms": ["instagram"],
            "account_ids": [],
            "hashtags": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        data = response.json()
        
        # Should default to draft when no scheduled_at
        assert data["status"] == "draft", f"Expected status=draft, got status={data['status']}"
        
        return data["id"]
    
    def test_create_scheduled_post_with_scheduled_at(self, auth_headers):
        """
        Test: POST /api/social/posts - création de post programmé avec scheduled_at
        Expected: status=scheduled
        """
        # Schedule for tomorrow
        scheduled_time = (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
        
        payload = {
            "content": "TEST_Scheduled post with scheduled_at",
            "media_urls": [],
            "post_type": "text",
            "platforms": ["facebook", "instagram"],
            "account_ids": [],
            "hashtags": ["#scheduled", "#test"],
            "scheduled_at": scheduled_time,
            "is_draft": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create scheduled post: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Post ID not in response"
        assert "status" in data, "Status not in response"
        assert "scheduled_at" in data, "scheduled_at not in response"
        
        # Verify status is scheduled
        assert data["status"] == "scheduled", f"Expected status=scheduled, got status={data['status']}"
        assert data["scheduled_at"] == scheduled_time, "scheduled_at mismatch"
        
        return data["id"]
    
    def test_create_post_with_scheduled_at_but_is_draft_true(self, auth_headers):
        """
        Test: POST /api/social/posts - avec scheduled_at mais is_draft=True
        Expected: status=draft (is_draft takes precedence)
        """
        scheduled_time = (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z"
        
        payload = {
            "content": "TEST_Post with scheduled_at but is_draft=True",
            "media_urls": [],
            "post_type": "text",
            "platforms": ["facebook"],
            "account_ids": [],
            "scheduled_at": scheduled_time,
            "is_draft": True  # This should take precedence
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        data = response.json()
        
        # is_draft=True should take precedence over scheduled_at
        assert data["status"] == "draft", f"Expected status=draft (is_draft takes precedence), got status={data['status']}"
        
        return data["id"]
    
    def test_get_social_posts(self, auth_headers):
        """Test: GET /api/social/posts - récupération des posts"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get posts: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        # Check that our test posts are in the list
        test_posts = [p for p in data if p.get("content", "").startswith("TEST_")]
        assert len(test_posts) >= 1, "Should have at least one test post"
        
        return data
    
    def test_get_social_posts_filter_by_status(self, auth_headers):
        """Test: GET /api/social/posts?status=draft - filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts?status=draft",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get draft posts: {response.text}"
        data = response.json()
        
        # All returned posts should have status=draft
        for post in data:
            assert post.get("status") == "draft", f"Expected all posts to be drafts, got {post.get('status')}"


class TestSocialEntitiesEndpoint:
    """Test /api/social/entities endpoints from social_media.py router"""
    
    def test_get_entities(self, auth_headers):
        """Test: GET /api/social/entities - récupération des entités"""
        response = requests.get(
            f"{BASE_URL}/api/social/entities",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get entities: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        # Each entity should have required fields
        for entity in data:
            assert "id" in entity, "Entity should have id"
            assert "name" in entity, "Entity should have name"
        
        return data
    
    def test_create_entity(self, auth_headers):
        """Test: POST /api/social/entities - création d'une nouvelle entité"""
        payload = {
            "name": "TEST_Entity_Social_Media",
            "color": "#FF5733",
            "description": "Test entity for social media module testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/entities",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create entity: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Entity ID not in response"
        assert "name" in data, "Name not in response"
        assert data["name"] == payload["name"], "Name mismatch"
        assert data["color"] == payload["color"], "Color mismatch"
        assert "account_count" in data, "account_count not in response"
        assert data["account_count"] == 0, "New entity should have 0 accounts"
        
        return data["id"]
    
    def test_update_entity(self, auth_headers):
        """Test: PUT /api/social/entities/{id} - update entity"""
        # First create an entity
        create_response = requests.post(
            f"{BASE_URL}/api/social/entities",
            json={
                "name": "TEST_Entity_To_Update",
                "color": "#000000"
            },
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        
        # Update the entity
        update_payload = {
            "name": "TEST_Entity_Updated",
            "color": "#FFFFFF"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/social/entities/{entity_id}",
            json=update_payload,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Failed to update entity: {update_response.text}"
        data = update_response.json()
        
        assert data["name"] == update_payload["name"], "Name not updated"
        assert data["color"] == update_payload["color"], "Color not updated"
        
        return entity_id
    
    def test_delete_entity(self, auth_headers):
        """Test: DELETE /api/social/entities/{id} - delete entity"""
        # First create an entity
        create_response = requests.post(
            f"{BASE_URL}/api/social/entities",
            json={
                "name": "TEST_Entity_To_Delete",
                "color": "#123456"
            },
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        
        # Delete the entity
        delete_response = requests.delete(
            f"{BASE_URL}/api/social/entities/{entity_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Failed to delete entity: {delete_response.text}"
        
        # Verify entity is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/social/entities",
            headers=auth_headers
        )
        
        entities = get_response.json()
        entity_ids = [e["id"] for e in entities]
        assert entity_id not in entity_ids, "Entity should be deleted"


class TestSocialAccountsEndpoint:
    """Test /api/social/accounts endpoints"""
    
    def test_get_accounts(self, auth_headers):
        """Test: GET /api/social/accounts - récupération des comptes sociaux"""
        response = requests.get(
            f"{BASE_URL}/api/social/accounts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get accounts: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        # Each account should have required fields (if any exist)
        for account in data:
            assert "id" in account, "Account should have id"
            # Tokens should not be exposed
            assert "access_token_encrypted" not in account, "Encrypted token should not be exposed"
            assert "refresh_token_encrypted" not in account, "Encrypted refresh token should not be exposed"
        
        return data


class TestSyncMetaAccounts:
    """Test /api/social/sync-meta-accounts endpoint"""
    
    def test_sync_meta_accounts_no_meta_connected(self, auth_headers):
        """
        Test: POST /api/social/sync-meta-accounts - synchronisation des comptes Meta
        Expected: 404 if no Meta account connected
        """
        response = requests.post(
            f"{BASE_URL}/api/social/sync-meta-accounts",
            headers=auth_headers
        )
        
        # If no Meta account is connected, should return 404
        # If Meta account exists, should return 200 with synced accounts
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 404:
            data = response.json()
            assert "detail" in data, "Error response should have detail"
            assert "Meta" in data["detail"] or "meta" in data["detail"].lower(), "Error should mention Meta"
        elif response.status_code == 200:
            data = response.json()
            assert "synced" in data, "Response should have synced count"
            assert "message" in data, "Response should have message"


class TestSocialCapabilities:
    """Test /api/social/capabilities endpoint"""
    
    def test_get_all_capabilities(self, auth_headers):
        """Test: GET /api/social/capabilities - get platform capabilities matrix"""
        response = requests.get(
            f"{BASE_URL}/api/social/capabilities",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get capabilities: {response.text}"
        data = response.json()
        
        # Should have platform keys
        assert "facebook" in data or "instagram" in data, "Should have platform capabilities"
        
        return data
    
    def test_get_platform_capabilities(self, auth_headers):
        """Test: GET /api/social/capabilities/{platform}/{account_type}"""
        response = requests.get(
            f"{BASE_URL}/api/social/capabilities/facebook/page",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get Facebook page capabilities: {response.text}"
        data = response.json()
        
        # Should have capability flags
        assert "canPublishFeed" in data, "Should have canPublishFeed"
        assert "canSchedule" in data, "Should have canSchedule"
        
        return data


class TestSocialQueue:
    """Test /api/social/queue endpoint"""
    
    def test_get_queue_scheduled(self, auth_headers):
        """Test: GET /api/social/queue?status=scheduled"""
        response = requests.get(
            f"{BASE_URL}/api/social/queue?status=scheduled",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get queue: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        return data
    
    def test_get_queue_drafts(self, auth_headers):
        """Test: GET /api/social/queue?status=draft"""
        response = requests.get(
            f"{BASE_URL}/api/social/queue?status=draft",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get draft queue: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        return data


class TestSocialStats:
    """Test /api/social/stats endpoints"""
    
    def test_get_stats_overview(self, auth_headers):
        """Test: GET /api/social/stats/overview"""
        response = requests.get(
            f"{BASE_URL}/api/social/stats/overview",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        
        # Should have stats fields
        assert "total_posts" in data, "Should have total_posts"
        assert "entities_count" in data, "Should have entities_count"
        assert "accounts_count" in data, "Should have accounts_count"
        
        return data


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_posts(self, auth_headers):
        """Clean up TEST_ prefixed posts"""
        # Get all posts
        response = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            posts = response.json()
            test_posts = [p for p in posts if p.get("content", "").startswith("TEST_")]
            
            for post in test_posts:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/social/posts/{post['id']}",
                    headers=auth_headers
                )
                print(f"Deleted test post {post['id']}: {delete_response.status_code}")
        
        assert True, "Cleanup completed"
    
    def test_cleanup_test_entities(self, auth_headers):
        """Clean up TEST_ prefixed entities"""
        # Get all entities
        response = requests.get(
            f"{BASE_URL}/api/social/entities",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            entities = response.json()
            test_entities = [e for e in entities if e.get("name", "").startswith("TEST_")]
            
            for entity in test_entities:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/social/entities/{entity['id']}",
                    headers=auth_headers
                )
                print(f"Deleted test entity {entity['id']}: {delete_response.status_code}")
        
        assert True, "Cleanup completed"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
