from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import random
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'codefeedback-studio-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="CodeFeedback Studio API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============

# Roles: student, marker, moderator, module_leader
VALID_ROLES = ["student", "marker"]  # Registration roles only - moderator/module_leader assigned through course management

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"
    course_ids: Optional[List[str]] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    course_ids: List[str] = []
    xp: int = 0
    badges: List[str] = []
    created_at: str

class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = ""
    description: Optional[str] = ""
    year: Optional[int] = None
    semester: Optional[str] = ""

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[str] = None
    collaborator_ids: Optional[List[str]] = None
    moderator_ids: Optional[List[str]] = None
    leader_id: Optional[str] = None  # For leadership transfer

class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    year: Optional[int]
    semester: str
    leader_id: str
    leader_name: Optional[str] = None
    collaborator_ids: List[str] = []
    moderator_ids: List[str] = []
    collaborators: Optional[List[dict]] = []
    moderators: Optional[List[dict]] = []
    created_at: str
    student_count: Optional[int] = 0

class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    has_deadline: bool = False  # Yes/No for deadline
    due_date: Optional[str] = None  # Deadline for submissions
    has_schedule_release: bool = False  # Yes/No for scheduled release
    schedule_release_date: Optional[str] = None  # When students can see assignment
    max_attempts: int = -1
    total_marks: int = 100

class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    course_name: Optional[str] = None
    title: str
    description: str
    has_deadline: bool = False
    due_date: Optional[str] = None
    has_schedule_release: bool = False
    schedule_release_date: Optional[str] = None  # When students can see assignment
    is_past_deadline: bool = False
    is_released: bool = True  # Whether students can see this assignment
    max_attempts: int
    total_marks: int = 100
    results_publish_date: Optional[str] = None  # When results are published to all
    results_published: bool = False
    marking_scheme_url: Optional[str] = None
    created_at: str
    submissions_reviewed: int = 0
    total_submissions: int = 0

class SubmissionFileCreate(BaseModel):
    filename: str
    content: str

class SubmissionCreate(BaseModel):
    assignment_id: str
    files: List[SubmissionFileCreate]

class SubmissionFileResponse(BaseModel):
    id: str
    filename: str
    content: str

class SubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    student_name: Optional[str] = None
    files: List[SubmissionFileResponse] = []
    status: str
    attempt_number: int
    previous_submission_id: Optional[str]
    submission_time: str
    issues_count: Optional[int] = 0
    marks: Optional[int] = None
    marks_released: bool = False
    review_completed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    moderation_status: Optional[str] = None  # pending, approved, flagged
    is_latest_attempt: bool = True

class IssueCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class IssueCategoryResponse(BaseModel):
    id: str
    name: str
    description: str

class FeedbackIssueCreate(BaseModel):
    submission_id: str
    file_id: str
    category_id: str
    line_start: int
    line_end: int
    title: str
    explanation: str
    severity: Optional[str] = "moderate"
    suggested_fix: Optional[str] = ""
    reference_links: Optional[List[str]] = []
    verification_criteria: Optional[str] = ""
    marks_deduction: Optional[int] = 0

class FeedbackIssueResponse(BaseModel):
    id: str
    submission_id: str
    file_id: str
    filename: Optional[str] = None
    marker_id: str
    marker_name: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    line_start: int
    line_end: int
    title: str
    explanation: str
    severity: str
    suggested_fix: str
    reference_links: List[str]
    student_status: str
    verification_criteria: str
    marks_deduction: int = 0
    created_at: str
    resolution_timestamp: Optional[str] = None

# Moderation models
class ModerationIssueCreate(BaseModel):
    submission_id: str
    issue_description: str
    severity: str = "moderate"

class ModerationIssueResponse(BaseModel):
    id: str
    submission_id: str
    moderator_id: str
    moderator_name: Optional[str] = None
    marker_id: str
    marker_name: Optional[str] = None
    issue_description: str
    severity: str
    status: str  # open, resolved, discarded
    leader_response: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None

class IssueTemplateCreate(BaseModel):
    title: str
    explanation: str
    category_id: str
    severity: str = "moderate"
    suggested_fix: Optional[str] = ""
    marks_deduction: int = 0
    course_id: Optional[str] = None

class IssueTemplateResponse(BaseModel):
    id: str
    title: str
    explanation: str
    category_id: str
    category_name: Optional[str] = None
    severity: str
    suggested_fix: str
    marks_deduction: int
    created_by: str
    usage_count: int = 0
    course_id: Optional[str] = None

class GradeSubmissionRequest(BaseModel):
    marks: int
    feedback: Optional[str] = ""

class MarkNoIssuesRequest(BaseModel):
    submission_id: str
    marker_comment: Optional[str] = ""

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def parse_iso_datetime(iso_string: str) -> datetime:
    if not iso_string:
        return None
    try:
        if iso_string.endswith('Z'):
            iso_string = iso_string[:-1] + '+00:00'
        dt = datetime.fromisoformat(iso_string)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None

def is_past_deadline(due_date_str: Optional[str]) -> bool:
    if not due_date_str:
        return False
    deadline = parse_iso_datetime(due_date_str)
    if not deadline:
        return False
    return datetime.now(timezone.utc) > (deadline + timedelta(minutes=1))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_jwt_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if "course_ids" not in user:
        user["course_ids"] = [user.get("course_id")] if user.get("course_id") else []
    return user

async def require_marker(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["marker", "moderator", "module_leader"]:
        raise HTTPException(status_code=403, detail="Marker access required")
    return current_user

async def require_moderator(current_user: dict = Depends(get_current_user)):
    # Allow markers who are course leaders to access moderation for their courses
    if current_user["role"] not in ["moderator", "module_leader", "marker"]:
        raise HTTPException(status_code=403, detail="Moderator access required")
    return current_user

async def require_module_leader(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "module_leader":
        raise HTTPException(status_code=403, detail="Module leader access required")
    return current_user

async def require_student(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

# ============ PERMISSION HELPERS ============

async def can_access_course(user: dict, course_id: str) -> bool:
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        return False
    if user["role"] == "module_leader":
        return course.get("leader_id") == user["id"]
    elif user["role"] == "moderator":
        return user["id"] in course.get("moderator_ids", []) or course.get("leader_id") == user["id"]
    elif user["role"] == "marker":
        return course.get("leader_id") == user["id"] or user["id"] in course.get("collaborator_ids", [])
    elif user["role"] == "student":
        return course_id in user.get("course_ids", [])
    return False

async def is_course_leader(user: dict, course_id: str) -> bool:
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return course and course.get("leader_id") == user["id"]

async def get_accessible_course_ids(user: dict) -> List[str]:
    if user["role"] == "module_leader":
        courses = await db.courses.find({"leader_id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
        return [c["id"] for c in courses]
    elif user["role"] == "moderator":
        courses = await db.courses.find({
            "$or": [{"leader_id": user["id"]}, {"moderator_ids": user["id"]}]
        }, {"_id": 0, "id": 1}).to_list(100)
        return [c["id"] for c in courses]
    elif user["role"] == "marker":
        courses = await db.courses.find({
            "$or": [{"leader_id": user["id"]}, {"collaborator_ids": user["id"]}]
        }, {"_id": 0, "id": 1}).to_list(100)
        return [c["id"] for c in courses]
    elif user["role"] == "student":
        return user.get("course_ids", [])
    return []

# ============ BADGE SYSTEM ============

# Student badges
STUDENT_BADGES = {
    "first_submission": {"name": "First Steps", "description": "Submit your first assignment", "icon": "rocket", "xp": 50},
    "bug_squasher": {"name": "Bug Squasher", "description": "Fix 10 issues across your submissions", "icon": "bug", "xp": 100},
    "quick_learner": {"name": "Quick Learner", "description": "Fix an issue within 24 hours of feedback", "icon": "zap", "xp": 75},
    "perfectionist": {"name": "Perfectionist", "description": "Get a submission marked with no issues", "icon": "star", "xp": 150},
    "consistent": {"name": "Consistent Performer", "description": "Submit 5 assignments on time", "icon": "calendar", "xp": 100},
    "improver": {"name": "Rapid Improver", "description": "Improve score by 20% on resubmission", "icon": "trending-up", "xp": 125},
    "streak_warrior": {"name": "Streak Warrior", "description": "Submit 3 assignments on time in a row", "icon": "flame", "xp": 80},
    "early_bird": {"name": "Early Bird", "description": "Submit an assignment 24 hours before deadline", "icon": "sunrise", "xp": 60},
    "feedback_engaged": {"name": "Feedback Champion", "description": "Fix at least 80% of all issues raised on your work", "icon": "message-circle", "xp": 120},
    "zero_to_hero": {"name": "Zero to Hero", "description": "Fix every single issue in a submission", "icon": "trophy", "xp": 100},
    "five_star": {"name": "Five Star Coder", "description": "Get 5 perfect submissions with no issues", "icon": "stars", "xp": 200},
    "multi_module": {"name": "Multi-Talented", "description": "Be active in 3 or more modules", "icon": "layers", "xp": 90},
    "tenacious": {"name": "Tenacious", "description": "Resubmit and improve your score 3 times", "icon": "repeat", "xp": 110},
    "centurion": {"name": "Centurion", "description": "Earn a total of 500 XP", "icon": "shield", "xp": 75},
}

# Marker badges
MARKER_BADGES = {
    "first_review": {"name": "First Review", "description": "Complete your first code review", "icon": "check", "xp": 50},
    "speed_reviewer": {"name": "Speed Reviewer", "description": "Review 10 submissions within deadline", "icon": "zap", "xp": 100},
    "thorough_reviewer": {"name": "Thorough Reviewer", "description": "Provide detailed feedback on 20 submissions", "icon": "search", "xp": 150},
    "mentor": {"name": "Mentor", "description": "Help 5 students achieve perfect scores", "icon": "award", "xp": 200},
    "consistent_marker": {"name": "Consistent Marker", "description": "Maintain 95% moderation approval rate", "icon": "target", "xp": 175},
    "on_time_champion": {"name": "On-Time Champion", "description": "Review all assignments before deadline for a course", "icon": "clock", "xp": 150},
    "feedback_master": {"name": "Feedback Master", "description": "Create 10 reusable feedback templates", "icon": "file-text", "xp": 100},
    "detail_oriented": {"name": "Detail Oriented", "description": "Average 3+ issues per review on at least 10 reviews", "icon": "eye", "xp": 125},
    "turnaround_king": {"name": "Quick Turnaround", "description": "Review 5 submissions within 48 hours of submission", "icon": "timer", "xp": 110},
    "multi_course": {"name": "Multi-Course Expert", "description": "Actively review in 3 or more courses", "icon": "layers", "xp": 90},
    "quality_guardian": {"name": "Quality Guardian", "description": "Achieve 100% moderation approval on 10+ reviews", "icon": "shield-check", "xp": 200},
    "century_reviewer": {"name": "Century Reviewer", "description": "Complete 100 code reviews", "icon": "hash", "xp": 250},
    "template_architect": {"name": "Template Architect", "description": "Create 20 reusable feedback templates", "icon": "blocks", "xp": 150},
}

LEVEL_THRESHOLDS = [
    (1, 0, "Novice"), (2, 100, "Beginner"), (3, 300, "Learner"),
    (4, 600, "Practitioner"), (5, 1000, "Competent"), (6, 1500, "Proficient"),
    (7, 2200, "Advanced"), (8, 3000, "Expert"), (9, 4000, "Master"),
    (10, 5200, "Grandmaster"),
]

def get_level_info(xp: int) -> tuple:
    level, title = 1, "Novice"
    current_threshold = 0
    next_level_xp = 100
    
    for lvl, threshold, lvl_title in LEVEL_THRESHOLDS:
        if xp >= threshold:
            level, title = lvl, lvl_title
            current_threshold = threshold
    
    for lvl, threshold, _ in LEVEL_THRESHOLDS:
        if threshold > xp:
            next_level_xp = threshold - xp
            break
    else:
        next_level_xp = 0
    
    return level, title, next_level_xp

async def award_badge(user_id: str, badge_id: str, badge_type: str = "student") -> dict:
    """Award a badge to a user. Returns badge info if awarded, None if already had."""
    badges = STUDENT_BADGES if badge_type == "student" else MARKER_BADGES
    if badge_id not in badges:
        return None
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or badge_id in user.get("badges", []):
        return None  # Already has badge or user not found
    
    badge = badges[badge_id]
    
    # Atomically update user
    await db.users.update_one(
        {"id": user_id, "badges": {"$ne": badge_id}},  # Prevent duplicates
        {"$addToSet": {"badges": badge_id}, "$inc": {"xp": badge["xp"]}}
    )
    
    # Create notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "badge_earned",
        "title": f"Badge Earned: {badge['name']}",
        "message": badge["description"],
        "xp_gained": badge["xp"],
        "badge_id": badge_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Log XP gain
    await db.xp_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "xp_gained": badge["xp"],
        "reason": f"Badge: {badge['name']}",
        "event_type": "badge_earned",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"badge_id": badge_id, "badge": badge, "xp_gained": badge["xp"]}

async def award_xp(user_id: str, xp_amount: int, reason: str, event_type: str = "action") -> int:
    """Award XP to a user and log it. Returns new total XP."""
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"xp": xp_amount}}
    )
    
    # Log XP gain
    await db.xp_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "xp_gained": xp_amount,
        "reason": reason,
        "event_type": event_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "xp": 1})
    return user.get("xp", 0) if user else 0

