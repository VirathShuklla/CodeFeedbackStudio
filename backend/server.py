from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
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

# Create the main app
app = FastAPI(title="CodeFeedback Studio API")

# CORS Configuration - Must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"  # student or marker
    course_ids: Optional[List[str]] = []  # For students - can enroll in multiple courses

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    course_ids: List[str] = []  # Courses student is enrolled in
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
    collaborator_ids: Optional[List[str]] = None  # Leader can add/remove collaborators

class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    year: Optional[int]
    semester: str
    leader_id: str  # Course leader (head marker)
    leader_name: Optional[str] = None
    collaborator_ids: List[str] = []  # Collaborating markers
    collaborators: Optional[List[dict]] = []  # Names of collaborators
    created_at: str
    student_count: Optional[int] = 0

class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None  # ISO 8601 format with timezone
    max_attempts: int = -1  # -1 means unlimited

class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    course_name: Optional[str] = None
    title: str
    description: str
    due_date: Optional[str]
    is_past_deadline: bool = False
    max_attempts: int
    created_at: str

# Multi-file submission models
class SubmissionFileCreate(BaseModel):
    filename: str
    content: str

class SubmissionCreate(BaseModel):
    assignment_id: str
    files: List[SubmissionFileCreate]  # Multiple files

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
    status: str  # pending, in_review, feedback_released, no_issues
    attempt_number: int
    previous_submission_id: Optional[str]
    submission_time: str
    issues_count: Optional[int] = 0
    review_completed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    is_latest_attempt: bool = True

class IssueCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class IssueCategoryResponse(BaseModel):
    id: str
    name: str
    description: str

# Enhanced feedback with file-specific issues
class FeedbackIssueCreate(BaseModel):
    submission_id: str
    file_id: str  # Which file the issue is in
    category_id: str
    line_start: int
    line_end: int
    title: str
    explanation: str
    severity: Optional[str] = "moderate"  # minor, moderate, critical
    suggested_fix: Optional[str] = ""
    reference_links: Optional[List[str]] = []
    verification_criteria: Optional[str] = ""

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
    student_status: str  # open, fixed
    verification_criteria: str
    created_at: str
    resolution_timestamp: Optional[str] = None

class MarkNoIssuesRequest(BaseModel):
    submission_id: str
    marker_comment: Optional[str] = ""

# ============ ANALYTICS MODELS ============

class CourseAnalytics(BaseModel):
    course_id: str
    course_name: str
    total_submissions: int
    pending_reviews: int
    in_review_count: int
    completed_reviews: int
    no_issues_count: int
    avg_turnaround_hours: Optional[float] = None
    total_students: int = 0
    most_common_issues: List[dict] = []
    submissions_by_assignment: List[dict] = []

class MarkerAnalyticsResponse(BaseModel):
    total_feedback_given: int
    total_pending_reviews: int
    active_courses: int
    courses: List[CourseAnalytics]
    # Leader-only: collaborator activity
    collaborator_activity: Optional[List[dict]] = None

class StudentCourseProgress(BaseModel):
    course_id: str
    course_name: str
    total_submissions: int
    total_issues: int
    fixed_issues: int
    open_issues: int
    assignments_completed: int
    total_assignments: int
    issues_by_category: dict
    improvement_trend: List[dict]

class StudentAnalyticsResponse(BaseModel):
    total_xp: int = 0
    level: int = 1
    level_title: str = "Novice Coder"
    badges: List[dict] = []
    courses: List[StudentCourseProgress] = []
    overall_stats: dict = {}

# ============ GAMIFICATION MODELS ============

class BadgeResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str
    earned_at: Optional[str] = None
    progress: Optional[int] = 0
    target: Optional[int] = 0

class GamificationStatsResponse(BaseModel):
    xp: int
    level: int
    level_title: str
    xp_to_next_level: int
    badges_earned: List[BadgeResponse]
    badges_in_progress: List[BadgeResponse]
    recent_xp_gains: List[dict]

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
    now = datetime.now(timezone.utc)
    return now > (deadline + timedelta(minutes=1))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Ensure course_ids exists for backward compatibility
    if "course_ids" not in user:
        user["course_ids"] = [user.get("course_id")] if user.get("course_id") else []
    return user

