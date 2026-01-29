"""
Multilink Sections Tests - Carousel, Text, Image, Divider, Header sections
Tests for section CRUD operations and public page rendering with sections
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


class TestMultilinkSectionsAuth:
    """Authentication setup for section tests"""
    
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
    
    @pytest.fixture(scope="class")
    def test_page_id(self, auth_headers):
        """Get or create a test page for section tests"""
        # First try to get existing pages
        response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        assert response.status_code == 200
        pages = response.json()
        
        if pages:
            return pages[0]["id"]
        
        # Create a test page if none exists
        unique_slug = f"test-sections-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Section Test Page",
            "bio": "Page for testing sections",
            "theme": "dark",
            "is_active": True
        })
        assert response.status_code == 200
        return response.json()["id"]


class TestSectionCRUD(TestMultilinkSectionsAuth):
    """Test section CRUD operations"""
    
    def test_get_sections_requires_auth(self, test_page_id):
        """GET /api/multilink/pages/{id}/sections - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections")
        assert response.status_code == 401
    
    def test_get_sections_empty_initially(self, auth_headers, test_page_id):
        """GET /api/multilink/pages/{id}/sections - returns empty list or existing sections"""
        response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_carousel_section(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/sections - creates carousel section with items"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "carousel",
            "title": "TEST_Carousel Section",
            "items": [
                {"image": "https://picsum.photos/400/300", "title": "Item 1", "subtitle": "Description 1", "url": "https://example.com/1"},
                {"image": "https://picsum.photos/400/301", "title": "Item 2", "subtitle": "Description 2", "url": "https://example.com/2"},
                {"image": "https://picsum.photos/400/302", "title": "Item 3", "subtitle": "Description 3", "url": "https://example.com/3"}
            ],
            "settings": {"autoplay": False, "show_arrows": True, "card_style": "rounded"},
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Section ajoutée"
        
        # Verify section was created
        section_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        created_section = next((s for s in sections if s["id"] == section_id), None)
        assert created_section is not None
        assert created_section["section_type"] == "carousel"
        assert created_section["title"] == "TEST_Carousel Section"
        assert len(created_section["items"]) == 3
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_create_text_section(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/sections - creates text section"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "text",
            "title": "TEST_About Us",
            "content": "This is a text section with some content.\nIt can have multiple lines.",
            "settings": {"align": "left", "size": "base"},
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify
        section_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        created_section = next((s for s in sections if s["id"] == section_id), None)
        assert created_section is not None
        assert created_section["section_type"] == "text"
        assert "multiple lines" in created_section["content"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_create_image_section(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/sections - creates image gallery section"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "image",
            "title": "TEST_Gallery",
            "images": [
                "https://picsum.photos/400/400",
                "https://picsum.photos/401/401",
                "https://picsum.photos/402/402"
            ],
            "settings": {"columns": 3, "gap": 2, "rounded": True},
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify
        section_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        created_section = next((s for s in sections if s["id"] == section_id), None)
        assert created_section is not None
        assert created_section["section_type"] == "image"
        assert len(created_section["images"]) == 3
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_create_divider_section(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/sections - creates divider section"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "divider",
            "settings": {"style": "line", "spacing": "md"},
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Cleanup
        section_id = data["id"]
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_create_header_section(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/sections - creates header section"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "header",
            "content": "TEST_Big Header Title",
            "settings": {"size": "lg", "align": "center"},
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Cleanup
        section_id = data["id"]
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_update_section(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id}/sections/{section_id} - updates section"""
        # Create section first
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "text",
            "title": "TEST_Original Title",
            "content": "Original content",
            "is_active": True
        })
        section_id = create_response.json()["id"]
        
        # Update section
        update_response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}",
            headers=auth_headers,
            json={
                "title": "TEST_Updated Title",
                "content": "Updated content",
                "is_active": False
            }
        )
        assert update_response.status_code == 200
        assert update_response.json()["message"] == "Section mise à jour"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        updated_section = next((s for s in sections if s["id"] == section_id), None)
        assert updated_section is not None
        assert updated_section["title"] == "TEST_Updated Title"
        assert updated_section["content"] == "Updated content"
        assert updated_section["is_active"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_delete_section(self, auth_headers, test_page_id):
        """DELETE /api/multilink/pages/{id}/sections/{section_id} - deletes section"""
        # Create section first
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "divider",
            "is_active": True
        })
        section_id = create_response.json()["id"]
        
        # Delete section
        delete_response = requests.delete(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Section supprimée"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        deleted_section = next((s for s in sections if s["id"] == section_id), None)
        assert deleted_section is None
    
    def test_delete_nonexistent_section_returns_404(self, auth_headers, test_page_id):
        """DELETE /api/multilink/pages/{id}/sections/{section_id} - returns 404 for nonexistent"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestSectionOrdering(TestMultilinkSectionsAuth):
    """Test section ordering/reordering"""
    
    def test_sections_ordered_by_order_field(self, auth_headers, test_page_id):
        """Sections should be returned in order"""
        # Create multiple sections
        section_ids = []
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
                "section_type": "divider",
                "title": f"TEST_Section {i}",
                "order": i,
                "is_active": True
            })
            section_ids.append(response.json()["id"])
        
        # Get sections and verify order
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        
        # Filter to our test sections
        test_sections = [s for s in sections if s["id"] in section_ids]
        assert len(test_sections) == 3
        
        # Verify they are ordered
        for i, section in enumerate(test_sections):
            assert section["order"] == i or section["order"] == i + 1  # Order may start at 1
        
        # Cleanup
        for sid in section_ids:
            requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{sid}", headers=auth_headers)
    
    def test_reorder_sections(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id}/sections/reorder - reorders sections"""
        # Create sections
        section_ids = []
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
                "section_type": "divider",
                "title": f"TEST_Reorder Section {i}",
                "is_active": True
            })
            section_ids.append(response.json()["id"])
        
        # Reorder: reverse the order
        reversed_ids = list(reversed(section_ids))
        reorder_response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/reorder",
            headers=auth_headers,
            json={"section_ids": reversed_ids}
        )
        assert reorder_response.status_code == 200
        
        # Verify new order
        get_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers)
        sections = get_response.json()
        test_sections = [s for s in sections if s["id"] in section_ids]
        
        # First section should now be the last one we created
        assert test_sections[0]["id"] == reversed_ids[0]
        
        # Cleanup
        for sid in section_ids:
            requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{sid}", headers=auth_headers)


class TestPublicPageWithSections(TestMultilinkSectionsAuth):
    """Test public page rendering with sections"""
    
    def test_public_page_includes_active_sections(self, auth_headers, test_page_id):
        """GET /api/multilink/public/{slug} - includes active sections"""
        # Get page slug
        pages_response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        pages = pages_response.json()
        page = next((p for p in pages if p["id"] == test_page_id), None)
        assert page is not None
        slug = page["slug"]
        
        # Create an active section
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "carousel",
            "title": "TEST_Public Carousel",
            "items": [
                {"image": "https://picsum.photos/400/300", "title": "Public Item", "subtitle": "Visible", "url": "https://example.com"}
            ],
            "is_active": True
        })
        section_id = create_response.json()["id"]
        
        # Get public page
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{slug}")
        assert public_response.status_code == 200
        data = public_response.json()
        
        # Verify sections are included
        assert "sections" in data
        assert isinstance(data["sections"], list)
        
        # Find our test section
        test_section = next((s for s in data["sections"] if s["id"] == section_id), None)
        assert test_section is not None
        assert test_section["section_type"] == "carousel"
        assert test_section["title"] == "TEST_Public Carousel"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)
    
    def test_public_page_excludes_inactive_sections(self, auth_headers, test_page_id):
        """GET /api/multilink/public/{slug} - excludes inactive sections"""
        # Get page slug
        pages_response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        pages = pages_response.json()
        page = next((p for p in pages if p["id"] == test_page_id), None)
        slug = page["slug"]
        
        # Create an inactive section
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections", headers=auth_headers, json={
            "section_type": "text",
            "title": "TEST_Inactive Section",
            "content": "This should not appear",
            "is_active": False
        })
        section_id = create_response.json()["id"]
        
        # Get public page
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{slug}")
        data = public_response.json()
        
        # Verify inactive section is NOT included
        inactive_section = next((s for s in data.get("sections", []) if s["id"] == section_id), None)
        assert inactive_section is None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/sections/{section_id}", headers=auth_headers)


class TestLinkThumbnails(TestMultilinkSectionsAuth):
    """Test link thumbnails feature"""
    
    def test_create_link_with_thumbnail(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/links - creates link with thumbnail"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/links", headers=auth_headers, json={
            "label": "TEST_Link with Thumbnail",
            "url": "https://example.com",
            "description": "A link with a thumbnail image",
            "thumbnail": "https://picsum.photos/400/300",
            "icon": "link",
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify link was created with thumbnail
        link_id = data["id"]
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        
        created_link = next((l for l in page_data.get("links", []) if l["id"] == link_id), None)
        assert created_link is not None
        assert created_link["thumbnail"] == "https://picsum.photos/400/300"
        assert created_link["description"] == "A link with a thumbnail image"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/links/{link_id}", headers=auth_headers)
    
    def test_update_link_thumbnail(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id}/links/{link_id} - updates link thumbnail"""
        # Create link without thumbnail
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/links", headers=auth_headers, json={
            "label": "TEST_Link No Thumbnail",
            "url": "https://example.com",
            "is_active": True
        })
        link_id = create_response.json()["id"]
        
        # Update with thumbnail
        update_response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/links/{link_id}",
            headers=auth_headers,
            json={
                "thumbnail": "https://picsum.photos/400/300",
                "description": "Now has a thumbnail"
            }
        )
        assert update_response.status_code == 200
        
        # Verify update
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        updated_link = next((l for l in page_data.get("links", []) if l["id"] == link_id), None)
        assert updated_link is not None
        assert updated_link["thumbnail"] == "https://picsum.photos/400/300"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/links/{link_id}", headers=auth_headers)


class TestImageUpload(TestMultilinkSectionsAuth):
    """Test image upload for multilink"""
    
    def test_upload_image_requires_auth(self):
        """POST /api/multilink/upload-image - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/multilink/upload-image")
        assert response.status_code == 401
    
    def test_upload_image_rejects_non_image(self, auth_headers):
        """POST /api/multilink/upload-image - rejects non-image files"""
        # Create a fake text file
        files = {"file": ("test.txt", b"This is not an image", "text/plain")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/multilink/upload-image", headers=headers, files=files)
        assert response.status_code == 400
        assert "image" in response.json().get("detail", "").lower()
