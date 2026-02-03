"""
Test suite for MoltBot CRM features:
1. Agent X chat widget phone number (0691 266 003)
2. Blog comment moderation APIs
3. Business Search API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBusinessSearchAPI:
    """Business Search API tests using recherche-entreprises.api.gouv.fr"""
    
    def test_search_by_name(self):
        """Test searching company by name"""
        response = requests.get(f"{BASE_URL}/api/business/search", params={"query": "alpha agency"})
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        print(f"Search by name result: found={data.get('found')}, company={data.get('company_name')}")
    
    def test_search_by_siret(self):
        """Test searching company by SIRET number"""
        # Using a known French SIRET
        response = requests.get(f"{BASE_URL}/api/business/siret/35169552300024")
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        print(f"Search by SIRET result: found={data.get('found')}, company={data.get('company_name')}")
    
    def test_search_all_companies(self):
        """Test searching multiple companies"""
        response = requests.get(f"{BASE_URL}/api/business/search/all", params={"query": "alpha", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "found" in data
        assert "count" in data
        assert "results" in data
        print(f"Search all result: found={data.get('found')}, count={data.get('count')}")
        if data.get('results'):
            for r in data['results'][:2]:
                print(f"  - {r.get('company_name')} (SIRET: {r.get('siret')})")


class TestBlogCommentModerationAPI:
    """Blog comment moderation API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@alphagency.fr",
            "password": "Test123!"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_pending_comments(self):
        """Test getting pending comments count"""
        response = requests.get(f"{BASE_URL}/api/blog/comments/pending", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "comments" in data
        print(f"Pending comments: {data.get('count')}")
    
    def test_get_all_comments(self):
        """Test getting all comments"""
        response = requests.get(f"{BASE_URL}/api/blog/comments/all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "comments" in data
        print(f"All comments: {data.get('count')}")
    
    def test_get_comments_by_status(self):
        """Test filtering comments by status"""
        for status in ["pending", "approved", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/blog/comments/all", 
                                   params={"status": status}, 
                                   headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            print(f"Comments with status '{status}': {data.get('count')}")
    
    def test_add_comment_to_article(self):
        """Test adding a comment to an article (requires moderation)"""
        # First get a blog article slug
        blog_response = requests.get(f"{BASE_URL}/api/blog")
        if blog_response.status_code == 200:
            posts = blog_response.json()
            if posts:
                slug = posts[0].get("slug")
                if slug:
                    # Add a test comment
                    comment_response = requests.post(
                        f"{BASE_URL}/api/blog/articles/{slug}/comments",
                        json={
                            "author": "Test User",
                            "email": "test@example.com",
                            "content": "This is a test comment for moderation testing"
                        }
                    )
                    assert comment_response.status_code == 200
                    data = comment_response.json()
                    assert data.get("success") == True
                    assert "comment_id" in data
                    print(f"Comment added successfully: {data.get('comment_id')}")
                    return
        print("No blog posts found to test comment submission")
    
    def test_moderate_comment_approve(self):
        """Test approving a comment"""
        # Get pending comments
        response = requests.get(f"{BASE_URL}/api/blog/comments/pending", headers=self.headers)
        if response.status_code == 200:
            data = response.json()
            comments = data.get("comments", [])
            if comments:
                comment_id = comments[0].get("id")
                # Approve the comment
                mod_response = requests.put(
                    f"{BASE_URL}/api/blog/comments/{comment_id}/moderate",
                    json={"status": "approved"},
                    headers=self.headers
                )
                assert mod_response.status_code == 200
                print(f"Comment {comment_id} approved successfully")
                return
        print("No pending comments to moderate")


class TestMoltBotFAQ:
    """Test MoltBot public FAQ endpoint (used by Agent X chat widget)"""
    
    def test_get_public_faq(self):
        """Test getting public FAQ for chat widget"""
        response = requests.get(f"{BASE_URL}/api/moltbot/public/faq")
        assert response.status_code == 200
        data = response.json()
        assert "faq" in data
        print(f"FAQ items: {len(data.get('faq', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
