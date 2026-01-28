"""
Multilink Module Tests - Linktree-style link pages
Tests for pages, links, stats, and public routes
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestMultilinkAuth:
    """Authentication setup for multilink tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestMultilinkThemes(TestMultilinkAuth):
    """Test themes endpoint (no auth required)"""
    
    def test_get_themes_returns_all_presets(self):
        """GET /api/multilink/themes - returns all theme presets"""
        response = requests.get(f"{BASE_URL}/api/multilink/themes")
        assert response.status_code == 200
        
        data = response.json()
        assert "themes" in data
        assert "social_icons" in data
        
        # Verify expected themes exist
        themes = data["themes"]
        expected_themes = ["minimal", "dark", "gradient", "ocean", "sunset", "nature", "custom"]
        for theme in expected_themes:
            assert theme in themes, f"Missing theme: {theme}"
            assert "name" in themes[theme]
            assert "background" in themes[theme]
            assert "text" in themes[theme]
        
        # Verify social icons
        icons = data["social_icons"]
        expected_icons = ["instagram", "facebook", "twitter", "youtube", "linkedin", "email", "website"]
        for icon in expected_icons:
            assert icon in icons, f"Missing icon: {icon}"


class TestMultilinkPages(TestMultilinkAuth):
    """Test page CRUD operations"""
    
    def test_list_pages_requires_auth(self):
        """GET /api/multilink/pages - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/multilink/pages")
        assert response.status_code == 401
    
    def test_list_pages_with_auth(self, auth_headers):
        """GET /api/multilink/pages - returns pages list with stats"""
        response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If pages exist, verify structure
        if len(data) > 0:
            page = data[0]
            assert "id" in page
            assert "slug" in page
            assert "title" in page
            assert "link_count" in page
            assert "total_views" in page
            assert "total_clicks" in page
    
    def test_create_page_with_auto_slug(self, auth_headers):
        """POST /api/multilink/pages - creates page with auto-generated slug"""
        unique_title = f"TEST_Page_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": "",  # Empty slug should auto-generate
            "title": unique_title,
            "bio": "Test bio description",
            "theme": "minimal",
            "is_active": True
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "slug" in data
        assert data["slug"] != ""  # Slug should be auto-generated
        assert "url" in data
        assert "/lien-bio/" in data["url"]
        
        # Cleanup
        page_id = data["id"]
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
    
    def test_create_page_with_custom_slug(self, auth_headers):
        """POST /api/multilink/pages - creates page with custom slug"""
        unique_slug = f"test-slug-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Custom Slug Page",
            "bio": "Test bio",
            "theme": "dark",
            "is_active": True
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["slug"] == unique_slug
        
        # Cleanup
        page_id = data["id"]
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
    
    def test_create_page_duplicate_slug_fails(self, auth_headers):
        """POST /api/multilink/pages - duplicate slug returns 400"""
        unique_slug = f"test-dup-{uuid.uuid4().hex[:8]}"
        
        # Create first page
        response1 = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_First Page",
            "theme": "minimal"
        })
        assert response1.status_code == 200
        page_id = response1.json()["id"]
        
        # Try to create second page with same slug
        response2 = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Second Page",
            "theme": "minimal"
        })
        assert response2.status_code == 400
        assert "déjà utilisé" in response2.json().get("detail", "")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
    
    def test_get_page_by_id(self, auth_headers):
        """GET /api/multilink/pages/{id} - returns page with links"""
        # Create a page first
        unique_slug = f"test-get-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Get Page",
            "bio": "Test bio",
            "theme": "gradient"
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Get the page
        response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == page_id
        assert data["slug"] == unique_slug
        assert data["title"] == "TEST_Get Page"
        assert data["bio"] == "Test bio"
        assert data["theme"] == "gradient"
        assert "links" in data
        assert isinstance(data["links"], list)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
    
    def test_get_nonexistent_page_returns_404(self, auth_headers):
        """GET /api/multilink/pages/{id} - nonexistent page returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/multilink/pages/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
    
    def test_update_page(self, auth_headers):
        """PUT /api/multilink/pages/{id} - updates page"""
        # Create a page
        unique_slug = f"test-update-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Original Title",
            "bio": "Original bio",
            "theme": "minimal"
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Update the page
        new_slug = f"test-updated-{uuid.uuid4().hex[:8]}"
        update_response = requests.put(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers, json={
            "slug": new_slug,
            "title": "TEST_Updated Title",
            "bio": "Updated bio",
            "theme": "dark"
        })
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["slug"] == new_slug
        assert data["title"] == "TEST_Updated Title"
        assert data["bio"] == "Updated bio"
        assert data["theme"] == "dark"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
    
    def test_delete_page(self, auth_headers):
        """DELETE /api/multilink/pages/{id} - deletes page and links"""
        # Create a page
        unique_slug = f"test-delete-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Delete Page",
            "theme": "minimal"
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Delete the page
        delete_response = requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert get_response.status_code == 404


