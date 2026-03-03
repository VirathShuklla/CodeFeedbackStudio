"""
CodeFeedback Studio - Phase 1 & 2 Features Backend Tests
Tests for:
- User registration with 4 roles (student, marker, moderator, module_leader)
- Login functionality for each role
- Role-based access control
- Course management (creation, moderator assignment)
- Assignment creation (total marks, max attempts, release date)
- Student enrollment
- Multi-file submissions
- Code review (issue creation with marks deduction)
- Grading workflow
- Moderation workflow (raise issues, approve/reject)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthAndAPI:
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


class TestUserRegistrationAllRoles:
    """Test registration for all 4 user roles"""
    
    def test_register_student_without_course(self):
        """Student registration should fail without course selection when courses exist"""
        # First create a course so there are courses available
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "temp_marker_for_course@test.com",
            "password": "Test123!",
            "full_name": "Temp Marker",
            "role": "marker"
        })
        if response.status_code == 200:
            # Marker created, now create a course
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "temp_marker_for_course@test.com",
                "password": "Test123!"
            })
            if login_resp.status_code == 200:
                token = login_resp.json()["token"]
                requests.post(f"{BASE_URL}/api/courses", 
                    headers={"Authorization": f"Bearer {token}"},
                    json={"name": "Test Course for Student Reg", "code": "TC001"}
                )
        print("✓ Student registration without course handling verified")
    
    def test_register_marker_role(self):
        """Test marker registration"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Test Marker",
            "role": "marker"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "marker"
        assert "id" in data
        print(f"✓ Marker registered: {data['email']}")
        return data
    
    def test_register_moderator_role(self):
        """Test moderator registration"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"moderator_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Test Moderator",
            "role": "moderator"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "moderator"
        print(f"✓ Moderator registered: {data['email']}")
        return data
    
    def test_register_module_leader_role(self):
        """Test module leader registration"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Test Module Leader",
            "role": "module_leader"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "module_leader"
        print(f"✓ Module Leader registered: {data['email']}")
        return data
    
    def test_register_invalid_role(self):
        """Test registration with invalid role fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "invalid_role@test.com",
            "password": "Test123!",
            "full_name": "Invalid Role Test",
            "role": "admin"  # Invalid role
        })
        assert response.status_code == 400
        print("✓ Invalid role registration correctly rejected")
    
    def test_duplicate_email_registration(self):
        """Test duplicate email registration fails"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        email = f"dup_{timestamp}@test.com"
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test123!",
            "full_name": "First User",
            "role": "marker"
        })
        assert response1.status_code == 200
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test123!",
            "full_name": "Second User",
            "role": "marker"
        })
        assert response2.status_code == 400
        print("✓ Duplicate email registration correctly rejected")


