from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
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
    due_date: Optional[str] = None
    max_attempts: int = -1
    marks_release_date: Optional[str] = None  # Scheduled release
    total_marks: int = 100

class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    course_name: Optional[str] = None
    title: str
    description: str
    due_date: Optional[str]
    is_past_deadline: bool = False
    max_attempts: int
    total_marks: int = 100
    marks_release_date: Optional[str] = None
    marking_scheme_url: Optional[str] = None
    created_at: str

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
    if current_user["role"] not in ["moderator", "module_leader"]:
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
    "bug_squasher": {"name": "Bug Squasher", "description": "Fix 10 issues", "icon": "bug", "xp": 100},
    "quick_learner": {"name": "Quick Learner", "description": "Fix an issue within 24 hours", "icon": "zap", "xp": 75},
    "perfectionist": {"name": "Perfectionist", "description": "Get a submission with no issues", "icon": "star", "xp": 150},
    "consistent": {"name": "Consistent Performer", "description": "Submit 5 assignments on time", "icon": "calendar", "xp": 100},
    "improver": {"name": "Rapid Improver", "description": "Improve score by 20% on resubmission", "icon": "trending-up", "xp": 125},
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
}

LEVEL_THRESHOLDS = [
    (1, 0, "Novice"), (2, 100, "Beginner"), (3, 300, "Learner"),
    (4, 600, "Practitioner"), (5, 1000, "Competent"), (6, 1500, "Proficient"),
    (7, 2200, "Advanced"), (8, 3000, "Expert"), (9, 4000, "Master"),
    (10, 5200, "Grandmaster"),
]

def get_level_info(xp: int) -> tuple:
    level, title = 1, "Novice"
    next_level_xp = 100
    for lvl, threshold, lvl_title in LEVEL_THRESHOLDS:
        if xp >= threshold:
            level, title = lvl, lvl_title
    for lvl, threshold, _ in LEVEL_THRESHOLDS:
        if threshold > xp:
            next_level_xp = threshold - xp
            break
    else:
        next_level_xp = 0
    return level, title, next_level_xp

async def award_badge(user_id: str, badge_id: str, badge_type: str = "student"):
    badges = STUDENT_BADGES if badge_type == "student" else MARKER_BADGES
    if badge_id not in badges:
        return
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or badge_id in user.get("badges", []):
        return
    badge = badges[badge_id]
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"badges": badge_id}, "$inc": {"xp": badge["xp"]}}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "badge_earned",
        "title": f"Badge Earned: {badge['name']}",
        "message": badge["description"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

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
    for c in courses:
        if "leader_id" not in c:
            continue
        student_count = await db.users.count_documents({"role": "student", "course_ids": c["id"]})
        leader = await db.users.find_one({"id": c.get("leader_id")}, {"_id": 0})
        collaborators = []
        for coll_id in c.get("collaborator_ids", []):
            coll = await db.users.find_one({"id": coll_id}, {"_id": 0})
            if coll:
                collaborators.append({"id": coll_id, "name": coll["full_name"]})
        moderators = []
        for mod_id in c.get("moderator_ids", []):
            mod = await db.users.find_one({"id": mod_id}, {"_id": 0})
            if mod:
                moderators.append({"id": mod_id, "name": mod["full_name"]})
        result.append({
            "id": c["id"], "name": c["name"], "code": c.get("code", ""),
            "description": c.get("description", ""), "year": c.get("year"),
            "semester": c.get("semester", ""), "leader_id": c.get("leader_id", ""),
            "leader_name": leader["full_name"] if leader else "Unknown",
            "collaborator_ids": c.get("collaborator_ids", []),
            "moderator_ids": c.get("moderator_ids", []),
            "collaborators": collaborators, "moderators": moderators,
            "created_at": c.get("created_at", ""), "student_count": student_count
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
    assignment_doc = {
        "id": assignment_id, "course_id": assignment_data.course_id,
        "title": assignment_data.title, "description": assignment_data.description or "",
        "due_date": assignment_data.due_date, "max_attempts": assignment_data.max_attempts,
        "total_marks": assignment_data.total_marks,
        "marks_release_date": assignment_data.marks_release_date,
        "marking_scheme_url": None, "created_at": now
    }
    await db.assignments.insert_one(assignment_doc)
    # Return without _id which gets added by MongoDB
    return {
        "id": assignment_id, "course_id": assignment_data.course_id,
        "title": assignment_data.title, "description": assignment_data.description or "",
        "due_date": assignment_data.due_date, "max_attempts": assignment_data.max_attempts,
        "total_marks": assignment_data.total_marks,
        "marks_release_date": assignment_data.marks_release_date,
        "marking_scheme_url": None, "created_at": now,
        "course_name": course["name"], "is_past_deadline": False
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
    for a in assignments:
        course = await db.courses.find_one({"id": a["course_id"]}, {"_id": 0})
        result.append({
            **a, "course_name": course["name"] if course else "Unknown",
            "is_past_deadline": is_past_deadline(a.get("due_date"))
        })
    return result

@api_router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    return {**assignment, "course_name": course["name"] if course else "Unknown", "is_past_deadline": is_past_deadline(assignment.get("due_date"))}

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
    if is_past_deadline(assignment.get("due_date")):
        raise HTTPException(status_code=403, detail="Submissions closed")
    
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
    now = datetime.now(timezone.utc).isoformat()
    files = [{"id": str(uuid.uuid4()), "filename": f.filename, "content": f.content} for f in submission_data.files]
    
    submission_doc = {
        "id": submission_id, "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"], "files": files, "status": "pending",
        "attempt_number": attempt, "previous_submission_id": prev_subs[0]["id"] if prev_subs else None,
        "submission_time": now, "is_latest_attempt": True, "marks": None,
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
    if status_filter:
        query["status"] = status_filter
    
    # Moderation filtering
    if for_moderation and current_user["role"] in ["moderator", "module_leader"]:
        # Get failed + 10% random sample
        all_subs = await db.submissions.find(query, {"_id": 0}).to_list(1000)
        failed = [s for s in all_subs if s.get("status") == "feedback_released" and (s.get("marks", 100) < 50)]
        passed = [s for s in all_subs if s.get("status") == "feedback_released" and (s.get("marks", 100) >= 50)]
        sample_size = max(1, len(passed) // 10)
        random_sample = random.sample(passed, min(sample_size, len(passed))) if passed else []
        submissions = failed + random_sample
    else:
        submissions = await db.submissions.find(query, {"_id": 0}).sort("submission_time", -1).to_list(500)
    
    result = []
    for sub in submissions:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0})
        reviewer = await db.users.find_one({"id": sub.get("reviewed_by")}, {"_id": 0}) if sub.get("reviewed_by") else None
        issues_count = await db.feedback_issues.count_documents({"submission_id": sub["id"]})
        result.append({
            **sub, "student_name": student["full_name"] if student else "Unknown",
            "reviewed_by_name": reviewer["full_name"] if reviewer else None,
            "issues_count": issues_count,
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
    
    # Award marker badges and XP
    reviews_count = await db.submissions.count_documents({"reviewed_by": current_user["id"]})
    
    # Award XP for completing review
    xp_gained = 25  # Base XP for grading
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"xp": xp_gained}})
    
    if reviews_count == 1:
        await award_badge(current_user["id"], "first_review", "marker")
    if reviews_count >= 10:
        await award_badge(current_user["id"], "speed_reviewer", "marker")
    
    return {"message": "Graded successfully", "marks": grade_data.marks, "xp_gained": xp_gained}

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
    assignment = await db.assignments.find_one({"id": (await db.submissions.find_one({"id": submission_id}))["assignment_id"]}, {"_id": 0})
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
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"xp": xp_gained}})
    
    # Check for first review badge
    reviews_count = await db.submissions.count_documents({"reviewed_by": current_user["id"]})
    if reviews_count == 1:
        await award_badge(current_user["id"], "first_review", "marker")
    
    return {"message": "Marked as correct", "status": "no_issues", "xp_gained": xp_gained}

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
        "created_by": current_user["id"], "usage_count": 0
    }
    await db.issue_templates.insert_one(template_doc)
    
    # Check for badge
    template_count = await db.issue_templates.count_documents({"created_by": current_user["id"]})
    if template_count >= 10:
        await award_badge(current_user["id"], "feedback_master", "marker")
    
    return template_doc