async def require_marker(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "marker":
        raise HTTPException(status_code=403, detail="Marker access required")
    return current_user

async def require_student(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

# ============ PERMISSION HELPERS ============

async def can_access_course(user: dict, course_id: str) -> bool:
    """Check if user has access to a course"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        return False
    
    if user["role"] == "marker":
        # Leader or collaborator
        return course["leader_id"] == user["id"] or user["id"] in course.get("collaborator_ids", [])
    elif user["role"] == "student":
        # Enrolled in course
        return course_id in user.get("course_ids", [])
    return False

async def is_course_leader(user: dict, course_id: str) -> bool:
    """Check if user is the course leader"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return course and course["leader_id"] == user["id"]

async def get_accessible_course_ids(user: dict) -> List[str]:
    """Get list of course IDs the user can access"""
    if user["role"] == "marker":
        # Get courses where user is leader or collaborator
        courses = await db.courses.find({
            "$or": [
                {"leader_id": user["id"]},
                {"collaborator_ids": user["id"]}
            ]
        }, {"_id": 0, "id": 1}).to_list(100)
        return [c["id"] for c in courses]
    elif user["role"] == "student":
        return user.get("course_ids", [])
    return []

# ============ XP & LEVEL SYSTEM ============

LEVEL_THRESHOLDS = [
    (1, 0, "Novice Coder"),
    (2, 100, "Bug Spotter"),
    (3, 300, "Issue Resolver"),
    (4, 600, "Apprentice Debugger"),
    (5, 1000, "Competent Reviewer"),
    (6, 1500, "Code Analyst"),
    (7, 2200, "Quality Advocate"),
    (8, 3000, "Refactoring Specialist"),
    (9, 4000, "Software Craftsman"),
    (10, 5200, "Engineering Practitioner"),
    (11, 6600, "Code Quality Expert"),
    (12, 8200, "Senior Practitioner"),
    (13, 10000, "Principal Developer"),
    (14, 12500, "Distinguished Engineer"),
    (15, 15000, "Master Craftsman"),
]

def get_level_info(xp: int) -> tuple:
    """Get level and title for XP amount"""
    level, title = 1, "Novice Coder"
    next_level_xp = 100
    
    for lvl, threshold, lvl_title in LEVEL_THRESHOLDS:
        if xp >= threshold:
            level = lvl
            title = lvl_title
    
    # Find next level threshold
    for lvl, threshold, _ in LEVEL_THRESHOLDS:
        if threshold > xp:
            next_level_xp = threshold - xp
            break
    else:
        next_level_xp = 0  # Max level
    
    return level, title, next_level_xp

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Students can optionally select courses during registration
    course_ids = user_data.course_ids or []
    if user_data.role == "student" and course_ids:
        # Verify all courses exist
        for cid in course_ids:
            course = await db.courses.find_one({"id": cid}, {"_id": 0})
            if not course:
                raise HTTPException(status_code=400, detail=f"Course {cid} does not exist")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "course_ids": course_ids if user_data.role == "student" else [],
        "xp": 0,
        "badges": [],
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        course_ids=user_doc["course_ids"],
        created_at=now
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["email"], user["role"])
    
    # Backward compatibility
    course_ids = user.get("course_ids", [])
    if not course_ids and user.get("course_id"):
        course_ids = [user["course_id"]]
    
    return {
        "token": token,
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            course_ids=course_ids,
            created_at=user["created_at"]
        )
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        course_ids=current_user.get("course_ids", []),
        created_at=current_user["created_at"]
    )

# ============ PUBLIC ENDPOINTS ============

@api_router.get("/public/courses", response_model=List[CourseResponse])
async def get_courses_public():
    """Public endpoint to list courses for student registration."""
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for c in courses:
        student_count = await db.users.count_documents({
            "role": "student",
            "course_ids": c["id"]
        })
        leader = await db.users.find_one({"id": c["leader_id"]}, {"_id": 0})
        result.append(CourseResponse(
            id=c["id"],
            name=c["name"],
            code=c.get("code", ""),
            description=c.get("description", ""),
            year=c.get("year"),
            semester=c.get("semester", ""),
            leader_id=c["leader_id"],
            leader_name=leader["full_name"] if leader else "Unknown",
            collaborator_ids=c.get("collaborator_ids", []),
            created_at=c["created_at"],
            student_count=student_count
        ))
    
    return result