class TestMultilinkLinks(TestMultilinkAuth):
    """Test link CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_page(self, auth_headers):
        """Create a test page for link tests"""
        unique_slug = f"test-links-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Links Page",
            "theme": "minimal"
        })
        assert response.status_code == 200
        page_data = response.json()
        
        yield page_data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_data['id']}", headers=auth_headers)
    
    def test_create_link(self, auth_headers, test_page):
        """POST /api/multilink/pages/{id}/links - creates a link"""
        page_id = test_page["id"]
        
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
            "label": "TEST_Instagram",
            "url": "https://instagram.com/test",
            "icon": "instagram",
            "icon_type": "social",
            "is_active": True
        })
        
        assert response.status_code == 200, f"Create link failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "message" in data
    
    def test_create_link_auto_order(self, auth_headers, test_page):
        """POST /api/multilink/pages/{id}/links - auto-increments order"""
        page_id = test_page["id"]
        
        # Create first link
        response1 = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
            "label": "TEST_Link 1",
            "url": "https://example1.com",
            "icon": "link"
        })
        assert response1.status_code == 200
        
        # Create second link
        response2 = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
            "label": "TEST_Link 2",
            "url": "https://example2.com",
            "icon": "link"
        })
        assert response2.status_code == 200
        
        # Verify order
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        links = page_response.json().get("links", [])
        
        # Links should be ordered
        assert len(links) >= 2
    
    def test_update_link(self, auth_headers, test_page):
        """PUT /api/multilink/pages/{id}/links/{link_id} - updates a link"""
        page_id = test_page["id"]
        
        # Create a link
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
            "label": "TEST_Original Label",
            "url": "https://original.com",
            "icon": "link",
            "is_active": True
        })
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Update the link
        update_response = requests.put(f"{BASE_URL}/api/multilink/pages/{page_id}/links/{link_id}", headers=auth_headers, json={
            "label": "TEST_Updated Label",
            "url": "https://updated.com",
            "icon": "website",
            "is_active": False
        })
        assert update_response.status_code == 200
        
        # Verify update
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        links = page_response.json().get("links", [])
        updated_link = next((l for l in links if l["id"] == link_id), None)
        
        assert updated_link is not None
        assert updated_link["label"] == "TEST_Updated Label"
        assert updated_link["url"] == "https://updated.com"
        assert updated_link["icon"] == "website"
        assert updated_link["is_active"] == False
    
    def test_delete_link(self, auth_headers, test_page):
        """DELETE /api/multilink/pages/{id}/links/{link_id} - deletes a link"""
        page_id = test_page["id"]
        
        # Create a link
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
            "label": "TEST_To Delete",
            "url": "https://delete.com",
            "icon": "link"
        })
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Delete the link
        delete_response = requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}/links/{link_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        links = page_response.json().get("links", [])
        deleted_link = next((l for l in links if l["id"] == link_id), None)
        assert deleted_link is None
    
    def test_reorder_links(self, auth_headers):
        """PUT /api/multilink/pages/{id}/links/reorder - reorders links"""
        # Create a dedicated page for this test
        unique_slug = f"test-reorder-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Reorder Page",
            "theme": "minimal"
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        try:
            # Create multiple links
            link_ids = []
            for i in range(3):
                response = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
                    "label": f"TEST_Reorder Link {i}",
                    "url": f"https://reorder{i}.com",
                    "icon": "link"
                })
                assert response.status_code == 200, f"Failed to create link {i}: {response.text}"
                link_ids.append(response.json()["id"])
            
            # Reverse the order
            reversed_ids = list(reversed(link_ids))
            reorder_response = requests.put(f"{BASE_URL}/api/multilink/pages/{page_id}/links/reorder", headers=auth_headers, json={
                "link_ids": reversed_ids
            })
            assert reorder_response.status_code == 200, f"Reorder failed: {reorder_response.text}"
            
            # Verify new order
            page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
            links = page_response.json().get("links", [])
            
            # Filter to only our test links
            test_links = [l for l in links if l["id"] in link_ids]
            test_links_sorted = sorted(test_links, key=lambda x: x["order"])
            
            # Verify order matches reversed_ids
            for i, link in enumerate(test_links_sorted):
                assert link["id"] == reversed_ids[i], f"Order mismatch at position {i}"
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)


class TestMultilinkStats(TestMultilinkAuth):
    """Test stats endpoint"""
    
    def test_get_page_stats(self, auth_headers):
        """GET /api/multilink/pages/{id}/stats - returns detailed stats"""
        # Create a page
        unique_slug = f"test-stats-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Stats Page",
            "theme": "minimal"
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Get stats
        stats_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}/stats?days=30", headers=auth_headers)
        assert stats_response.status_code == 200
        
        data = stats_response.json()
        assert "page_id" in data
        assert "period_days" in data
        assert "total_views" in data
        assert "total_clicks" in data
        assert "ctr" in data
        assert "views_by_day" in data
        assert "clicks_by_day" in data
        assert "link_stats" in data
        
        assert data["page_id"] == page_id
        assert data["period_days"] == 30
        assert isinstance(data["total_views"], int)
        assert isinstance(data["total_clicks"], int)
        assert isinstance(data["ctr"], (int, float))
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)


class TestMultilinkPublic:
    """Test public routes (no auth required)"""
    
    def test_get_public_page_existing(self):
        """GET /api/multilink/public/{slug} - returns public page data"""
        # Use the existing 'alpha' page
        response = requests.get(f"{BASE_URL}/api/multilink/public/alpha")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "slug" in data
        assert data["slug"] == "alpha"
        assert "title" in data
        assert "links" in data
        assert "theme_colors" in data
        
        # Should not expose user_id
        assert "user_id" not in data
        
        # Verify links structure
        if len(data["links"]) > 0:
            link = data["links"][0]
            assert "id" in link
            assert "label" in link
            assert "url" in link
            assert "icon" in link
            assert "is_active" in link
    
    def test_get_public_page_nonexistent(self):
        """GET /api/multilink/public/{slug} - nonexistent slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/multilink/public/nonexistent-slug-12345")
        assert response.status_code == 404
    
    def test_record_click(self):
        """POST /api/multilink/public/{slug}/click/{link_id} - records click"""
        # Get the alpha page to find a link ID
        page_response = requests.get(f"{BASE_URL}/api/multilink/public/alpha")
        assert page_response.status_code == 200
        
        links = page_response.json().get("links", [])
        if len(links) == 0:
            pytest.skip("No links available for click test")
        
        link_id = links[0]["id"]
        
        # Record click
        click_response = requests.post(f"{BASE_URL}/api/multilink/public/alpha/click/{link_id}")
        assert click_response.status_code == 200
        
        data = click_response.json()
        assert "message" in data
        assert "url" in data
    
    def test_record_click_invalid_link(self):
        """POST /api/multilink/public/{slug}/click/{link_id} - invalid link returns 404"""
        fake_link_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/multilink/public/alpha/click/{fake_link_id}")
        assert response.status_code == 404


