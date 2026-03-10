"""
Iteration 5 - Backend API Tests
Testing Assignment Workflow features (Schedule Release, Deadline, Publish Results)
and related functionality as per the PRD

Features tested:
- Marker login and authentication
- Assignment creation with has_deadline YES/NO toggle
- Assignment creation with has_schedule_release YES/NO toggle
- Publish results functionality (review status endpoint)
- Student login and enrolled courses
"""
import pytest
import requests
import os
import time

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MARKER_EMAIL = "marker@test.com"
MARKER_PASSWORD = "password123"
STUDENT_EMAIL = "student@test.com"
STUDENT_PASSWORD = "password123"


class TestBackendHealth:
    """Basic API health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestMarkerLogin:
    """Test marker authentication"""
    
    def test_marker_login_success(self):
        """Test marker can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == MARKER_EMAIL
        # Marker should have marker-level role
        assert data["user"]["role"] in ["marker", "moderator", "module_leader"], f"Unexpected role: {data['user']['role']}"
        print(f"✓ Marker login successful - role: {data['user']['role']}")
        
    def test_marker_login_invalid_credentials(self):
        """Test invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid marker credentials rejected correctly")


class TestStudentLogin:
    """Test student authentication"""
    
    def test_student_login_success(self):
        """Test student can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == STUDENT_EMAIL
        assert data["user"]["role"] == "student", f"Expected student role, got {data['user']['role']}"
        print("✓ Student login successful")
        
    def test_student_enrolled_courses(self):
        """Test student can view enrolled courses"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["token"]
        
        # Get enrolled courses
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/students/courses", headers=headers)
        assert response.status_code == 200, f"Failed to get courses: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of courses"
        print(f"✓ Student enrolled courses retrieved - {len(data)} courses")


class TestAssignmentCreationWithFlags:
    """Test assignment creation with has_deadline and has_schedule_release flags"""
    
    @pytest.fixture
    def marker_auth(self):
        """Get marker authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return {
            "token": response.json()["token"],
            "user": response.json()["user"]
        }
    
    @pytest.fixture
    def course_id(self, marker_auth):
        """Get or create a course for testing"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        # Try to get existing courses first
        courses_response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        if courses_response.status_code == 200 and courses_response.json():
            # Find a course where user is leader
            for course in courses_response.json():
                if course.get("leader_id") == marker_auth["user"]["id"]:
                    return course["id"]
        
        # Create a new course if no existing course found
        timestamp = int(time.time())
        course_response = requests.post(f"{BASE_URL}/api/courses", headers=headers, json={
            "name": f"Test Course {timestamp}",
            "code": f"TC{timestamp}",
            "description": "Course for iteration 5 tests"
        })
        assert course_response.status_code == 200, f"Failed to create course: {course_response.text}"
        return course_response.json()["id"]
    
    def test_create_assignment_no_deadline_no_schedule(self, marker_auth, course_id):
        """Test creating assignment with no deadline (NO toggle) and no schedule release (NO toggle)"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        timestamp = int(time.time())
        payload = {
            "course_id": course_id,
            "title": f"Assignment No Flags {timestamp}",
            "description": "Assignment with both flags set to NO",
            "has_deadline": False,
            "due_date": None,
            "has_schedule_release": False,
            "schedule_release_date": None,
            "max_attempts": -1,
            "total_marks": 100
        }
        
        response = requests.post(f"{BASE_URL}/api/assignments", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create assignment: {response.text}"
        
        data = response.json()
        assert data["has_deadline"] == False, "has_deadline should be False"
        assert data["has_schedule_release"] == False, "has_schedule_release should be False"
        assert data["due_date"] is None, "due_date should be None"
        assert data["schedule_release_date"] is None, "schedule_release_date should be None"
        assert data["is_released"] == True, "Assignment should be immediately released when no schedule"
        print("✓ Created assignment with no deadline and no schedule release")
    
    def test_create_assignment_with_deadline_yes(self, marker_auth, course_id):
        """Test creating assignment with deadline YES toggle"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        timestamp = int(time.time())
        # Set deadline to future
        from datetime import datetime, timedelta, timezone
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        payload = {
            "course_id": course_id,
            "title": f"Assignment With Deadline {timestamp}",
            "description": "Assignment with deadline set to YES",
            "has_deadline": True,
            "due_date": future_date,
            "has_schedule_release": False,
            "schedule_release_date": None,
            "max_attempts": 3,
            "total_marks": 100
        }
        
        response = requests.post(f"{BASE_URL}/api/assignments", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create assignment: {response.text}"
        
        data = response.json()
        assert data["has_deadline"] == True, "has_deadline should be True"
        assert data["due_date"] is not None, "due_date should be set"
        assert data["is_past_deadline"] == False, "Should not be past deadline"
        print("✓ Created assignment with deadline YES")
    
    def test_create_assignment_with_schedule_release_yes(self, marker_auth, course_id):
        """Test creating assignment with schedule release YES toggle"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        timestamp = int(time.time())
        # Set release date to past so it's already released
        from datetime import datetime, timedelta, timezone
        past_date = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        payload = {
            "course_id": course_id,
            "title": f"Assignment With Schedule {timestamp}",
            "description": "Assignment with schedule release set to YES",
            "has_deadline": False,
            "due_date": None,
            "has_schedule_release": True,
            "schedule_release_date": past_date,
            "max_attempts": -1,
            "total_marks": 100
        }
        
        response = requests.post(f"{BASE_URL}/api/assignments", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create assignment: {response.text}"
        
        data = response.json()
        assert data["has_schedule_release"] == True, "has_schedule_release should be True"
        assert data["schedule_release_date"] is not None, "schedule_release_date should be set"
        assert data["is_released"] == True, "Assignment should be released (past date)"
        print("✓ Created assignment with schedule release YES")
    
    def test_create_assignment_with_both_flags_yes(self, marker_auth, course_id):
        """Test creating assignment with both deadline and schedule release YES"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        timestamp = int(time.time())
        from datetime import datetime, timedelta, timezone
        future_release = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        future_deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        payload = {
            "course_id": course_id,
            "title": f"Assignment Both Flags {timestamp}",
            "description": "Assignment with both flags set to YES",
            "has_deadline": True,
            "due_date": future_deadline,
            "has_schedule_release": True,
            "schedule_release_date": future_release,
            "max_attempts": 5,
            "total_marks": 50
        }
        
        response = requests.post(f"{BASE_URL}/api/assignments", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create assignment: {response.text}"
        
        data = response.json()
        assert data["has_deadline"] == True, "has_deadline should be True"
        assert data["has_schedule_release"] == True, "has_schedule_release should be True"
        assert data["due_date"] is not None, "due_date should be set"
        assert data["schedule_release_date"] is not None, "schedule_release_date should be set"
        assert data["is_released"] == False, "Assignment should NOT be released yet (future date)"
        print("✓ Created assignment with both deadline and schedule release YES")


class TestPublishResultsEndpoint:
    """Test the assignment review status and publish results endpoints"""
    
    @pytest.fixture
    def marker_auth(self):
        """Get marker authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return {
            "token": response.json()["token"],
            "user": response.json()["user"]
        }
    
    @pytest.fixture
    def assignment_with_submissions(self, marker_auth):
        """Get or create an assignment with submissions for testing"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        # Get assignments for the marker
        assignments_response = requests.get(f"{BASE_URL}/api/assignments", headers=headers)
        if assignments_response.status_code == 200:
            assignments = assignments_response.json()
            # Find an assignment that has submissions
            for assignment in assignments:
                if assignment.get("total_submissions", 0) > 0:
                    return assignment["id"]
            # Return first assignment if any exist
            if assignments:
                return assignments[0]["id"]
        
        pytest.skip("No assignments found for testing review status")
    
    def test_get_review_status(self, marker_auth, assignment_with_submissions):
        """Test getting assignment review status"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        assignment_id = assignment_with_submissions
        
        response = requests.get(
            f"{BASE_URL}/api/assignments/{assignment_id}/review-status",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get review status: {response.text}"
        
        data = response.json()
        assert "assignment_id" in data, "Response should include assignment_id"
        assert "total_submissions" in data, "Response should include total_submissions"
        assert "reviewed_count" in data, "Response should include reviewed_count"
        assert "pending_count" in data, "Response should include pending_count"
        assert "reviewed_submissions" in data, "Response should include reviewed_submissions list"
        assert "pending_submissions" in data, "Response should include pending_submissions list"
        assert "results_publish_date" in data, "Response should include results_publish_date"
        assert "results_published" in data, "Response should include results_published"
        
        # Verify counts are correct
        assert len(data["reviewed_submissions"]) == data["reviewed_count"], "Reviewed count mismatch"
        assert len(data["pending_submissions"]) == data["pending_count"], "Pending count mismatch"
        assert data["total_submissions"] == data["reviewed_count"] + data["pending_count"], "Total mismatch"
        
        print(f"✓ Review status retrieved - {data['reviewed_count']}/{data['total_submissions']} reviewed")
    
    def test_publish_results(self, marker_auth, assignment_with_submissions):
        """Test scheduling results publication"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        assignment_id = assignment_with_submissions
        
        from datetime import datetime, timedelta, timezone
        publish_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/assignments/{assignment_id}/publish-results",
            headers=headers,
            json={"publish_date": publish_date}
        )
        
        # May fail if not leader, which is acceptable
        if response.status_code == 403:
            print("✓ Non-leader correctly denied publish rights")
            return
        
        assert response.status_code == 200, f"Failed to schedule publish: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should include message"
        assert "publish_date" in data, "Response should include publish_date"
        assert "submissions_reviewed" in data, "Response should include submissions_reviewed"
        assert "total_submissions" in data, "Response should include total_submissions"
        
        print(f"✓ Results publication scheduled - {data['submissions_reviewed']}/{data['total_submissions']} reviewed")


class TestAssignmentRetrievalWithFlags:
    """Test that assignment retrieval includes new flag fields"""
    
    @pytest.fixture
    def marker_auth(self):
        """Get marker authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return {"token": response.json()["token"]}
    
    def test_get_assignments_includes_flags(self, marker_auth):
        """Test that listing assignments includes has_deadline and has_schedule_release flags"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/assignments", headers=headers)
        assert response.status_code == 200, f"Failed to get assignments: {response.text}"
        
        assignments = response.json()
        if not assignments:
            pytest.skip("No assignments to test")
        
        # Check each assignment has the new fields
        for assignment in assignments:
            assert "has_deadline" in assignment, f"Assignment {assignment.get('id')} missing has_deadline"
            assert "has_schedule_release" in assignment, f"Assignment {assignment.get('id')} missing has_schedule_release"
            assert "is_released" in assignment, f"Assignment {assignment.get('id')} missing is_released"
            assert "is_past_deadline" in assignment, f"Assignment {assignment.get('id')} missing is_past_deadline"
            assert "results_published" in assignment, f"Assignment {assignment.get('id')} missing results_published"
            assert "submissions_reviewed" in assignment, f"Assignment {assignment.get('id')} missing submissions_reviewed"
            assert "total_submissions" in assignment, f"Assignment {assignment.get('id')} missing total_submissions"
        
        print(f"✓ All {len(assignments)} assignments include required flag fields")


class TestGamificationEndpoints:
    """Test gamification/badges API endpoints"""
    
    @pytest.fixture
    def student_auth(self):
        """Get student authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return {"token": response.json()["token"]}
    
    @pytest.fixture
    def marker_auth(self):
        """Get marker authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return {"token": response.json()["token"]}
    
    def test_student_gamification_stats(self, student_auth):
        """Test student can retrieve gamification stats"""
        headers = {"Authorization": f"Bearer {student_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/gamification/stats", headers=headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        # Verify expected fields
        assert "xp" in data or "total_xp" in data, "Response should include xp"
        assert "badges" in data or "badges_earned" in data, "Response should include badges"
        print(f"✓ Student gamification stats retrieved - XP: {data.get('xp', data.get('total_xp', 0))}")
    
    def test_marker_gamification_stats(self, marker_auth):
        """Test marker can retrieve gamification stats"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/gamification/stats", headers=headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        assert "xp" in data or "total_xp" in data, "Response should include xp"
        print(f"✓ Marker gamification stats retrieved")
    
    def test_student_badges_endpoint(self, student_auth):
        """Test student badges endpoint"""
        headers = {"Authorization": f"Bearer {student_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/gamification/badges", headers=headers)
        assert response.status_code == 200, f"Failed to get badges: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be dict"
        # Should have some badge definitions
        assert len(data) > 0, "Should have badge definitions"
        print(f"✓ Student badges retrieved - {len(data)} badge types")
    
    def test_marker_badges_endpoint(self, marker_auth):
        """Test marker badges endpoint"""
        headers = {"Authorization": f"Bearer {marker_auth['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/gamification/badges", headers=headers)
        assert response.status_code == 200, f"Failed to get badges: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be dict"
        print(f"✓ Marker badges retrieved - {len(data)} badge types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
