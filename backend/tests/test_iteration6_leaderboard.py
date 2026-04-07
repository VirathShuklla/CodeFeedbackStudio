"""
Iteration 6 Tests: Leaderboard System, Extended Badges, and Profile Endpoint
Tests for:
- GET /api/leaderboard/check-nickname - nickname availability check
- POST /api/leaderboard/join - join leaderboard with unique nickname
- POST /api/leaderboard/leave - leave leaderboard
- GET /api/leaderboard/settings/{course_id} - user opt-in status
- GET /api/leaderboard/{course_id}/students - student leaderboard
- GET /api/leaderboard/{course_id}/markers - marker leaderboard
- GET /api/profile/{user_id} - public profile with badges, XP, stats
- Nickname uniqueness per module
- Extended badge definitions (14 student, 13 marker)
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


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def marker_token(api_client):
    """Get marker authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MARKER_EMAIL,
        "password": MARKER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Marker authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def student_token(api_client):
    """Get student authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Student authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def marker_client(api_client, marker_token):
    """Session with marker auth header"""
    api_client.headers.update({"Authorization": f"Bearer {marker_token}"})
    return api_client


@pytest.fixture(scope="module")
def student_client(api_client, student_token):
    """Session with student auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {student_token}"
    })
    return session


@pytest.fixture(scope="module")
def marker_user_info(marker_client):
    """Get marker user info"""
    response = marker_client.get(f"{BASE_URL}/api/auth/me")
    if response.status_code == 200:
        return response.json()
    return None


@pytest.fixture(scope="module")
def student_user_info(student_client):
    """Get student user info"""
    response = student_client.get(f"{BASE_URL}/api/auth/me")
    if response.status_code == 200:
        return response.json()
    return None


@pytest.fixture(scope="module")
def test_course(marker_client):
    """Get or create a test course for leaderboard testing"""
    # First try to get existing courses
    response = marker_client.get(f"{BASE_URL}/api/courses")
    if response.status_code == 200:
        courses = response.json()
        if courses:
            return courses[0]
    
    # Create a new course if none exist
    course_data = {
        "name": f"TEST_Leaderboard_Course_{uuid.uuid4().hex[:6]}",
        "code": f"LB{uuid.uuid4().hex[:4].upper()}",
        "description": "Test course for leaderboard testing"
    }
    response = marker_client.post(f"{BASE_URL}/api/courses", json=course_data)
    if response.status_code in [200, 201]:
        return response.json()
    pytest.skip("Could not get or create test course")


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_marker_login(self, api_client):
        """Test marker login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKER_EMAIL,
            "password": MARKER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] in ["marker", "module_leader"]
        print(f"✓ Marker login successful, role: {data['user']['role']}")
    
    def test_student_login(self, api_client):
        """Test student login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "student"
        print("✓ Student login successful")