@api_router.get("/public/markers", response_model=List[dict])
async def get_markers_public():
    """Public endpoint to list markers for course collaboration."""
    markers = await db.users.find({"role": "marker"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [{"id": m["id"], "full_name": m["full_name"], "email": m["email"]} for m in markers]

# ============ COURSE ENDPOINTS ============

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, current_user: dict = Depends(require_marker)):
    """Create a course. The creator becomes the Course Leader."""
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    course_doc = {
        "id": course_id,
        "name": course_data.name,
        "code": course_data.code or "",
        "description": course_data.description or "",
        "year": course_data.year,
        "semester": course_data.semester or "",
        "leader_id": current_user["id"],  # Creator is the leader
        "collaborator_ids": [],  # Empty initially
        "created_at": now
    }
    
    await db.courses.insert_one(course_doc)
    
    return CourseResponse(
        **course_doc,
        leader_name=current_user["full_name"],
        collaborators=[],
        student_count=0
    )

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(current_user: dict = Depends(get_current_user)):
    """Get courses based on user role and access."""
    if current_user["role"] == "marker":
        # Markers see courses they lead or collaborate on
        courses = await db.courses.find({
            "$or": [
                {"leader_id": current_user["id"]},
                {"collaborator_ids": current_user["id"]}
            ]
        }, {"_id": 0}).to_list(100)
    else:
        # Students see all courses for potential enrollment
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for c in courses:
        student_count = await db.users.count_documents({
            "role": "student",
            "course_ids": c["id"]
        })
        leader = await db.users.find_one({"id": c["leader_id"]}, {"_id": 0})
        
        # Get collaborator names
        collaborators = []
        for coll_id in c.get("collaborator_ids", []):
            coll = await db.users.find_one({"id": coll_id}, {"_id": 0})
            if coll:
                collaborators.append({"id": coll_id, "name": coll["full_name"]})
        
        result.append(CourseResponse(
            id=c["id"],
            name=c["name"],
            code=c.get("code", ""),
            description=c.get("description", ""),
            year=c.get("year"),
            semester=c.get("semester", ""),
            leader_id=c["leader_id"],
            leader_name=leader["full_name"] if leader else "Unknown",
            collaborator_ids=c.get("collaborator_ids", []),
            collaborators=collaborators,
            created_at=c["created_at"],
            student_count=student_count
        ))
    
    return result

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Access control
    if current_user["role"] == "marker":
        if not await can_access_course(current_user, course_id):
            raise HTTPException(status_code=403, detail="Access denied")
    
    student_count = await db.users.count_documents({
        "role": "student",
        "course_ids": course_id
    })
    leader = await db.users.find_one({"id": course["leader_id"]}, {"_id": 0})
    
    collaborators = []
    for coll_id in course.get("collaborator_ids", []):
        coll = await db.users.find_one({"id": coll_id}, {"_id": 0})
        if coll:
            collaborators.append({"id": coll_id, "name": coll["full_name"]})
    
    return CourseResponse(
        id=course["id"],
        name=course["name"],
        code=course.get("code", ""),
        description=course.get("description", ""),
        year=course.get("year"),
        semester=course.get("semester", ""),
        leader_id=course["leader_id"],
        leader_name=leader["full_name"] if leader else "Unknown",
        collaborator_ids=course.get("collaborator_ids", []),
        collaborators=collaborators,
        created_at=course["created_at"],
        student_count=student_count
    )

@api_router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, course_data: CourseUpdate, current_user: dict = Depends(require_marker)):
    """Update course. Only leader can update collaborators."""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    is_leader = course["leader_id"] == current_user["id"]
    is_collaborator = current_user["id"] in course.get("collaborator_ids", [])
    
    if not is_leader and not is_collaborator:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_doc = {}
    if course_data.name is not None:
        update_doc["name"] = course_data.name
    if course_data.code is not None:
        update_doc["code"] = course_data.code
    if course_data.description is not None:
        update_doc["description"] = course_data.description
    if course_data.year is not None:
        update_doc["year"] = course_data.year
    if course_data.semester is not None:
        update_doc["semester"] = course_data.semester
    
    # Only leader can modify collaborators
    if course_data.collaborator_ids is not None:
        if not is_leader:
            raise HTTPException(status_code=403, detail="Only course leader can modify collaborators")
        # Verify all collaborators are markers
        for coll_id in course_data.collaborator_ids:
            coll = await db.users.find_one({"id": coll_id, "role": "marker"}, {"_id": 0})
            if not coll:
                raise HTTPException(status_code=400, detail=f"User {coll_id} is not a marker")
        update_doc["collaborator_ids"] = course_data.collaborator_ids
    
    if update_doc:
        await db.courses.update_one({"id": course_id}, {"$set": update_doc})
    
    return await get_course(course_id, current_user)

# ============ STUDENT COURSE ENROLLMENT ============

@api_router.post("/students/enroll/{course_id}")
async def enroll_in_course(course_id: str, current_user: dict = Depends(require_student)):
    """Enroll student in a course."""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    current_courses = current_user.get("course_ids", [])
    if course_id in current_courses:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"course_ids": course_id}}
    )
    
    return {"message": f"Enrolled in {course['name']}", "course_id": course_id}

@api_router.delete("/students/enroll/{course_id}")
async def unenroll_from_course(course_id: str, current_user: dict = Depends(require_student)):
    """Unenroll student from a course."""
    current_courses = current_user.get("course_ids", [])
    if course_id not in current_courses:
        raise HTTPException(status_code=400, detail="Not enrolled in this course")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"course_ids": course_id}}
    )
    
    return {"message": "Unenrolled from course", "course_id": course_id}

@api_router.get("/students/courses", response_model=List[CourseResponse])
async def get_enrolled_courses(current_user: dict = Depends(require_student)):
    """Get student's enrolled courses."""
    course_ids = current_user.get("course_ids", [])
    if not course_ids:
        return []
    
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(100)
    
    result = []
    for c in courses:
        leader = await db.users.find_one({"id": c["leader_id"]}, {"_id": 0})
        result.append(CourseResponse(
            id=c["id"],
            name=c["name"],
            code=c.get("code", ""),
            description=c.get("description", ""),
            year=c.get("year"),
            semester=c.get("semester", ""),
            leader_id=c["leader_id"],
            leader_name=leader["full_name"] if leader else "Unknown",
            collaborator_ids=c.get("collaborator_ids", []),
            created_at=c["created_at"]
        ))
    
    return result

# ============ ASSIGNMENT ENDPOINTS ============