async def check_and_award_student_badges(user_id: str):
    """Check all student badge conditions and award any earned badges."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get("role") != "student":
        return []
    
    awarded = []
    
    # Get user stats
    submissions = await db.submissions.find({"student_id": user_id}, {"_id": 0}).to_list(500)
    sub_ids = [s["id"] for s in submissions]
    all_issues = await db.feedback_issues.find(
        {"submission_id": {"$in": sub_ids}}, {"_id": 0}
    ).to_list(1000)
    
    fixed_issues = [i for i in all_issues if i.get("student_status") == "fixed"]
    no_issue_submissions = [s for s in submissions if s.get("status") == "no_issues"]
    on_time_submissions = [s for s in submissions if s.get("status") in ["feedback_released", "no_issues"]]
    
    async def try_award(badge_id):
        r = await award_badge(user_id, badge_id, "student")
        if r:
            awarded.append(r)
    
    # first_submission
    if len(submissions) >= 1:
        await try_award("first_submission")
    
    # bug_squasher - Fix 10 issues
    if len(fixed_issues) >= 10:
        await try_award("bug_squasher")
    
    # perfectionist - No issues submission
    if len(no_issue_submissions) >= 1:
        await try_award("perfectionist")
    
    # consistent - 5 on-time
    if len(on_time_submissions) >= 5:
        await try_award("consistent")
    
    # streak_warrior - 3 consecutive on-time (check last 3 submissions)
    if len(on_time_submissions) >= 3:
        sorted_subs = sorted(submissions, key=lambda s: s.get("submission_time", ""))
        streak = 0
        for s in sorted_subs:
            if s.get("status") in ["feedback_released", "no_issues"]:
                streak += 1
                if streak >= 3:
                    await try_award("streak_warrior")
                    break
            else:
                streak = 0
    
    # early_bird - Submit 24h before deadline (batch fetch assignments)
    assignment_ids = list(set(s["assignment_id"] for s in submissions))
    assignments_for_badges = await db.assignments.find(
        {"id": {"$in": assignment_ids}},
        {"_id": 0, "id": 1, "due_date": 1, "has_deadline": 1}
    ).to_list(len(assignment_ids))
    assignments_badge_map = {a["id"]: a for a in assignments_for_badges}
    
    for s in submissions:
        assignment = assignments_badge_map.get(s["assignment_id"])
        if assignment and assignment.get("has_deadline") and assignment.get("due_date"):
            deadline = parse_iso_datetime(assignment["due_date"])
            sub_time = parse_iso_datetime(s.get("submission_time", ""))
            if deadline and sub_time and (deadline - sub_time).total_seconds() >= 86400:
                await try_award("early_bird")
                break
    
    # feedback_engaged - Fix 80%+ of issues
    if len(all_issues) >= 5:
        fix_rate = len(fixed_issues) / len(all_issues)
        if fix_rate >= 0.8:
            await try_award("feedback_engaged")
    
    # zero_to_hero - Fix ALL issues in a single submission
    for sid in sub_ids:
        sub_issues = [i for i in all_issues if i["submission_id"] == sid]
        if len(sub_issues) >= 2 and all(i.get("student_status") == "fixed" for i in sub_issues):
            await try_award("zero_to_hero")
            break
    
    # five_star - 5 perfect submissions
    if len(no_issue_submissions) >= 5:
        await try_award("five_star")
    
    # multi_module - Active in 3+ modules
    course_ids = user.get("course_ids", [])
    if len(course_ids) >= 3:
        active_count = 0
        for cid in course_ids:
            has_sub = await db.submissions.count_documents({
                "student_id": user_id,
                "assignment_id": {"$in": [a["id"] async for a in db.assignments.find({"course_id": cid}, {"id": 1})]}
            })
            if has_sub > 0:
                active_count += 1
        if active_count >= 3:
            await try_award("multi_module")
    
    # tenacious - Resubmit and improve 3 times
    improved_count = 0
    assignments_seen = set()
    for s in sorted(submissions, key=lambda x: x.get("attempt_number", 0)):
        if s.get("attempt_number", 1) > 1 and s["assignment_id"] not in assignments_seen:
            prev = [p for p in submissions if p["assignment_id"] == s["assignment_id"] and p.get("attempt_number", 0) < s.get("attempt_number", 0)]
            if prev and s.get("marks") is not None:
                best_prev = max((p.get("marks") or 0) for p in prev)
                if (s.get("marks") or 0) > best_prev:
                    improved_count += 1
                    assignments_seen.add(s["assignment_id"])
    if improved_count >= 3:
        await try_award("tenacious")
    
    # centurion - Earn 500+ XP
    if user.get("xp", 0) >= 500:
        await try_award("centurion")
    
    return awarded

async def check_and_award_marker_badges(user_id: str):
    """Check all marker badge conditions and award any earned badges."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get("role") == "student":
        return []
    
    awarded = []
    
    async def try_award(badge_id):
        r = await award_badge(user_id, badge_id, "marker")
        if r:
            awarded.append(r)
    
    # Get marker stats
    reviews_count = await db.submissions.count_documents({"reviewed_by": user_id})
    templates_count = await db.issue_templates.count_documents({"created_by": user_id})
    issues_created = await db.feedback_issues.count_documents({"marker_id": user_id})
    
    # Perfect score reviews (mentor badge)
    perfect_reviews = await db.submissions.count_documents({
        "reviewed_by": user_id,
        "status": "no_issues"
    })
    
    # first_review
    if reviews_count >= 1:
        await try_award("first_review")
    
    # speed_reviewer - 10 submissions
    if reviews_count >= 10:
        await try_award("speed_reviewer")
    
    # thorough_reviewer - 20 detailed feedbacks
    if issues_created >= 20:
        await try_award("thorough_reviewer")
    
    # feedback_master - 10 templates
    if templates_count >= 10:
        await try_award("feedback_master")
    
    # mentor - 5 perfect score students
    if perfect_reviews >= 5:
        await try_award("mentor")
    
    # detail_oriented - Avg 3+ issues per review on 10+ reviews
    if reviews_count >= 10 and issues_created >= reviews_count * 3:
        await try_award("detail_oriented")
    
    # turnaround_king - Review 5 within 48h of submission
    quick_reviews = 0
    reviewed_subs = await db.submissions.find(
        {"reviewed_by": user_id, "review_completed_at": {"$exists": True}},
        {"_id": 0, "submission_time": 1, "review_completed_at": 1}
    ).to_list(200)
    for rs in reviewed_subs:
        sub_time = parse_iso_datetime(rs.get("submission_time", ""))
        rev_time = parse_iso_datetime(rs.get("review_completed_at", ""))
        if sub_time and rev_time and (rev_time - sub_time).total_seconds() <= 172800:
            quick_reviews += 1
    if quick_reviews >= 5:
        await try_award("turnaround_king")
    
    # multi_course - Review in 3+ courses
    reviewed_assignment_ids = await db.submissions.distinct("assignment_id", {"reviewed_by": user_id})
    if reviewed_assignment_ids:
        reviewed_courses = await db.assignments.distinct("course_id", {"id": {"$in": reviewed_assignment_ids}})
        if len(reviewed_courses) >= 3:
            await try_award("multi_course")
    
    # quality_guardian - 100% moderation approval on 10+ reviews
    approved_count = await db.submissions.count_documents({"reviewed_by": user_id, "moderation_status": "approved"})
    flagged_count = await db.submissions.count_documents({"reviewed_by": user_id, "moderation_status": {"$in": ["flagged", "flagged_approved"]}})
    if approved_count >= 10 and flagged_count == 0:
        await try_award("quality_guardian")
    
    # century_reviewer - 100 reviews
    if reviews_count >= 100:
        await try_award("century_reviewer")
    
    # template_architect - 20 templates
    if templates_count >= 20:
        await try_award("template_architect")
    
    return awarded

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    if user_data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {VALID_ROLES}")
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    course_ids = user_data.course_ids or []
    if user_data.role == "student" and course_ids:
        for cid in course_ids:
            course = await db.courses.find_one({"id": cid}, {"_id": 0})
            if not course:
                raise HTTPException(status_code=400, detail=f"Course {cid} does not exist")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id, "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name, "role": user_data.role,
        "course_ids": course_ids if user_data.role == "student" else [],
        "xp": 0, "badges": [], "created_at": now
    }
    await db.users.insert_one(user_doc)
    return UserResponse(**{k: v for k, v in user_doc.items() if k != "password_hash"})

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})

# ============ PUBLIC ENDPOINTS ============

