"""
Multilink Blocks Tests - Testing Text blocks with Markdown, Link+Image blocks, and Design color customization
Tests for the zaap.bio clone features
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "Test123!"


class TestMultilinkBlocksAuth:
    """Authentication setup for block tests"""
    
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
        """Get or create a test page for block tests"""
        response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        assert response.status_code == 200
        pages = response.json()
        
        if pages:
            return pages[0]["id"]
        
        # Create a test page if none exists
        unique_slug = f"test-blocks-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/multilink/pages", headers=auth_headers, json={
            "slug": unique_slug,
            "title": "TEST_Block Test Page",
            "bio": "Page for testing blocks",
            "theme": "dark",
            "is_active": True
        })
        assert response.status_code == 200
        return response.json()["id"]


class TestTextBlockWithMarkdown(TestMultilinkBlocksAuth):
    """Test text blocks with markdown content"""
    
    def test_create_text_block_with_markdown(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/blocks - creates text block with markdown"""
        markdown_content = """# Test Heading

This is **bold** and *italic* text.

## Subheading
- List item 1
- List item 2
- List item 3

> This is a blockquote

[Link text](https://example.com)
"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "text",
            "content": markdown_content,
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Bloc ajouté"
        
        # Verify block was created with markdown content
        block_id = data["id"]
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        
        created_block = next((b for b in page_data.get("blocks", []) if b["id"] == block_id), None)
        assert created_block is not None
        assert created_block["block_type"] == "text"
        assert "# Test Heading" in created_block["content"]
        assert "**bold**" in created_block["content"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)
    
    def test_update_text_block_content(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id}/blocks/{block_id} - updates text block content"""
        # Create block first
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "text",
            "content": "Original content",
            "is_active": True
        })
        block_id = create_response.json()["id"]
        
        # Update with new markdown content
        new_content = "# Updated Heading\n\nNew **markdown** content"
        update_response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}",
            headers=auth_headers,
            json={"content": new_content}
        )
        assert update_response.status_code == 200
        
        # Verify update
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        updated_block = next((b for b in page_data.get("blocks", []) if b["id"] == block_id), None)
        assert updated_block is not None
        assert "# Updated Heading" in updated_block["content"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)


class TestLinkImageBlock(TestMultilinkBlocksAuth):
    """Test link+image blocks with all fields"""
    
    def test_create_link_image_block_with_all_fields(self, auth_headers, test_page_id):
        """POST /api/multilink/pages/{id}/blocks - creates link_image block with all fields"""
        response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "link_image",
            "label": "TEST_Link Image Block",
            "url": "https://example.com/test",
            "description": "This is a test description for the link image block",
            "thumbnail": "https://picsum.photos/800/400",
            "settings": {
                "button_text": "Click Here",
                "open_in": "new_tab"
            },
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify block was created with all fields
        block_id = data["id"]
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        
        created_block = next((b for b in page_data.get("blocks", []) if b["id"] == block_id), None)
        assert created_block is not None
        assert created_block["block_type"] == "link_image"
        assert created_block["label"] == "TEST_Link Image Block"
        assert created_block["url"] == "https://example.com/test"
        assert created_block["description"] == "This is a test description for the link image block"
        assert created_block["thumbnail"] == "https://picsum.photos/800/400"
        assert created_block["settings"]["button_text"] == "Click Here"
        assert created_block["settings"]["open_in"] == "new_tab"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)
    
    def test_link_image_block_appears_in_public_page(self, auth_headers, test_page_id):
        """GET /api/multilink/public/{slug} - link_image block appears in public page"""
        # Get page slug
        pages_response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        pages = pages_response.json()
        page = next((p for p in pages if p["id"] == test_page_id), None)
        assert page is not None
        slug = page["slug"]
        
        # Create link_image block
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "link_image",
            "label": "TEST_Public Link Image",
            "url": "https://example.com/public",
            "description": "Public description",
            "thumbnail": "https://picsum.photos/800/401",
            "is_active": True
        })
        block_id = create_response.json()["id"]
        
        # Get public page
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{slug}")
        assert public_response.status_code == 200
        data = public_response.json()
        
        # Verify block is in public page
        public_block = next((b for b in data.get("blocks", []) if b["id"] == block_id), None)
        assert public_block is not None
        assert public_block["label"] == "TEST_Public Link Image"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)


