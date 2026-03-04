"""
CodeFeedback Studio - Iteration 4 Feature Tests
Tests for:
- User registration (2 roles: student, marker)
- Role elevation (marker → module_leader when creating course)
- Course team management (collaborators, moderators, leadership transfer)
- Assignment creation with total marks and deadlines
- Student enrollment
- Multi-file submissions
- Code review with grading
- Moderation workflow
- Gamification (stats API, badges)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ===== HEALTH CHECK TESTS =====
class TestHealthEndpoints:
    """Basic health and API endpoint tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "CodeFeedback Studio API"
        print("✓ API root check passed")


# ===== REGISTRATION TESTS (2 ROLES ONLY) =====
class TestRegistrationTwoRoles:
    """Test registration is limited to 2 roles: student and marker"""
    
    def test_register_student_role(self):
        """Test student registration"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"iter4_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Test Student",
            "role": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "student"
        print(f"✓ Student registered: {data['email']}")
    
    def test_register_marker_role(self):
        """Test marker registration"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"iter4_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Test Marker",
            "role": "marker"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "marker"
        print(f"✓ Marker registered: {data['email']}")
    
    def test_register_invalid_moderator_role(self):
        """Test registration with moderator role fails (not allowed at registration)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "invalid_mod@test.com",
            "password": "Test123!",
            "full_name": "Invalid Moderator",
            "role": "moderator"
        })
        assert response.status_code == 400
        print("✓ Moderator role registration correctly rejected")
    
    def test_register_invalid_module_leader_role(self):
        """Test registration with module_leader role fails (not allowed at registration)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "invalid_leader@test.com",
            "password": "Test123!",
            "full_name": "Invalid Leader",
            "role": "module_leader"
        })
        assert response.status_code == 400
        print("✓ Module leader role registration correctly rejected")


# ===== LOGIN TESTS =====
class TestLoginFunctionality:
    """Test login for student and marker roles"""
    
    def test_student_login(self):
        """Test student login"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        # Register first
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"login_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Login Student",
            "role": "student"
        })
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"login_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "student"
        print("✓ Student login successful")
    
    def test_marker_login(self):
        """Test marker login"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        # Register first
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"login_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Login Marker",
            "role": "marker"
        })
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"login_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "marker"
        print("✓ Marker login successful")
    
    def test_invalid_credentials_login(self):
        """Test invalid credentials login fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


# ===== ROLE ELEVATION TESTS =====
class TestRoleElevation:
    """Test marker becomes module_leader when creating a course"""
    
    def test_marker_becomes_module_leader_on_course_creation(self):
        """Test marker role elevates to module_leader after creating course"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Register as marker
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"elevate_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Elevate Marker",
            "role": "marker"
        })
        
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"elevate_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Verify initial role is marker
        me_resp = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "marker"
        
        # Create course
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Elevation Test Course {timestamp}",
                "code": f"ETC{timestamp[:4]}"
            })
        assert course_resp.status_code == 200
        
        # Verify role changed to module_leader
        me_resp2 = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"})
        assert me_resp2.status_code == 200
        assert me_resp2.json()["role"] == "module_leader"
        print("✓ Marker elevated to module_leader after course creation")