@api_router.get("/public/courses")
async def get_courses_public():
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    result = []
    for c in courses:
        if "leader_id" not in c:
            continue
        student_count = await db.users.count_documents({"role": "student", "course_ids": c["id"]})
        leader = await db.users.find_one({"id": c.get("leader_id")}, {"_id": 0})
        result.append({
            "id": c["id"], "name": c["name"], "code": c.get("code", ""),
            "description": c.get("description", ""), "year": c.get("year"),
            "semester": c.get("semester", ""), "leader_id": c.get("leader_id", ""),
            "leader_name": leader["full_name"] if leader else "Unknown",
            "created_at": c.get("created_at", ""), "student_count": student_count
        })
    return result

@api_router.get("/public/users")
async def get_users_public():
    users = await db.users.find({"role": {"$ne": "student"}}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [{"id": u["id"], "full_name": u["full_name"], "email": u["email"], "role": u["role"]} for u in users]

# ============ COURSE ENDPOINTS ============

@api_router.post("/courses")
async def create_course(course_data: CourseCreate, current_user: dict = Depends(require_marker)):
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # Creator becomes module_leader for this course
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"role": "module_leader"}})
    course_doc = {
        "id": course_id, "name": course_data.name, "code": course_data.code or "",
        "description": course_data.description or "", "year": course_data.year,
        "semester": course_data.semester or "", "leader_id": current_user["id"],
        "collaborator_ids": [], "moderator_ids": [], "created_at": now
    }
    await db.courses.insert_one(course_doc)
    # Return without _id
    return {
        "id": course_id, "name": course_data.name, "code": course_data.code or "",
        "description": course_data.description or "", "year": course_data.year,
        "semester": course_data.semester or "", "leader_id": current_user["id"],
        "leader_name": current_user["full_name"], "collaborator_ids": [], "moderator_ids": [],
        "collaborators": [], "moderators": [], "created_at": now, "student_count": 0
    }

@api_router.get("/courses")
async def get_courses(current_user: dict = Depends(get_current_user)):
    course_ids = await get_accessible_course_ids(current_user)
    if not course_ids:
        if current_user["role"] == "student":
            return []
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    else:
        courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(100)
    
    result = []
    
    # Batch: collect all user IDs and student counts in bulk
    all_user_ids = set()
    course_ids_list = []
    for c in courses:
        if "leader_id" not in c:
            continue
        course_ids_list.append(c["id"])
        if c.get("leader_id"):
            all_user_ids.add(c["leader_id"])
        all_user_ids.update(c.get("collaborator_ids", []))
        all_user_ids.update(c.get("moderator_ids", []))
    
    # Single bulk query for all users
    users_map = {}
    if all_user_ids:
        all_users = await db.users.find({"id": {"$in": list(all_user_ids)}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(len(all_user_ids))
        users_map = {u["id"]: u for u in all_users}
    
    # Aggregate student counts per course in one query
    student_counts_map = {}
    if course_ids_list:
        pipeline = [
            {"$match": {"role": "student", "course_ids": {"$in": course_ids_list}}},
            {"$unwind": "$course_ids"},
            {"$match": {"course_ids": {"$in": course_ids_list}}},
            {"$group": {"_id": "$course_ids", "count": {"$sum": 1}}}
        ]
        counts = await db.users.aggregate(pipeline).to_list(len(course_ids_list))
        student_counts_map = {c["_id"]: c["count"] for c in counts}
    
    for c in courses:
        if "leader_id" not in c:
            continue
        leader = users_map.get(c.get("leader_id"))
        collaborators = [{"id": cid, "name": users_map[cid]["full_name"]} for cid in c.get("collaborator_ids", []) if cid in users_map]
        moderators = [{"id": mid, "name": users_map[mid]["full_name"]} for mid in c.get("moderator_ids", []) if mid in users_map]
        result.append({
            "id": c["id"], "name": c["name"], "code": c.get("code", ""),
            "description": c.get("description", ""), "year": c.get("year"),
            "semester": c.get("semester", ""), "leader_id": c.get("leader_id", ""),
            "leader_name": leader["full_name"] if leader else "Unknown",
            "collaborator_ids": c.get("collaborator_ids", []),
            "moderator_ids": c.get("moderator_ids", []),
            "collaborators": collaborators, "moderators": moderators,
            "created_at": c.get("created_at", ""), "student_count": student_counts_map.get(c["id"], 0)
        })
    return result

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    leader = await db.users.find_one({"id": course.get("leader_id")}, {"_id": 0})
    student_count = await db.users.count_documents({"role": "student", "course_ids": course_id})
    
    # Get collaborator details
    collaborators = []
    for cid in course.get("collaborator_ids", []):
        collab = await db.users.find_one({"id": cid}, {"_id": 0, "id": 1, "full_name": 1, "email": 1})
        if collab:
            collaborators.append({"id": collab["id"], "name": collab["full_name"], "email": collab.get("email", "")})
    
    # Get moderator details
    moderators = []
    for mid in course.get("moderator_ids", []):
        mod = await db.users.find_one({"id": mid}, {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1})
        if mod:
            moderators.append({"id": mod["id"], "name": mod["full_name"], "email": mod.get("email", ""), "role": mod.get("role", "marker")})
    
    return {
        **course, 
        "leader_name": leader["full_name"] if leader else "Unknown", 
        "student_count": student_count,
        "collaborators": collaborators,
        "moderators": moderators
    }

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, course_data: CourseUpdate, current_user: dict = Depends(require_marker)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.get("leader_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only course leader can update")
    
    update_doc = {}
    if course_data.name is not None:
        update_doc["name"] = course_data.name
    if course_data.code is not None:
        update_doc["code"] = course_data.code
    if course_data.collaborator_ids is not None:
        update_doc["collaborator_ids"] = course_data.collaborator_ids
    if course_data.moderator_ids is not None:
        update_doc["moderator_ids"] = course_data.moderator_ids
        # Update role of moderators to 'moderator' if they are currently 'marker'
        for mod_id in course_data.moderator_ids:
            user = await db.users.find_one({"id": mod_id}, {"_id": 0, "role": 1})
            if user and user.get("role") == "marker":
                await db.users.update_one({"id": mod_id}, {"$set": {"role": "moderator"}})
    
    # Handle leadership transfer
    if course_data.leader_id is not None and course_data.leader_id != course.get("leader_id"):
        new_leader = await db.users.find_one({"id": course_data.leader_id}, {"_id": 0})
        if not new_leader:
            raise HTTPException(status_code=400, detail="New leader not found")
        if new_leader.get("role") == "student":
            raise HTTPException(status_code=400, detail="Students cannot be course leaders")
        
        # Update new leader's role to module_leader
        await db.users.update_one({"id": course_data.leader_id}, {"$set": {"role": "module_leader"}})
        
        # Add current leader as collaborator (unless they're already)
        current_collaborators = course.get("collaborator_ids", [])
        if current_user["id"] not in current_collaborators:
            current_collaborators.append(current_user["id"])
        
        # Remove new leader from collaborators/moderators if they were there
        current_collaborators = [c for c in current_collaborators if c != course_data.leader_id]
        current_moderators = [m for m in course.get("moderator_ids", []) if m != course_data.leader_id]
        
        update_doc["leader_id"] = course_data.leader_id
        update_doc["collaborator_ids"] = current_collaborators
        update_doc["moderator_ids"] = current_moderators
    
    if update_doc:
        await db.courses.update_one({"id": course_id}, {"$set": update_doc})
    return await get_course(course_id, current_user)

# ============ STUDENT ENROLLMENT ============

@api_router.post("/students/enroll/{course_id}")
async def enroll_in_course(course_id: str, current_user: dict = Depends(require_student)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course_id in current_user.get("course_ids", []):
        raise HTTPException(status_code=400, detail="Already enrolled")
    await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"course_ids": course_id}})
    return {"message": f"Enrolled in {course['name']}", "course_id": course_id}

@api_router.delete("/students/enroll/{course_id}")
async def unenroll_from_course(course_id: str, current_user: dict = Depends(require_student)):
    await db.users.update_one({"id": current_user["id"]}, {"$pull": {"course_ids": course_id}})
    return {"message": "Unenrolled", "course_id": course_id}

@api_router.get("/students/courses")
async def get_enrolled_courses(current_user: dict = Depends(require_student)):
    course_ids = current_user.get("course_ids", [])
    if not course_ids:
        return []
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(100)
    result = []
    for c in courses:
        leader = await db.users.find_one({"id": c.get("leader_id")}, {"_id": 0})
        result.append({
            "id": c["id"], "name": c["name"], "code": c.get("code", ""),
            "leader_name": leader["full_name"] if leader else "Unknown",
            "created_at": c.get("created_at", "")
        })
    return result

# ============ ASSIGNMENT ENDPOINTS ============

@api_router.post("/assignments")
async def create_assignment(assignment_data: AssignmentCreate, current_user: dict = Depends(require_marker)):
    course = await db.courses.find_one({"id": assignment_data.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.get("leader_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only course leader can create assignments")
    
    assignment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine if assignment is released to students
    is_released = True
    schedule_release_date = None
    if assignment_data.has_schedule_release and assignment_data.schedule_release_date:
        schedule_release_date = assignment_data.schedule_release_date
        release_dt = datetime.fromisoformat(schedule_release_date.replace('Z', '+00:00'))
        is_released = datetime.now(timezone.utc) >= release_dt
    
    # Handle deadline
    due_date = None
    if assignment_data.has_deadline and assignment_data.due_date:
        due_date = assignment_data.due_date
    
    assignment_doc = {
        "id": assignment_id, "course_id": assignment_data.course_id,
        "title": assignment_data.title, "description": assignment_data.description or "",
        "has_deadline": assignment_data.has_deadline,
        "due_date": due_date,
        "has_schedule_release": assignment_data.has_schedule_release,
        "schedule_release_date": schedule_release_date,
        "max_attempts": assignment_data.max_attempts,
        "total_marks": assignment_data.total_marks,
        "results_publish_date": None,  # Set when publishing results
        "results_published": False,
        "marking_scheme_url": None, "created_at": now
    }
    await db.assignments.insert_one(assignment_doc)
    return {
        "id": assignment_id, "course_id": assignment_data.course_id,
        "title": assignment_data.title, "description": assignment_data.description or "",
        "has_deadline": assignment_data.has_deadline,
        "due_date": due_date,
        "has_schedule_release": assignment_data.has_schedule_release,
        "schedule_release_date": schedule_release_date,
        "max_attempts": assignment_data.max_attempts,
        "total_marks": assignment_data.total_marks,
        "results_publish_date": None,
        "results_published": False,
        "marking_scheme_url": None, "created_at": now,
        "course_name": course["name"], "is_past_deadline": False, "is_released": is_released,
        "submissions_reviewed": 0, "total_submissions": 0
    }

@api_router.post("/assignments/{assignment_id}/marking-scheme")
async def upload_marking_scheme(assignment_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_marker)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Save file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    filename = f"{assignment_id}_scheme.{file_ext}"
    file_path = UPLOAD_DIR / filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    await db.assignments.update_one({"id": assignment_id}, {"$set": {"marking_scheme_url": f"/api/files/{filename}"}})
    return {"message": "Marking scheme uploaded", "url": f"/api/files/{filename}"}

class PublishResultsRequest(BaseModel):
    publish_date: str  # ISO datetime when results should be published

@api_router.post("/assignments/{assignment_id}/publish-results")
async def publish_assignment_results(assignment_id: str, request: PublishResultsRequest, current_user: dict = Depends(require_marker)):
    """Publish results for all students in an assignment at a specific date/time"""
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course.get("leader_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only course leader can publish results")
    
    # Get submission stats
    total_subs = await db.submissions.count_documents({"assignment_id": assignment_id})
    reviewed_subs = await db.submissions.count_documents({
        "assignment_id": assignment_id,
        "status": {"$in": ["feedback_released", "no_issues"]}
    })
    
    all_reviewed = reviewed_subs >= total_subs if total_subs > 0 else False
    warning = None
    if not all_reviewed:
        warning = f"Warning: Only {reviewed_subs} of {total_subs} submissions have been reviewed."
    
    # Update assignment with publish date
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": {
            "results_publish_date": request.publish_date,
            "results_published": False  # Will be True when the date passes
        }}
    )
    
    # Mark all submissions as having results scheduled
    await db.submissions.update_many(
        {"assignment_id": assignment_id},
        {"$set": {"results_scheduled": request.publish_date}}
    )
    
    return {
        "message": "Results publication scheduled",
        "publish_date": request.publish_date,
        "submissions_reviewed": reviewed_subs,
        "total_submissions": total_subs,
        "all_reviewed": all_reviewed,
        "warning": warning
    }

