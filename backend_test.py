#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CodeFeedbackStudioTester:
    def __init__(self, base_url="https://codefeedbackstudio.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.marker_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.marker_user = None
        self.student_user = None
        self.course_id = None
        self.assignment_id = None
        self.past_assignment_id = None
        self.submission_id = None
        self.issue_id = None
        self.category_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
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
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test API health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '/')
        self.log_test("API Root Endpoint", success, 
                     "" if success else f"Failed: {data}")
        
        # Test health endpoint
        success, data = self.make_request('GET', '/health')
        self.log_test("Health Check Endpoint", success,
                     "" if success else f"Failed: {data}")

    def test_user_registration(self):
        """Test user registration for both marker and student"""
        print("\n🔍 Testing User Registration...")
        
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Register marker (no course required)
        marker_data = {
            "email": f"marker_{timestamp}@test.com",
            "password": "TestPass123!",
            "full_name": "Test Marker",
            "role": "marker"
        }
        
        success, data = self.make_request('POST', '/auth/register', marker_data, expected_status=200)
        if success:
            self.marker_user = data
        self.log_test("Marker Registration (no course required)", success,
                     "" if success else f"Failed: {data}")
        
        # Test student registration WITHOUT course (should fail)
        student_data_no_course = {
            "email": f"student_nocourse_{timestamp}@test.com", 
            "password": "TestPass123!",
            "full_name": "Test Student No Course",
            "role": "student"
        }
        
        success, data = self.make_request('POST', '/auth/register', student_data_no_course, expected_status=400)
        self.log_test("Student Registration Without Course (should fail)", success,
                     "" if success else f"Should return 400: {data}")
        
        # Note: Student registration WITH course will be tested after course creation

    def test_user_login(self):
        """Test user login and JWT token generation"""
        print("\n🔍 Testing User Login...")
        
        if not self.marker_user or not self.student_user:
            self.log_test("Login Test Skipped", False, "Registration failed")
            return
        
        # Login marker
        marker_login = {
            "email": self.marker_user["email"],
            "password": "TestPass123!"
        }
        
        success, data = self.make_request('POST', '/auth/login', marker_login, expected_status=200)
        if success and 'token' in data:
            self.marker_token = data['token']
        self.log_test("Marker Login", success and 'token' in data,
                     "" if success else f"Failed: {data}")
        
        # Login student
        student_login = {
            "email": self.student_user["email"],
            "password": "TestPass123!"
        }
        
        success, data = self.make_request('POST', '/auth/login', student_login, expected_status=200)
        if success and 'token' in data:
            self.student_token = data['token']
        self.log_test("Student Login", success and 'token' in data,
                     "" if success else f"Failed: {data}")

    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with tokens"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        if not self.marker_token:
            self.log_test("Marker Auth Me Test Skipped", False, "No marker token")
        else:
            success, data = self.make_request('GET', '/auth/me', token=self.marker_token)
            self.log_test("Marker Auth Me", success and data.get('role') == 'marker',
                         "" if success else f"Failed: {data}")
        
        if not self.student_token:
            self.log_test("Student Auth Me Test Skipped", False, "No student token")
        else:
            success, data = self.make_request('GET', '/auth/me', token=self.student_token)
            self.log_test("Student Auth Me", success and data.get('role') == 'student',
                         "" if success else f"Failed: {data}")

    def test_course_management(self):
        """Test course creation and retrieval"""
        print("\n🔍 Testing Course Management...")
        
        if not self.marker_token:
            self.log_test("Course Tests Skipped", False, "No marker token")
            return
        
        # Create course with code/name/year
        course_data = {
            "name": "Test Course - Python Fundamentals",
            "code": "CS101",
            "description": "A test course for automated testing",
            "year": 2024,
            "semester": "Fall"
        }
        
        success, data = self.make_request('POST', '/courses', course_data, self.marker_token, expected_status=200)
        if success:
            self.course_id = data.get('id')
        self.log_test("Course Creation with code/name/year", success,
                     "" if success else f"Failed: {data}")
        
        # Get courses
        success, data = self.make_request('GET', '/courses', token=self.marker_token)
        courses_found = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Courses", courses_found,
                     "" if courses_found else f"Failed: {data}")
        
        # Now test student registration WITH course selection
        if self.course_id:
            timestamp = datetime.now().strftime("%H%M%S")
            student_data = {
                "email": f"student_{timestamp}@test.com", 
                "password": "TestPass123!",
                "full_name": "Test Student",
                "role": "student",
                "course_id": self.course_id
            }
            
            success, data = self.make_request('POST', '/auth/register', student_data, expected_status=200)
            if success:
                self.student_user = data
            self.log_test("Student Registration WITH course selection", success,
                         "" if success else f"Failed: {data}")

    def test_assignment_management(self):
        """Test assignment creation and retrieval with deadlines"""
        print("\n🔍 Testing Assignment Management...")
        
        if not self.marker_token or not self.course_id:
            self.log_test("Assignment Tests Skipped", False, "Missing marker token or course")
            return
        
        # Create assignment with deadline (datetime-local format)
        from datetime import datetime, timezone, timedelta
        future_deadline = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        
        assignment_data = {
            "course_id": self.course_id,
            "title": "Test Assignment - Hello World",
            "description": "Write a simple Hello World program",
            "due_date": future_deadline,
            "max_attempts": 3
        }
        
        success, data = self.make_request('POST', '/assignments', assignment_data, self.marker_token, expected_status=200)
        if success:
            self.assignment_id = data.get('id')
        self.log_test("Assignment Creation with deadline", success,
                     "" if success else f"Failed: {data}")
        
        # Get assignments
        success, data = self.make_request('GET', '/assignments', token=self.marker_token)
        assignments_found = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Assignments", assignments_found,
                     "" if assignments_found else f"Failed: {data}")
        
        # Get specific assignment
        if self.assignment_id:
            success, data = self.make_request('GET', f'/assignments/{self.assignment_id}', token=self.marker_token)
            self.log_test("Get Specific Assignment", success,
                         "" if success else f"Failed: {data}")
        
        # Create assignment with past deadline for deadline enforcement test
        past_deadline = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        past_assignment_data = {
            "course_id": self.course_id,
            "title": "Past Deadline Assignment",
            "description": "Assignment with past deadline",
            "due_date": past_deadline,
            "max_attempts": 3
        }
        
        success, data = self.make_request('POST', '/assignments', past_assignment_data, self.marker_token, expected_status=200)
        if success:
            self.past_assignment_id = data.get('id')
        self.log_test("Assignment Creation with past deadline", success,
                     "" if success else f"Failed: {data}")

    def test_issue_categories(self):
        """Test issue categories"""
        print("\n🔍 Testing Issue Categories...")
        
        if not self.marker_token:
            self.log_test("Categories Tests Skipped", False, "No marker token")
            return
        
        # Get categories (should auto-seed defaults)
        success, data = self.make_request('GET', '/categories', token=self.marker_token)
        categories_found = success and isinstance(data, list) and len(data) > 0
        if success and data:
            self.category_id = data[0].get('id')
        self.log_test("Get Issue Categories", categories_found,
                     "" if categories_found else f"Failed: {data}")

    def test_submission_workflow(self):
        """Test student submission workflow"""
        print("\n🔍 Testing Submission Workflow...")
        
        if not self.student_token or not self.assignment_id:
            self.log_test("Submission Tests Skipped", False, "Missing student token or assignment")
            return
        
        # Create submission before deadline
        submission_data = {
            "assignment_id": self.assignment_id,
            "code_content": "print('Hello, World!')\n\ndef main():\n    print('This is a test submission')\n\nif __name__ == '__main__':\n    main()",
            "filename": "hello_world.py"
        }
        
        success, data = self.make_request('POST', '/submissions', submission_data, self.student_token, expected_status=200)
        if success:
            self.submission_id = data.get('id')
        self.log_test("Student Submission before deadline", success,
                     "" if success else f"Failed: {data}")
        
        # Test deadline enforcement - try to submit to past deadline assignment
        if hasattr(self, 'past_assignment_id') and self.past_assignment_id:
            past_submission_data = {
                "assignment_id": self.past_assignment_id,
                "code_content": "print('This should fail')",
                "filename": "past_deadline.py"
            }
            
            success, data = self.make_request('POST', '/submissions', past_submission_data, self.student_token, expected_status=403)
            self.log_test("Deadline enforcement - 403 response if past deadline", success,
                         "" if success else f"Should return 403: {data}")
        
        # Get submissions
        success, data = self.make_request('GET', '/submissions', token=self.student_token)
        submissions_found = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Student Submissions", submissions_found,
                     "" if submissions_found else f"Failed: {data}")
        
        # Get specific submission
        if self.submission_id:
            success, data = self.make_request('GET', f'/submissions/{self.submission_id}', token=self.student_token)
            self.log_test("Get Specific Submission", success,
                         "" if success else f"Failed: {data}")
        
        # Student views assignments for their course only
        success, data = self.make_request('GET', '/assignments', token=self.student_token)
        if success and isinstance(data, list):
            # Check that all assignments belong to student's course
            course_match = all(assignment.get('course_id') == self.course_id for assignment in data)
            self.log_test("Student views assignments for their course only", course_match,
                         "" if course_match else f"Found assignments from other courses: {data}")
        else:
            self.log_test("Student views assignments for their course only", False, f"Failed to get assignments: {data}")

    def test_feedback_workflow(self):
        """Test marker feedback workflow"""
        print("\n🔍 Testing Feedback Workflow...")
        
        if not self.marker_token or not self.submission_id or not self.category_id:
            self.log_test("Feedback Tests Skipped", False, "Missing required data")
            return
        
        # Create feedback issue
        issue_data = {
            "submission_id": self.submission_id,
            "category_id": self.category_id,
            "line_start": 1,
            "line_end": 1,
            "title": "Missing docstring",
            "explanation": "Functions should have docstrings to explain their purpose",
            "severity": "minor",
            "suggested_fix": "Add a docstring at the beginning of the function",
            "verification_criteria": "Function has a proper docstring"
        }
        
        success, data = self.make_request('POST', '/issues', issue_data, self.marker_token, expected_status=200)
        if success:
            self.issue_id = data.get('id')
        self.log_test("Create Feedback Issue", success,
                     "" if success else f"Failed: {data}")
        
        # Get issues for submission
        success, data = self.make_request('GET', f'/issues?submission_id={self.submission_id}', token=self.marker_token)
        issues_found = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Submission Issues", issues_found,
                     "" if issues_found else f"Failed: {data}")
        
        # Publish feedback
        success, data = self.make_request('POST', f'/submissions/{self.submission_id}/publish', token=self.marker_token)
        self.log_test("Publish Feedback", success,
                     "" if success else f"Failed: {data}")

    def test_student_feedback_access(self):
        """Test student accessing published feedback"""
        print("\n🔍 Testing Student Feedback Access...")
        
        if not self.student_token or not self.submission_id:
            self.log_test("Student Feedback Tests Skipped", False, "Missing required data")
            return
        
        # Get issues as student (should work after feedback published)
        success, data = self.make_request('GET', f'/issues?submission_id={self.submission_id}', token=self.student_token)
        issues_accessible = success and isinstance(data, list)
        self.log_test("Student Access to Feedback", issues_accessible,
                     "" if issues_accessible else f"Failed: {data}")
        
        # Mark issue as fixed
        if self.issue_id:
            success, data = self.make_request('POST', f'/issues/{self.issue_id}/mark-fixed', token=self.student_token)
            self.log_test("Mark Issue as Fixed", success,
                         "" if success else f"Failed: {data}")

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n🔍 Testing Analytics Endpoints...")
        
        # Marker analytics
        if self.marker_token:
            success, data = self.make_request('GET', '/analytics/marker', token=self.marker_token)
            analytics_valid = success and isinstance(data, dict) and 'total_submissions' in data
            self.log_test("Marker Analytics", analytics_valid,
                         "" if analytics_valid else f"Failed: {data}")
        
        # Student analytics
        if self.student_token:
            success, data = self.make_request('GET', '/analytics/student', token=self.student_token)
            analytics_valid = success and isinstance(data, dict) and 'total_submissions' in data
            self.log_test("Student Analytics", analytics_valid,
                         "" if analytics_valid else f"Failed: {data}")

    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🔍 Testing Error Handling...")
        
        # Test unauthorized access
        success, data = self.make_request('GET', '/submissions', expected_status=401)
        self.log_test("Unauthorized Access Blocked", success,
                     "" if success else f"Should return 401: {data}")
        
        # Test invalid login
        invalid_login = {"email": "invalid@test.com", "password": "wrong"}
        success, data = self.make_request('POST', '/auth/login', invalid_login, expected_status=401)
        self.log_test("Invalid Login Rejected", success,
                     "" if success else f"Should return 401: {data}")
        
        # Test duplicate registration
        if self.marker_user:
            duplicate_data = {
                "email": self.marker_user["email"],
                "password": "TestPass123!",
                "full_name": "Duplicate User",
                "role": "marker"
            }
            success, data = self.make_request('POST', '/auth/register', duplicate_data, expected_status=400)
            self.log_test("Duplicate Registration Blocked", success,
                         "" if success else f"Should return 400: {data}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting CodeFeedback Studio Backend Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_health_check()
            self.test_user_registration()
            self.test_user_login()
            self.test_auth_me_endpoint()
            self.test_course_management()
            self.test_assignment_management()
            self.test_issue_categories()
            self.test_submission_workflow()
            self.test_feedback_workflow()
            self.test_student_feedback_access()
            self.test_analytics_endpoints()
            self.test_error_handling()
            
        except Exception as e:
            print(f"💥 Test suite crashed: {str(e)}")
            return 1
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            
            # Print failed tests
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            
            return 1

def main():
    tester = CodeFeedbackStudioTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())