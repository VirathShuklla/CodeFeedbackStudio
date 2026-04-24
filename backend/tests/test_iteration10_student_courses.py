"""
Iteration 10 backend test: enriched GET /api/students/courses endpoint.

Validates that /api/students/courses returns the new fields documented in the
review request (description, year, semester, student_count, assignments_count,
submitted_count, reviewed_count, pending_count, progress_pct) for an
authenticated student, plus basic auth/regression checks.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback used only inside test container - never hardcode in production
    BASE_URL = "http://localhost:8001"

STUDENT_EMAIL = "student@test.com"
STUDENT_PASSWORD = "password123"
MARKER_EMAIL = "marker@test.com"
MARKER_PASSWORD = "password123"


# ---- shared fixtures ----
@pytest.fixture(scope="module")
def student_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def marker_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MARKER_EMAIL, "password": MARKER_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json().get("token") or r.json().get("access_token")


# ---- /students/courses enriched response ----
class TestStudentsCoursesEnriched:
    REQUIRED_FIELDS = {
        "id", "name", "code", "description", "year", "semester",
        "leader_id", "leader_name", "student_count",
        "assignments_count", "submitted_count", "reviewed_count",
        "pending_count", "progress_pct",
    }

    def test_returns_list_for_authenticated_student(self, student_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) >= 1, "Student should be enrolled in >=1 course"

    def test_all_required_enriched_fields_present(self, student_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        assert r.status_code == 200
        for course in r.json():
            missing = self.REQUIRED_FIELDS - set(course.keys())
            assert not missing, f"Missing enriched fields {missing} in {course}"

    def test_field_types_and_ranges(self, student_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        for c in r.json():
            assert isinstance(c["assignments_count"], int)
            assert isinstance(c["submitted_count"], int)
            assert isinstance(c["reviewed_count"], int)
            assert isinstance(c["pending_count"], int)
            assert isinstance(c["student_count"], int)
            assert isinstance(c["progress_pct"], int)
            assert 0 <= c["progress_pct"] <= 100
            # submitted cannot exceed assignments
            if c["assignments_count"] > 0:
                assert c["submitted_count"] <= c["assignments_count"]

    def test_progress_pct_math(self, student_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        for c in r.json():
            if c["assignments_count"] > 0:
                expected = int(round((c["submitted_count"] / c["assignments_count"]) * 100))
                assert c["progress_pct"] == expected, f"progress_pct math wrong for {c['code']}"
            else:
                assert c["progress_pct"] == 0

    def test_no_mongo_object_id_leak(self, student_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        for c in r.json():
            assert "_id" not in c

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/students/courses", timeout=30)
        assert r.status_code in (401, 403)

    def test_marker_forbidden(self, marker_token):
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {marker_token}"},
            timeout=30,
        )
        # require_student should reject non-students
        assert r.status_code in (401, 403)


# ---- Regression: critical student flow endpoints still work ----
class TestStudentRegression:
    def test_assignments_listing(self, student_token):
        # Students fetch assignments via courses -> assignments; make sure auth works
        r = requests.get(
            f"{BASE_URL}/api/students/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        assert r.status_code == 200
        courses = r.json()
        if not courses:
            pytest.skip("student has no courses")
        cid = courses[0]["id"]
        r2 = requests.get(
            f"{BASE_URL}/api/assignments?course_id={cid}",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)

    def test_available_courses_endpoint(self, student_token):
        # Manage Courses dialog needs list of available courses
        r = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=30,
        )
        assert r.status_code in (200, 403)  # some apps restrict; main check is no 500