@api_router.get("/assignments/{assignment_id}/review-status")
async def get_assignment_review_status(assignment_id: str, current_user: dict = Depends(require_marker)):
    """Get detailed review status for an assignment"""
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    submissions = await db.submissions.find({"assignment_id": assignment_id}, {"_id": 0}).to_list(500)
    
    reviewed = []
    pending = []
    for sub in submissions:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        sub_info = {
            "id": sub["id"],
            "student_name": student.get("full_name", "Unknown") if student else "Unknown",
            "student_email": student.get("email", "") if student else "",
            "status": sub.get("status", "pending"),
            "marks": sub.get("marks"),
            "submitted_at": sub.get("submission_time")
        }
        if sub.get("status") in ["feedback_released", "no_issues"]:
            reviewed.append(sub_info)
        else:
            pending.append(sub_info)
    
    return {
        "assignment_id": assignment_id,
        "total_submissions": len(submissions),
        "reviewed_count": len(reviewed),
        "pending_count": len(pending),
        "reviewed_submissions": reviewed,
        "pending_submissions": pending,
        "results_publish_date": assignment.get("results_publish_date"),
        "results_published": assignment.get("results_published", False)
    }

@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@api_router.get("/assignments")
async def get_assignments(course_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if course_id:
        query["course_id"] = course_id
    else:
        course_ids = await get_accessible_course_ids(current_user)
        if course_ids:
            query["course_id"] = {"$in": course_ids}
    
    assignments = await db.assignments.find(query, {"_id": 0}).to_list(100)
    result = []
    now = datetime.now(timezone.utc)
    
    # Batch: pre-fetch all submission counts and courses
    assignment_ids_for_stats = [a["id"] for a in assignments]
    course_ids_for_stats = list(set(a.get("course_id") for a in assignments if a.get("course_id")))
    
    # Aggregate submission counts per assignment
    sub_counts_map = {}
    reviewed_counts_map = {}
    if assignment_ids_for_stats:
        all_sub_counts = await db.submissions.aggregate([
            {"$match": {"assignment_id": {"$in": assignment_ids_for_stats}}},
            {"$group": {
                "_id": "$assignment_id",
                "total": {"$sum": 1},
                "reviewed": {"$sum": {"$cond": [{"$in": ["$status", ["feedback_released", "no_issues"]]}, 1, 0]}}
            }}
        ]).to_list(len(assignment_ids_for_stats))
        for sc in all_sub_counts:
            sub_counts_map[sc["_id"]] = sc["total"]
            reviewed_counts_map[sc["_id"]] = sc["reviewed"]
    
    # Bulk fetch courses
    courses_for_assignments = {}
    if course_ids_for_stats:
        courses_list = await db.courses.find({"id": {"$in": course_ids_for_stats}}, {"_id": 0, "id": 1, "name": 1}).to_list(len(course_ids_for_stats))
        courses_for_assignments = {c["id"]: c for c in courses_list}
    
    for a in assignments:
        # Check if assignment is released to students
        is_released = True
        if a.get("has_schedule_release") and a.get("schedule_release_date"):
            release_dt = datetime.fromisoformat(a["schedule_release_date"].replace('Z', '+00:00'))
            is_released = now >= release_dt
        
        # For students, only show released assignments
        if current_user["role"] == "student" and not is_released:
            continue
        
        # Check if results are published
        results_published = a.get("results_published", False)
        if a.get("results_publish_date"):
            publish_dt = datetime.fromisoformat(a["results_publish_date"].replace('Z', '+00:00'))
            if now >= publish_dt:
                results_published = True
                if not a.get("results_published"):
                    await db.assignments.update_one({"id": a["id"]}, {"$set": {"results_published": True}})
        
        course = courses_for_assignments.get(a.get("course_id"))
        result.append({
            **a, 
            "has_deadline": a.get("has_deadline", False),
            "has_schedule_release": a.get("has_schedule_release", False),
            "course_name": course["name"] if course else "Unknown",
            "is_past_deadline": is_past_deadline(a.get("due_date")) if a.get("has_deadline") else False,
            "is_released": is_released,
            "submissions_reviewed": reviewed_counts_map.get(a["id"], 0),
            "total_submissions": sub_counts_map.get(a["id"], 0),
            "results_published": results_published
        })
    return result

@api_router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    now = datetime.now(timezone.utc)
    is_released = True
    if assignment.get("has_schedule_release") and assignment.get("schedule_release_date"):
        release_dt = datetime.fromisoformat(assignment["schedule_release_date"].replace('Z', '+00:00'))
        is_released = now >= release_dt
    
    # Check if results are published
    results_published = assignment.get("results_published", False)
    if assignment.get("results_publish_date"):
        publish_dt = datetime.fromisoformat(assignment["results_publish_date"].replace('Z', '+00:00'))
        if now >= publish_dt:
            results_published = True
    
    # Get submission stats
    total_subs = await db.submissions.count_documents({"assignment_id": assignment_id})
    reviewed_subs = await db.submissions.count_documents({
        "assignment_id": assignment_id,
        "status": {"$in": ["feedback_released", "no_issues"]}
    })
    
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    # Ensure new fields have default values for legacy assignments
    return {
        **assignment, 
        "has_deadline": assignment.get("has_deadline", False),
        "has_schedule_release": assignment.get("has_schedule_release", False),
        "course_name": course["name"] if course else "Unknown", 
        "is_past_deadline": is_past_deadline(assignment.get("due_date")) if assignment.get("has_deadline") else False,
        "is_released": is_released,
        "submissions_reviewed": reviewed_subs,
        "total_submissions": total_subs,
        "results_published": results_published
    }


@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, current_user: dict = Depends(require_marker)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Only course leader can delete
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if not course or course.get("leader_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the module leader can delete assignments")
    
    # Delete related submissions and feedback
    await db.feedback_issues.delete_many({"submission_id": {"$in": [s["id"] async for s in db.submissions.find({"assignment_id": assignment_id}, {"id": 1})]}})
    await db.submissions.delete_many({"assignment_id": assignment_id})
    await db.assignments.delete_one({"id": assignment_id})
    
    return {"message": "Assignment deleted successfully"}


# ============ ISSUE CATEGORIES ============

@api_router.post("/categories")
async def create_category(category_data: IssueCategoryCreate, current_user: dict = Depends(require_marker)):
    category_id = str(uuid.uuid4())
    category_doc = {"id": category_id, "name": category_data.name, "description": category_data.description or ""}
    await db.issue_categories.insert_one(category_doc)
    # Return without _id
    return {"id": category_id, "name": category_data.name, "description": category_data.description or ""}

@api_router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.issue_categories.find({}, {"_id": 0}).to_list(100)
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Logic Error", "description": "Incorrect program logic"},
            {"id": str(uuid.uuid4()), "name": "Style", "description": "Code style issues"},
            {"id": str(uuid.uuid4()), "name": "Efficiency", "description": "Performance issues"},
            {"id": str(uuid.uuid4()), "name": "Security", "description": "Security vulnerabilities"},
            {"id": str(uuid.uuid4()), "name": "Best Practice", "description": "Violation of best practices"},
        ]
        await db.issue_categories.insert_many(default_categories)
        # Exclude _id from returned documents
        return [{"id": c["id"], "name": c["name"], "description": c["description"]} for c in default_categories]
    return categories

# ============ SUBMISSION ENDPOINTS ============

@api_router.post("/submissions")
async def create_submission(submission_data: SubmissionCreate, current_user: dict = Depends(require_student)):
    assignment = await db.assignments.find_one({"id": submission_data.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment["course_id"] not in current_user.get("course_ids", []):
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Check if assignment is released
    now = datetime.now(timezone.utc)
    if assignment.get("has_schedule_release") and assignment.get("schedule_release_date"):
        release_dt = datetime.fromisoformat(assignment["schedule_release_date"].replace('Z', '+00:00'))
        if now < release_dt:
            raise HTTPException(status_code=403, detail="Assignment not yet available")
    
    # Check deadline only if deadline is enabled
    if assignment.get("has_deadline") and assignment.get("due_date"):
        if is_past_deadline(assignment.get("due_date")):
            raise HTTPException(status_code=403, detail="Submissions closed - deadline has passed")
    
    prev_subs = await db.submissions.find({
        "assignment_id": submission_data.assignment_id, "student_id": current_user["id"]
    }, {"_id": 0}).sort("attempt_number", -1).to_list(100)
    
    attempt = len(prev_subs) + 1
    if assignment.get("max_attempts", -1) > 0 and attempt > assignment["max_attempts"]:
        raise HTTPException(status_code=400, detail="Max attempts reached")
    
    if prev_subs:
        await db.submissions.update_many(
            {"assignment_id": submission_data.assignment_id, "student_id": current_user["id"]},
            {"$set": {"is_latest_attempt": False}}
        )
    
    submission_id = str(uuid.uuid4())
    files = [{"id": str(uuid.uuid4()), "filename": f.filename, "content": f.content} for f in submission_data.files]
    
    submission_doc = {
        "id": submission_id, "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"], "files": files, "status": "pending",
        "attempt_number": attempt, "previous_submission_id": prev_subs[0]["id"] if prev_subs else None,
        "submission_time": now.isoformat(), "is_latest_attempt": True, "marks": None,
        "marks_released": False, "moderation_status": None,
        "review_completed_at": None, "reviewed_by": None
    }
    await db.submissions.insert_one(submission_doc)
    
    # Award badge for first submission
    total_subs = await db.submissions.count_documents({"student_id": current_user["id"]})
    if total_subs == 1:
        await award_badge(current_user["id"], "first_submission", "student")
    
    # Return without _id
    return {
        "id": submission_id, "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"], "files": files, "status": "pending",
        "attempt_number": attempt, "previous_submission_id": prev_subs[0]["id"] if prev_subs else None,
        "submission_time": now, "is_latest_attempt": True, "marks": None,
        "marks_released": False, "moderation_status": None,
        "review_completed_at": None, "reviewed_by": None,
        "student_name": current_user["full_name"], "issues_count": 0
    }