# ===== COURSE TEAM MANAGEMENT TESTS =====
class TestCourseTeamManagement:
    """Test course team management: collaborators, moderators, leadership transfer"""
    
    @pytest.fixture
    def course_setup(self):
        """Setup course with leader"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create leader (marker who creates course)
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"team_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Team Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"team_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        leader_id = login_leader.json()["user"]["id"]
        
        # Create course
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Team Test Course {timestamp}", "code": f"TTC{timestamp[:4]}"})
        
        course_id = course_resp.json()["id"]
        
        # Create collaborator (another marker)
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"team_collab_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Team Collaborator",
            "role": "marker"
        })
        
        login_collab = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"team_collab_{timestamp}@test.com",
            "password": "Test123!"
        })
        collab_token = login_collab.json()["token"]
        collab_id = login_collab.json()["user"]["id"]
        
        return {
            "leader_token": leader_token,
            "leader_id": leader_id,
            "course_id": course_id,
            "collab_token": collab_token,
            "collab_id": collab_id,
            "timestamp": timestamp
        }
    
    def test_add_collaborator_to_course(self, course_setup):
        """Test adding collaborator to course"""
        response = requests.put(
            f"{BASE_URL}/api/courses/{course_setup['course_id']}",
            headers={"Authorization": f"Bearer {course_setup['leader_token']}"},
            json={"collaborator_ids": [course_setup['collab_id']]}
        )
        assert response.status_code == 200
        data = response.json()
        assert course_setup['collab_id'] in data.get("collaborator_ids", [])
        print("✓ Collaborator added to course")
    
    def test_add_moderator_to_course(self, course_setup):
        """Test adding moderator to course (role changes to moderator)"""
        response = requests.put(
            f"{BASE_URL}/api/courses/{course_setup['course_id']}",
            headers={"Authorization": f"Bearer {course_setup['leader_token']}"},
            json={"moderator_ids": [course_setup['collab_id']]}
        )
        assert response.status_code == 200
        data = response.json()
        assert course_setup['collab_id'] in data.get("moderator_ids", [])
        
        # Verify collaborator's role changed to moderator
        me_resp = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {course_setup['collab_token']}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "moderator"
        print("✓ Moderator added to course and role elevated")
    
    def test_transfer_leadership(self, course_setup):
        """Test transferring course leadership"""
        response = requests.put(
            f"{BASE_URL}/api/courses/{course_setup['course_id']}",
            headers={"Authorization": f"Bearer {course_setup['leader_token']}"},
            json={"leader_id": course_setup['collab_id']}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["leader_id"] == course_setup['collab_id']
        
        # Verify new leader's role is module_leader
        me_resp = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {course_setup['collab_token']}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "module_leader"
        print("✓ Leadership transferred successfully")


# ===== ASSIGNMENT CREATION TESTS =====
class TestAssignmentCreation:
    """Test assignment creation with total marks and deadlines"""
    
    @pytest.fixture
    def assignment_setup(self):
        """Setup course for assignment tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"assign_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Assignment Leader",
            "role": "marker"
        })
        
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"assign_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        token = login_resp.json()["token"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": f"Assignment Course {timestamp}", "code": f"AC{timestamp[:4]}"})
        
        return {
            "token": token,
            "course_id": course_resp.json()["id"]
        }
    
    def test_create_assignment_with_total_marks(self, assignment_setup):
        """Test assignment creation with custom total marks"""
        response = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {assignment_setup['token']}"},
            json={
                "course_id": assignment_setup["course_id"],
                "title": "Custom Marks Assignment",
                "total_marks": 50
            })
        assert response.status_code == 200
        data = response.json()
        assert data["total_marks"] == 50
        print("✓ Assignment created with custom total marks")
    
    def test_create_assignment_with_deadline(self, assignment_setup):
        """Test assignment creation with deadline"""
        future_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        response = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {assignment_setup['token']}"},
            json={
                "course_id": assignment_setup["course_id"],
                "title": "Deadline Assignment",
                "due_date": future_date
            })
        assert response.status_code == 200
        data = response.json()
        assert data["due_date"] is not None
        print("✓ Assignment created with deadline")


