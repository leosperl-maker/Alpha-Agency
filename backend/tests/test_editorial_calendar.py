"""
Editorial Calendar Module Tests
Tests for: Key dates generation, Posts CRUD, Move API, Filters, Social preview
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://social-hub-406.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@alphagency.fr"
TEST_PASSWORD = "superpassword"

# Store test data across tests
test_data = {
    "token": None,
    "calendar_id": None,
    "post_id": None,
    "key_date_id": None,
    "test_calendar_id": None
}


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        test_data["token"] = data["token"]
        print(f"✓ Login successful, user: {data['user']['email']}")


class TestEditorialNichesAndSettings:
    """Test niches and settings endpoints"""
    
    def test_get_available_niches(self):
        """Test GET /api/editorial/niches"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/niches", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "niches" in data
        assert "countries" in data
        assert len(data["niches"]) >= 10  # Should have multiple niches
        assert len(data["countries"]) >= 5  # Should have multiple countries
        
        # Verify restaurant niche exists
        niche_ids = [n["id"] for n in data["niches"]]
        assert "restaurant" in niche_ids
        assert "automobile" in niche_ids
        print(f"✓ Found {len(data['niches'])} niches and {len(data['countries'])} countries")
    
    def test_get_editorial_settings(self):
        """Test GET /api/editorial/settings"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/settings", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "networks" in data
        assert "formats" in data
        assert "statuses" in data
        assert "pillars" in data
        assert "objectives" in data
        
        # Verify networks include social platforms
        network_ids = [n["id"] for n in data["networks"]]
        assert "instagram" in network_ids
        assert "facebook" in network_ids
        assert "linkedin" in network_ids
        assert "tiktok" in network_ids
        assert "youtube" in network_ids
        print(f"✓ Settings loaded: {len(data['networks'])} networks, {len(data['statuses'])} statuses")


class TestCalendarCRUD:
    """Test calendar CRUD operations"""
    
    def test_list_calendars(self):
        """Test GET /api/editorial/calendars"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/calendars", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Find restaurant calendar
        restaurant_cal = next((c for c in data if c.get("niche") == "restaurant"), None)
        if restaurant_cal:
            test_data["calendar_id"] = restaurant_cal["id"]
            print(f"✓ Found restaurant calendar: {restaurant_cal['title']} with {len(restaurant_cal.get('key_dates', []))} key dates")
        else:
            print(f"✓ Listed {len(data)} calendars")
    
    def test_create_calendar_with_key_dates(self):
        """Test POST /api/editorial/calendars with AI key dates generation"""
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/editorial/calendars", headers=headers, json={
            "title": "TEST_Editorial_Calendar",
            "niche": "beaute",
            "country": "FR",
            "generate_key_dates": True,
            "description": "Test calendar for beauty niche"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Editorial_Calendar"
        assert data["niche"] == "beaute"
        
        # Key dates should be generated (may take time for AI)
        test_data["test_calendar_id"] = data["id"]
        key_dates_count = len(data.get("key_dates", []))
        print(f"✓ Created calendar with {key_dates_count} AI-generated key dates")
    
    def test_get_single_calendar(self):
        """Test GET /api/editorial/calendars/{id}"""
        if not test_data.get("calendar_id"):
            pytest.skip("No calendar ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/calendars/{test_data['calendar_id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["calendar_id"]
        print(f"✓ Retrieved calendar: {data['title']}")


class TestKeyDates:
    """Test key dates functionality"""
    
    def test_get_calendar_key_dates(self):
        """Test GET /api/editorial/calendars/{id}/key-dates"""
        if not test_data.get("calendar_id"):
            pytest.skip("No calendar ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/calendars/{test_data['calendar_id']}/key-dates", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "key_dates" in data
        assert "calendar_id" in data
        
        key_dates = data["key_dates"]
        if key_dates:
            test_data["key_date_id"] = key_dates[0]["id"]
            # Verify key date structure
            first_date = key_dates[0]
            assert "date" in first_date
            assert "title" in first_date
            assert "category" in first_date
            print(f"✓ Found {len(key_dates)} key dates, first: {first_date['title']} on {first_date['date']}")
        else:
            print("✓ Key dates endpoint works (no dates found)")
    
    def test_create_post_from_key_date(self):
        """Test POST /api/editorial/calendars/{id}/key-dates/{date_id}/create-post"""
        if not test_data.get("calendar_id") or not test_data.get("key_date_id"):
            pytest.skip("No calendar or key date ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/editorial/calendars/{test_data['calendar_id']}/key-dates/{test_data['key_date_id']}/create-post",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "scheduled_date" in data
        assert "key_date_id" in data
        
        test_data["post_id"] = data["id"]
        print(f"✓ Created post from key date: {data['title']} scheduled for {data['scheduled_date']}")


class TestPostsCRUD:
    """Test posts CRUD operations"""
    
    def test_list_posts(self):
        """Test GET /api/editorial/posts"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/posts", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} posts")
    
    def test_create_post(self):
        """Test POST /api/editorial/posts"""
        if not test_data.get("calendar_id"):
            pytest.skip("No calendar ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/editorial/posts", headers=headers, json={
            "calendar_id": test_data["calendar_id"],
            "title": "TEST_Post_Social_Preview",
            "caption": "🎉 Test caption for social preview!\n\nThis is a test post with multiple lines.\n\n#test #socialmedia #preview",
            "scheduled_date": "2026-03-20",
            "scheduled_time": "10:00",
            "networks": ["instagram", "facebook", "linkedin"],
            "format_type": "post",
            "content_pillar": "education",
            "objective": "engagement",
            "status": "draft"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Post_Social_Preview"
        assert "instagram" in data["networks"]
        assert "facebook" in data["networks"]
        assert "linkedin" in data["networks"]
        
        if not test_data.get("post_id"):
            test_data["post_id"] = data["id"]
        print(f"✓ Created post: {data['title']} with networks: {data['networks']}")
    
    def test_get_single_post(self):
        """Test GET /api/editorial/posts/{id}"""
        if not test_data.get("post_id"):
            pytest.skip("No post ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/editorial/posts/{test_data['post_id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["post_id"]
        print(f"✓ Retrieved post: {data['title']}")
    
    def test_update_post(self):
        """Test PUT /api/editorial/posts/{id}"""
        if not test_data.get("post_id"):
            pytest.skip("No post ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        response = requests.put(f"{BASE_URL}/api/editorial/posts/{test_data['post_id']}", headers=headers, json={
            "status": "in_progress",
            "cta": "Découvrez notre offre!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        assert data["cta"] == "Découvrez notre offre!"
        print(f"✓ Updated post status to: {data['status']}")


class TestMovePostAPI:
    """Test post move/drag-drop functionality"""
    
    def test_move_post_to_new_date(self):
        """Test PUT /api/editorial/posts/{id}/move"""
        if not test_data.get("post_id"):
            pytest.skip("No post ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        
        # Move to a new date
        response = requests.put(
            f"{BASE_URL}/api/editorial/posts/{test_data['post_id']}/move?scheduled_date=2026-04-15&scheduled_time=16:30",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["scheduled_date"] == "2026-04-15"
        assert data["scheduled_time"] == "16:30"
        print(f"✓ Moved post to: {data['scheduled_date']} at {data['scheduled_time']}")
    
    def test_move_post_date_only(self):
        """Test move post with date only (no time)"""
        if not test_data.get("post_id"):
            pytest.skip("No post ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}", "Content-Type": "application/json"}
        
        response = requests.put(
            f"{BASE_URL}/api/editorial/posts/{test_data['post_id']}/move?scheduled_date=2026-05-01",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["scheduled_date"] == "2026-05-01"
        print(f"✓ Moved post to date: {data['scheduled_date']}")


class TestPostFilters:
    """Test post filtering functionality"""
    
    def test_filter_by_status(self):
        """Test GET /api/editorial/posts?status=..."""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/editorial/posts?status=idea", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned posts should have status=idea
        for post in data:
            assert post["status"] == "idea"
        print(f"✓ Filter by status=idea: {len(data)} posts")
    
    def test_filter_by_network(self):
        """Test GET /api/editorial/posts?network=..."""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/editorial/posts?network=instagram", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned posts should have instagram in networks
        for post in data:
            assert "instagram" in post.get("networks", [])
        print(f"✓ Filter by network=instagram: {len(data)} posts")
    
    def test_filter_by_format(self):
        """Test GET /api/editorial/posts?format_type=..."""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/editorial/posts?format_type=post", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned posts should have format_type=post
        for post in data:
            assert post["format_type"] == "post"
        print(f"✓ Filter by format_type=post: {len(data)} posts")
    
    def test_filter_by_calendar(self):
        """Test GET /api/editorial/posts?calendar_id=..."""
        if not test_data.get("calendar_id"):
            pytest.skip("No calendar ID available")
        
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/editorial/posts?calendar_id={test_data['calendar_id']}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned posts should belong to the calendar
        for post in data:
            assert post["calendar_id"] == test_data["calendar_id"]
        print(f"✓ Filter by calendar_id: {len(data)} posts")
    
    def test_filter_by_date_range(self):
        """Test GET /api/editorial/posts?start_date=...&end_date=..."""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/editorial/posts?start_date=2026-01-01&end_date=2026-06-30",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned posts should be within date range
        for post in data:
            if post.get("scheduled_date"):
                assert "2026-01-01" <= post["scheduled_date"] <= "2026-06-30"
        print(f"✓ Filter by date range: {len(data)} posts")


class TestCalendarView:
    """Test calendar view endpoint"""
    
    def test_calendar_view_endpoint(self):
        """Test GET /api/editorial/calendar-view"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/editorial/calendar-view?start_date=2026-01-01&end_date=2026-12-31",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify event structure
        if data:
            event = data[0]
            assert "id" in event
            assert "title" in event
            assert "start" in event
            assert "extendedProps" in event
        print(f"✓ Calendar view: {len(data)} events")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_calendar(self):
        """Delete test calendar"""
        if not test_data.get("test_calendar_id"):
            pytest.skip("No test calendar to cleanup")
        
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.delete(
            f"{BASE_URL}/api/editorial/calendars/{test_data['test_calendar_id']}",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Cleaned up test calendar")
    
    def test_cleanup_test_posts(self):
        """Delete test posts"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        # Get all posts and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/editorial/posts", headers=headers)
        if response.status_code == 200:
            posts = response.json()
            deleted = 0
            for post in posts:
                if post.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/editorial/posts/{post['id']}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
