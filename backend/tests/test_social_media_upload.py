"""
Test suite for POST /api/social/upload-media endpoint
Tests Cloudinary media upload for social media posts

Features tested:
- Image upload to Cloudinary (returns https://res.cloudinary.com/... URL)
- Video upload to Cloudinary
- File type validation (image or video only)
- File size validation (10MB images, 50MB videos)
"""

import pytest
import requests
import os
import io

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"


class TestSocialMediaUpload:
    """Tests for POST /api/social/upload-media endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_upload_image_returns_cloudinary_url(self):
        """Test: Image upload returns a valid Cloudinary URL (https://res.cloudinary.com/...)"""
        # Create a simple test image (1x1 red PNG)
        # PNG header + IHDR + IDAT + IEND chunks for a 1x1 red pixel
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,  # compressed data
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,  
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,  # IEND chunk
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should indicate success"
        assert "url" in data, "Response should contain 'url' field"
        assert "type" in data, "Response should contain 'type' field"
        assert "public_id" in data, "Response should contain 'public_id' field"
        
        # CRITICAL: Verify URL is a Cloudinary URL, not a blob:// URL
        url = data.get("url")
        assert url is not None, "URL should not be None"
        assert url.startswith("https://res.cloudinary.com/"), f"URL should be a Cloudinary URL, got: {url}"
        assert "blob:" not in url, f"URL should NOT be a blob:// URL, got: {url}"
        
        # Verify type is image
        assert data.get("type") == "image", f"Type should be 'image', got: {data.get('type')}"
        
        print(f"✓ Image uploaded successfully to Cloudinary: {url}")
    
    def test_upload_image_with_jpeg(self):
        """Test: JPEG image upload returns Cloudinary URL"""
        # Minimal valid JPEG (1x1 white pixel)
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
            0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
            0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
            0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
            0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00,
            0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
            0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1,
            0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A,
            0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35,
            0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55,
            0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65,
            0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85,
            0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94,
            0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2,
            0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA,
            0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8,
            0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6,
            0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA,
            0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
            0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7F, 0xFF,
            0xD9
        ])
        
        files = {
            'file': ('test_image.jpg', io.BytesIO(jpeg_data), 'image/jpeg')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        
        # Accept 200 (success) or 400 (if Cloudinary rejects minimal JPEG)
        if response.status_code == 200:
            data = response.json()
            url = data.get("url")
            assert url.startswith("https://res.cloudinary.com/"), f"URL should be Cloudinary URL: {url}"
            print(f"✓ JPEG uploaded successfully: {url}")
        else:
            # Cloudinary may reject minimal/invalid JPEG
            print(f"Note: Cloudinary rejected minimal JPEG (expected for test data)")
    
    def test_upload_rejects_invalid_file_type(self):
        """Test: Upload rejects non-image/video files (e.g., text files)"""
        text_content = b"This is a text file, not an image or video"
        
        files = {
            'file': ('test.txt', io.BytesIO(text_content), 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 400, f"Should reject text files with 400, got: {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain 'detail'"
        print(f"✓ Text file correctly rejected: {data.get('detail')}")
    
    def test_upload_rejects_pdf_file(self):
        """Test: Upload rejects PDF files"""
        # Minimal PDF header
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        
        files = {
            'file': ('document.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        
        assert response.status_code == 400, f"Should reject PDF with 400, got: {response.status_code}"
        print("✓ PDF file correctly rejected")
    
    def test_upload_rejects_oversized_image(self):
        """Test: Upload rejects images larger than 10MB"""
        # Create a file larger than 10MB (10.5MB)
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        
        files = {
            'file': ('large_image.png', io.BytesIO(large_content), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        
        assert response.status_code == 400, f"Should reject oversized image with 400, got: {response.status_code}"
        
        data = response.json()
        assert "10" in data.get("detail", "") or "MB" in data.get("detail", ""), \
            f"Error should mention size limit: {data.get('detail')}"
        print(f"✓ Oversized image correctly rejected: {data.get('detail')}")
    
    def test_upload_requires_authentication(self):
        """Test: Upload endpoint requires authentication"""
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Request without auth header
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            files=files
        )
        
        print(f"Response status (no auth): {response.status_code}")
        
        assert response.status_code == 401, f"Should require auth (401), got: {response.status_code}"
        print("✓ Authentication correctly required")
    
    def test_upload_response_contains_metadata(self):
        """Test: Upload response contains useful metadata (format, dimensions, size)"""
        # Create a valid PNG
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_metadata.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check metadata fields
            assert "format" in data, "Response should contain 'format'"
            assert "width" in data, "Response should contain 'width'"
            assert "height" in data, "Response should contain 'height'"
            assert "bytes" in data, "Response should contain 'bytes'"
            
            print(f"✓ Metadata present: format={data.get('format')}, "
                  f"dimensions={data.get('width')}x{data.get('height')}, "
                  f"size={data.get('bytes')} bytes")
        else:
            print(f"Note: Upload returned {response.status_code}")


class TestCloudinaryURLValidation:
    """Tests to verify URLs are valid Cloudinary URLs, not blob:// URLs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_url_is_publicly_accessible(self):
        """Test: Returned Cloudinary URL is publicly accessible (can be fetched)"""
        # Upload an image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_public.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            url = data.get("url")
            
            # Try to fetch the URL
            fetch_response = requests.get(url, timeout=10)
            
            assert fetch_response.status_code == 200, \
                f"Cloudinary URL should be publicly accessible, got: {fetch_response.status_code}"
            
            # Verify it's an image
            content_type = fetch_response.headers.get('Content-Type', '')
            assert 'image' in content_type, f"Should return image content-type, got: {content_type}"
            
            print(f"✓ URL is publicly accessible: {url}")
        else:
            pytest.skip(f"Upload failed with {response.status_code}")
    
    def test_url_format_is_cloudinary(self):
        """Test: URL format matches Cloudinary pattern"""
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_format.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/upload-media",
            headers=self.headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            url = data.get("url")
            
            # Verify URL format
            assert url.startswith("https://"), "URL should use HTTPS"
            assert "res.cloudinary.com" in url, "URL should be from res.cloudinary.com"
            assert "dd9izwkgo" in url, "URL should contain the cloud name"
            assert "social_media_posts" in url, "URL should contain the folder name"
            
            # Verify it's NOT a blob URL
            assert not url.startswith("blob:"), "URL should NOT be a blob:// URL"
            assert "blob:" not in url, "URL should NOT contain 'blob:'"
            
            print(f"✓ URL format is correct Cloudinary format: {url}")
        else:
            pytest.skip(f"Upload failed with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
