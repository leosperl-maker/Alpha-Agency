"""
Backend API tests for News (Actualités) and Social Media Manager features
Tests: News topics, articles, refresh, delete + Social posts, calendar, inbox, stats
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestNewsAPI(TestAuth):
    """News/Actualités API tests"""
    
    def test_get_news_topics(self, auth_headers):
        """Test GET /api/news/topics - Get available news topics"""
        response = requests.get(f"{BASE_URL}/api/news/topics", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get topics: {response.text}"
        
        topics = response.json()
        assert isinstance(topics, list), "Topics should be a list"
        assert len(topics) > 0, "Should have at least one topic"
        
        # Verify topic structure
        for topic in topics:
            assert "id" in topic, "Topic should have id"
            assert "label" in topic, "Topic should have label"
        
        # Check for expected topics
        topic_ids = [t["id"] for t in topics]
        expected_topics = ["guadeloupe", "martinique", "france", "marketing", "social"]
        for expected in expected_topics:
            assert expected in topic_ids, f"Expected topic '{expected}' not found"
        
        print(f"✓ Found {len(topics)} news topics")
    
    def test_get_news_articles(self, auth_headers):
        """Test GET /api/news - Get news articles"""
        response = requests.get(f"{BASE_URL}/api/news", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get articles: {response.text}"
        
        articles = response.json()
        assert isinstance(articles, list), "Articles should be a list"
        
        print(f"✓ Found {len(articles)} news articles")
        
        # If articles exist, verify structure
        if len(articles) > 0:
            article = articles[0]
            assert "id" in article, "Article should have id"
            assert "title" in article, "Article should have title"
            assert "topic_id" in article, "Article should have topic_id"
            print(f"  First article: {article.get('title', 'N/A')[:50]}...")
    
    def test_get_news_articles_by_topic(self, auth_headers):
        """Test GET /api/news?topic_id=guadeloupe - Filter by topic"""
        response = requests.get(
            f"{BASE_URL}/api/news", 
            params={"topic_id": "guadeloupe", "limit": 10},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to filter articles: {response.text}"
        
        articles = response.json()
        assert isinstance(articles, list), "Articles should be a list"
        
        # All articles should be from guadeloupe topic
        for article in articles:
            assert article.get("topic_id") == "guadeloupe", f"Article topic mismatch: {article.get('topic_id')}"
        
        print(f"✓ Found {len(articles)} articles for topic 'guadeloupe'")
    
    def test_delete_news_article_not_found(self, auth_headers):
        """Test DELETE /api/news/{id} - Delete non-existent article"""
        response = requests.delete(
            f"{BASE_URL}/api/news/non-existent-id",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent article returns 404")


class TestSocialMediaAPI(TestAuth):
    """Social Media Manager API tests"""
    
    def test_get_social_stats(self, auth_headers):
        """Test GET /api/social/stats - Get social media statistics"""
        response = requests.get(f"{BASE_URL}/api/social/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        stats = response.json()
        assert "posts" in stats, "Stats should have posts"
        assert "inbox" in stats, "Stats should have inbox"
        assert "accounts" in stats, "Stats should have accounts"
        
        # Verify posts stats structure
        posts_stats = stats["posts"]
        assert "scheduled" in posts_stats, "Posts stats should have scheduled count"
        assert "published" in posts_stats, "Posts stats should have published count"
        assert "drafts" in posts_stats, "Posts stats should have drafts count"
        
        # Verify inbox stats structure
        inbox_stats = stats["inbox"]
        assert "unread" in inbox_stats, "Inbox stats should have unread count"
        assert "pending_reply" in inbox_stats, "Inbox stats should have pending_reply count"
        
        print(f"✓ Social stats: {posts_stats['scheduled']} scheduled, {inbox_stats['unread']} unread")
    
    def test_get_social_accounts(self, auth_headers):
        """Test GET /api/social/accounts - Get connected accounts"""
        response = requests.get(f"{BASE_URL}/api/social/accounts", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get accounts: {response.text}"
        
        accounts = response.json()
        assert isinstance(accounts, list), "Accounts should be a list"
        print(f"✓ Found {len(accounts)} connected social accounts")
    
    def test_get_social_posts(self, auth_headers):
        """Test GET /api/social/posts - Get scheduled posts"""
        response = requests.get(f"{BASE_URL}/api/social/posts", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get posts: {response.text}"
        
        posts = response.json()
        assert isinstance(posts, list), "Posts should be a list"
        print(f"✓ Found {len(posts)} social posts")
        
        # If posts exist, verify structure
        if len(posts) > 0:
            post = posts[0]
            assert "id" in post, "Post should have id"
            assert "content" in post, "Post should have content"
            assert "status" in post, "Post should have status"
            print(f"  First post status: {post.get('status')}")
    
    def test_get_social_calendar(self, auth_headers):
        """Test GET /api/social/calendar - Get calendar view"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/social/calendar",
            params={"month": current_month, "year": current_year},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get calendar: {response.text}"
        
        calendar = response.json()
        assert "month" in calendar, "Calendar should have month"
        assert "year" in calendar, "Calendar should have year"
        assert "posts_by_date" in calendar, "Calendar should have posts_by_date"
        
        assert calendar["month"] == current_month, f"Month mismatch: {calendar['month']} != {current_month}"
        assert calendar["year"] == current_year, f"Year mismatch: {calendar['year']} != {current_year}"
        
        print(f"✓ Calendar for {current_month}/{current_year} loaded")
    
    def test_get_social_calendar_december_2025(self, auth_headers):
        """Test GET /api/social/calendar for December 2025 (where test post exists)"""
        response = requests.get(
            f"{BASE_URL}/api/social/calendar",
            params={"month": 12, "year": 2025},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get calendar: {response.text}"
        
        calendar = response.json()
        posts_by_date = calendar.get("posts_by_date", {})
        
        print(f"✓ December 2025 calendar: {len(posts_by_date)} dates with posts")
        
        # Check if there's a post on 25/12/2025 as mentioned in context
        if "2025-12-25" in posts_by_date:
            print(f"  Found {len(posts_by_date['2025-12-25'])} post(s) on 2025-12-25")
    
    def test_create_social_post(self, auth_headers):
        """Test POST /api/social/posts - Create a new scheduled post"""
        # Schedule for tomorrow
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        post_data = {
            "content": "TEST_Post de test automatique #testing #automation",
            "platforms": ["facebook", "instagram"],
            "post_type": "text",
            "scheduled_at": scheduled_time,
            "hashtags": ["#testing", "#automation"],
            "status": "scheduled"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=post_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should have post id"
        
        post_id = result["id"]
        print(f"✓ Created social post: {post_id}")
        
        # Verify post was created by fetching it
        get_response = requests.get(
            f"{BASE_URL}/api/social/posts/{post_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200, f"Failed to get created post: {get_response.text}"
        
        created_post = get_response.json()
        assert created_post["content"] == post_data["content"], "Content mismatch"
        assert created_post["status"] == "scheduled", "Status should be scheduled"
        
        print(f"✓ Verified post creation - content matches")
        
        return post_id
    
    def test_update_social_post(self, auth_headers):
        """Test PUT /api/social/posts/{id} - Update a post"""
        # First create a post
        scheduled_time = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT14:00:00")
        
        create_response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json={
                "content": "TEST_Original content",
                "platforms": ["facebook"],
                "post_type": "text",
                "scheduled_at": scheduled_time,
                "status": "draft"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Update the post
        update_response = requests.put(
            f"{BASE_URL}/api/social/posts/{post_id}",
            json={
                "content": "TEST_Updated content",
                "status": "scheduled"
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Failed to update post: {update_response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/social/posts/{post_id}",
            headers=auth_headers
        )
        updated_post = get_response.json()
        assert updated_post["content"] == "TEST_Updated content", "Content not updated"
        assert updated_post["status"] == "scheduled", "Status not updated"
        
        print(f"✓ Updated social post: {post_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/social/posts/{post_id}", headers=auth_headers)
    
    def test_delete_social_post(self, auth_headers):
        """Test DELETE /api/social/posts/{id} - Delete a post"""
        # First create a post
        scheduled_time = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%dT16:00:00")
        
        create_response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json={
                "content": "TEST_Post to delete",
                "platforms": ["instagram"],
                "post_type": "text",
                "scheduled_at": scheduled_time,
                "status": "draft"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Delete the post
        delete_response = requests.delete(
            f"{BASE_URL}/api/social/posts/{post_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete post: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/social/posts/{post_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404, "Post should not exist after deletion"
        
        print(f"✓ Deleted social post: {post_id}")
    
    def test_get_social_inbox(self, auth_headers):
        """Test GET /api/social/inbox - Get inbox messages"""
        response = requests.get(f"{BASE_URL}/api/social/inbox", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get inbox: {response.text}"
        
        messages = response.json()
        assert isinstance(messages, list), "Inbox should be a list"
        print(f"✓ Found {len(messages)} inbox messages")
        
        # If messages exist, verify structure
        if len(messages) > 0:
            msg = messages[0]
            assert "id" in msg, "Message should have id"
            assert "platform" in msg, "Message should have platform"
            assert "status" in msg, "Message should have status"
    
    def test_add_social_message(self, auth_headers):
        """Test POST /api/social/inbox - Add a message"""
        message_data = {
            "platform": "facebook",
            "message_type": "comment",
            "sender_name": "TEST_User",
            "sender_id": "test_sender_123",
            "content": "TEST_This is a test comment",
            "priority": "normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/inbox",
            json=message_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to add message: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should have message id"
        
        print(f"✓ Added inbox message: {result['id']}")
        return result["id"]
    
    def test_update_message_status(self, auth_headers):
        """Test PUT /api/social/inbox/{id}/status - Update message status"""
        # First create a message
        create_response = requests.post(
            f"{BASE_URL}/api/social/inbox",
            json={
                "platform": "instagram",
                "message_type": "dm",
                "sender_name": "TEST_StatusUser",
                "sender_id": "test_status_123",
                "content": "TEST_Message for status update",
                "priority": "normal"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Update status to read
        update_response = requests.put(
            f"{BASE_URL}/api/social/inbox/{message_id}/status",
            params={"status": "read"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        
        print(f"✓ Updated message status to 'read': {message_id}")
    
    def test_update_message_priority(self, auth_headers):
        """Test PUT /api/social/inbox/{id}/priority - Update message priority"""
        # First create a message
        create_response = requests.post(
            f"{BASE_URL}/api/social/inbox",
            json={
                "platform": "facebook",
                "message_type": "comment",
                "sender_name": "TEST_PriorityUser",
                "sender_id": "test_priority_123",
                "content": "TEST_Message for priority update",
                "priority": "normal"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Update priority to high
        update_response = requests.put(
            f"{BASE_URL}/api/social/inbox/{message_id}/priority",
            params={"priority": "high"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Failed to update priority: {update_response.text}"
        
        print(f"✓ Updated message priority to 'high': {message_id}")
    
    def test_reply_to_message(self, auth_headers):
        """Test POST /api/social/inbox/{id}/reply - Reply to a message"""
        # First create a message
        create_response = requests.post(
            f"{BASE_URL}/api/social/inbox",
            json={
                "platform": "instagram",
                "message_type": "dm",
                "sender_name": "TEST_ReplyUser",
                "sender_id": "test_reply_123",
                "content": "TEST_Message to reply to",
                "priority": "normal"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Reply to message
        reply_response = requests.post(
            f"{BASE_URL}/api/social/inbox/{message_id}/reply",
            params={"reply_content": "TEST_Thank you for your message!"},
            headers=auth_headers
        )
        assert reply_response.status_code == 200, f"Failed to reply: {reply_response.text}"
        
        print(f"✓ Replied to message: {message_id}")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_posts(self, auth_headers):
        """Clean up TEST_ prefixed posts"""
        response = requests.get(f"{BASE_URL}/api/social/posts", headers=auth_headers)
        if response.status_code == 200:
            posts = response.json()
            deleted = 0
            for post in posts:
                if post.get("content", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/social/posts/{post['id']}", headers=auth_headers)
                    deleted += 1
            print(f"✓ Cleaned up {deleted} test posts")
    
    def test_cleanup_test_messages(self, auth_headers):
        """Clean up TEST_ prefixed messages"""
        # Note: No delete endpoint for messages, so just report
        response = requests.get(f"{BASE_URL}/api/social/inbox", headers=auth_headers)
        if response.status_code == 200:
            messages = response.json()
            test_messages = [m for m in messages if m.get("sender_name", "").startswith("TEST_")]
            print(f"✓ Found {len(test_messages)} test messages (no delete endpoint available)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
