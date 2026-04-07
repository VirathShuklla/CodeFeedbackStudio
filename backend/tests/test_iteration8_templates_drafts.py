"""
Iteration 8 Tests: Issue Templates (module-specific) and Auto-Draft Saving
Tests for:
- POST /api/issue-templates with course_id creates a module-specific template
- GET /api/issue-templates?course_id=xxx returns only that module's templates + global templates
- DELETE /api/issue-templates/{id} deletes own template
- POST /api/issue-templates/{id}/use increments usage_count
- POST /api/drafts/save saves marker draft for a submission
- GET /api/drafts/{submission_id} retrieves saved draft
- Template without course_id is a global template
- Regression tests for auth, courses, badges, gamification
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MARKER_EMAIL = "marker@test.com"
MARKER_PASSWORD = "password123"
STUDENT_EMAIL = "student@test.com"
STUDENT_PASSWORD = "password123"


class TestAuth:
    """Authentication tests - regression"""
    
    def test_marker_login(self):
        """Test marker can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200, f"Marker login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == MARKER_EMAIL
        print(f"PASS: Marker login successful, role={data['user']['role']}")
    
    def test_student_login(self):
        """Test student can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200, f"Student login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "student"
        print(f"PASS: Student login successful")


class TestIssueTemplates:
    """Issue Templates CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as marker and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = response.json()["user"]["id"]
        
        # Get a course for testing
        courses_res = requests.get(f"{BASE_URL}/api/courses", headers=self.headers)
        if courses_res.status_code == 200 and courses_res.json():
            self.course_id = courses_res.json()[0]["id"]
        else:
            self.course_id = None
        
        # Get a category for testing
        categories_res = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        assert categories_res.status_code == 200
        self.category_id = categories_res.json()[0]["id"]
    
    def test_create_module_specific_template(self):
        """POST /api/issue-templates with course_id creates module-specific template"""
        if not self.course_id:
            pytest.skip("No course available for testing")
        
        template_data = {
            "title": f"TEST_Module_Template_{uuid.uuid4().hex[:8]}",
            "explanation": "This is a module-specific test template",
            "category_id": self.category_id,
            "severity": "moderate",
            "suggested_fix": "Fix by doing X",
            "marks_deduction": 5,
            "course_id": self.course_id
        }
        
        response = requests.post(f"{BASE_URL}/api/issue-templates", 
                                json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        
        data = response.json()
        assert data["title"] == template_data["title"]
        assert data["course_id"] == self.course_id
        assert data["created_by"] == self.user_id
        assert data["usage_count"] == 0
        assert "category_name" in data
        
        # Store for cleanup
        self.created_template_id = data["id"]
        print(f"PASS: Created module-specific template with course_id={self.course_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issue-templates/{data['id']}", headers=self.headers)
    
    def test_create_global_template(self):
        """Template without course_id is a global template"""
        template_data = {
            "title": f"TEST_Global_Template_{uuid.uuid4().hex[:8]}",
            "explanation": "This is a global test template",
            "category_id": self.category_id,
            "severity": "minor",
            "suggested_fix": "General fix",
            "marks_deduction": 2
            # No course_id - should be global
        }
        
        response = requests.post(f"{BASE_URL}/api/issue-templates", 
                                json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create global template: {response.text}"
        
        data = response.json()
        assert data["title"] == template_data["title"]
        assert data.get("course_id") is None, "Global template should have no course_id"
        print(f"PASS: Created global template (no course_id)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issue-templates/{data['id']}", headers=self.headers)
    
    def test_get_templates_with_course_filter(self):
        """GET /api/issue-templates?course_id=xxx returns module's templates + global templates"""
        if not self.course_id:
            pytest.skip("No course available for testing")
        
        # Create a module-specific template
        module_template = {
            "title": f"TEST_Module_{uuid.uuid4().hex[:8]}",
            "explanation": "Module template",
            "category_id": self.category_id,
            "severity": "moderate",
            "course_id": self.course_id
        }
        res1 = requests.post(f"{BASE_URL}/api/issue-templates", json=module_template, headers=self.headers)
        assert res1.status_code == 200
        module_template_id = res1.json()["id"]
        
        # Create a global template
        global_template = {
            "title": f"TEST_Global_{uuid.uuid4().hex[:8]}",
            "explanation": "Global template",
            "category_id": self.category_id,
            "severity": "minor"
        }
        res2 = requests.post(f"{BASE_URL}/api/issue-templates", json=global_template, headers=self.headers)
        assert res2.status_code == 200
        global_template_id = res2.json()["id"]
        
        # Get templates with course filter
        response = requests.get(f"{BASE_URL}/api/issue-templates?course_id={self.course_id}", 
                               headers=self.headers)
        assert response.status_code == 200
        
        templates = response.json()
        template_ids = [t["id"] for t in templates]
        
        # Should include both module-specific and global templates
        assert module_template_id in template_ids, "Module template should be in results"
        assert global_template_id in template_ids, "Global template should be in results"
        
        # Verify module template has course_id
        module_t = next(t for t in templates if t["id"] == module_template_id)
        assert module_t["course_id"] == self.course_id
        
        # Verify global template has no course_id
        global_t = next(t for t in templates if t["id"] == global_template_id)
        assert global_t.get("course_id") is None
        
        print(f"PASS: GET templates with course_id returns module + global templates")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issue-templates/{module_template_id}", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/issue-templates/{global_template_id}", headers=self.headers)
    
    def test_delete_own_template(self):
        """DELETE /api/issue-templates/{id} deletes own template"""
        # Create a template
        template_data = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "explanation": "Will be deleted",
            "category_id": self.category_id,
            "severity": "minor"
        }
        create_res = requests.post(f"{BASE_URL}/api/issue-templates", 
                                  json=template_data, headers=self.headers)
        assert create_res.status_code == 200
        template_id = create_res.json()["id"]
        
        # Delete it
        delete_res = requests.delete(f"{BASE_URL}/api/issue-templates/{template_id}", 
                                    headers=self.headers)
        assert delete_res.status_code == 200, f"Failed to delete template: {delete_res.text}"
        assert delete_res.json()["message"] == "Template deleted"
        
        # Verify it's gone
        get_res = requests.get(f"{BASE_URL}/api/issue-templates", headers=self.headers)
        template_ids = [t["id"] for t in get_res.json()]
        assert template_id not in template_ids, "Deleted template should not appear in list"
        
        print(f"PASS: DELETE own template works correctly")
    
    def test_increment_usage_count(self):
        """POST /api/issue-templates/{id}/use increments usage_count"""
        # Create a template
        template_data = {
            "title": f"TEST_Usage_{uuid.uuid4().hex[:8]}",
            "explanation": "Testing usage count",
            "category_id": self.category_id,
            "severity": "moderate"
        }
        create_res = requests.post(f"{BASE_URL}/api/issue-templates", 
                                  json=template_data, headers=self.headers)
        assert create_res.status_code == 200
        template_id = create_res.json()["id"]
        initial_count = create_res.json()["usage_count"]
        assert initial_count == 0
        
        # Increment usage
        use_res = requests.post(f"{BASE_URL}/api/issue-templates/{template_id}/use", 
                               headers=self.headers)
        assert use_res.status_code == 200
        
        # Verify count increased
        get_res = requests.get(f"{BASE_URL}/api/issue-templates", headers=self.headers)
        template = next(t for t in get_res.json() if t["id"] == template_id)
        assert template["usage_count"] == 1, f"Usage count should be 1, got {template['usage_count']}"
        
        # Increment again
        requests.post(f"{BASE_URL}/api/issue-templates/{template_id}/use", headers=self.headers)
        get_res2 = requests.get(f"{BASE_URL}/api/issue-templates", headers=self.headers)
        template2 = next(t for t in get_res2.json() if t["id"] == template_id)
        assert template2["usage_count"] == 2
        
        print(f"PASS: Usage count increments correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issue-templates/{template_id}", headers=self.headers)


