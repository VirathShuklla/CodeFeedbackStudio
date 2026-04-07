"""
Iteration 7 Bug Fixes and UI Enhancements Tests
Tests for:
1. Backend /api/submissions?for_moderation=true - marks None comparison fix
2. Gamification stats endpoint returns correct badge count
3. Leaderboard endpoints work correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration7BugFixes:
    """Test bug fixes for iteration 7"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.marker_email = "marker@test.com"
        self.marker_password = "password123"
        self.student_email = "student@test.com"
        self.student_password = "password123"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_marker_token(self):
        """Login as marker and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.marker_email,
            "password": self.marker_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_student_token(self):
        """Login as student and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.student_email,
            "password": self.student_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    # ============ BUG FIX: Backend marks None comparison ============
    
    def test_moderation_endpoint_with_none_marks(self):
        """Test that /api/submissions?for_moderation=true doesn't crash when marks is None"""
        token = self.get_marker_token()
        assert token is not None, "Failed to login as marker"
        
        # Get courses first
        headers = {"Authorization": f"Bearer {token}"}
        courses_response = self.session.get(f"{BASE_URL}/api/courses", headers=headers)
        assert courses_response.status_code == 200, f"Failed to get courses: {courses_response.text}"
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("No courses available for testing")
        
        course_id = courses[0]["id"]
        
        # Test the moderation endpoint - this should NOT crash even if marks is None
        response = self.session.get(
            f"{BASE_URL}/api/submissions?course_id={course_id}&for_moderation=true",
            headers=headers
        )
        
        # The key test: should return 200, not 500 (TypeError)
        assert response.status_code == 200, f"Moderation endpoint failed: {response.status_code} - {response.text}"
        
        # Verify response is a list
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Moderation endpoint returned {len(data)} submissions without crashing")
    
    def test_moderation_issues_endpoint(self):
        """Test that /api/moderation/issues endpoint works"""
        token = self.get_marker_token()
        assert token is not None, "Failed to login as marker"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get courses first
        courses_response = self.session.get(f"{BASE_URL}/api/courses", headers=headers)
        assert courses_response.status_code == 200
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("No courses available for testing")
        
        course_id = courses[0]["id"]
        
        # Test moderation issues endpoint
        response = self.session.get(
            f"{BASE_URL}/api/moderation/issues?course_id={course_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Moderation issues endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Moderation issues endpoint returned {len(data)} issues")
    
    # ============ REGRESSION: Gamification stats endpoint ============
    
    def test_gamification_stats_student(self):
        """Test gamification stats endpoint returns correct badge count for student"""
        token = self.get_student_token()
        assert token is not None, "Failed to login as student"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/gamification/stats", headers=headers)
        
        assert response.status_code == 200, f"Gamification stats failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "total_badges_available" in data, "Missing total_badges_available field"
        assert "badges_earned" in data, "Missing badges_earned field"
        assert "badges_count" in data, "Missing badges_count field"
        
        # Student should have 14 badges available
        assert data["total_badges_available"] == 14, f"Expected 14 student badges, got {data['total_badges_available']}"
        print(f"PASS: Student gamification stats - {data['badges_count']}/{data['total_badges_available']} badges")
    
    def test_gamification_stats_marker(self):
        """Test gamification stats endpoint returns correct badge count for marker"""
        token = self.get_marker_token()
        assert token is not None, "Failed to login as marker"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/gamification/stats", headers=headers)
        
        assert response.status_code == 200, f"Gamification stats failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "total_badges_available" in data, "Missing total_badges_available field"
        assert "badges_earned" in data, "Missing badges_earned field"
        assert "badges_count" in data, "Missing badges_count field"
        
        # Marker should have 13 badges available
        assert data["total_badges_available"] == 13, f"Expected 13 marker badges, got {data['total_badges_available']}"
        print(f"PASS: Marker gamification stats - {data['badges_count']}/{data['total_badges_available']} badges")
    
    # ============ REGRESSION: Leaderboard endpoints ============
    
    def test_leaderboard_student_endpoint(self):
        """Test student leaderboard endpoint works"""
        token = self.get_student_token()
        assert token is not None, "Failed to login as student"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get enrolled courses
        courses_response = self.session.get(f"{BASE_URL}/api/students/courses", headers=headers)
        assert courses_response.status_code == 200
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("Student not enrolled in any courses")
        
        course_id = courses[0]["id"]
        
        # Test student leaderboard
        response = self.session.get(f"{BASE_URL}/api/leaderboard/{course_id}/students", headers=headers)
        assert response.status_code == 200, f"Student leaderboard failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Missing leaderboard field"
        print(f"PASS: Student leaderboard returned {len(data['leaderboard'])} entries")
    
    def test_leaderboard_marker_endpoint(self):
        """Test marker leaderboard endpoint works"""
        token = self.get_marker_token()
        assert token is not None, "Failed to login as marker"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get courses
        courses_response = self.session.get(f"{BASE_URL}/api/courses", headers=headers)
        assert courses_response.status_code == 200
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["id"]
        
        # Test marker leaderboard
        response = self.session.get(f"{BASE_URL}/api/leaderboard/{course_id}/markers", headers=headers)
        assert response.status_code == 200, f"Marker leaderboard failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Missing leaderboard field"
        print(f"PASS: Marker leaderboard returned {len(data['leaderboard'])} entries")
    
    def test_leaderboard_settings_endpoint(self):
        """Test leaderboard settings endpoint works"""
        token = self.get_student_token()
        assert token is not None, "Failed to login as student"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get enrolled courses
        courses_response = self.session.get(f"{BASE_URL}/api/students/courses", headers=headers)
        assert courses_response.status_code == 200
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("Student not enrolled in any courses")
        
        course_id = courses[0]["id"]
        
        # Test leaderboard settings
        response = self.session.get(f"{BASE_URL}/api/leaderboard/settings/{course_id}", headers=headers)
        assert response.status_code == 200, f"Leaderboard settings failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "joined" in data, "Missing joined field"
        print(f"PASS: Leaderboard settings - joined: {data['joined']}")
    
    def test_check_nickname_endpoint(self):
        """Test nickname availability check endpoint"""
        token = self.get_student_token()
        assert token is not None, "Failed to login as student"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get enrolled courses
        courses_response = self.session.get(f"{BASE_URL}/api/students/courses", headers=headers)
        assert courses_response.status_code == 200
        
        courses = courses_response.json()
        if not courses:
            pytest.skip("Student not enrolled in any courses")
        
        course_id = courses[0]["id"]
        
        # Test nickname check
        response = self.session.get(
            f"{BASE_URL}/api/leaderboard/check-nickname?course_id={course_id}&nickname=TestNick123",
            headers=headers
        )
        assert response.status_code == 200, f"Nickname check failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "available" in data, "Missing available field"
        print(f"PASS: Nickname check - available: {data['available']}")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_marker_login(self):
        """Test marker can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marker@test.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Marker login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing token"
        assert "user" in data, "Missing user"
        assert data["user"]["role"] in ["marker", "module_leader"], f"Unexpected role: {data['user']['role']}"
        print(f"PASS: Marker login successful - role: {data['user']['role']}")
    
    def test_student_login(self):
        """Test student can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "student@test.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Student login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing token"
        assert "user" in data, "Missing user"
        assert data["user"]["role"] == "student", f"Unexpected role: {data['user']['role']}"
        print(f"PASS: Student login successful - role: {data['user']['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
