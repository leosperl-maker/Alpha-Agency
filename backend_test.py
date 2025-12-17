import requests
import sys
import json
from datetime import datetime

class AlphaAgencyAPITester:
    def __init__(self, base_url="https://alphacommunicate.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_lead_submission(self):
        """Test lead form submission (public endpoint)"""
        lead_data = {
            "first_name": "Jean",
            "last_name": "Dupont", 
            "email": "jean.dupont@test.com",
            "phone": "0690123456",
            "company": "Test Company",
            "project_type": "infographie",
            "budget": "1000-2000€",
            "message": "Test message pour infographie"
        }
        
        success, response = self.run_test(
            "Lead Form Submission (Infographie)",
            "POST",
            "lead",
            200,
            data=lead_data
        )
        return response.get('contact_id') if success else None

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@alphagency.fr",
            "password": "TestPass123!",
            "full_name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_contacts_api(self):
        """Test contacts CRUD operations"""
        # Get all contacts
        self.run_test("Get All Contacts", "GET", "contacts", 200)
        
        # Test filtering by source (website leads)
        self.run_test("Get Website Leads", "GET", "contacts?source=website", 200)

    def test_settings_endpoints(self):
        """Test new settings endpoints"""
        # Get settings
        success, settings = self.run_test("Get Settings", "GET", "settings", 200)
        
        if success:
            # Test company settings update
            company_data = {
                "name": "Alpha Digital Test",
                "commercial_name": "ALPHA Agency Test"
            }
            self.run_test("Update Company Settings", "PUT", "settings/company", 200, data=company_data)
            
            # Test social links update
            social_data = {
                "linkedin": "https://linkedin.com/company/alpha-test",
                "instagram": "https://instagram.com/alpha_test"
            }
            self.run_test("Update Social Links", "PUT", "settings/social-links", 200, data=social_data)
            
            # Test legal texts update
            legal_data = {
                "mentions_legales": "Test mentions légales",
                "politique_confidentialite": "Test politique confidentialité"
            }
            self.run_test("Update Legal Texts", "PUT", "settings/legal-texts", 200, data=legal_data)
            
            # Test integrations update
            integrations_data = {
                "ga4_id": "G-TEST123456",
                "resend_api_key": "re_test_key"
            }
            self.run_test("Update Integrations", "PUT", "settings/integrations", 200, data=integrations_data)

    def test_dashboard_endpoints(self):
        """Test dashboard related endpoints"""
        # Dashboard stats
        self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        # Pipeline data
        self.run_test("Pipeline Data", "GET", "dashboard/pipeline", 200)
        
        # Update KPIs
        kpi_data = {
            "sessions": 1500,
            "leads": 25,
            "conversion_rate": 1.67
        }
        self.run_test("Update KPIs", "PUT", "dashboard/kpis", 200, data=kpi_data)

    def test_blog_endpoints(self):
        """Test blog endpoints (public)"""
        # Get blog posts (public endpoint)
        success, response = self.run_test("Get Blog Posts (Public)", "GET", "blog", 200)
        
        # Test specific blog post (if any exist)
        if success and response and len(response) > 0:
            first_post = response[0]
            if 'slug' in first_post:
                self.run_test(f"Get Blog Post by Slug", "GET", f"blog/{first_post['slug']}", 200)

    def test_portfolio_endpoints(self):
        """Test portfolio endpoints (public)"""
        # Get all portfolio items
        self.run_test("Get Portfolio Items", "GET", "portfolio", 200)
        
        # Get portfolio by category (infographie)
        self.run_test("Get Infographie Portfolio", "GET", "portfolio?category=infographie", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ALPHA Agency API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test public endpoints first
        print("\n📋 Testing Public Endpoints...")
        contact_id = self.test_lead_submission()
        self.test_blog_endpoints()
        self.test_portfolio_endpoints()

        # Test authentication
        print("\n🔐 Testing Authentication...")
        if not self.test_user_registration():
            print("❌ Cannot proceed with authenticated tests - registration failed")
            return

        # Test authenticated endpoints
        print("\n👥 Testing Contacts Management...")
        self.test_contacts_api()

        print("\n⚙️ Testing Settings Management...")
        self.test_settings_endpoints()

        print("\n📊 Testing Dashboard...")
        self.test_dashboard_endpoints()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        if contact_id:
            print(f"🎯 Lead created with ID: {contact_id}")

        return success_rate >= 80

def main():
    tester = AlphaAgencyAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_results_backend.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())