class TestDrafts:
    """Draft saving and retrieval tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as marker and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a submission for testing
        submissions_res = requests.get(f"{BASE_URL}/api/submissions", headers=self.headers)
        if submissions_res.status_code == 200 and submissions_res.json():
            self.submission_id = submissions_res.json()[0]["id"]
        else:
            self.submission_id = f"test-submission-{uuid.uuid4().hex[:8]}"
    
    def test_save_draft(self):
        """POST /api/drafts/save saves marker draft for a submission"""
        draft_data = {
            "submission_id": self.submission_id,
            "form_state": {
                "newIssue": {
                    "title": "Test Issue Title",
                    "explanation": "Test explanation",
                    "severity": "moderate",
                    "category_id": "test-category",
                    "marks_deduction": 5
                },
                "gradeData": {
                    "marks": 85,
                    "feedback": "Good work overall"
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/drafts/save", 
                                json=draft_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to save draft: {response.text}"
        assert response.json()["message"] == "Draft saved"
        print(f"PASS: Draft saved successfully for submission {self.submission_id}")
    
    def test_get_draft(self):
        """GET /api/drafts/{submission_id} retrieves saved draft"""
        # First save a draft
        draft_data = {
            "submission_id": self.submission_id,
            "form_state": {
                "newIssue": {
                    "title": "Retrieved Issue",
                    "explanation": "This should be retrieved",
                    "severity": "critical"
                },
                "gradeData": {
                    "marks": 70,
                    "feedback": "Needs improvement"
                }
            }
        }
        save_res = requests.post(f"{BASE_URL}/api/drafts/save", 
                                json=draft_data, headers=self.headers)
        assert save_res.status_code == 200
        
        # Retrieve the draft
        get_res = requests.get(f"{BASE_URL}/api/drafts/{self.submission_id}", 
                              headers=self.headers)
        assert get_res.status_code == 200, f"Failed to get draft: {get_res.text}"
        
        data = get_res.json()
        assert "form_state" in data
        assert data["form_state"]["newIssue"]["title"] == "Retrieved Issue"
        assert data["form_state"]["gradeData"]["marks"] == 70
        print(f"PASS: Draft retrieved successfully with correct data")
    
    def test_get_nonexistent_draft(self):
        """GET /api/drafts/{submission_id} returns empty form_state for nonexistent draft"""
        fake_submission_id = f"nonexistent-{uuid.uuid4().hex}"
        
        response = requests.get(f"{BASE_URL}/api/drafts/{fake_submission_id}", 
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["form_state"] == {}, "Nonexistent draft should return empty form_state"
        print(f"PASS: Nonexistent draft returns empty form_state")
    
    def test_draft_update_overwrites(self):
        """Saving draft again overwrites previous draft"""
        # Save initial draft
        draft1 = {
            "submission_id": self.submission_id,
            "form_state": {"version": 1, "data": "initial"}
        }
        requests.post(f"{BASE_URL}/api/drafts/save", json=draft1, headers=self.headers)
        
        # Save updated draft
        draft2 = {
            "submission_id": self.submission_id,
            "form_state": {"version": 2, "data": "updated"}
        }
        requests.post(f"{BASE_URL}/api/drafts/save", json=draft2, headers=self.headers)
        
        # Retrieve and verify it's the updated version
        get_res = requests.get(f"{BASE_URL}/api/drafts/{self.submission_id}", 
                              headers=self.headers)
        data = get_res.json()
        assert data["form_state"]["version"] == 2
        assert data["form_state"]["data"] == "updated"
        print(f"PASS: Draft update overwrites previous draft")


class TestRegressionAuth:
    """Regression tests for authentication"""
    
    def test_auth_me_endpoint(self):
        """GET /api/auth/me returns current user"""
        # Login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Get current user
        me_res = requests.get(f"{BASE_URL}/api/auth/me", 
                             headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == MARKER_EMAIL
        print(f"PASS: /api/auth/me returns correct user")


class TestRegressionCourses:
    """Regression tests for courses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_courses(self):
        """GET /api/courses returns courses"""
        response = requests.get(f"{BASE_URL}/api/courses", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"PASS: GET /api/courses returns {len(response.json())} courses")