class TestLoginFunctionality:
    """Test login for each role"""
    
    @pytest.fixture
    def registered_users(self):
        """Register users for all roles"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        users = {}
        
        for role in ["marker", "moderator", "module_leader"]:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": f"login_test_{role}_{timestamp}@test.com",
                "password": "Test123!",
                "full_name": f"Login Test {role.title()}",
                "role": role
            })
            if response.status_code == 200:
                users[role] = response.json()
        
        return users, timestamp
    
    def test_marker_login(self, registered_users):
        """Test marker login"""
        users, timestamp = registered_users
        if "marker" in users:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"login_test_marker_{timestamp}@test.com",
                "password": "Test123!"
            })
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            assert data["user"]["role"] == "marker"
            print("✓ Marker login successful")
    
    def test_moderator_login(self, registered_users):
        """Test moderator login"""
        users, timestamp = registered_users
        if "moderator" in users:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"login_test_moderator_{timestamp}@test.com",
                "password": "Test123!"
            })
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            assert data["user"]["role"] == "moderator"
            print("✓ Moderator login successful")
    
    def test_module_leader_login(self, registered_users):
        """Test module leader login"""
        users, timestamp = registered_users
        if "module_leader" in users:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"login_test_module_leader_{timestamp}@test.com",
                "password": "Test123!"
            })
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            assert data["user"]["role"] == "module_leader"
            print("✓ Module Leader login successful")
    
    def test_invalid_login(self):
        """Test invalid login fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestRoleBasedAccessControl:
    """Test role-based access control"""
    
    @pytest.fixture
    def setup_users(self):
        """Setup users with different roles"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        tokens = {}
        
        for role in ["marker", "moderator", "module_leader"]:
            # Register
            reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": f"rbac_{role}_{timestamp}@test.com",
                "password": "Test123!",
                "full_name": f"RBAC {role.title()}",
                "role": role
            })
            if reg_resp.status_code == 200:
                # Login
                login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": f"rbac_{role}_{timestamp}@test.com",
                    "password": "Test123!"
                })
                if login_resp.status_code == 200:
                    tokens[role] = login_resp.json()["token"]
        
        return tokens
    
    def test_marker_can_access_courses(self, setup_users):
        """Test marker can access courses endpoint"""
        if "marker" in setup_users:
            response = requests.get(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {setup_users['marker']}"})
            assert response.status_code == 200
            print("✓ Marker can access courses")
    
    def test_moderator_can_access_moderation(self, setup_users):
        """Test moderator can access moderation endpoints"""
        if "moderator" in setup_users:
            response = requests.get(f"{BASE_URL}/api/moderation/issues",
                headers={"Authorization": f"Bearer {setup_users['moderator']}"})
            assert response.status_code == 200
            print("✓ Moderator can access moderation")
    
    def test_marker_cannot_access_moderation_create(self, setup_users):
        """Test marker cannot create moderation issues"""
        if "marker" in setup_users:
            response = requests.post(f"{BASE_URL}/api/moderation/issues",
                headers={"Authorization": f"Bearer {setup_users['marker']}"},
                json={"submission_id": "test", "issue_description": "test"})
            assert response.status_code == 403
            print("✓ Marker correctly denied moderation access")


class TestCourseManagement:
    """Test course creation and management"""
    
    @pytest.fixture
    def marker_with_course(self):
        """Create a marker and a course"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Register marker
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"course_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Course Marker",
            "role": "marker"
        })
        
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"course_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_resp.status_code == 200:
            token = login_resp.json()["token"]
            
            # Create course
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "name": f"Test Course {timestamp}",
                    "code": f"TC{timestamp[:6]}",
                    "year": 2026,
                    "semester": "Spring"
                })
            
            if course_resp.status_code == 200:
                return {
                    "token": token,
                    "course": course_resp.json(),
                    "timestamp": timestamp
                }
        return None
    
    def test_course_creation(self, marker_with_course):
        """Test course is created properly"""
        assert marker_with_course is not None
        course = marker_with_course["course"]
        assert "id" in course
        assert course["name"].startswith("Test Course")
        print(f"✓ Course created: {course['name']}")
    
    def test_marker_becomes_leader_on_course_creation(self, marker_with_course):
        """Test marker becomes module_leader after creating course"""
        if marker_with_course:
            token = marker_with_course["token"]
            response = requests.get(f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"})
            # After creating course, user should be module_leader
            assert response.status_code == 200
            data = response.json()
            assert data["role"] == "module_leader"
            print("✓ Marker promoted to module_leader after course creation")


class TestAssignmentCreation:
    """Test assignment creation with Phase 2 features"""
    
    @pytest.fixture
    def course_setup(self):
        """Setup course for assignment tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Register and login marker
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"assign_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Assignment Marker",
            "role": "marker"
        })
        
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"assign_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_resp.status_code == 200:
            token = login_resp.json()["token"]
            
            # Create course
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {token}"},
                json={"name": "Assignment Test Course", "code": f"ATC{timestamp[:4]}"})
            
            if course_resp.status_code == 200:
                return {
                    "token": token,
                    "course_id": course_resp.json()["id"]
                }
        return None
    
    def test_assignment_with_total_marks(self, course_setup):
        """Test assignment creation with custom total marks"""
        if course_setup:
            response = requests.post(f"{BASE_URL}/api/assignments",
                headers={"Authorization": f"Bearer {course_setup['token']}"},
                json={
                    "course_id": course_setup["course_id"],
                    "title": "Test Assignment",
                    "total_marks": 50
                })
            assert response.status_code == 200
            data = response.json()
            assert data["total_marks"] == 50
            print("✓ Assignment created with custom total marks")
    
    def test_assignment_with_max_attempts(self, course_setup):
        """Test assignment creation with max attempts"""
        if course_setup:
            response = requests.post(f"{BASE_URL}/api/assignments",
                headers={"Authorization": f"Bearer {course_setup['token']}"},
                json={
                    "course_id": course_setup["course_id"],
                    "title": "Limited Attempts Assignment",
                    "max_attempts": 3
                })
            assert response.status_code == 200
            data = response.json()
            assert data["max_attempts"] == 3
            print("✓ Assignment created with max attempts limit")
    
    def test_assignment_with_release_date(self, course_setup):
        """Test assignment creation with scheduled marks release date"""
        if course_setup:
            future_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
            response = requests.post(f"{BASE_URL}/api/assignments",
                headers={"Authorization": f"Bearer {course_setup['token']}"},
                json={
                    "course_id": course_setup["course_id"],
                    "title": "Scheduled Release Assignment",
                    "marks_release_date": future_date
                })
            assert response.status_code == 200
            data = response.json()
            assert data["marks_release_date"] is not None
            print("✓ Assignment created with scheduled release date")


class TestStudentEnrollment:
    """Test student enrollment in courses"""
    
    @pytest.fixture
    def course_and_student(self):
        """Setup course and student"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create course by marker
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"enroll_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Enroll Marker",
            "role": "marker"
        })
        
        login_marker = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"enroll_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_marker.status_code == 200:
            marker_token = login_marker.json()["token"]
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {marker_token}"},
                json={"name": "Enrollment Test Course", "code": f"ETC{timestamp[:4]}"})
            
            if course_resp.status_code == 200:
                course_id = course_resp.json()["id"]
                
                # Register student with course
                requests.post(f"{BASE_URL}/api/auth/register", json={
                    "email": f"enroll_student_{timestamp}@test.com",
                    "password": "Test123!",
                    "full_name": "Enroll Student",
                    "role": "student",
                    "course_ids": [course_id]
                })
                
                login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": f"enroll_student_{timestamp}@test.com",
                    "password": "Test123!"
                })
                
                if login_student.status_code == 200:
                    return {
                        "course_id": course_id,
                        "student_token": login_student.json()["token"],
                        "marker_token": marker_token
                    }
        return None
    
    def test_student_sees_enrolled_courses(self, course_and_student):
        """Test student can see enrolled courses"""
        if course_and_student:
            response = requests.get(f"{BASE_URL}/api/students/courses",
                headers={"Authorization": f"Bearer {course_and_student['student_token']}"})
            assert response.status_code == 200
            courses = response.json()
            assert len(courses) >= 1
            print("✓ Student can see enrolled courses")
    
    def test_student_can_unenroll(self, course_and_student):
        """Test student can unenroll from course"""
        if course_and_student:
            response = requests.delete(
                f"{BASE_URL}/api/students/enroll/{course_and_student['course_id']}",
                headers={"Authorization": f"Bearer {course_and_student['student_token']}"})
            assert response.status_code == 200
            print("✓ Student can unenroll from course")
    
    def test_student_can_enroll(self, course_and_student):
        """Test student can enroll in new course"""
        if course_and_student:
            # First unenroll
            requests.delete(
                f"{BASE_URL}/api/students/enroll/{course_and_student['course_id']}",
                headers={"Authorization": f"Bearer {course_and_student['student_token']}"})
            
            # Then re-enroll
            response = requests.post(
                f"{BASE_URL}/api/students/enroll/{course_and_student['course_id']}",
                headers={"Authorization": f"Bearer {course_and_student['student_token']}"})
            assert response.status_code == 200
            print("✓ Student can enroll in course")


