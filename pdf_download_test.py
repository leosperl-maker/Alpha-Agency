#!/usr/bin/env python3
"""
Alpha Agency PDF Download Test
Specific test for JWT authentication and PDF download functionality
"""

import requests
import sys
import json
from datetime import datetime

class PDFDownloadTester:
    def __init__(self, base_url="https://multilink-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.invoice_id = None
        
        # Test credentials from review request
        self.admin_email = "admin@alphagency.fr"
        self.admin_password = "superpassword"

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{test_name}: {details}")

    def test_authentication(self):
        """Test admin login and get token"""
        print("\n🔐 Testing Authentication...")
        
        url = f"{self.base_url}/api/auth/login"
        data = {"email": self.admin_email, "password": self.admin_password}
        
        try:
            response = requests.post(url, json=data, timeout=10)
            if response.status_code == 200:
                response_data = response.json()
                if 'token' in response_data:
                    self.token = response_data['token']
                    user_email = response_data.get('user', {}).get('email', 'unknown')
                    self.log_result("Admin Login", True, f"Token received for {user_email}")
                    return True
                else:
                    self.log_result("Admin Login", False, f"No token in response: {response_data}")
                    return False
            else:
                self.log_result("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Request failed: {str(e)}")
            return False

    def get_existing_invoice(self):
        """Get an existing invoice for PDF testing"""
        print("\n📋 Getting existing invoice...")
        
        url = f"{self.base_url}/api/invoices"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                invoices = response.json()
                if invoices:
                    self.invoice_id = invoices[0]['id']
                    invoice_number = invoices[0].get('invoice_number', 'N/A')
                    self.log_result("Get Existing Invoice", True, f"Using invoice {invoice_number} (ID: {self.invoice_id})")
                    return True
                else:
                    self.log_result("Get Existing Invoice", False, "No invoices found")
                    return False
            else:
                self.log_result("Get Existing Invoice", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Get Existing Invoice", False, f"Request failed: {str(e)}")
            return False

    def test_pdf_download_with_auth(self):
        """Test PDF download WITH JWT token"""
        print("\n📄 Testing PDF Download WITH Authentication...")
        
        if not self.invoice_id:
            self.log_result("PDF Download with Auth", False, "No invoice_id available")
            return False
        
        url = f"{self.base_url}/api/invoices/{self.invoice_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                content_disposition = response.headers.get('content-disposition', '')
                
                if 'application/pdf' in content_type and content_length > 0:
                    self.log_result("PDF Download with Auth", True, 
                                  f"PDF downloaded successfully - {content_length} bytes, Content-Type: {content_type}")
                    
                    # Check Content-Disposition header
                    if 'attachment' in content_disposition:
                        self.log_result("PDF Content-Disposition", True, f"Correct header: {content_disposition}")
                    else:
                        self.log_result("PDF Content-Disposition", False, f"Missing or incorrect header: {content_disposition}")
                    
                    return True
                else:
                    self.log_result("PDF Download with Auth", False, 
                                  f"Invalid PDF response - Content-Type: {content_type}, Size: {content_length} bytes")
                    return False
            else:
                self.log_result("PDF Download with Auth", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("PDF Download with Auth", False, f"Request failed: {str(e)}")
            return False

    def test_pdf_download_without_auth(self):
        """Test PDF download WITHOUT JWT token (should return 401)"""
        print("\n🚫 Testing PDF Download WITHOUT Authentication...")
        
        if not self.invoice_id:
            self.log_result("PDF Download without Auth", False, "No invoice_id available")
            return False
        
        url = f"{self.base_url}/api/invoices/{self.invoice_id}/pdf"
        # No Authorization header
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 401:
                response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"text": response.text}
                detail = response_data.get('detail', response_data.get('text', 'Unknown error'))
                self.log_result("PDF Download without Auth", True, f"Correctly returned 401: {detail}")
                return True
            else:
                self.log_result("PDF Download without Auth", False, 
                              f"Expected 401 but got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("PDF Download without Auth", False, f"Request failed: {str(e)}")
            return False

    def test_pdf_download_invalid_token(self):
        """Test PDF download with invalid JWT token (should return 401)"""
        print("\n🔒 Testing PDF Download with Invalid Token...")
        
        if not self.invoice_id:
            self.log_result("PDF Download with Invalid Token", False, "No invoice_id available")
            return False
        
        url = f"{self.base_url}/api/invoices/{self.invoice_id}/pdf"
        headers = {'Authorization': 'Bearer invalid_token_here'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 401:
                response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"text": response.text}
                detail = response_data.get('detail', response_data.get('text', 'Unknown error'))
                self.log_result("PDF Download with Invalid Token", True, f"Correctly returned 401: {detail}")
                return True
            else:
                self.log_result("PDF Download with Invalid Token", False, 
                              f"Expected 401 but got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("PDF Download with Invalid Token", False, f"Request failed: {str(e)}")
            return False

    def test_pdf_download_nonexistent_invoice(self):
        """Test PDF download for non-existent invoice (should return 404)"""
        print("\n❓ Testing PDF Download for Non-existent Invoice...")
        
        fake_invoice_id = "00000000-0000-0000-0000-000000000000"
        url = f"{self.base_url}/api/invoices/{fake_invoice_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 404:
                response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"text": response.text}
                detail = response_data.get('detail', response_data.get('text', 'Unknown error'))
                self.log_result("PDF Download Non-existent Invoice", True, f"Correctly returned 404: {detail}")
                return True
            else:
                self.log_result("PDF Download Non-existent Invoice", False, 
                              f"Expected 404 but got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("PDF Download Non-existent Invoice", False, f"Request failed: {str(e)}")
            return False

    def run_pdf_tests(self):
        """Run all PDF download tests"""
        print("🚀 Starting Alpha Agency PDF Download Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Step 2: Get an existing invoice
        if not self.get_existing_invoice():
            print("\n❌ No invoices available - stopping tests")
            return False
        
        # Step 3: Test PDF download scenarios
        self.test_pdf_download_with_auth()
        self.test_pdf_download_without_auth()
        self.test_pdf_download_invalid_token()
        self.test_pdf_download_nonexistent_invoice()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 PDF DOWNLOAD TEST SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = PDFDownloadTester()
    success = tester.run_pdf_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())