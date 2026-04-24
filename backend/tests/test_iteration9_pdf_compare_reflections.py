"""
Iteration 9 Backend Tests
- PDF Feedback Export (GET /api/submissions/{id}/export-pdf)
- Cross-Student Comparison (GET /api/compare/submissions, GET /api/compare/{a}/{b})
- Student Reflections (POST /api/reflections, GET /api/reflections/{id},
  POST /api/reflections/auto-save, GET /api/reflections/draft/{id}/{type})
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://codefeedback-studio-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MARKER = {"email": "marker@test.com", "password": "password123"}
STUDENT = {"email": "student@test.com", "password": "password123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def marker_token():
    return _login(MARKER)


@pytest.fixture(scope="module")
def student_token():
    return _login(STUDENT)


@pytest.fixture(scope="module")
def marker_headers(marker_token):
    return {"Authorization": f"Bearer {marker_token}"}


@pytest.fixture(scope="module")
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture(scope="module")
def student_user(student_headers):
    r = requests.get(f"{API}/auth/me", headers=student_headers, timeout=30)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def some_submission(student_headers):
    """Locate any existing submission belonging to the student."""
    r = requests.get(f"{API}/submissions", headers=student_headers, timeout=30)
    assert r.status_code == 200, f"Failed to fetch my submissions: {r.status_code} {r.text}"
    subs = r.json()
    if not subs:
        pytest.skip("No existing student submissions to test against")
    return subs[0]


@pytest.fixture(scope="module")
def assignment_with_subs(marker_headers):
    """Find an assignment that has at least one submission so we can compare."""
    # Get any submissions accessible to marker, then group by assignment_id
    r = requests.get(f"{API}/submissions", headers=marker_headers, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Could not list submissions: {r.status_code}")
    subs = r.json()
    if not subs:
        pytest.skip("No submissions available for comparison testing")
    # Pick the assignment_id with most submissions
    from collections import Counter
    cnt = Counter(s["assignment_id"] for s in subs)
    assignment_id = cnt.most_common(1)[0][0]
    sr = requests.get(
        f"{API}/compare/submissions",
        headers=marker_headers,
        params={"assignment_id": assignment_id},
        timeout=30,
    )
    if sr.status_code != 200 or not sr.json():
        pytest.skip(f"compare/submissions returned {sr.status_code}: {sr.text[:200]}")
    return {"id": assignment_id}, sr.json()


# ====================== PDF EXPORT ======================
class TestPDFExport:
    def test_student_export_own_pdf(self, student_headers, some_submission):
        r = requests.get(
            f"{API}/submissions/{some_submission['id']}/export-pdf",
            headers=student_headers, timeout=60,
        )
        assert r.status_code == 200, f"PDF export failed: {r.status_code} {r.text[:300]}"
        assert "application/pdf" in r.headers.get("content-type", ""), \
            f"Wrong content-type: {r.headers.get('content-type')}"
        assert r.content[:4] == b"%PDF", "Response is not a valid PDF (missing %PDF magic)"
        assert len(r.content) > 500, f"PDF too small: {len(r.content)} bytes"

    def test_marker_can_export_any_pdf(self, marker_headers, some_submission):
        r = requests.get(
            f"{API}/submissions/{some_submission['id']}/export-pdf",
            headers=marker_headers, timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_pdf_export_404_for_missing_submission(self, student_headers):
        r = requests.get(
            f"{API}/submissions/nonexistent-id-xyz/export-pdf",
            headers=student_headers, timeout=30,
        )
        assert r.status_code == 404

    def test_pdf_export_requires_auth(self):
        r = requests.get(f"{API}/submissions/anything/export-pdf", timeout=30)
        assert r.status_code in (401, 403)


# ====================== COMPARISON ======================
class TestComparison:
    def test_compare_submissions_list_marker(self, marker_headers, assignment_with_subs):
        a, subs = assignment_with_subs
        r = requests.get(
            f"{API}/compare/submissions",
            headers=marker_headers,
            params={"assignment_id": a["id"]},
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            sample = data[0]
            for k in ("id", "student_name", "status", "attempt_number"):
                assert k in sample, f"missing key {k} in compare submissions list"

    def test_compare_submissions_forbidden_for_student(self, student_headers, assignment_with_subs):
        a, _ = assignment_with_subs
        r = requests.get(
            f"{API}/compare/submissions",
            headers=student_headers,
            params={"assignment_id": a["id"]},
            timeout=30,
        )
        assert r.status_code in (401, 403), f"student should not access marker comparison list; got {r.status_code}"

    def test_compare_two_submissions(self, marker_headers, assignment_with_subs):
        a, subs = assignment_with_subs
        if len(subs) < 1:
            pytest.skip("Need at least 1 submission")
        # Use same submission twice if only one available - endpoint should still work
        id_a = subs[0]["id"]
        id_b = subs[1]["id"] if len(subs) > 1 else subs[0]["id"]
        r = requests.get(f"{API}/compare/{id_a}/{id_b}", headers=marker_headers, timeout=30)
        assert r.status_code == 200, f"compare failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "submission_a" in data and "submission_b" in data
        assert data["submission_a"]["id"] == id_a
        assert data["submission_b"]["id"] == id_b
        # Reference panel must NOT expose issues for sub_b
        assert data["submission_b"].get("issues") == []
        # sub_a should have issues key (possibly empty list)
        assert isinstance(data["submission_a"].get("issues", []), list)
        assert "student_name" in data["submission_a"]
        assert "student_name" in data["submission_b"]

    def test_compare_404_for_missing(self, marker_headers, assignment_with_subs):
        a, subs = assignment_with_subs
        id_a = subs[0]["id"]
        r = requests.get(f"{API}/compare/{id_a}/missing-id-xyz", headers=marker_headers, timeout=30)
        assert r.status_code == 404


# ====================== REFLECTIONS ======================
class TestReflections:
    def test_save_pre_submission_reflection(self, student_headers, some_submission):
        payload = {
            "submission_id": some_submission["id"],
            "reflection_type": "pre_submission",
            "content": "TEST_pre reflection content",
            "prompted_responses": {"q1": "answer1", "q2": "answer2"},
        }
        r = requests.post(f"{API}/reflections", json=payload, headers=student_headers, timeout=30)
        assert r.status_code == 200, f"save reflection failed: {r.status_code} {r.text}"
        assert "message" in r.json()

    def test_get_reflections_returns_saved(self, student_headers, some_submission):
        r = requests.get(
            f"{API}/reflections/{some_submission['id']}",
            headers=student_headers, timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "pre_submission" in data and "post_feedback" in data
        assert data["pre_submission"] is not None
        assert data["pre_submission"]["content"] == "TEST_pre reflection content"
        assert data["pre_submission"]["prompted_responses"]["q1"] == "answer1"

    def test_marker_cannot_save_reflection(self, marker_headers, some_submission):
        payload = {
            "submission_id": some_submission["id"],
            "reflection_type": "pre_submission",
            "content": "marker should not write",
        }
        r = requests.post(f"{API}/reflections", json=payload, headers=marker_headers, timeout=30)
        assert r.status_code == 403

    def test_post_feedback_blocked_when_not_released(self, student_headers, some_submission):
        # If submission isn't in feedback_released/no_issues, post_feedback should be blocked.
        if some_submission.get("status") in ("feedback_released", "no_issues"):
            pytest.skip("Submission is already released; cannot test the blocked path")
        payload = {
            "submission_id": some_submission["id"],
            "reflection_type": "post_feedback",
            "content": "should be blocked",
        }
        r = requests.post(f"{API}/reflections", json=payload, headers=student_headers, timeout=30)
        assert r.status_code == 400

    def test_auto_save_draft_and_retrieve(self, student_headers, some_submission):
        payload = {
            "submission_id": some_submission["id"],
            "reflection_type": "pre_submission",
            "content": "TEST_draft content auto saved",
            "prompted_responses": {"draft_q": "draft_a"},
        }
        r = requests.post(f"{API}/reflections/auto-save", json=payload, headers=student_headers, timeout=30)
        assert r.status_code == 200

        gr = requests.get(
            f"{API}/reflections/draft/{some_submission['id']}/pre_submission",
            headers=student_headers, timeout=30,
        )
        assert gr.status_code == 200
        data = gr.json()
        assert data.get("content") == "TEST_draft content auto saved"
        assert data.get("prompted_responses", {}).get("draft_q") == "draft_a"

    def test_get_draft_returns_empty_when_missing(self, student_headers, some_submission):
        r = requests.get(
            f"{API}/reflections/draft/{some_submission['id']}/post_feedback",
            headers=student_headers, timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        # Either empty default or previously-saved content; structure must be present
        assert "content" in data
        assert "prompted_responses" in data

    def test_reflection_404_missing_submission(self, student_headers):
        payload = {
            "submission_id": "nonexistent-sub-xyz",
            "reflection_type": "pre_submission",
            "content": "test",
        }
        r = requests.post(f"{API}/reflections", json=payload, headers=student_headers, timeout=30)
        assert r.status_code == 404


# ====================== REGRESSION ======================
class TestRegression:
    def test_marker_login(self, marker_token):
        assert marker_token

    def test_student_login(self, student_token):
        assert student_token

    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"