class TestDesignColorCustomization(TestMultilinkBlocksAuth):
    """Test design tab color customization"""
    
    def test_update_page_custom_colors(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id} - updates custom colors"""
        custom_colors = {
            "background": "#1a1a2e",
            "text": "#ffffff",
            "button_bg": "#4a4a6a",
            "button_text": "#ffffff",
            "button_hover": "#5a5a7a",
            "accent": "#ff6b6b"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}",
            headers=auth_headers,
            json={
                "theme": "custom",
                "custom_colors": custom_colors
            }
        )
        assert response.status_code == 200
        
        # Verify colors were saved
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        
        assert page_data["theme"] == "custom"
        assert page_data["custom_colors"]["background"] == "#1a1a2e"
        assert page_data["custom_colors"]["accent"] == "#ff6b6b"
    
    def test_custom_colors_appear_in_public_page(self, auth_headers, test_page_id):
        """GET /api/multilink/public/{slug} - custom colors appear in public page"""
        # Get page slug
        pages_response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        pages = pages_response.json()
        page = next((p for p in pages if p["id"] == test_page_id), None)
        slug = page["slug"]
        
        # Set custom colors
        custom_colors = {
            "background": "#2d2d44",
            "text": "#f0f0f0",
            "button_bg": "#3d3d5c",
            "button_text": "#ffffff",
            "accent": "#00ff88"
        }
        
        requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}",
            headers=auth_headers,
            json={
                "theme": "custom",
                "custom_colors": custom_colors
            }
        )
        
        # Get public page
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{slug}")
        assert public_response.status_code == 200
        data = public_response.json()
        
        # Verify custom colors are present
        assert "custom_colors" in data
        assert data["custom_colors"]["background"] == "#2d2d44"
        assert data["custom_colors"]["accent"] == "#00ff88"
    
    def test_theme_presets_available(self):
        """GET /api/multilink/themes - returns available theme presets"""
        response = requests.get(f"{BASE_URL}/api/multilink/themes")
        assert response.status_code == 200
        data = response.json()
        
        assert "themes" in data
        themes = data["themes"]
        
        # Check for expected theme presets
        expected_themes = ["minimal", "dark", "gradient", "ocean", "sunset", "nature", "custom"]
        for theme in expected_themes:
            assert theme in themes, f"Theme '{theme}' not found"
            assert "background" in themes[theme]
            assert "text" in themes[theme]


class TestBlockCRUD(TestMultilinkBlocksAuth):
    """Test block CRUD operations"""
    
    def test_delete_block(self, auth_headers, test_page_id):
        """DELETE /api/multilink/pages/{id}/blocks/{block_id} - deletes block"""
        # Create block first
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "text",
            "content": "Block to delete",
            "is_active": True
        })
        block_id = create_response.json()["id"]
        
        # Delete block
        delete_response = requests.delete(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Bloc supprimé"
        
        # Verify deletion
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        deleted_block = next((b for b in page_data.get("blocks", []) if b["id"] == block_id), None)
        assert deleted_block is None
    
    def test_toggle_block_active_status(self, auth_headers, test_page_id):
        """PUT /api/multilink/pages/{id}/blocks/{block_id} - toggles block active status"""
        # Create active block
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "text",
            "content": "Toggle test",
            "is_active": True
        })
        block_id = create_response.json()["id"]
        
        # Deactivate block
        update_response = requests.put(
            f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}",
            headers=auth_headers,
            json={"is_active": False}
        )
        assert update_response.status_code == 200
        
        # Verify block is inactive
        page_response = requests.get(f"{BASE_URL}/api/multilink/pages/{test_page_id}", headers=auth_headers)
        page_data = page_response.json()
        updated_block = next((b for b in page_data.get("blocks", []) if b["id"] == block_id), None)
        assert updated_block is not None
        assert updated_block["is_active"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)
    
    def test_inactive_block_not_in_public_page(self, auth_headers, test_page_id):
        """GET /api/multilink/public/{slug} - inactive blocks not shown"""
        # Get page slug
        pages_response = requests.get(f"{BASE_URL}/api/multilink/pages", headers=auth_headers)
        pages = pages_response.json()
        page = next((p for p in pages if p["id"] == test_page_id), None)
        slug = page["slug"]
        
        # Create inactive block
        create_response = requests.post(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks", headers=auth_headers, json={
            "block_type": "text",
            "content": "TEST_Inactive block",
            "is_active": False
        })
        block_id = create_response.json()["id"]
        
        # Get public page
        public_response = requests.get(f"{BASE_URL}/api/multilink/public/{slug}")
        data = public_response.json()
        
        # Verify inactive block is NOT in public page
        inactive_block = next((b for b in data.get("blocks", []) if b["id"] == block_id), None)
        assert inactive_block is None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/multilink/pages/{test_page_id}/blocks/{block_id}", headers=auth_headers)