@api_router.get("/issue-templates")
async def get_issue_templates(current_user: dict = Depends(require_marker)):
    templates = await db.issue_templates.find({}, {"_id": 0}).to_list(100)
    result = []
    for t in templates:
        category = await db.issue_categories.find_one({"id": t["category_id"]}, {"_id": 0})
        result.append({**t, "category_name": category["name"] if category else "Unknown"})
    return result

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
    
    for cid in course_ids:
        course = await db.courses.find_one({"id": cid}, {"_id": 0})
        if not course:
            continue
        assignments = await db.assignments.find({"course_id": cid}, {"_id": 0}).to_list(100)
        submissions = await db.submissions.find({
            "assignment_id": {"$in": [a["id"] for a in assignments]},
            "student_id": current_user["id"]
        }, {"_id": 0}).to_list(100)
        
        total_marks = sum(s.get("marks", 0) for s in submissions if s.get("marks_released"))
        max_marks = len([s for s in submissions if s.get("marks_released")]) * 100
        
        courses_progress.append({
            "course_id": cid, "course_name": course["name"],
            "total_submissions": len(submissions),
            "average_marks": round(total_marks / max_marks * 100, 1) if max_marks > 0 else 0
        })
    
    return {
        "total_xp": xp, "level": level, "level_title": title,
        "badges": current_user.get("badges", []),
        "courses": courses_progress
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
    xp = current_user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    user_badges = current_user.get("badges", [])
    
    # Get recent XP gains from notifications
    recent_gains = await db.notifications.find(
        {"user_id": current_user["id"], "type": "badge_earned"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    recent_xp_gains = [
        {"reason": n.get("title", "Badge earned"), "xp_gained": 50, "date": n.get("created_at")}
        for n in recent_gains
    ]
    
    if current_user["role"] == "student":
        # Student-specific stats
        submissions = await db.submissions.find(
            {"student_id": current_user["id"]}, {"_id": 0}
        ).to_list(100)
        
        issues = await db.feedback_issues.find(
            {"submission_id": {"$in": [s["id"] for s in submissions]}}, {"_id": 0}
        ).to_list(500)
        
        issues_fixed = len([i for i in issues if i.get("student_status") == "fixed"])
        
        return {
            "xp": xp,
            "total_xp": xp,
            "level": level,
            "level_title": title,
            "xp_to_next_level": xp_to_next,
            "badges": user_badges,
            "badges_earned": [{"id": b, **STUDENT_BADGES.get(b, {})} for b in user_badges if b in STUDENT_BADGES],
            "issues_fixed": issues_fixed,
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
        
        return {
            "xp": xp,
            "total_xp": xp,
            "level": level,
            "level_title": title,
            "xp_to_next_level": xp_to_next,
            "badges": user_badges,
            "badges_earned": [{"id": b, **MARKER_BADGES.get(b, {})} for b in user_badges if b in MARKER_BADGES],
            "total_reviews": reviews,
            "pending_reviews": pending,
            "recent_xp_gains": recent_xp_gains
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