@api_router.get("/submissions")
async def get_submissions(
    assignment_id: Optional[str] = None, course_id: Optional[str] = None,
    status_filter: Optional[str] = None, for_moderation: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    now = datetime.now(timezone.utc)
    
    if current_user["role"] == "student":
        query["student_id"] = current_user["id"]
    else:
        accessible_courses = await get_accessible_course_ids(current_user)
        if course_id:
            if course_id not in accessible_courses:
                raise HTTPException(status_code=403, detail="Access denied")
            assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
            query["assignment_id"] = {"$in": [a["id"] for a in assignments]}
        elif accessible_courses:
            assignments = await db.assignments.find({"course_id": {"$in": accessible_courses}}, {"_id": 0}).to_list(500)
            query["assignment_id"] = {"$in": [a["id"] for a in assignments]}
    
    if assignment_id:
        query["assignment_id"] = assignment_id
        
        # For markers: only show submissions if deadline has passed (or no deadline set)
        if current_user["role"] != "student":
            assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
            if assignment and assignment.get("has_deadline") and assignment.get("due_date"):
                deadline_dt = datetime.fromisoformat(assignment["due_date"].replace('Z', '+00:00'))
                if now < deadline_dt:
                    # Deadline hasn't passed - return empty for markers
                    return []
    
    if status_filter:
        query["status"] = status_filter
    
    # Moderation filtering - allow course leaders as well
    if for_moderation and current_user["role"] in ["moderator", "module_leader", "marker"]:
        # Get failed + 10% random sample
        all_subs = await db.submissions.find(query, {"_id": 0}).to_list(1000)
        # Only include reviewed submissions for moderation
        reviewed_subs = [s for s in all_subs if s.get("status") in ["feedback_released", "no_issues"]]
        failed = [s for s in reviewed_subs if (s.get("marks") or 0) < 50]
        passed = [s for s in reviewed_subs if (s.get("marks") or 0) >= 50]
        sample_size = max(1, len(passed) // 10) if passed else 0
        random_sample = random.sample(passed, min(sample_size, len(passed))) if passed else []
        submissions = failed + random_sample
    else:
        submissions = await db.submissions.find(query, {"_id": 0}).sort("submission_time", -1).to_list(500)
    
    result = []
    
    # Batch: collect all user IDs, assignment IDs, submission IDs
    student_ids = set()
    reviewer_ids = set()
    assignment_ids_set = set()
    submission_ids = []
    for sub in submissions:
        student_ids.add(sub["student_id"])
        if sub.get("reviewed_by"):
            reviewer_ids.add(sub["reviewed_by"])
        assignment_ids_set.add(sub["assignment_id"])
        submission_ids.append(sub["id"])
    
    # Bulk fetch users
    all_uids = list(student_ids | reviewer_ids)
    users_map = {}
    if all_uids:
        users_list = await db.users.find({"id": {"$in": all_uids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(len(all_uids))
        users_map = {u["id"]: u for u in users_list}
    
    # Bulk fetch assignments (for student result visibility)
    assignments_map = {}
    if assignment_ids_set:
        assignments_list = await db.assignments.find({"id": {"$in": list(assignment_ids_set)}}, {"_id": 0}).to_list(len(assignment_ids_set))
        assignments_map = {a["id"]: a for a in assignments_list}
    
    # Aggregate issue counts per submission in one query
    issues_map = {}
    if submission_ids:
        issue_counts = await db.feedback_issues.aggregate([
            {"$match": {"submission_id": {"$in": submission_ids}}},
            {"$group": {"_id": "$submission_id", "count": {"$sum": 1}}}
        ]).to_list(len(submission_ids))
        issues_map = {ic["_id"]: ic["count"] for ic in issue_counts}
    
    for sub in submissions:
        student = users_map.get(sub["student_id"])
        reviewer = users_map.get(sub.get("reviewed_by"))
        issues_count = issues_map.get(sub["id"], 0)
        
        # For students: check if results are published before showing marks
        show_marks = True
        if current_user["role"] == "student":
            assignment = assignments_map.get(sub["assignment_id"])
            if assignment:
                if assignment.get("results_publish_date"):
                    publish_dt = datetime.fromisoformat(assignment["results_publish_date"].replace('Z', '+00:00'))
                    show_marks = now >= publish_dt
                elif not assignment.get("results_published", True):
                    show_marks = assignment.get("results_published", True)
        
        result.append({
            **sub, "student_name": student["full_name"] if student else "Unknown",
            "reviewed_by_name": reviewer["full_name"] if reviewer else None,
            "issues_count": issues_count,
            "marks": sub.get("marks") if show_marks else None,
            "marks_visible": show_marks,
            "files": [{"id": f["id"], "filename": f["filename"], "content": f["content"]} for f in sub.get("files", [])]
        })
    return result

@api_router.get("/submissions/{submission_id}")
async def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    student = await db.users.find_one({"id": submission["student_id"]}, {"_id": 0})
    reviewer = await db.users.find_one({"id": submission.get("reviewed_by")}, {"_id": 0}) if submission.get("reviewed_by") else None
    issues_count = await db.feedback_issues.count_documents({"submission_id": submission_id})
    return {
        **submission, "student_name": student["full_name"] if student else "Unknown",
        "reviewed_by_name": reviewer["full_name"] if reviewer else None, "issues_count": issues_count
    }

# ============ GRADING ENDPOINTS ============

@api_router.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, grade_data: GradeSubmissionRequest, current_user: dict = Depends(require_marker)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    if grade_data.marks > assignment.get("total_marks", 100):
        raise HTTPException(status_code=400, detail=f"Marks cannot exceed {assignment.get('total_marks', 100)}")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "marks": grade_data.marks, "marker_feedback": grade_data.feedback,
            "status": "feedback_released", "review_completed_at": now,
            "reviewed_by": current_user["id"], "moderation_status": "pending"
        }}
    )
    
    # Check if marks should be released now or scheduled
    release_date = assignment.get("marks_release_date")
    if not release_date or datetime.now(timezone.utc) >= parse_iso_datetime(release_date):
        await db.submissions.update_one({"id": submission_id}, {"$set": {"marks_released": True}})
    
    # Award marker XP for completing review
    xp_gained = 25  # Base XP for grading
    new_xp = await award_xp(current_user["id"], xp_gained, "Graded submission", "review_completed")
    
    # Check and award any earned badges
    badges_awarded = await check_and_award_marker_badges(current_user["id"])
    
    return {
        "message": "Graded successfully", 
        "marks": grade_data.marks, 
        "xp_gained": xp_gained,
        "new_total_xp": new_xp,
        "badges_awarded": badges_awarded
    }

@api_router.post("/submissions/{submission_id}/release-marks")
async def release_marks(submission_id: str, current_user: dict = Depends(require_marker)):
    await db.submissions.update_one({"id": submission_id}, {"$set": {"marks_released": True}})
    
    # Create notification for student
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if submission:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": submission["student_id"],
            "type": "marks_released", "title": "Marks Released",
            "message": f"Your marks for submission have been released. Score: {submission.get('marks', 'N/A')}",
            "read": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
    return {"message": "Marks released"}

@api_router.post("/submissions/{submission_id}/mark-no-issues")
async def mark_no_issues(submission_id: str, request: MarkNoIssuesRequest, current_user: dict = Depends(require_marker)):
    now = datetime.now(timezone.utc).isoformat()
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "status": "no_issues", "marks": assignment.get("total_marks", 100),
            "review_completed_at": now, "reviewed_by": current_user["id"],
            "marker_comment": request.marker_comment or "No issues found.",
            "marks_released": True, "moderation_status": "pending"
        }}
    )
    
    # Award marker XP for quick review
    xp_gained = 15
    new_xp = await award_xp(current_user["id"], xp_gained, "Marked no issues", "review_completed")
    
    # Check and award any earned badges
    badges_awarded = await check_and_award_marker_badges(current_user["id"])
    
    # Award student the perfectionist badge
    await award_badge(submission["student_id"], "perfectionist", "student")
    
    return {
        "message": "Marked as correct", 
        "status": "no_issues", 
        "xp_gained": xp_gained,
        "new_total_xp": new_xp,
        "badges_awarded": badges_awarded
    }

@api_router.post("/submissions/{submission_id}/publish")
async def publish_feedback(submission_id: str, current_user: dict = Depends(require_marker)):
    now = datetime.now(timezone.utc).isoformat()
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": "feedback_released", "review_completed_at": now, "reviewed_by": current_user["id"]}}
    )
    return {"message": "Feedback published"}

# ============ FEEDBACK ISSUES ============