# ===== STUDENT ENROLLMENT TESTS =====
class TestStudentEnrollment:
    """Test student enrollment in courses"""
    
    @pytest.fixture
    def enrollment_setup(self):
        """Setup course and student for enrollment tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create course
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"enroll_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Enrollment Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"enroll_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Enrollment Course {timestamp}", "code": f"EC{timestamp[:4]}"})
        course_id = course_resp.json()["id"]
        
        # Create student
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"enroll_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Enrollment Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"enroll_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        return {
            "course_id": course_id,
            "student_token": student_token
        }
    
    def test_student_enrollment(self, enrollment_setup):
        """Test student can enroll in course"""
        response = requests.post(
            f"{BASE_URL}/api/students/enroll/{enrollment_setup['course_id']}",
            headers={"Authorization": f"Bearer {enrollment_setup['student_token']}"})
        assert response.status_code == 200
        print("✓ Student enrolled in course")
    
    def test_student_sees_enrolled_courses(self, enrollment_setup):
        """Test student can see enrolled courses"""
        # Enroll first
        requests.post(
            f"{BASE_URL}/api/students/enroll/{enrollment_setup['course_id']}",
            headers={"Authorization": f"Bearer {enrollment_setup['student_token']}"})
        
        # Get enrolled courses
        response = requests.get(f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {enrollment_setup['student_token']}"})
        assert response.status_code == 200
        courses = response.json()
        assert any(c["id"] == enrollment_setup["course_id"] for c in courses)
        print("✓ Student sees enrolled courses")


# ===== SUBMISSION TESTS =====
class TestStudentSubmission:
    """Test student file submission"""
    
    @pytest.fixture
    def submission_setup(self):
        """Setup for submission tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create course and assignment
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"sub_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Submission Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"sub_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Submission Course {timestamp}", "code": f"SC{timestamp[:4]}"})
        course_id = course_resp.json()["id"]
        
        assign_resp = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"course_id": course_id, "title": "Submission Assignment", "total_marks": 100})
        assignment_id = assign_resp.json()["id"]
        
        # Create student and enroll
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"sub_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Submission Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"sub_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        # Enroll student
        requests.post(f"{BASE_URL}/api/students/enroll/{course_id}",
            headers={"Authorization": f"Bearer {student_token}"})
        
        return {
            "leader_token": leader_token,
            "student_token": student_token,
            "assignment_id": assignment_id,
            "course_id": course_id
        }
    
    def test_multi_file_submission(self, submission_setup):
        """Test multi-file submission"""
        response = requests.post(f"{BASE_URL}/api/submissions",
            headers={"Authorization": f"Bearer {submission_setup['student_token']}"},
            json={
                "assignment_id": submission_setup["assignment_id"],
                "files": [
                    {"filename": "main.py", "content": "def main():\n    pass"},
                    {"filename": "helper.py", "content": "def helper():\n    return True"}
                ]
            })
        assert response.status_code == 200
        data = response.json()
        assert len(data["files"]) == 2
        print("✓ Multi-file submission successful")
        return data["id"]