class TestRegressionGamification:
    """Regression tests for gamification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_gamification_stats(self):
        """GET /api/gamification/stats returns XP, level, badges"""
        response = requests.get(f"{BASE_URL}/api/gamification/stats", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "xp" in data
        assert "level" in data
        assert "badges" in data
        assert "total_badges_available" in data
        print(f"PASS: Gamification stats: XP={data['xp']}, Level={data['level']}, Badges={len(data['badges'])}")


class TestRegressionBadges:
    """Regression tests for badges"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as marker
        marker_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        self.marker_token = marker_res.json()["token"]
        self.marker_headers = {"Authorization": f"Bearer {self.marker_token}"}
        
        # Login as student
        student_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        self.student_token = student_res.json()["token"]
        self.student_headers = {"Authorization": f"Bearer {self.student_token}"}
    
    def test_marker_badges_count(self):
        """Marker should have 13 badges available"""
        response = requests.get(f"{BASE_URL}/api/gamification/stats", headers=self.marker_headers)
        assert response.status_code == 200
        
        total_badges = response.json()["total_badges_available"]
        assert total_badges == 13, f"Expected 13 marker badges, got {total_badges}"
        print(f"PASS: Marker has 13 badges available")
    
    def test_student_badges_count(self):
        """Student should have 14 badges available"""
        response = requests.get(f"{BASE_URL}/api/gamification/stats", headers=self.student_headers)
        assert response.status_code == 200
        
        total_badges = response.json()["total_badges_available"]
        assert total_badges == 14, f"Expected 14 student badges, got {total_badges}"
        print(f"PASS: Student has 14 badges available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