@api_router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(assignment_data: AssignmentCreate, current_user: dict = Depends(require_marker)):
    """Create assignment. Only course leader can create assignments."""
    course = await db.courses.find_one({"id": assignment_data.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Only leader can create assignments
    if course["leader_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only course leader can create assignments")
    
    assignment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    assignment_doc = {
        "id": assignment_id,
        "course_id": assignment_data.course_id,
        "title": assignment_data.title,
        "description": assignment_data.description or "",
        "due_date": assignment_data.due_date,
        "max_attempts": assignment_data.max_attempts,
        "created_at": now
    }
    
    await db.assignments.insert_one(assignment_doc)
    
    return AssignmentResponse(
        **assignment_doc,
        course_name=course["name"],
        is_past_deadline=is_past_deadline(assignment_data.due_date)
    )

@api_router.put("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    assignment_data: AssignmentCreate,
    current_user: dict = Depends(require_marker)
):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course["leader_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only course leader can update assignments")
    
    update_doc = {
        "title": assignment_data.title,
        "description": assignment_data.description or "",
        "due_date": assignment_data.due_date,
        "max_attempts": assignment_data.max_attempts
    }
    
    await db.assignments.update_one({"id": assignment_id}, {"$set": update_doc})
    
    updated = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    return AssignmentResponse(
        **updated,
        course_name=course["name"],
        is_past_deadline=is_past_deadline(updated.get("due_date"))
    )

@api_router.get("/assignments", response_model=List[AssignmentResponse])
async def get_assignments(course_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    accessible_course_ids = await get_accessible_course_ids(current_user)
    
    query = {}
    if course_id:
        if course_id not in accessible_course_ids:
            raise HTTPException(status_code=403, detail="Access denied")
        query["course_id"] = course_id
    else:
        if not accessible_course_ids:
            return []
        query["course_id"] = {"$in": accessible_course_ids}
    
    assignments = await db.assignments.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for a in assignments:
        course = await db.courses.find_one({"id": a["course_id"]}, {"_id": 0})
        result.append(AssignmentResponse(
            **a,
            course_name=course["name"] if course else "Unknown",
            is_past_deadline=is_past_deadline(a.get("due_date"))
        ))
    
    return result

@api_router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if not await can_access_course(current_user, assignment["course_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    
    return AssignmentResponse(
        **assignment,
        course_name=course["name"] if course else "Unknown",
        is_past_deadline=is_past_deadline(assignment.get("due_date"))
    )

# ============ ISSUE CATEGORIES ============

@api_router.post("/categories", response_model=IssueCategoryResponse)
async def create_category(category_data: IssueCategoryCreate, current_user: dict = Depends(require_marker)):
    category_id = str(uuid.uuid4())
    
    category_doc = {
        "id": category_id,
        "name": category_data.name,
        "description": category_data.description or ""
    }
    
    await db.issue_categories.insert_one(category_doc)
    
    return IssueCategoryResponse(**category_doc)

@api_router.get("/categories", response_model=List[IssueCategoryResponse])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.issue_categories.find({}, {"_id": 0}).to_list(100)
    
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Logic Error", "description": "Incorrect program logic or algorithm"},
            {"id": str(uuid.uuid4()), "name": "Style", "description": "Code style and formatting issues"},
            {"id": str(uuid.uuid4()), "name": "Efficiency", "description": "Performance and optimization issues"},
            {"id": str(uuid.uuid4()), "name": "Security", "description": "Security vulnerabilities"},
            {"id": str(uuid.uuid4()), "name": "Best Practice", "description": "Violation of coding best practices"},
            {"id": str(uuid.uuid4()), "name": "Documentation", "description": "Missing or inadequate documentation"}
        ]
        await db.issue_categories.insert_many(default_categories)
        categories = default_categories
    
    return [IssueCategoryResponse(**c) for c in categories]

# ============ MULTI-FILE SUBMISSION ENDPOINTS ============

@api_router.post("/submissions", response_model=SubmissionResponse)
async def create_submission(submission_data: SubmissionCreate, current_user: dict = Depends(require_student)):
    assignment = await db.assignments.find_one({"id": submission_data.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify student is enrolled in the course
    if assignment["course_id"] not in current_user.get("course_ids", []):
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")
    
    # Deadline enforcement
    if is_past_deadline(assignment.get("due_date")):
        raise HTTPException(
            status_code=403, 
            detail="Submissions are closed. Deadline has passed."
        )
    
    # Check attempt count
    prev_submissions = await db.submissions.find({
        "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"]
    }, {"_id": 0}).sort("attempt_number", -1).to_list(100)
    
    attempt_number = len(prev_submissions) + 1
    max_attempts = assignment.get("max_attempts", -1)
    
    if max_attempts > 0 and attempt_number > max_attempts:
        raise HTTPException(status_code=400, detail=f"Maximum attempts ({max_attempts}) reached")
    
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Mark previous submissions as not latest
    if prev_submissions:
        await db.submissions.update_many(
            {"assignment_id": submission_data.assignment_id, "student_id": current_user["id"]},
            {"$set": {"is_latest_attempt": False}}
        )
    
    # Create file documents
    files = []
    for f in submission_data.files:
        file_id = str(uuid.uuid4())
        files.append({
            "id": file_id,
            "filename": f.filename,
            "content": f.content
        })
    
    submission_doc = {
        "id": submission_id,
        "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"],
        "files": files,
        "status": "pending",
        "attempt_number": attempt_number,
        "previous_submission_id": prev_submissions[0]["id"] if prev_submissions else None,
        "submission_time": now,
        "is_latest_attempt": True,
        "review_completed_at": None,
        "reviewed_by": None,
        "marker_comment": None
    }
    
    await db.submissions.insert_one(submission_doc)
    
    return SubmissionResponse(
        id=submission_id,
        assignment_id=submission_data.assignment_id,
        student_id=current_user["id"],
        student_name=current_user["full_name"],
        files=[SubmissionFileResponse(**f) for f in files],
        status="pending",
        attempt_number=attempt_number,
        previous_submission_id=submission_doc["previous_submission_id"],
        submission_time=now,
        issues_count=0,
        is_latest_attempt=True
    )

@api_router.post("/submissions/upload")
async def upload_submission(
    assignment_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(require_student)
):
    """Upload multiple files for a submission."""
    # Validate files
    file_data = []
    for f in files:
        if not f.filename.endswith('.py'):
            raise HTTPException(status_code=400, detail=f"Only .py files are allowed. Got: {f.filename}")
        content = await f.read()
        file_data.append(SubmissionFileCreate(
            filename=f.filename,
            content=content.decode('utf-8')
        ))
    
    submission_data = SubmissionCreate(
        assignment_id=assignment_id,
        files=file_data
    )
    
    return await create_submission(submission_data, current_user)

@api_router.get("/submissions", response_model=List[SubmissionResponse])
async def get_submissions(
    assignment_id: Optional[str] = None,
    course_id: Optional[str] = None,
    student_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "student":
        query["student_id"] = current_user["id"]
    elif current_user["role"] == "marker":
        accessible_course_ids = await get_accessible_course_ids(current_user)
        
        if course_id:
            if course_id not in accessible_course_ids:
                raise HTTPException(status_code=403, detail="Access denied")
            course_assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
            query["assignment_id"] = {"$in": [a["id"] for a in course_assignments]}
        else:
            all_assignments = await db.assignments.find({"course_id": {"$in": accessible_course_ids}}, {"_id": 0}).to_list(500)
            query["assignment_id"] = {"$in": [a["id"] for a in all_assignments]}
        
        if student_id:
            query["student_id"] = student_id
    
    if assignment_id:
        query["assignment_id"] = assignment_id
    
    if status:
        query["status"] = status
    
    submissions = await db.submissions.find(query, {"_id": 0}).sort("submission_time", -1).to_list(500)
    
    result = []
    for sub in submissions:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0})
        issues_count = await db.feedback_issues.count_documents({"submission_id": sub["id"]})
        
        files = [SubmissionFileResponse(**f) for f in sub.get("files", [])]
        
        # Backward compatibility for single-file submissions
        if not files and sub.get("code_content"):
            files = [SubmissionFileResponse(
                id=str(uuid.uuid4()),
                filename=sub.get("filename", "main.py"),
                content=sub["code_content"]
            )]
        
        result.append(SubmissionResponse(
            id=sub["id"],
            assignment_id=sub["assignment_id"],
            student_id=sub["student_id"],
            student_name=student["full_name"] if student else "Unknown",
            files=files,
            status=sub["status"],
            attempt_number=sub.get("attempt_number", 1),
            previous_submission_id=sub.get("previous_submission_id"),
            submission_time=sub["submission_time"],
            issues_count=issues_count,
            review_completed_at=sub.get("review_completed_at"),
            reviewed_by=sub.get("reviewed_by"),
            is_latest_attempt=sub.get("is_latest_attempt", True)
        ))
    
    return result

@api_router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Access control
    if current_user["role"] == "student":
        if submission["student_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] == "marker":
        assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
        if not await can_access_course(current_user, assignment["course_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
    
    student = await db.users.find_one({"id": submission["student_id"]}, {"_id": 0})
    issues_count = await db.feedback_issues.count_documents({"submission_id": submission_id})
    
    files = [SubmissionFileResponse(**f) for f in submission.get("files", [])]
    if not files and submission.get("code_content"):
        files = [SubmissionFileResponse(
            id=str(uuid.uuid4()),
            filename=submission.get("filename", "main.py"),
            content=submission["code_content"]
        )]
    
    return SubmissionResponse(
        id=submission["id"],
        assignment_id=submission["assignment_id"],
        student_id=submission["student_id"],
        student_name=student["full_name"] if student else "Unknown",
        files=files,
        status=submission["status"],
        attempt_number=submission.get("attempt_number", 1),
        previous_submission_id=submission.get("previous_submission_id"),
        submission_time=submission["submission_time"],
        issues_count=issues_count,
        review_completed_at=submission.get("review_completed_at"),
        reviewed_by=submission.get("reviewed_by"),
        is_latest_attempt=submission.get("is_latest_attempt", True)
    )

@api_router.get("/submissions/{submission_id}/history", response_model=List[SubmissionResponse])
async def get_submission_history(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    history = await db.submissions.find({
        "assignment_id": submission["assignment_id"],
        "student_id": submission["student_id"]
    }, {"_id": 0}).sort("attempt_number", 1).to_list(100)
    
    result = []
    for sub in history:
        issues_count = await db.feedback_issues.count_documents({"submission_id": sub["id"]})
        files = [SubmissionFileResponse(**f) for f in sub.get("files", [])]
        result.append(SubmissionResponse(
            id=sub["id"],
            assignment_id=sub["assignment_id"],
            student_id=sub["student_id"],
            files=files,
            status=sub["status"],
            attempt_number=sub.get("attempt_number", 1),
            previous_submission_id=sub.get("previous_submission_id"),
            submission_time=sub["submission_time"],
            issues_count=issues_count,
            is_latest_attempt=sub.get("is_latest_attempt", False)
        ))
    
    return result

@api_router.patch("/submissions/{submission_id}/status")
async def update_submission_status(
    submission_id: str,
    status: str,
    current_user: dict = Depends(require_marker)
):
    valid_statuses = ["pending", "in_review", "feedback_released", "no_issues"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    result = await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Status updated", "status": status}

# ============ NO ISSUES ENDPOINT ============

@api_router.post("/submissions/{submission_id}/mark-no-issues")
async def mark_no_issues(
    submission_id: str,
    request: MarkNoIssuesRequest,
    current_user: dict = Depends(require_marker)
):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    if not await can_access_course(current_user, assignment["course_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "status": "no_issues",
            "review_completed_at": now,
            "reviewed_by": current_user["id"],
            "marker_comment": request.marker_comment or "No issues found. Code is correct."
        }}
    )
    
    return {
        "message": "Submission marked as fully correct",
        "status": "no_issues",
        "review_completed_at": now
    }

# ============ FEEDBACK ISSUE ENDPOINTS (File-Specific) ============

@api_router.post("/issues", response_model=FeedbackIssueResponse)
async def create_issue(issue_data: FeedbackIssueCreate, current_user: dict = Depends(require_marker)):
    submission = await db.submissions.find_one({"id": issue_data.submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    if not await can_access_course(current_user, assignment["course_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify file exists in submission
    file_exists = any(f["id"] == issue_data.file_id for f in submission.get("files", []))
    if not file_exists:
        raise HTTPException(status_code=400, detail="File not found in submission")
    
    issue_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    category = await db.issue_categories.find_one({"id": issue_data.category_id}, {"_id": 0})
    
    # Get filename
    filename = None
    for f in submission.get("files", []):
        if f["id"] == issue_data.file_id:
            filename = f["filename"]
            break
    
    issue_doc = {
        "id": issue_id,
        "submission_id": issue_data.submission_id,
        "file_id": issue_data.file_id,
        "marker_id": current_user["id"],
        "category_id": issue_data.category_id,
        "line_start": issue_data.line_start,
        "line_end": issue_data.line_end,
        "title": issue_data.title,
        "explanation": issue_data.explanation,
        "severity": issue_data.severity or "moderate",
        "suggested_fix": issue_data.suggested_fix or "",
        "reference_links": issue_data.reference_links or [],
        "student_status": "open",
        "verification_criteria": issue_data.verification_criteria or "",
        "created_at": now,
        "resolution_timestamp": None
    }
    
    await db.feedback_issues.insert_one(issue_doc)
    
    # Update submission status
    await db.submissions.update_one(
        {"id": issue_data.submission_id},
        {"$set": {"status": "in_review"}}
    )
    
    return FeedbackIssueResponse(
        **issue_doc,
        filename=filename,
        marker_name=current_user["full_name"],
        category_name=category["name"] if category else "Unknown"
    )

@api_router.get("/issues", response_model=List[FeedbackIssueResponse])
async def get_issues(
    submission_id: Optional[str] = None,
    file_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if submission_id:
        query["submission_id"] = submission_id
        
        if current_user["role"] == "student":
            submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
            if not submission:
                raise HTTPException(status_code=404, detail="Submission not found")
            if submission["student_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            if submission["status"] not in ["feedback_released", "no_issues"]:
                return []
    
    if file_id:
        query["file_id"] = file_id
    
    issues = await db.feedback_issues.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for issue in issues:
        category = await db.issue_categories.find_one({"id": issue["category_id"]}, {"_id": 0})
        marker = await db.users.find_one({"id": issue["marker_id"]}, {"_id": 0})
        
        # Get filename
        submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
        filename = None
        if submission:
            for f in submission.get("files", []):
                if f["id"] == issue["file_id"]:
                    filename = f["filename"]
                    break
        
        result.append(FeedbackIssueResponse(
            **issue,
            filename=filename,
            marker_name=marker["full_name"] if marker else "Unknown",
            category_name=category["name"] if category else "Unknown"
        ))
    
    return result

@api_router.get("/issues/{issue_id}", response_model=FeedbackIssueResponse)
async def get_issue(issue_id: str, current_user: dict = Depends(get_current_user)):
    issue = await db.feedback_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    category = await db.issue_categories.find_one({"id": issue["category_id"]}, {"_id": 0})
    marker = await db.users.find_one({"id": issue["marker_id"]}, {"_id": 0})
    
    submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
    filename = None
    if submission:
        for f in submission.get("files", []):
            if f["id"] == issue["file_id"]:
                filename = f["filename"]
                break
    
    return FeedbackIssueResponse(
        **issue,
        filename=filename,
        marker_name=marker["full_name"] if marker else "Unknown",
        category_name=category["name"] if category else "Unknown"
    )

@api_router.put("/issues/{issue_id}", response_model=FeedbackIssueResponse)
async def update_issue(
    issue_id: str,
    issue_data: FeedbackIssueCreate,
    current_user: dict = Depends(require_marker)
):
    update_doc = {
        "file_id": issue_data.file_id,
        "category_id": issue_data.category_id,
        "line_start": issue_data.line_start,
        "line_end": issue_data.line_end,
        "title": issue_data.title,
        "explanation": issue_data.explanation,
        "severity": issue_data.severity or "moderate",
        "suggested_fix": issue_data.suggested_fix or "",
        "reference_links": issue_data.reference_links or [],
        "verification_criteria": issue_data.verification_criteria or ""
    }
    
    result = await db.feedback_issues.update_one(
        {"id": issue_id},
        {"$set": update_doc}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return await get_issue(issue_id, current_user)

@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str, current_user: dict = Depends(require_marker)):
    result = await db.feedback_issues.delete_one({"id": issue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted"}

@api_router.post("/issues/{issue_id}/mark-fixed")
async def mark_issue_fixed(issue_id: str, current_user: dict = Depends(require_student)):
    issue = await db.feedback_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
    if submission["student_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.feedback_issues.update_one(
        {"id": issue_id},
        {"$set": {"student_status": "fixed", "resolution_timestamp": now}}
    )
    
    # Award XP for fixing issue (simplified version)
    xp_values = {"minor": 10, "moderate": 25, "critical": 50}
    xp_gained = xp_values.get(issue.get("severity", "moderate"), 10)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"xp": xp_gained}}
    )
    
    # Log XP gain
    await db.xp_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "xp_gained": xp_gained,
        "reason": f"Fixed {issue.get('severity', 'moderate')} issue: {issue['title']}",
        "issue_id": issue_id,
        "created_at": now
    })
    
    return {"message": "Issue marked as fixed", "xp_gained": xp_gained}

@api_router.post("/submissions/{submission_id}/publish")
async def publish_feedback(submission_id: str, current_user: dict = Depends(require_marker)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    if not await can_access_course(current_user, assignment["course_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "status": "feedback_released",
            "review_completed_at": now,
            "reviewed_by": current_user["id"]
        }}
    )
    
    return {"message": "Feedback published", "review_completed_at": now}

# ============ ANALYTICS ENDPOINTS ============

@api_router.get("/analytics/marker", response_model=MarkerAnalyticsResponse)
async def get_marker_analytics(
    course_id: Optional[str] = None,
    current_user: dict = Depends(require_marker)
):
    """Marker analytics - course-scoped, includes collaborator activity for leaders."""
    accessible_course_ids = await get_accessible_course_ids(current_user)
    
    if course_id:
        if course_id not in accessible_course_ids:
            raise HTTPException(status_code=403, detail="Access denied")
        accessible_course_ids = [course_id]
    
    courses = await db.courses.find({"id": {"$in": accessible_course_ids}}, {"_id": 0}).to_list(100)
    
    total_feedback_given = 0
    total_pending_reviews = 0
    courses_analytics = []
    collaborator_activity = []
    
    for course in courses:
        assignments = await db.assignments.find({"course_id": course["id"]}, {"_id": 0}).to_list(100)
        assignment_ids = [a["id"] for a in assignments]
        
        if not assignment_ids:
            courses_analytics.append(CourseAnalytics(
                course_id=course["id"],
                course_name=course["name"],
                total_submissions=0,
                pending_reviews=0,
                in_review_count=0,
                completed_reviews=0,
                no_issues_count=0,
                total_students=0
            ))
            continue
        
        submissions = await db.submissions.find(
            {"assignment_id": {"$in": assignment_ids}},
            {"_id": 0}
        ).to_list(1000)
        
        total_subs = len(submissions)
        pending = len([s for s in submissions if s["status"] == "pending"])
        in_review = len([s for s in submissions if s["status"] == "in_review"])
        completed = len([s for s in submissions if s["status"] == "feedback_released"])
        no_issues = len([s for s in submissions if s["status"] == "no_issues"])
        
        # Calculate turnaround time
        turnaround_times = []
        for s in submissions:
            if s.get("review_completed_at") and s.get("submission_time"):
                try:
                    submitted = parse_iso_datetime(s["submission_time"])
                    completed_at = parse_iso_datetime(s["review_completed_at"])
                    if submitted and completed_at:
                        delta = (completed_at - submitted).total_seconds() / 3600
                        turnaround_times.append(delta)
                except:
                    pass
        
        avg_turnaround = sum(turnaround_times) / len(turnaround_times) if turnaround_times else None
        
        # Student count
        student_count = await db.users.count_documents({
            "role": "student",
            "course_ids": course["id"]
        })
        
        # Most common issues
        submission_ids = [s["id"] for s in submissions]
        issues = await db.feedback_issues.find(
            {"submission_id": {"$in": submission_ids}},
            {"_id": 0}
        ).to_list(1000)
        
        category_counts = {}
        for issue in issues:
            cat_id = issue.get("category_id")
            category_counts[cat_id] = category_counts.get(cat_id, 0) + 1
        
        most_common = []
        for cat_id, count in sorted(category_counts.items(), key=lambda x: -x[1])[:5]:
            cat = await db.issue_categories.find_one({"id": cat_id}, {"_id": 0})
            most_common.append({"category": cat["name"] if cat else "Unknown", "count": count})
        
        # Submissions by assignment
        subs_by_assignment = []
        for a in assignments:
            a_subs = len([s for s in submissions if s["assignment_id"] == a["id"]])
            subs_by_assignment.append({"assignment": a["title"], "count": a_subs})
        
        feedback_count = len(issues)
        total_feedback_given += feedback_count + no_issues
        total_pending_reviews += pending
        
        courses_analytics.append(CourseAnalytics(
            course_id=course["id"],
            course_name=course["name"],
            total_submissions=total_subs,
            pending_reviews=pending,
            in_review_count=in_review,
            completed_reviews=completed,
            no_issues_count=no_issues,
            avg_turnaround_hours=round(avg_turnaround, 1) if avg_turnaround else None,
            total_students=student_count,
            most_common_issues=most_common,
            submissions_by_assignment=subs_by_assignment
        ))
        
        # Collaborator activity (for leaders)
        if course["leader_id"] == current_user["id"]:
            for coll_id in course.get("collaborator_ids", []):
                coll = await db.users.find_one({"id": coll_id}, {"_id": 0})
                if coll:
                    coll_issues = await db.feedback_issues.count_documents({
                        "marker_id": coll_id,
                        "submission_id": {"$in": submission_ids}
                    })
                    collaborator_activity.append({
                        "course_id": course["id"],
                        "course_name": course["name"],
                        "collaborator_id": coll_id,
                        "collaborator_name": coll["full_name"],
                        "issues_created": coll_issues
                    })
    
    return MarkerAnalyticsResponse(
        total_feedback_given=total_feedback_given,
        total_pending_reviews=total_pending_reviews,
        active_courses=len([c for c in courses_analytics if c.total_submissions > 0]),
        courses=courses_analytics,
        collaborator_activity=collaborator_activity if collaborator_activity else None
    )

@api_router.get("/analytics/student", response_model=StudentAnalyticsResponse)
async def get_student_analytics(current_user: dict = Depends(require_student)):
    """Student analytics - personal progress per course + gamification."""
    course_ids = current_user.get("course_ids", [])
    
    # Get XP and level info
    xp = current_user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    
    # Get badges (simplified)
    badges = current_user.get("badges", [])
    
    courses_progress = []
    total_submissions = 0
    total_issues = 0
    total_fixed = 0
    
    for course_id in course_ids:
        course = await db.courses.find_one({"id": course_id}, {"_id": 0})
        if not course:
            continue
        
        # Get assignments for course
        assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
        assignment_ids = [a["id"] for a in assignments]
        
        # Get student's submissions
        submissions = await db.submissions.find({
            "assignment_id": {"$in": assignment_ids},
            "student_id": current_user["id"]
        }, {"_id": 0}).to_list(100)
        
        submission_ids = [s["id"] for s in submissions]
        
        # Get issues for released feedback
        released_submission_ids = [
            s["id"] for s in submissions 
            if s["status"] in ["feedback_released", "no_issues"]
        ]
        
        issues = await db.feedback_issues.find(
            {"submission_id": {"$in": released_submission_ids}},
            {"_id": 0}
        ).to_list(500)
        
        course_issues = len(issues)
        fixed_issues = len([i for i in issues if i.get("student_status") == "fixed"])
        open_issues = course_issues - fixed_issues
        
        # Count by category
        categories_count = {}
        for issue in issues:
            cat_id = issue.get("category_id", "unknown")
            category = await db.issue_categories.find_one({"id": cat_id}, {"_id": 0})
            cat_name = category["name"] if category else "Unknown"
            categories_count[cat_name] = categories_count.get(cat_name, 0) + 1
        
        # Assignments completed
        completed_assignments = set()
        for sub in submissions:
            if sub["status"] in ["feedback_released", "no_issues"]:
                completed_assignments.add(sub["assignment_id"])
        
        # Improvement trend
        improvement_trend = []
        for sub in sorted(submissions, key=lambda x: x.get("submission_time", "")):
            if sub["status"] in ["feedback_released", "no_issues"]:
                sub_issues = [i for i in issues if i["submission_id"] == sub["id"]]
                improvement_trend.append({
                    "submission_id": sub["id"],
                    "attempt_number": sub.get("attempt_number", 1),
                    "total_issues": len(sub_issues),
                    "fixed_issues": len([i for i in sub_issues if i.get("student_status") == "fixed"]),
                    "status": sub["status"]
                })
        
        courses_progress.append(StudentCourseProgress(
            course_id=course_id,
            course_name=course["name"],
            total_submissions=len(submissions),
            total_issues=course_issues,
            fixed_issues=fixed_issues,
            open_issues=open_issues,
            assignments_completed=len(completed_assignments),
            total_assignments=len(assignments),
            issues_by_category=categories_count,
            improvement_trend=improvement_trend
        ))
        
        total_submissions += len(submissions)
        total_issues += course_issues
        total_fixed += fixed_issues
    
    return StudentAnalyticsResponse(
        total_xp=xp,
        level=level,
        level_title=title,
        badges=[{"id": b, "name": b, "earned": True} for b in badges],
        courses=courses_progress,
        overall_stats={
            "total_submissions": total_submissions,
            "total_issues": total_issues,
            "fixed_issues": total_fixed,
            "open_issues": total_issues - total_fixed,
            "fix_rate": round(total_fixed / total_issues * 100, 1) if total_issues > 0 else 0
        }
    )

@api_router.get("/gamification/stats", response_model=GamificationStatsResponse)
async def get_gamification_stats(current_user: dict = Depends(require_student)):
    """Get student's gamification stats - XP, level, badges."""
    xp = current_user.get("xp", 0)
    level, title, xp_to_next = get_level_info(xp)
    
    # Get recent XP gains
    recent_xp = await db.xp_logs.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # TODO: Implement full badge system
    # For now, return basic badges based on XP milestones
    earned_badges = []
    in_progress_badges = []
    
    if xp >= 100:
        earned_badges.append(BadgeResponse(
            id="first_100_xp",
            name="Getting Started",
            description="Earned your first 100 XP",
            category="milestone",
            icon="star",
            earned_at=current_user.get("created_at")
        ))
    else:
        in_progress_badges.append(BadgeResponse(
            id="first_100_xp",
            name="Getting Started",
            description="Earn your first 100 XP",
            category="milestone",
            icon="star",
            progress=xp,
            target=100
        ))
    
    return GamificationStatsResponse(
        xp=xp,
        level=level,
        level_title=title,
        xp_to_next_level=xp_to_next,
        badges_earned=earned_badges,
        badges_in_progress=in_progress_badges,
        recent_xp_gains=recent_xp
    )

# ============ DEADLINE CHECK ENDPOINT ============

@api_router.get("/assignments/{assignment_id}/deadline-status")
async def check_deadline_status(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    due_date = assignment.get("due_date")
    past_deadline = is_past_deadline(due_date)
    
    return {
        "assignment_id": assignment_id,
        "due_date": due_date,
        "is_past_deadline": past_deadline,
        "submissions_open": not past_deadline,
        "server_time_utc": datetime.now(timezone.utc).isoformat()
    }

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "CodeFeedback Studio API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