# ===== CODE REVIEW AND GRADING TESTS =====
class TestCodeReviewAndGrading:
    """Test code review with issue creation and grading"""
    
    @pytest.fixture
    def review_setup(self):
        """Setup for code review tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create course, assignment, submission
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"review_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Review Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"review_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Review Course {timestamp}", "code": f"RC{timestamp[:4]}"})
        course_id = course_resp.json()["id"]
        
        assign_resp = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"course_id": course_id, "title": "Review Assignment", "total_marks": 100})
        assignment_id = assign_resp.json()["id"]
        
        # Create student and submit
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"review_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Review Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"review_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        # Enroll and submit
        requests.post(f"{BASE_URL}/api/students/enroll/{course_id}",
            headers={"Authorization": f"Bearer {student_token}"})
        
        sub_resp = requests.post(f"{BASE_URL}/api/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "assignment_id": assignment_id,
                "files": [{"filename": "solution.py", "content": "def solve():\n    pass"}]
            })
        
        return {
            "leader_token": leader_token,
            "student_token": student_token,
            "submission_id": sub_resp.json()["id"],
            "file_id": sub_resp.json()["files"][0]["id"]
        }
    
    def test_view_submission(self, review_setup):
        """Test viewing submission"""
        response = requests.get(
            f"{BASE_URL}/api/submissions/{review_setup['submission_id']}",
            headers={"Authorization": f"Bearer {review_setup['leader_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        print("✓ Submission viewed successfully")
    
    def test_add_issue_with_marks_deduction(self, review_setup):
        """Test adding issue with marks deduction"""
        # Get categories
        cat_resp = requests.get(f"{BASE_URL}/api/categories",
            headers={"Authorization": f"Bearer {review_setup['leader_token']}"})
        category_id = cat_resp.json()[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/issues",
            headers={"Authorization": f"Bearer {review_setup['leader_token']}"},
            json={
                "submission_id": review_setup["submission_id"],
                "file_id": review_setup["file_id"],
                "category_id": category_id,
                "line_start": 1,
                "line_end": 2,
                "title": "Logic Error",
                "explanation": "Function does nothing",
                "severity": "moderate",
                "marks_deduction": 10
            })
        assert response.status_code == 200
        data = response.json()
        assert data["marks_deduction"] == 10
        print("✓ Issue added with marks deduction")
    
    def test_grade_submission(self, review_setup):
        """Test grading submission"""
        response = requests.post(
            f"{BASE_URL}/api/submissions/{review_setup['submission_id']}/grade",
            headers={"Authorization": f"Bearer {review_setup['leader_token']}"},
            json={"marks": 85, "feedback": "Good effort"})
        assert response.status_code == 200
        data = response.json()
        assert data["marks"] == 85
        print("✓ Submission graded successfully")


# ===== GAMIFICATION TESTS =====
class TestGamification:
    """Test gamification stats and badges API"""
    
    @pytest.fixture
    def gamification_setup(self):
        """Setup for gamification tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create student
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"gamif_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Gamification Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"gamif_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        # Create marker
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"gamif_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Gamification Marker",
            "role": "marker"
        })
        
        login_marker = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"gamif_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        marker_token = login_marker.json()["token"]
        
        return {
            "student_token": student_token,
            "marker_token": marker_token
        }
    
    def test_gamification_stats_endpoint_student(self, gamification_setup):
        """Test gamification stats endpoint for student"""
        response = requests.get(f"{BASE_URL}/api/gamification/stats",
            headers={"Authorization": f"Bearer {gamification_setup['student_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "xp" in data or "total_xp" in data
        assert "level" in data
        assert "badges" in data or "badges_earned" in data
        print("✓ Gamification stats API works for students")
    
    def test_gamification_stats_endpoint_marker(self, gamification_setup):
        """Test gamification stats endpoint for marker"""
        response = requests.get(f"{BASE_URL}/api/gamification/stats",
            headers={"Authorization": f"Bearer {gamification_setup['marker_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "xp" in data or "total_xp" in data
        assert "level" in data
        print("✓ Gamification stats API works for markers")
    
    def test_gamification_badges_endpoint_student(self, gamification_setup):
        """Test gamification badges endpoint for student"""
        response = requests.get(f"{BASE_URL}/api/gamification/badges",
            headers={"Authorization": f"Bearer {gamification_setup['student_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "earned" in data
        assert "available" in data
        print("✓ Gamification badges API works for students")
    
    def test_gamification_badges_endpoint_marker(self, gamification_setup):
        """Test gamification badges endpoint for marker"""
        response = requests.get(f"{BASE_URL}/api/gamification/badges",
            headers={"Authorization": f"Bearer {gamification_setup['marker_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "earned" in data
        assert "available" in data
        print("✓ Gamification badges API works for markers")


# ===== STUDENT FEEDBACK VIEW TESTS =====
class TestStudentFeedbackView:
    """Test student can view feedback and mark issues as fixed"""
    
    @pytest.fixture
    def feedback_setup(self):
        """Setup for feedback tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create course, assignment, and grade a submission
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"feedback_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Feedback Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"feedback_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Feedback Course {timestamp}", "code": f"FC{timestamp[:4]}"})
        course_id = course_resp.json()["id"]
        
        assign_resp = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"course_id": course_id, "title": "Feedback Assignment", "total_marks": 100})
        assignment_id = assign_resp.json()["id"]
        
        # Create student and submit
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"feedback_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Feedback Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"feedback_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        # Enroll and submit
        requests.post(f"{BASE_URL}/api/students/enroll/{course_id}",
            headers={"Authorization": f"Bearer {student_token}"})
        
        sub_resp = requests.post(f"{BASE_URL}/api/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "assignment_id": assignment_id,
                "files": [{"filename": "feedback.py", "content": "def test():\n    pass"}]
            })
        submission_id = sub_resp.json()["id"]
        file_id = sub_resp.json()["files"][0]["id"]
        
        # Add issue and grade
        cat_resp = requests.get(f"{BASE_URL}/api/categories",
            headers={"Authorization": f"Bearer {leader_token}"})
        category_id = cat_resp.json()[0]["id"]
        
        issue_resp = requests.post(f"{BASE_URL}/api/issues",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={
                "submission_id": submission_id,
                "file_id": file_id,
                "category_id": category_id,
                "line_start": 1,
                "line_end": 1,
                "title": "Empty function",
                "explanation": "Function does nothing",
                "severity": "minor",
                "marks_deduction": 5
            })
        issue_id = issue_resp.json()["id"]
        
        # Grade submission
        requests.post(f"{BASE_URL}/api/submissions/{submission_id}/grade",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"marks": 95, "feedback": "Minor issue"})
        
        return {
            "student_token": student_token,
            "submission_id": submission_id,
            "issue_id": issue_id
        }
    
    def test_student_view_feedback(self, feedback_setup):
        """Test student can view feedback"""
        response = requests.get(
            f"{BASE_URL}/api/submissions/{feedback_setup['submission_id']}",
            headers={"Authorization": f"Bearer {feedback_setup['student_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "marks" in data
        print("✓ Student can view feedback")
    
    def test_student_mark_issue_fixed(self, feedback_setup):
        """Test student can mark issue as fixed"""
        response = requests.post(
            f"{BASE_URL}/api/issues/{feedback_setup['issue_id']}/mark-fixed",
            headers={"Authorization": f"Bearer {feedback_setup['student_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "xp_gained" in data
        print("✓ Student marked issue as fixed and gained XP")


# ===== MODERATION TESTS =====
class TestModerationWorkflow:
    """Test moderation page and workflow"""
    
    @pytest.fixture
    def moderation_setup(self):
        """Setup for moderation tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create leader and course
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"moderation_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Moderation Leader",
            "role": "marker"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"moderation_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        leader_token = login_leader.json()["token"]
        leader_id = login_leader.json()["user"]["id"]
        
        course_resp = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"name": f"Moderation Course {timestamp}", "code": f"MC{timestamp[:4]}"})
        course_id = course_resp.json()["id"]
        
        # Create moderator (another marker added as moderator)
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"moderation_moderator_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Moderation Moderator",
            "role": "marker"
        })
        
        login_mod = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"moderation_moderator_{timestamp}@test.com",
            "password": "Test123!"
        })
        mod_token = login_mod.json()["token"]
        mod_id = login_mod.json()["user"]["id"]
        
        # Add as moderator
        requests.put(f"{BASE_URL}/api/courses/{course_id}",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"moderator_ids": [mod_id]})
        
        # Need to re-login to get updated role
        login_mod2 = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"moderation_moderator_{timestamp}@test.com",
            "password": "Test123!"
        })
        mod_token = login_mod2.json()["token"]
        
        # Create assignment and submission
        assign_resp = requests.post(f"{BASE_URL}/api/assignments",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"course_id": course_id, "title": "Moderation Assignment"})
        assignment_id = assign_resp.json()["id"]
        
        # Create student and submit
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"moderation_student_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Moderation Student",
            "role": "student"
        })
        
        login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"moderation_student_{timestamp}@test.com",
            "password": "Test123!"
        })
        student_token = login_student.json()["token"]
        
        requests.post(f"{BASE_URL}/api/students/enroll/{course_id}",
            headers={"Authorization": f"Bearer {student_token}"})
        
        sub_resp = requests.post(f"{BASE_URL}/api/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "assignment_id": assignment_id,
                "files": [{"filename": "mod.py", "content": "# Test"}]
            })
        submission_id = sub_resp.json()["id"]
        
        # Grade submission
        requests.post(f"{BASE_URL}/api/submissions/{submission_id}/grade",
            headers={"Authorization": f"Bearer {leader_token}"},
            json={"marks": 70, "feedback": "Needs improvement"})
        
        return {
            "leader_token": leader_token,
            "mod_token": mod_token,
            "submission_id": submission_id,
            "course_id": course_id
        }
    
    def test_moderator_can_view_submissions_for_moderation(self, moderation_setup):
        """Test moderator can view submissions for moderation"""
        response = requests.get(
            f"{BASE_URL}/api/submissions?course_id={moderation_setup['course_id']}&for_moderation=true",
            headers={"Authorization": f"Bearer {moderation_setup['mod_token']}"})
        assert response.status_code == 200
        print("✓ Moderator can view submissions for moderation")
    
    def test_moderator_can_raise_issue(self, moderation_setup):
        """Test moderator can raise moderation issue"""
        response = requests.post(f"{BASE_URL}/api/moderation/issues",
            headers={"Authorization": f"Bearer {moderation_setup['mod_token']}"},
            json={
                "submission_id": moderation_setup["submission_id"],
                "issue_description": "Inconsistent marking",
                "severity": "moderate"
            })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "open"
        print("✓ Moderator raised moderation issue")
        return data["id"]
    
    def test_module_leader_can_view_moderation_issues(self, moderation_setup):
        """Test module leader can view moderation issues"""
        response = requests.get(f"{BASE_URL}/api/moderation/issues",
            headers={"Authorization": f"Bearer {moderation_setup['leader_token']}"})
        assert response.status_code == 200
        print("✓ Module leader can view moderation issues")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