@api_router.post("/issues")
async def create_issue(issue_data: FeedbackIssueCreate, current_user: dict = Depends(require_marker)):
    submission = await db.submissions.find_one({"id": issue_data.submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    issue_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    category = await db.issue_categories.find_one({"id": issue_data.category_id}, {"_id": 0})
    
    filename = None
    for f in submission.get("files", []):
        if f["id"] == issue_data.file_id:
            filename = f["filename"]
            break
    
    issue_doc = {
        "id": issue_id, "submission_id": issue_data.submission_id,
        "file_id": issue_data.file_id, "marker_id": current_user["id"],
        "category_id": issue_data.category_id, "line_start": issue_data.line_start,
        "line_end": issue_data.line_end, "title": issue_data.title,
        "explanation": issue_data.explanation, "severity": issue_data.severity or "moderate",
        "suggested_fix": issue_data.suggested_fix or "", "reference_links": issue_data.reference_links or [],
        "student_status": "open", "verification_criteria": issue_data.verification_criteria or "",
        "marks_deduction": issue_data.marks_deduction or 0, "created_at": now
    }
    await db.feedback_issues.insert_one(issue_doc)
    await db.submissions.update_one({"id": issue_data.submission_id}, {"$set": {"status": "in_review"}})
    
    # Return without _id
    return {
        "id": issue_id, "submission_id": issue_data.submission_id,
        "file_id": issue_data.file_id, "marker_id": current_user["id"],
        "category_id": issue_data.category_id, "line_start": issue_data.line_start,
        "line_end": issue_data.line_end, "title": issue_data.title,
        "explanation": issue_data.explanation, "severity": issue_data.severity or "moderate",
        "suggested_fix": issue_data.suggested_fix or "", "reference_links": issue_data.reference_links or [],
        "student_status": "open", "verification_criteria": issue_data.verification_criteria or "",
        "marks_deduction": issue_data.marks_deduction or 0, "created_at": now,
        "filename": filename, "marker_name": current_user["full_name"], 
        "category_name": category["name"] if category else "Unknown"
    }

@api_router.get("/issues")
async def get_issues(submission_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if submission_id:
        query["submission_id"] = submission_id
    issues = await db.feedback_issues.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for issue in issues:
        category = await db.issue_categories.find_one({"id": issue["category_id"]}, {"_id": 0})
        marker = await db.users.find_one({"id": issue["marker_id"]}, {"_id": 0})
        submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
        filename = None
        if submission:
            for f in submission.get("files", []):
                if f["id"] == issue["file_id"]:
                    filename = f["filename"]
                    break
        result.append({
            **issue, "filename": filename,
            "marker_name": marker["full_name"] if marker else "Unknown",
            "category_name": category["name"] if category else "Unknown"
        })
    return result

@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str, current_user: dict = Depends(require_marker)):
    issue = await db.feedback_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    # Only module leader can delete issues they didn't create
    if issue["marker_id"] == current_user["id"] and current_user["role"] != "module_leader":
        raise HTTPException(status_code=403, detail="Cannot delete your own issue")
    await db.feedback_issues.delete_one({"id": issue_id})
    return {"message": "Issue deleted"}

@api_router.post("/issues/{issue_id}/mark-fixed")
async def mark_issue_fixed(issue_id: str, current_user: dict = Depends(require_student)):
    issue = await db.feedback_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
    if submission["student_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc)
    created = parse_iso_datetime(issue["created_at"])
    hours_elapsed = (now - created).total_seconds() / 3600 if created else 24
    
    # XP based on speed of fix
    xp_values = {"minor": 10, "moderate": 25, "critical": 50}
    base_xp = xp_values.get(issue.get("severity", "moderate"), 10)
    if hours_elapsed < 24:
        xp_gained = base_xp  # Full XP for quick fix
        await award_badge(current_user["id"], "quick_learner", "student")
    else:
        xp_gained = base_xp // 2  # Half XP for delayed fix
    
    await db.feedback_issues.update_one(
        {"id": issue_id},
        {"$set": {"student_status": "fixed", "resolution_timestamp": now.isoformat()}}
    )
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"xp": xp_gained}})
    
    # Check badges
    fixed_count = await db.feedback_issues.count_documents({"submission_id": {"$in": [s["id"] async for s in db.submissions.find({"student_id": current_user["id"]})]}, "student_status": "fixed"})
    if fixed_count >= 10:
        await award_badge(current_user["id"], "bug_squasher", "student")
    
    return {"message": "Issue marked as fixed", "xp_gained": xp_gained}

# ============ ISSUE TEMPLATES ============