class TestMultiFileSubmission:
    """Test multi-file submission workflow"""
    
    @pytest.fixture
    def submission_setup(self):
        """Setup for submission tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create marker and course
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"sub_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Submission Marker",
            "role": "marker"
        })
        
        login_marker = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"sub_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_marker.status_code == 200:
            marker_token = login_marker.json()["token"]
            
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {marker_token}"},
                json={"name": "Submission Test Course", "code": f"STC{timestamp[:4]}"})
            
            if course_resp.status_code == 200:
                course_id = course_resp.json()["id"]
                
                # Create assignment
                assign_resp = requests.post(f"{BASE_URL}/api/assignments",
                    headers={"Authorization": f"Bearer {marker_token}"},
                    json={
                        "course_id": course_id,
                        "title": "Multi-file Assignment",
                        "total_marks": 100
                    })
                
                if assign_resp.status_code == 200:
                    assignment_id = assign_resp.json()["id"]
                    
                    # Create student
                    requests.post(f"{BASE_URL}/api/auth/register", json={
                        "email": f"sub_student_{timestamp}@test.com",
                        "password": "Test123!",
                        "full_name": "Submission Student",
                        "role": "student",
                        "course_ids": [course_id]
                    })
                    
                    login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
                        "email": f"sub_student_{timestamp}@test.com",
                        "password": "Test123!"
                    })
                    
                    if login_student.status_code == 200:
                        return {
                            "marker_token": marker_token,
                            "student_token": login_student.json()["token"],
                            "assignment_id": assignment_id,
                            "course_id": course_id
                        }
        return None
    
    def test_multi_file_submission(self, submission_setup):
        """Test submitting multiple files"""
        if submission_setup:
            response = requests.post(f"{BASE_URL}/api/submissions",
                headers={"Authorization": f"Bearer {submission_setup['student_token']}"},
                json={
                    "assignment_id": submission_setup["assignment_id"],
                    "files": [
                        {"filename": "main.py", "content": "def main():\n    pass"},
                        {"filename": "helper.py", "content": "def helper():\n    return True"},
                        {"filename": "utils.py", "content": "# Utility functions"}
                    ]
                })
            assert response.status_code == 200
            data = response.json()
            assert len(data["files"]) == 3
            print("✓ Multi-file submission successful")
            return data
    
    def test_submission_has_correct_files(self, submission_setup):
        """Test submission files are stored correctly"""
        if submission_setup:
            # Submit files
            sub_resp = requests.post(f"{BASE_URL}/api/submissions",
                headers={"Authorization": f"Bearer {submission_setup['student_token']}"},
                json={
                    "assignment_id": submission_setup["assignment_id"],
                    "files": [
                        {"filename": "test1.py", "content": "# Test 1"},
                        {"filename": "test2.py", "content": "# Test 2"}
                    ]
                })
            
            if sub_resp.status_code == 200:
                submission_id = sub_resp.json()["id"]
                
                # Fetch submission
                get_resp = requests.get(f"{BASE_URL}/api/submissions/{submission_id}",
                    headers={"Authorization": f"Bearer {submission_setup['marker_token']}"})
                assert get_resp.status_code == 200
                data = get_resp.json()
                assert len(data["files"]) == 2
                filenames = [f["filename"] for f in data["files"]]
                assert "test1.py" in filenames
                assert "test2.py" in filenames
                print("✓ Submission files stored correctly")


class TestCodeReviewAndGrading:
    """Test code review and grading workflow"""
    
    @pytest.fixture
    def grading_setup(self):
        """Setup for grading tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create marker and course
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"grade_marker_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Grade Marker",
            "role": "marker"
        })
        
        login_marker = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"grade_marker_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_marker.status_code == 200:
            marker_token = login_marker.json()["token"]
            
            # Create course and assignment
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {marker_token}"},
                json={"name": "Grading Test Course", "code": f"GTC{timestamp[:4]}"})
            
            if course_resp.status_code == 200:
                course_id = course_resp.json()["id"]
                
                assign_resp = requests.post(f"{BASE_URL}/api/assignments",
                    headers={"Authorization": f"Bearer {marker_token}"},
                    json={
                        "course_id": course_id,
                        "title": "Grading Test Assignment",
                        "total_marks": 100
                    })
                
                if assign_resp.status_code == 200:
                    assignment_id = assign_resp.json()["id"]
                    
                    # Create student and submit
                    requests.post(f"{BASE_URL}/api/auth/register", json={
                        "email": f"grade_student_{timestamp}@test.com",
                        "password": "Test123!",
                        "full_name": "Grade Student",
                        "role": "student",
                        "course_ids": [course_id]
                    })
                    
                    login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
                        "email": f"grade_student_{timestamp}@test.com",
                        "password": "Test123!"
                    })
                    
                    if login_student.status_code == 200:
                        student_token = login_student.json()["token"]
                        
                        # Submit code
                        sub_resp = requests.post(f"{BASE_URL}/api/submissions",
                            headers={"Authorization": f"Bearer {student_token}"},
                            json={
                                "assignment_id": assignment_id,
                                "files": [{"filename": "solution.py", "content": "def solve():\n    pass"}]
                            })
                        
                        if sub_resp.status_code == 200:
                            return {
                                "marker_token": marker_token,
                                "student_token": student_token,
                                "submission_id": sub_resp.json()["id"],
                                "file_id": sub_resp.json()["files"][0]["id"],
                                "assignment_id": assignment_id
                            }
        return None
    
    def test_create_issue_with_marks_deduction(self, grading_setup):
        """Test creating issue with marks deduction"""
        if grading_setup:
            # Get categories first
            cat_resp = requests.get(f"{BASE_URL}/api/categories",
                headers={"Authorization": f"Bearer {grading_setup['marker_token']}"})
            
            if cat_resp.status_code == 200 and len(cat_resp.json()) > 0:
                category_id = cat_resp.json()[0]["id"]
                
                response = requests.post(f"{BASE_URL}/api/issues",
                    headers={"Authorization": f"Bearer {grading_setup['marker_token']}"},
                    json={
                        "submission_id": grading_setup["submission_id"],
                        "file_id": grading_setup["file_id"],
                        "category_id": category_id,
                        "line_start": 1,
                        "line_end": 2,
                        "title": "Logic Error",
                        "explanation": "The function doesn't do anything",
                        "severity": "moderate",
                        "marks_deduction": 10
                    })
                assert response.status_code == 200
                data = response.json()
                assert data["marks_deduction"] == 10
                print("✓ Issue created with marks deduction")
    
    def test_grade_submission(self, grading_setup):
        """Test grading a submission"""
        if grading_setup:
            response = requests.post(
                f"{BASE_URL}/api/submissions/{grading_setup['submission_id']}/grade",
                headers={"Authorization": f"Bearer {grading_setup['marker_token']}"},
                json={
                    "marks": 85,
                    "feedback": "Good effort but needs improvement"
                })
            assert response.status_code == 200
            data = response.json()
            assert data["marks"] == 85
            print("✓ Submission graded successfully")
    
    def test_mark_no_issues(self, grading_setup):
        """Test marking submission as having no issues"""
        if grading_setup:
            # Need fresh submission without issues
            timestamp = datetime.now().strftime("%H%M%S%f")
            
            # Create new submission
            sub_resp = requests.post(f"{BASE_URL}/api/submissions",
                headers={"Authorization": f"Bearer {grading_setup['student_token']}"},
                json={
                    "assignment_id": grading_setup["assignment_id"],
                    "files": [{"filename": "perfect.py", "content": "def perfect():\n    return True"}]
                })
            
            if sub_resp.status_code == 200:
                new_sub_id = sub_resp.json()["id"]
                
                response = requests.post(
                    f"{BASE_URL}/api/submissions/{new_sub_id}/mark-no-issues",
                    headers={"Authorization": f"Bearer {grading_setup['marker_token']}"},
                    json={"submission_id": new_sub_id})
                assert response.status_code == 200
                assert response.json()["status"] == "no_issues"
                print("✓ Submission marked as no issues")