class TestMultilinkIntegration(TestMultilinkAuth):
    """Integration tests for full workflows"""
    
    def test_full_page_workflow(self, auth_headers):
        """Test complete page creation, link management, and deletion workflow"""
        unique_slug = f"test-workflow-{uuid.uuid4().hex[:8]}"
        
        # 1. Create page
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Workflow Page",
            "bio": "Integration test page",
            "theme": "ocean",
            "is_active": True
        })
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # 2. Add links
        link_ids = []
        for i, (label, url, icon) in enumerate([
            ("Instagram", "https://instagram.com/test", "instagram"),
            ("Website", "https://example.com", "website"),
            ("Email", "mailto:test@example.com", "email")
        ]):
            link_response = requests.post(f"{BASE_URL}/api/multilink/pages/{page_id}/links", headers=auth_headers, json={
                "label": f"TEST_{label}",
                "url": url,
                "icon": icon,
                "is_active": True
            })
            assert link_response.status_code == 200
            link_ids.append(link_response.json()["id"])
        
        # 3. Verify page has links
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert page_response.status_code == 200
        assert len(page_response.json()["links"]) == 3
        
        # 4. Test public access
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{unique_slug}")
        assert public_response.status_code == 200
        public_data = public_response.json()
        assert public_data["title"] == "TEST_Workflow Page"
        assert len(public_data["links"]) == 3
        
        # 5. Record a click
        click_response = requests.post(f"{BASE_URL}/api/multilink/public/{unique_slug}/click/{link_ids[0]}")
        assert click_response.status_code == 200
        
        # 6. Check stats
        stats_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}/stats", headers=auth_headers)
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats["total_views"] >= 1  # At least one view from public access
        
        # 7. Update page to inactive
        update_response = requests.put(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers, json={
            "is_active": False
        })
        assert update_response.status_code == 200
        
        # 8. Verify public access is blocked for inactive page
        public_inactive_response = requests.get(f"{BASE_URL}/api/multilink/public/{unique_slug}")
        assert public_inactive_response.status_code == 404
        
        # 9. Cleanup - delete page
        delete_response = requests.delete(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # 10. Verify page is deleted
        get_deleted_response = requests.get(f"{BASE_URL}/api/multilink/pages/{page_id}", headers=auth_headers)
        assert get_deleted_response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