@api_router.post("/issue-templates")
async def create_issue_template(template_data: IssueTemplateCreate, current_user: dict = Depends(require_marker)):
    template_id = str(uuid.uuid4())
    template_doc = {
        "id": template_id, "title": template_data.title,
        "explanation": template_data.explanation, "category_id": template_data.category_id,
        "severity": template_data.severity, "suggested_fix": template_data.suggested_fix or "",
        "marks_deduction": template_data.marks_deduction,
        "course_id": template_data.course_id,
        "created_by": current_user["id"], "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.issue_templates.insert_one(template_doc)
    
    # Check for badge
    template_count = await db.issue_templates.count_documents({"created_by": current_user["id"]})
    if template_count >= 10:
        await award_badge(current_user["id"], "feedback_master", "marker")
    if template_count >= 20:
        await award_badge(current_user["id"], "template_architect", "marker")
    
    category = await db.issue_categories.find_one({"id": template_data.category_id}, {"_id": 0})
    return {**template_doc, "_id": None, "category_name": category["name"] if category else "Unknown"}

@api_router.get("/issue-templates")
async def get_issue_templates(course_id: Optional[str] = None, current_user: dict = Depends(require_marker)):
    query = {}
    if course_id:
        # Module-specific: show templates for this course + user's global templates (no course_id)
        query["$or"] = [{"course_id": course_id}, {"course_id": None}, {"course_id": {"$exists": False}}]
    templates = await db.issue_templates.find(query, {"_id": 0}).to_list(200)
    result = []
    for t in templates:
        category = await db.issue_categories.find_one({"id": t["category_id"]}, {"_id": 0})
        result.append({**t, "category_name": category["name"] if category else "Unknown"})
    return result

@api_router.delete("/issue-templates/{template_id}")
async def delete_issue_template(template_id: str, current_user: dict = Depends(require_marker)):
    template = await db.issue_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own templates")
    await db.issue_templates.delete_one({"id": template_id})
    return {"message": "Template deleted"}

@api_router.post("/issue-templates/{template_id}/use")
async def increment_template_usage(template_id: str, current_user: dict = Depends(require_marker)):
    await db.issue_templates.update_one({"id": template_id}, {"$inc": {"usage_count": 1}})
    return {"message": "Usage recorded"}

@api_router.post("/drafts/save")
async def save_draft(draft_data: dict = Body(...), current_user: dict = Depends(require_marker)):
    """Save marker's in-progress work (issues, form state) as a server-side draft."""
    await db.drafts.update_one(
        {"user_id": current_user["id"], "submission_id": draft_data.get("submission_id")},
        {"$set": {
            "user_id": current_user["id"],
            "submission_id": draft_data.get("submission_id"),
            "form_state": draft_data.get("form_state", {}),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Draft saved"}

@api_router.get("/drafts/{submission_id}")
async def get_draft(submission_id: str, current_user: dict = Depends(require_marker)):
    """Get saved draft for a submission."""
    draft = await db.drafts.find_one(
        {"user_id": current_user["id"], "submission_id": submission_id}, {"_id": 0}
    )
    return draft or {"form_state": {}}

# ============ MODERATION ENDPOINTS ============

@api_router.post("/moderation/issues")
async def create_moderation_issue(issue_data: ModerationIssueCreate, current_user: dict = Depends(require_moderator)):
    submission = await db.submissions.find_one({"id": issue_data.submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    issue_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    issue_doc = {
        "id": issue_id, "submission_id": issue_data.submission_id,
        "moderator_id": current_user["id"], "marker_id": submission.get("reviewed_by"),
        "issue_description": issue_data.issue_description,
        "severity": issue_data.severity, "status": "open",
        "leader_response": None, "created_at": now
    }
    await db.moderation_issues.insert_one(issue_doc)
    await db.submissions.update_one({"id": issue_data.submission_id}, {"$set": {"moderation_status": "flagged"}})
    
    # Notify the marker
    if submission.get("reviewed_by"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": submission["reviewed_by"],
            "type": "moderation_issue", "title": "Moderation Issue Raised",
            "message": f"A moderator has raised an issue with your review: {issue_data.issue_description[:50]}...",
            "read": False, "created_at": now
        })
    
    moderator = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    marker = await db.users.find_one({"id": submission.get("reviewed_by")}, {"_id": 0})
    # Return without _id
    return {
        "id": issue_id, "submission_id": issue_data.submission_id,
        "moderator_id": current_user["id"], "marker_id": submission.get("reviewed_by"),
        "issue_description": issue_data.issue_description,
        "severity": issue_data.severity, "status": "open",
        "leader_response": None, "created_at": now,
        "moderator_name": moderator["full_name"], "marker_name": marker["full_name"] if marker else "Unknown"
    }

@api_router.post("/moderation/issues/{issue_id}/approve")
async def approve_moderation(issue_id: str, current_user: dict = Depends(require_module_leader)):
    issue = await db.moderation_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.moderation_issues.update_one(
        {"id": issue_id},
        {"$set": {"status": "resolved", "leader_response": "approved", "resolved_at": now}}
    )
    await db.submissions.update_one({"id": issue["submission_id"]}, {"$set": {"moderation_status": "flagged_approved"}})
    return {"message": "Issue approved"}

@api_router.post("/moderation/issues/{issue_id}/reject")
async def reject_moderation(issue_id: str, current_user: dict = Depends(require_module_leader)):
    now = datetime.now(timezone.utc).isoformat()
    await db.moderation_issues.update_one(
        {"id": issue_id},
        {"$set": {"status": "discarded", "leader_response": "rejected", "resolved_at": now}}
    )
    return {"message": "Issue rejected"}

@api_router.post("/moderation/submissions/{submission_id}/confirm")
async def confirm_no_moderation_issue(submission_id: str, current_user: dict = Depends(require_moderator)):
    await db.submissions.update_one({"id": submission_id}, {"$set": {"moderation_status": "approved"}})
    
    # Award marker badge for consistent marking
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if submission and submission.get("reviewed_by"):
        approved_count = await db.submissions.count_documents({"reviewed_by": submission["reviewed_by"], "moderation_status": "approved"})
        total_reviewed = await db.submissions.count_documents({"reviewed_by": submission["reviewed_by"], "moderation_status": {"$exists": True}})
        if total_reviewed >= 20 and approved_count / total_reviewed >= 0.95:
            await award_badge(submission["reviewed_by"], "consistent_marker", "marker")
    
    return {"message": "Confirmed no issues"}

@api_router.get("/moderation/issues")
async def get_moderation_issues(course_id: Optional[str] = None, current_user: dict = Depends(require_moderator)):
    query = {}
    if course_id:
        assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
        submissions = await db.submissions.find({"assignment_id": {"$in": [a["id"] for a in assignments]}}, {"_id": 0}).to_list(1000)
        query["submission_id"] = {"$in": [s["id"] for s in submissions]}
    
    issues = await db.moderation_issues.find(query, {"_id": 0}).to_list(500)
    result = []
    for issue in issues:
        moderator = await db.users.find_one({"id": issue["moderator_id"]}, {"_id": 0})
        marker = await db.users.find_one({"id": issue.get("marker_id")}, {"_id": 0})
        result.append({
            **issue,
            "moderator_name": moderator["full_name"] if moderator else "Unknown",
            "marker_name": marker["full_name"] if marker else "Unknown"
        })
    return result

@api_router.get("/moderation/queue")
async def get_moderation_queue(course_id: Optional[str] = None, assignment_id: Optional[str] = None, current_user: dict = Depends(require_moderator)):
    """Get moderation queue - all failed submissions + 10% random sample of passed ones."""
    # Build base query for reviewed submissions
    base_query = {"status": {"$in": ["feedback_released", "no_issues"]}}
    
    if assignment_id:
        base_query["assignment_id"] = assignment_id
    elif course_id:
        assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
        base_query["assignment_id"] = {"$in": [a["id"] for a in assignments]}
    else:
        # Get all accessible courses
        accessible = await get_accessible_course_ids(current_user)
        if accessible:
            assignments = await db.assignments.find({"course_id": {"$in": accessible}}, {"_id": 0}).to_list(500)
            base_query["assignment_id"] = {"$in": [a["id"] for a in assignments]}
    
    all_submissions = await db.submissions.find(base_query, {"_id": 0}).to_list(1000)
    
    # Separate failed and passed
    failed = [s for s in all_submissions if (s.get("marks") or 0) < 50]
    passed = [s for s in all_submissions if (s.get("marks") or 0) >= 50]
    
    # Get 10% sample of passed
    sample_size = max(1, len(passed) // 10) if passed else 0
    passed_sample = random.sample(passed, min(sample_size, len(passed))) if passed else []
    
    # Combine
    moderation_queue = failed + passed_sample
    
    # Enrich with student and assignment info
    result = []
    for sub in moderation_queue:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0})
        assignment = await db.assignments.find_one({"id": sub["assignment_id"]}, {"_id": 0})
        marker = await db.users.find_one({"id": sub.get("reviewed_by")}, {"_id": 0})
        
        result.append({
            **sub,
            "student_name": student["full_name"] if student else "Unknown",
            "assignment_title": assignment["title"] if assignment else "Unknown",
            "marker_name": marker["full_name"] if marker else "Unknown",
            "is_failed": (sub.get("marks") or 0) < 50
        })
    
    return {
        "queue": result,
        "stats": {
            "total_reviewed": len(all_submissions),
            "failed_count": len(failed),
            "passed_count": len(passed),
            "sample_size": sample_size,
            "queue_size": len(moderation_queue)
        }
    }

@api_router.get("/moderation/dashboard")
async def get_moderation_dashboard(course_id: Optional[str] = None, current_user: dict = Depends(require_moderator)):
    """Get moderation dashboard statistics."""
    accessible = await get_accessible_course_ids(current_user)
    
    if course_id and course_id in accessible:
        accessible = [course_id]
    
    stats = {
        "total_submissions": 0,
        "reviewed": 0,
        "pending_moderation": 0,
        "issues_open": 0,
        "issues_resolved": 0,
        "issues_discarded": 0,
        "approved_no_issues": 0,
        "courses": []
    }
    
    for cid in accessible[:10]:  # Limit to 10 courses
        course = await db.courses.find_one({"id": cid}, {"_id": 0})
        if not course:
            continue
        
        assignments = await db.assignments.find({"course_id": cid}, {"_id": 0}).to_list(50)
        assignment_ids = [a["id"] for a in assignments]
        
        submissions = await db.submissions.find({"assignment_id": {"$in": assignment_ids}}, {"_id": 0}).to_list(500)
        reviewed = [s for s in submissions if s.get("status") in ["feedback_released", "no_issues"]]
        
        mod_issues = await db.moderation_issues.find({"submission_id": {"$in": [s["id"] for s in submissions]}}, {"_id": 0}).to_list(200)
        
        course_stats = {
            "id": cid,
            "name": course.get("name", "Unknown"),
            "code": course.get("code", ""),
            "total_submissions": len(submissions),
            "reviewed": len(reviewed),
            "issues_open": len([i for i in mod_issues if i.get("status") == "open"]),
            "issues_resolved": len([i for i in mod_issues if i.get("status") == "resolved"])
        }
        
        stats["total_submissions"] += len(submissions)
        stats["reviewed"] += len(reviewed)
        stats["issues_open"] += course_stats["issues_open"]
        stats["issues_resolved"] += course_stats["issues_resolved"]
        stats["courses"].append(course_stats)
    
    return stats

# ============ NOTIFICATIONS ============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "user_id": current_user["id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

# ============ ANALYTICS ============

@api_router.get("/analytics/marker")
async def get_marker_analytics(course_id: Optional[str] = None, current_user: dict = Depends(require_marker)):
    accessible_courses = await get_accessible_course_ids(current_user)
    if course_id:
        accessible_courses = [course_id] if course_id in accessible_courses else []
    
    courses_data = []
    total_reviews = 0
    total_pending = 0
    
    for cid in accessible_courses:
        course = await db.courses.find_one({"id": cid}, {"_id": 0})
        if not course:
            continue
        assignments = await db.assignments.find({"course_id": cid}, {"_id": 0}).to_list(100)
        assignment_ids = [a["id"] for a in assignments]
        
        submissions = await db.submissions.find({"assignment_id": {"$in": assignment_ids}}, {"_id": 0}).to_list(1000)
        pending = len([s for s in submissions if s["status"] == "pending"])
        completed = len([s for s in submissions if s["status"] in ["feedback_released", "no_issues"]])
        
        courses_data.append({
            "course_id": cid, "course_name": course["name"],
            "total_submissions": len(submissions), "pending_reviews": pending,
            "completed_reviews": completed
        })
        total_reviews += completed
        total_pending += pending
    
    return {
        "total_feedback_given": total_reviews,
        "total_pending_reviews": total_pending,
        "active_courses": len(courses_data),
        "courses": courses_data
    }

@api_router.get("/analytics/student")
async def get_student_analytics(current_user: dict = Depends(require_student)):
    xp = current_user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    
    course_ids = current_user.get("course_ids", [])
    courses_progress = []
    
    total_assignments_completed = 0
    total_assignments_all = 0
    total_issues_fixed = 0
    total_issues_all = 0
    
    for cid in course_ids:
        course = await db.courses.find_one({"id": cid}, {"_id": 0})
        if not course:
            continue
        assignments = await db.assignments.find({"course_id": cid}, {"_id": 0}).to_list(100)
        assignment_ids = [a["id"] for a in assignments]
        
        submissions = await db.submissions.find({
            "assignment_id": {"$in": assignment_ids},
            "student_id": current_user["id"]
        }, {"_id": 0}).to_list(100)
        
        # Get all issues for these submissions
        submission_ids = [s["id"] for s in submissions]
        issues = await db.feedback_issues.find({
            "submission_id": {"$in": submission_ids}
        }, {"_id": 0}).to_list(500)
        
        fixed_issues = len([i for i in issues if i.get("student_status") == "fixed"])
        total_issues = len(issues)
        
        # Count completed assignments (ones with feedback released or no_issues)
        completed_submissions = [s for s in submissions if s.get("status") in ["feedback_released", "no_issues"]]
        completed_assignment_ids = set(s["assignment_id"] for s in completed_submissions)
        
        total_marks = sum(s.get("marks", 0) for s in submissions if s.get("marks_released"))
        max_marks = len([s for s in submissions if s.get("marks_released")]) * 100
        
        # Issues by category
        issues_by_category = {}
        for issue in issues:
            cat = issue.get("category", "Other")
            issues_by_category[cat] = issues_by_category.get(cat, 0) + 1
        
        courses_progress.append({
            "course_id": cid, 
            "course_name": course["name"],
            "total_submissions": len(submissions),
            "total_assignments": len(assignments),
            "assignments_completed": len(completed_assignment_ids),
            "fixed_issues": fixed_issues,
            "total_issues": total_issues,
            "issues_by_category": issues_by_category,
            "average_marks": round(total_marks / max_marks * 100, 1) if max_marks > 0 else 0
        })
        
        total_assignments_completed += len(completed_assignment_ids)
        total_assignments_all += len(assignments)
        total_issues_fixed += fixed_issues
        total_issues_all += total_issues
    
    # Calculate totals for overall stats
    total_submissions = sum(c["total_submissions"] for c in courses_progress)
    fix_rate = round((total_issues_fixed / total_issues_all * 100), 0) if total_issues_all > 0 else 0
    
    return {
        "total_xp": xp, "level": level, "level_title": title,
        "badges": current_user.get("badges", []),
        "courses": courses_progress,
        "overall_stats": {
            "total_submissions": total_submissions,
            "total_issues": total_issues_all,
            "fixed_issues": total_issues_fixed,
            "fix_rate": fix_rate
        },
        "summary": {
            "assignments_completed": total_assignments_completed,
            "total_assignments": total_assignments_all,
            "issues_fixed": total_issues_fixed,
            "total_issues": total_issues_all
        }
    }

@api_router.get("/gamification/badges")
async def get_all_badges(current_user: dict = Depends(get_current_user)):
    user_badges = current_user.get("badges", [])
    if current_user["role"] == "student":
        return {"earned": [STUDENT_BADGES[b] for b in user_badges if b in STUDENT_BADGES],
                "available": [{"id": k, **v} for k, v in STUDENT_BADGES.items()]}
    else:
        return {"earned": [MARKER_BADGES[b] for b in user_badges if b in MARKER_BADGES],
                "available": [{"id": k, **v} for k, v in MARKER_BADGES.items()]}

@api_router.get("/gamification/stats")
async def get_gamification_stats(current_user: dict = Depends(get_current_user)):
    """Get comprehensive gamification stats for current user"""
    # Refresh badge status first
    if current_user["role"] == "student":
        await check_and_award_student_badges(current_user["id"])
    else:
        await check_and_award_marker_badges(current_user["id"])
    
    # Re-fetch user to get updated data
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    xp = user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    user_badges = user.get("badges", [])
    
    # Get recent XP history
    recent_xp = await db.xp_history.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    recent_xp_gains = [
        {"reason": r.get("reason", "Action"), "xp_gained": r.get("xp_gained", 0), "date": r.get("created_at")}
        for r in recent_xp
    ]
    
    # Calculate level progress percentage
    current_level_threshold = 0
    next_level_threshold = 100
    for lvl, threshold, _ in LEVEL_THRESHOLDS:
        if xp >= threshold:
            current_level_threshold = threshold
        if threshold > xp:
            next_level_threshold = threshold
            break
    
    level_progress = 0
    if next_level_threshold > current_level_threshold:
        level_progress = ((xp - current_level_threshold) / (next_level_threshold - current_level_threshold)) * 100
    elif xp >= 5200:  # Max level
        level_progress = 100
    
    if current_user["role"] == "student":
        # Student-specific stats
        submissions = await db.submissions.find(
            {"student_id": current_user["id"]}, {"_id": 0}
        ).to_list(100)
        
        issues = await db.feedback_issues.find(
            {"submission_id": {"$in": [s["id"] for s in submissions]}}, {"_id": 0}
        ).to_list(500)
        
        issues_fixed = len([i for i in issues if i.get("student_status") == "fixed"])
        issues_open = len([i for i in issues if i.get("student_status") != "fixed"])
        
        return {
            "xp": xp,
            "total_xp": xp,
            "level": level,
            "level_title": title,
            "level_progress": round(level_progress, 1),
            "xp_to_next_level": xp_to_next,
            "badges": user_badges,
            "badges_earned": [{"id": b, **STUDENT_BADGES.get(b, {})} for b in user_badges if b in STUDENT_BADGES],
            "badges_count": len(user_badges),
            "total_badges_available": len(STUDENT_BADGES),
            "issues_fixed": issues_fixed,
            "issues_open": issues_open,
            "submissions_count": len(submissions),
            "recent_xp_gains": recent_xp_gains
        }
    else:
        # Marker-specific stats
        reviews = await db.submissions.count_documents({"reviewed_by": current_user["id"]})
        pending = await db.submissions.count_documents({
            "status": "pending",
            "reviewed_by": {"$exists": False}
        })
        issues_created = await db.feedback_issues.count_documents({"marker_id": current_user["id"]})
        templates_created = await db.issue_templates.count_documents({"created_by": current_user["id"]})
        
        return {
            "xp": xp,
            "total_xp": xp,
            "level": level,
            "level_title": title,
            "level_progress": round(level_progress, 1),
            "xp_to_next_level": xp_to_next,
            "badges": user_badges,
            "badges_earned": [{"id": b, **MARKER_BADGES.get(b, {})} for b in user_badges if b in MARKER_BADGES],
            "badges_count": len(user_badges),
            "total_badges_available": len(MARKER_BADGES),
            "total_reviews": reviews,
            "pending_reviews": pending,
            "issues_created": issues_created,
            "templates_created": templates_created,
            "recent_xp_gains": recent_xp_gains
        }

# ============ LEADERBOARD ENDPOINTS ============

class LeaderboardJoinRequest(BaseModel):
    course_id: str
    nickname: str

class LeaderboardLeaveRequest(BaseModel):
    course_id: str

@api_router.get("/leaderboard/check-nickname")
async def check_nickname(course_id: str, nickname: str, current_user: dict = Depends(get_current_user)):
    """Check if a nickname is available in a module."""
    if not nickname or len(nickname.strip()) < 2:
        return {"available": False, "reason": "Nickname must be at least 2 characters"}
    if len(nickname.strip()) > 20:
        return {"available": False, "reason": "Nickname must be 20 characters or less"}
    nickname_clean = nickname.strip()
    existing = await db.leaderboard_settings.find_one({
        "course_id": course_id,
        "nickname": {"$regex": f"^{nickname_clean}$", "$options": "i"},
        "user_id": {"$ne": current_user["id"]}
    })
    return {"available": existing is None, "reason": "Nickname already taken in this module" if existing else None}

@api_router.post("/leaderboard/join")
async def join_leaderboard(request: LeaderboardJoinRequest, current_user: dict = Depends(get_current_user)):
    """Opt-in to a module leaderboard with a unique nickname."""
    nickname = request.nickname.strip()
    if len(nickname) < 2 or len(nickname) > 20:
        raise HTTPException(status_code=400, detail="Nickname must be 2-20 characters")
    
    # Check course exists
    course = await db.courses.find_one({"id": request.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check nickname uniqueness in this module
    existing = await db.leaderboard_settings.find_one({
        "course_id": request.course_id,
        "nickname": {"$regex": f"^{nickname}$", "$options": "i"},
        "user_id": {"$ne": current_user["id"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Nickname already taken in this module")
    
    now = datetime.now(timezone.utc).isoformat()
    # Upsert leaderboard settings
    await db.leaderboard_settings.update_one(
        {"user_id": current_user["id"], "course_id": request.course_id},
        {"$set": {
            "user_id": current_user["id"],
            "course_id": request.course_id,
            "nickname": nickname,
            "joined": True,
            "role": current_user["role"],
            "updated_at": now
        },
        "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
        upsert=True
    )
    return {"message": f"Joined leaderboard as '{nickname}'", "nickname": nickname}

@api_router.post("/leaderboard/leave")
async def leave_leaderboard(request: LeaderboardLeaveRequest, current_user: dict = Depends(get_current_user)):
    """Opt-out of a module leaderboard."""
    await db.leaderboard_settings.update_one(
        {"user_id": current_user["id"], "course_id": request.course_id},
        {"$set": {"joined": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Left leaderboard. Your progress is still tracked privately."}

@api_router.get("/leaderboard/settings/{course_id}")
async def get_leaderboard_settings(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get current user's leaderboard settings for a module."""
    settings = await db.leaderboard_settings.find_one(
        {"user_id": current_user["id"], "course_id": course_id}, {"_id": 0}
    )
    return settings or {"joined": False, "nickname": None, "course_id": course_id}

@api_router.get("/leaderboard/{course_id}/students")
async def get_student_leaderboard(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get student leaderboard for a module, ranked by positive academic behaviour."""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get all opted-in students for this module
    opted_in = await db.leaderboard_settings.find(
        {"course_id": course_id, "joined": True, "role": "student"}, {"_id": 0}
    ).to_list(200)
    
    if not opted_in:
        return {"leaderboard": [], "course_name": course["name"], "participant_count": 0}
    
    # Get assignments for this course
    assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
    assignment_ids = [a["id"] for a in assignments]
    
    leaderboard = []
    for entry in opted_in:
        uid = entry["user_id"]
        user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if not user:
            continue
        
        # Get submissions for this module
        subs = await db.submissions.find(
            {"student_id": uid, "assignment_id": {"$in": assignment_ids}}, {"_id": 0}
        ).to_list(200)
        
        sub_ids = [s["id"] for s in subs]
        issues = await db.feedback_issues.find({"submission_id": {"$in": sub_ids}}, {"_id": 0}).to_list(500)
        fixed = [i for i in issues if i.get("student_status") == "fixed"]
        perfect = [s for s in subs if s.get("status") == "no_issues"]
        on_time = [s for s in subs if s.get("status") in ["feedback_released", "no_issues"]]
        
        # Score: weighted composite encouraging positive behaviour
        score = 0
        score += len(subs) * 10             # Submissions
        score += len(on_time) * 15           # On-time bonus
        score += len(fixed) * 8              # Fixed issues
        score += len(perfect) * 30           # Perfect submissions
        
        # Quick fix bonus
        for fi in fixed:
            created = parse_iso_datetime(fi.get("created_at", ""))
            resolved = parse_iso_datetime(fi.get("resolution_timestamp", ""))
            if created and resolved and (resolved - created).total_seconds() < 86400:
                score += 5
        
        xp = user.get("xp", 0)
        level, title, _ = get_level_info(xp)
        badges = user.get("badges", [])
        
        leaderboard.append({
            "user_id": uid,
            "nickname": entry["nickname"],
            "score": score,
            "xp": xp,
            "level": level,
            "level_title": title,
            "badges_count": len(badges),
            "submissions_count": len(subs),
            "issues_fixed": len(fixed),
            "perfect_submissions": len(perfect),
            "top_badges": badges[:3]
        })
    
    # Sort by score descending
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    # Add rank
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return {
        "leaderboard": leaderboard,
        "course_name": course["name"],
        "participant_count": len(leaderboard)
    }

@api_router.get("/leaderboard/{course_id}/markers")
async def get_marker_leaderboard(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get marker leaderboard for a module, ranked by review quality metrics."""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get all opted-in markers for this module
    opted_in = await db.leaderboard_settings.find(
        {"course_id": course_id, "joined": True, "role": {"$ne": "student"}}, {"_id": 0}
    ).to_list(200)
    
    if not opted_in:
        return {"leaderboard": [], "course_name": course["name"], "participant_count": 0}
    
    assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
    assignment_ids = [a["id"] for a in assignments]
    
    leaderboard = []
    for entry in opted_in:
        uid = entry["user_id"]
        user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if not user:
            continue
        
        # Reviews in this module
        reviews = await db.submissions.find(
            {"reviewed_by": uid, "assignment_id": {"$in": assignment_ids}}, {"_id": 0}
        ).to_list(500)
        
        issues_count = 0
        for r in reviews:
            ic = await db.feedback_issues.count_documents({"submission_id": r["id"], "marker_id": uid})
            issues_count += ic
        
        approved = len([r for r in reviews if r.get("moderation_status") == "approved"])
        
        # Score: weighted composite
        score = 0
        score += len(reviews) * 10           # Reviews completed
        score += issues_count * 5            # Issues found (thoroughness)
        score += approved * 20               # Moderation approvals
        
        # Quick turnaround bonus
        for r in reviews:
            sub_time = parse_iso_datetime(r.get("submission_time", ""))
            rev_time = parse_iso_datetime(r.get("review_completed_at", ""))
            if sub_time and rev_time and (rev_time - sub_time).total_seconds() <= 172800:
                score += 8
        
        xp = user.get("xp", 0)
        level, title, _ = get_level_info(xp)
        badges = user.get("badges", [])
        
        leaderboard.append({
            "user_id": uid,
            "nickname": entry["nickname"],
            "score": score,
            "xp": xp,
            "level": level,
            "level_title": title,
            "badges_count": len(badges),
            "reviews_count": len(reviews),
            "issues_found": issues_count,
            "approval_count": approved,
            "top_badges": badges[:3]
        })
    
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return {
        "leaderboard": leaderboard,
        "course_name": course["name"],
        "participant_count": len(leaderboard)
    }

# ============ PROFILE ENDPOINT ============

@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str, course_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get a user's public profile with badges, XP, and level. Respects privacy settings."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    xp = user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    badges = user.get("badges", [])
    role = user.get("role", "student")
    
    # Get display name - check if they have a leaderboard nickname for the given course
    display_name = user.get("full_name", "Anonymous")
    is_self = user_id == current_user["id"]
    
    if course_id and not is_self:
        lb_settings = await db.leaderboard_settings.find_one(
            {"user_id": user_id, "course_id": course_id, "joined": True}, {"_id": 0}
        )
        if lb_settings:
            display_name = lb_settings.get("nickname", display_name)
        else:
            display_name = "Private User"
    
    # Badge details
    badge_defs = STUDENT_BADGES if role == "student" else MARKER_BADGES
    badges_detail = [{"id": b, **badge_defs.get(b, {"name": b, "description": "", "xp": 0})} for b in badges if b in badge_defs]
    
    # Role-specific stats
    stats = {}
    if role == "student":
        subs = await db.submissions.find({"student_id": user_id}, {"_id": 0}).to_list(200)
        sub_ids = [s["id"] for s in subs]
        all_issues = await db.feedback_issues.find({"submission_id": {"$in": sub_ids}}, {"_id": 0}).to_list(500)
        stats = {
            "submissions_count": len(subs),
            "issues_fixed": len([i for i in all_issues if i.get("student_status") == "fixed"]),
            "perfect_submissions": len([s for s in subs if s.get("status") == "no_issues"]),
        }
    else:
        reviews = await db.submissions.count_documents({"reviewed_by": user_id})
        issues = await db.feedback_issues.count_documents({"marker_id": user_id})
        templates = await db.issue_templates.count_documents({"created_by": user_id})
        stats = {
            "reviews_count": reviews,
            "issues_created": issues,
            "templates_created": templates,
        }
    
    # Calculate level progress
    current_threshold = 0
    next_threshold = 100
    for lvl, threshold, _ in LEVEL_THRESHOLDS:
        if xp >= threshold:
            current_threshold = threshold
        if threshold > xp:
            next_threshold = threshold
            break
    level_progress = ((xp - current_threshold) / (next_threshold - current_threshold)) * 100 if next_threshold > current_threshold else 100
    
    # Modules they're on the leaderboard for
    lb_entries = await db.leaderboard_settings.find(
        {"user_id": user_id, "joined": True}, {"_id": 0}
    ).to_list(50)
    active_modules = []
    for lb in lb_entries:
        c = await db.courses.find_one({"id": lb["course_id"]}, {"_id": 0, "name": 1, "id": 1})
        if c:
            active_modules.append({"course_id": c["id"], "course_name": c["name"], "nickname": lb["nickname"]})
    
    return {
        "user_id": user_id,
        "display_name": display_name,
        "role": role,
        "xp": xp,
        "level": level,
        "level_title": title,
        "level_progress": round(level_progress, 1),
        "xp_to_next_level": xp_to_next,
        "badges": badges_detail,
        "badges_count": len(badges),
        "total_badges_available": len(badge_defs),
        "stats": stats,
        "active_modules": active_modules,
        "is_self": is_self,
        "member_since": user.get("created_at", "")
    }

# ============ HEALTH ============

@api_router.get("/")
async def root():
    return {"message": "CodeFeedback Studio API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