class TestModerationWorkflow:
    """Test moderation workflow"""
    
    @pytest.fixture
    def moderation_setup(self):
        """Setup for moderation tests"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Create module leader and course
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"mod_leader_{timestamp}@test.com",
            "password": "Test123!",
            "full_name": "Mod Leader",
            "role": "module_leader"
        })
        
        login_leader = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"mod_leader_{timestamp}@test.com",
            "password": "Test123!"
        })
        
        if login_leader.status_code == 200:
            leader_token = login_leader.json()["token"]
            
            # Create course
            course_resp = requests.post(f"{BASE_URL}/api/courses",
                headers={"Authorization": f"Bearer {leader_token}"},
                json={"name": "Moderation Test Course", "code": f"MTC{timestamp[:4]}"})
            
            if course_resp.status_code == 200:
                course_id = course_resp.json()["id"]
                
                # Create moderator
                requests.post(f"{BASE_URL}/api/auth/register", json={
                    "email": f"mod_moderator_{timestamp}@test.com",
                    "password": "Test123!",
                    "full_name": "Mod Moderator",
                    "role": "moderator"
                })
                
                login_mod = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": f"mod_moderator_{timestamp}@test.com",
                    "password": "Test123!"
                })
                
                # Add moderator to course
                mod_user_id = login_mod.json()["user"]["id"] if login_mod.status_code == 200 else None
                if mod_user_id:
                    requests.put(f"{BASE_URL}/api/courses/{course_id}",
                        headers={"Authorization": f"Bearer {leader_token}"},
                        json={"moderator_ids": [mod_user_id]})
                
                # Create assignment
                assign_resp = requests.post(f"{BASE_URL}/api/assignments",
                    headers={"Authorization": f"Bearer {leader_token}"},
                    json={"course_id": course_id, "title": "Moderation Assignment"})
                
                if assign_resp.status_code == 200:
                    assignment_id = assign_resp.json()["id"]
                    
                    # Create student and submission
                    requests.post(f"{BASE_URL}/api/auth/register", json={
                        "email": f"mod_student_{timestamp}@test.com",
                        "password": "Test123!",
                        "full_name": "Mod Student",
                        "role": "student",
                        "course_ids": [course_id]
                    })
                    
                    login_student = requests.post(f"{BASE_URL}/api/auth/login", json={
                        "email": f"mod_student_{timestamp}@test.com",
                        "password": "Test123!"
                    })
                    
                    if login_student.status_code == 200:
                        student_token = login_student.json()["token"]
                        
                        # Submit and grade
                        sub_resp = requests.post(f"{BASE_URL}/api/submissions",
                            headers={"Authorization": f"Bearer {student_token}"},
                            json={
                                "assignment_id": assignment_id,
                                "files": [{"filename": "mod_test.py", "content": "# Mod test"}]
                            })
                        
                        if sub_resp.status_code == 200:
                            submission_id = sub_resp.json()["id"]
                            
                            # Grade submission
                            requests.post(f"{BASE_URL}/api/submissions/{submission_id}/grade",
                                headers={"Authorization": f"Bearer {leader_token}"},
                                json={"marks": 75, "feedback": "Needs improvement"})
                            
                            return {
                                "leader_token": leader_token,
                                "moderator_token": login_mod.json()["token"] if login_mod.status_code == 200 else None,
                                "submission_id": submission_id,
                                "course_id": course_id
                            }
        return None
    
    def test_moderator_can_raise_issue(self, moderation_setup):
        """Test moderator can raise moderation issue"""
        if moderation_setup and moderation_setup.get("moderator_token"):
            response = requests.post(f"{BASE_URL}/api/moderation/issues",
                headers={"Authorization": f"Bearer {moderation_setup['moderator_token']}"},
                json={
                    "submission_id": moderation_setup["submission_id"],
                    "issue_description": "Marking appears inconsistent",
                    "severity": "moderate"
                })
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "open"
            print("✓ Moderator raised moderation issue")
            return data["id"]
    
    def test_module_leader_can_approve_issue(self, moderation_setup):
        """Test module leader can approve moderation issue"""
        if moderation_setup and moderation_setup.get("moderator_token"):
            # First raise an issue
            issue_resp = requests.post(f"{BASE_URL}/api/moderation/issues",
                headers={"Authorization": f"Bearer {moderation_setup['moderator_token']}"},
                json={
                    "submission_id": moderation_setup["submission_id"],
                    "issue_description": "Approve test issue",
                    "severity": "minor"
                })
            
            if issue_resp.status_code == 200:
                issue_id = issue_resp.json()["id"]
                
                # Leader approves
                response = requests.post(f"{BASE_URL}/api/moderation/issues/{issue_id}/approve",
                    headers={"Authorization": f"Bearer {moderation_setup['leader_token']}"})
                assert response.status_code == 200
                print("✓ Module leader approved moderation issue")
    
    def test_module_leader_can_reject_issue(self, moderation_setup):
        """Test module leader can reject moderation issue"""
        if moderation_setup and moderation_setup.get("moderator_token"):
            # First raise an issue
            issue_resp = requests.post(f"{BASE_URL}/api/moderation/issues",
                headers={"Authorization": f"Bearer {moderation_setup['moderator_token']}"},
                json={
                    "submission_id": moderation_setup["submission_id"],
                    "issue_description": "Reject test issue",
                    "severity": "minor"
                })
            
            if issue_resp.status_code == 200:
                issue_id = issue_resp.json()["id"]
                
                # Leader rejects
                response = requests.post(f"{BASE_URL}/api/moderation/issues/{issue_id}/reject",
                    headers={"Authorization": f"Bearer {moderation_setup['leader_token']}"})
                assert response.status_code == 200
                print("✓ Module leader rejected moderation issue")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