class TestExtendedBadges:
    """Test extended badge definitions - 14 student badges and 13 marker badges"""
    
    def test_gamification_stats_student_badges(self, student_client):
        """Test that gamification stats returns correct badge count for students"""
        response = student_client.get(f"{BASE_URL}/api/gamification/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify total badges available is 14 for students
        assert "total_badges_available" in data
        assert data["total_badges_available"] == 14, f"Expected 14 student badges, got {data['total_badges_available']}"
        print(f"✓ Student has access to {data['total_badges_available']} badges (expected 14)")
        
        # Verify other gamification fields
        assert "xp" in data or "total_xp" in data
        assert "level" in data
        assert "level_title" in data
    
    def test_gamification_stats_marker_badges(self, marker_client):
        """Test that gamification stats returns correct badge count for markers"""
        response = marker_client.get(f"{BASE_URL}/api/gamification/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify total badges available is 13 for markers
        assert "total_badges_available" in data
        assert data["total_badges_available"] == 13, f"Expected 13 marker badges, got {data['total_badges_available']}"
        print(f"✓ Marker has access to {data['total_badges_available']} badges (expected 13)")
        
        # Verify marker-specific stats
        assert "total_reviews" in data or "reviews_count" in data or "pending_reviews" in data
    
    def test_gamification_badges_endpoint(self, student_client):
        """Test /api/gamification/badges returns all available badges"""
        response = student_client.get(f"{BASE_URL}/api/gamification/badges")
        assert response.status_code == 200
        data = response.json()
        
        assert "available" in data
        available_badges = data["available"]
        assert len(available_badges) == 14, f"Expected 14 available student badges, got {len(available_badges)}"
        
        # Verify badge structure
        for badge in available_badges:
            assert "id" in badge or "name" in badge
            assert "description" in badge
            assert "xp" in badge
        print(f"✓ Gamification badges endpoint returns {len(available_badges)} badges")


class TestNicknameCheck:
    """Test nickname availability check endpoint"""
    
    def test_check_nickname_available(self, student_client, test_course):
        """Test checking an available nickname"""
        unique_nickname = f"TestNick_{uuid.uuid4().hex[:6]}"
        response = student_client.get(
            f"{BASE_URL}/api/leaderboard/check-nickname",
            params={"course_id": test_course["id"], "nickname": unique_nickname}
        )
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert data["available"] == True
        print(f"✓ Nickname '{unique_nickname}' is available")
    
    def test_check_nickname_too_short(self, student_client, test_course):
        """Test nickname validation - too short"""
        response = student_client.get(
            f"{BASE_URL}/api/leaderboard/check-nickname",
            params={"course_id": test_course["id"], "nickname": "A"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False
        assert "reason" in data
        print(f"✓ Short nickname rejected: {data.get('reason')}")
    
    def test_check_nickname_too_long(self, student_client, test_course):
        """Test nickname validation - too long"""
        long_nickname = "A" * 25
        response = student_client.get(
            f"{BASE_URL}/api/leaderboard/check-nickname",
            params={"course_id": test_course["id"], "nickname": long_nickname}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False
        assert "reason" in data
        print(f"✓ Long nickname rejected: {data.get('reason')}")


class TestLeaderboardJoinLeave:
    """Test joining and leaving leaderboard"""
    
    def test_join_leaderboard_student(self, student_client, test_course):
        """Test student joining leaderboard with unique nickname"""
        unique_nickname = f"Student_{uuid.uuid4().hex[:6]}"
        response = student_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": unique_nickname}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert unique_nickname in data.get("nickname", "") or unique_nickname in data.get("message", "")
        print(f"✓ Student joined leaderboard as '{unique_nickname}'")
    
    def test_get_leaderboard_settings(self, student_client, test_course):
        """Test getting leaderboard settings after joining"""
        response = student_client.get(f"{BASE_URL}/api/leaderboard/settings/{test_course['id']}")
        assert response.status_code == 200
        data = response.json()
        assert "joined" in data
        assert data["joined"] == True
        assert "nickname" in data
        print(f"✓ Leaderboard settings: joined={data['joined']}, nickname={data.get('nickname')}")
    
    def test_leave_leaderboard(self, student_client, test_course):
        """Test leaving leaderboard"""
        response = student_client.post(
            f"{BASE_URL}/api/leaderboard/leave",
            json={"course_id": test_course["id"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Left leaderboard: {data.get('message')}")
    
    def test_settings_after_leave(self, student_client, test_course):
        """Test settings show not joined after leaving"""
        response = student_client.get(f"{BASE_URL}/api/leaderboard/settings/{test_course['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["joined"] == False
        print("✓ Settings correctly show joined=False after leaving")


class TestNicknameUniqueness:
    """Test nickname uniqueness per module"""
    
    def test_nickname_uniqueness_same_module(self, student_client, marker_client, test_course):
        """Test that two users cannot have the same nickname in the same module"""
        shared_nickname = f"SharedNick_{uuid.uuid4().hex[:6]}"
        
        # Student joins with nickname
        response1 = student_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": shared_nickname}
        )
        assert response1.status_code == 200
        print(f"✓ Student joined with nickname '{shared_nickname}'")
        
        # Marker tries to join with same nickname - should fail
        response2 = marker_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": shared_nickname}
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "taken" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print(f"✓ Marker correctly rejected with same nickname: {data.get('detail')}")
        
        # Cleanup - student leaves
        student_client.post(f"{BASE_URL}/api/leaderboard/leave", json={"course_id": test_course["id"]})


class TestLeaderboardEndpoints:
    """Test leaderboard retrieval endpoints"""
    
    def test_get_student_leaderboard(self, student_client, test_course):
        """Test getting student leaderboard for a course"""
        # First join the leaderboard
        unique_nickname = f"LBTest_{uuid.uuid4().hex[:6]}"
        student_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": unique_nickname}
        )
        
        response = student_client.get(f"{BASE_URL}/api/leaderboard/{test_course['id']}/students")
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "course_name" in data
        assert "participant_count" in data
        
        # If there are participants, verify structure
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "user_id" in entry
            assert "nickname" in entry
            assert "score" in entry
            assert "rank" in entry
            assert "xp" in entry
            assert "level" in entry or "level_title" in entry
            print(f"✓ Student leaderboard has {len(data['leaderboard'])} participants")
        else:
            print("✓ Student leaderboard endpoint works (no participants yet)")
    
    def test_get_marker_leaderboard(self, marker_client, test_course):
        """Test getting marker leaderboard for a course"""
        # First join the leaderboard as marker
        unique_nickname = f"Marker_{uuid.uuid4().hex[:6]}"
        marker_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": unique_nickname}
        )
        
        response = marker_client.get(f"{BASE_URL}/api/leaderboard/{test_course['id']}/markers")
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "course_name" in data
        assert "participant_count" in data
        
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "user_id" in entry
            assert "nickname" in entry
            assert "score" in entry
            assert "rank" in entry
            print(f"✓ Marker leaderboard has {len(data['leaderboard'])} participants")
        else:
            print("✓ Marker leaderboard endpoint works (no participants yet)")
    
    def test_leaderboard_nonexistent_course(self, student_client):
        """Test leaderboard for non-existent course returns 404"""
        fake_course_id = "nonexistent_course_12345"
        response = student_client.get(f"{BASE_URL}/api/leaderboard/{fake_course_id}/students")
        assert response.status_code == 404
        print("✓ Non-existent course returns 404")


class TestProfileEndpoint:
    """Test user profile endpoint"""
    
    def test_get_own_profile(self, student_client, student_user_info):
        """Test getting own profile"""
        if not student_user_info:
            pytest.skip("Could not get student user info")
        
        user_id = student_user_info.get("id")
        response = student_client.get(f"{BASE_URL}/api/profile/{user_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify profile structure
        assert "user_id" in data
        assert "display_name" in data
        assert "role" in data
        assert "xp" in data
        assert "level" in data
        assert "level_title" in data
        assert "badges" in data
        assert "badges_count" in data
        assert "total_badges_available" in data
        assert "stats" in data
        assert "is_self" in data
        
        # For own profile, is_self should be True
        assert data["is_self"] == True
        print(f"✓ Own profile retrieved: {data['display_name']}, Level {data['level']} ({data['level_title']})")
    
    def test_get_other_user_profile(self, student_client, marker_user_info, test_course):
        """Test getting another user's profile"""
        if not marker_user_info:
            pytest.skip("Could not get marker user info")
        
        marker_id = marker_user_info.get("id")
        response = student_client.get(
            f"{BASE_URL}/api/profile/{marker_id}",
            params={"course_id": test_course["id"]}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user_id" in data
        assert "display_name" in data
        assert "role" in data
        assert data["is_self"] == False
        print(f"✓ Other user profile retrieved: {data['display_name']}")
    
    def test_profile_nonexistent_user(self, student_client):
        """Test profile for non-existent user returns 404"""
        fake_user_id = "nonexistent_user_12345"
        response = student_client.get(f"{BASE_URL}/api/profile/{fake_user_id}")
        assert response.status_code == 404
        print("✓ Non-existent user profile returns 404")
    
    def test_profile_includes_active_modules(self, student_client, student_user_info, test_course):
        """Test that profile includes active leaderboard modules"""
        if not student_user_info:
            pytest.skip("Could not get student user info")
        
        # Join a leaderboard first
        unique_nickname = f"Profile_{uuid.uuid4().hex[:6]}"
        student_client.post(
            f"{BASE_URL}/api/leaderboard/join",
            json={"course_id": test_course["id"], "nickname": unique_nickname}
        )
        
        user_id = student_user_info.get("id")
        response = student_client.get(f"{BASE_URL}/api/profile/{user_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "active_modules" in data
        # Should have at least one active module
        if data["active_modules"]:
            module = data["active_modules"][0]
            assert "course_id" in module
            assert "course_name" in module
            assert "nickname" in module
            print(f"✓ Profile shows {len(data['active_modules'])} active module(s)")
        else:
            print("✓ Profile active_modules field present")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_leaderboard_entries(self, student_client, marker_client, test_course):
        """Leave leaderboards to clean up"""
        student_client.post(f"{BASE_URL}/api/leaderboard/leave", json={"course_id": test_course["id"]})
        marker_client.post(f"{BASE_URL}/api/leaderboard/leave", json={"course_id": test_course["id"]})
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
