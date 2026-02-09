from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"  # student or marker
    course_id: Optional[str] = None  # Required for students

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    course_id: Optional[str] = None
    created_at: str

class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = ""  # e.g., "CS101"
    description: Optional[str] = ""
    year: Optional[int] = None
    semester: Optional[str] = ""

class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    year: Optional[int]
    semester: str
    marker_id: str
    marker_name: Optional[str] = None
    created_at: str
    student_count: Optional[int] = 0

class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None  # ISO 8601 format with timezone
    max_attempts: int = 3

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

class SubmissionCreate(BaseModel):
    assignment_id: str
    code_content: str
    filename: Optional[str] = "main.py"

class SubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    student_name: Optional[str] = None
    code_content: str
    filename: str
    status: str  # pending, in_review, feedback_released, no_issues
    attempt_number: int
    previous_submission_id: Optional[str]
    submission_time: str
    issues_count: Optional[int] = 0
    review_completed_at: Optional[str] = None
    reviewed_by: Optional[str] = None

class IssueCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class IssueCategoryResponse(BaseModel):
    id: str
    name: str
    description: str

class FeedbackIssueCreate(BaseModel):
    submission_id: str
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
    marker_id: str
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

# ============ ANALYTICS MODELS (Course-Scoped) ============

class CourseAnalytics(BaseModel):
    course_id: str
    course_name: str
    total_submissions: int
    pending_reviews: int
    in_review_count: int
    completed_reviews: int
    no_issues_count: int
    avg_turnaround_hours: Optional[float] = None

class MarkerAnalyticsResponse(BaseModel):
    # Overall marker stats
    total_feedback_given: int
    total_pending_reviews: int
    active_courses: int
    # Per-course breakdown
    courses: List[CourseAnalytics]

class StudentProgressResponse(BaseModel):
    total_submissions: int
    total_issues: int
    fixed_issues: int
    open_issues: int
    issues_by_category: dict
    improvement_trend: List[dict]

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
    """Parse ISO 8601 datetime string to timezone-aware datetime."""
    if not iso_string:
        return None
    try:
        # Handle both formats: with and without timezone
        if iso_string.endswith('Z'):
            iso_string = iso_string[:-1] + '+00:00'
        dt = datetime.fromisoformat(iso_string)
        # Ensure timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None

def is_past_deadline(due_date_str: Optional[str]) -> bool:
    """Check if the deadline has passed. Uses UTC for consistency."""
    if not due_date_str:
        return False
    deadline = parse_iso_datetime(due_date_str)
    if not deadline:
        return False
    # Add 1-minute grace period for clock skew
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
    return user

async def require_marker(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "marker":
        raise HTTPException(status_code=403, detail="Marker access required")
    return current_user

async def require_student(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Students must have a course_id
    if user_data.role == "student" and not user_data.course_id:
        raise HTTPException(status_code=400, detail="Students must select a course")
    
    # Verify course exists for students
    if user_data.role == "student" and user_data.course_id:
        course = await db.courses.find_one({"id": user_data.course_id}, {"_id": 0})
        if not course:
            raise HTTPException(status_code=400, detail="Selected course does not exist")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "course_id": user_data.course_id if user_data.role == "student" else None,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        course_id=user_doc.get("course_id"),
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
    
    return {
        "token": token,
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            course_id=user.get("course_id"),
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
        course_id=current_user.get("course_id"),
        created_at=current_user["created_at"]
    )

# ============ PUBLIC ENDPOINTS (No Auth Required) ============

@api_router.get("/public/courses", response_model=List[CourseResponse])
async def get_courses_public():
    """
    Public endpoint to list courses for student registration.
    No authentication required.
    """
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for c in courses:
        student_count = await db.users.count_documents({"course_id": c["id"], "role": "student"})
        marker = await db.users.find_one({"id": c["marker_id"]}, {"_id": 0})
        result.append(CourseResponse(
            id=c["id"],
            name=c["name"],
            code=c.get("code", ""),
            description=c.get("description", ""),
            year=c.get("year"),
            semester=c.get("semester", ""),
            marker_id=c["marker_id"],
            created_at=c["created_at"],
            marker_name=marker["full_name"] if marker else "Unknown",
            student_count=student_count
        ))
    
    return result

# ============ COURSE ENDPOINTS ============

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, current_user: dict = Depends(require_marker)):
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    course_doc = {
        "id": course_id,
        "name": course_data.name,
        "code": course_data.code or "",
        "description": course_data.description or "",
        "year": course_data.year,
        "semester": course_data.semester or "",
        "marker_id": current_user["id"],
        "created_at": now
    }
    
    await db.courses.insert_one(course_doc)
    
    return CourseResponse(
        **course_doc,
        marker_name=current_user["full_name"],
        student_count=0
    )

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "marker":
        # Markers only see their own courses
        courses = await db.courses.find({"marker_id": current_user["id"]}, {"_id": 0}).to_list(100)
    else:
        # Students see all courses (for enrollment selection)
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for c in courses:
        # Get student count
        student_count = await db.users.count_documents({"course_id": c["id"], "role": "student"})
        # Get marker name
        marker = await db.users.find_one({"id": c["marker_id"]}, {"_id": 0})
        result.append(CourseResponse(
            **c,
            marker_name=marker["full_name"] if marker else "Unknown",
            student_count=student_count
        ))
    
    return result

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Access control: markers only see their courses
    if current_user["role"] == "marker" and course["marker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    student_count = await db.users.count_documents({"course_id": course_id, "role": "student"})
    marker = await db.users.find_one({"id": course["marker_id"]}, {"_id": 0})
    
    return CourseResponse(
        **course,
        marker_name=marker["full_name"] if marker else "Unknown",
        student_count=student_count
    )

# ============ ASSIGNMENT ENDPOINTS ============

@api_router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(assignment_data: AssignmentCreate, current_user: dict = Depends(require_marker)):
    # Verify marker owns this course
    course = await db.courses.find_one({"id": assignment_data.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course["marker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this course")
    
    assignment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    assignment_doc = {
        "id": assignment_id,
        "course_id": assignment_data.course_id,
        "title": assignment_data.title,
        "description": assignment_data.description or "",
        "due_date": assignment_data.due_date,  # Store as ISO string with timezone
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
    """Update assignment including deadline."""
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify marker owns the course
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course["marker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
    query = {}
    
    if current_user["role"] == "marker":
        # Get courses owned by marker
        marker_courses = await db.courses.find({"marker_id": current_user["id"]}, {"_id": 0}).to_list(100)
        marker_course_ids = [c["id"] for c in marker_courses]
        if course_id:
            if course_id not in marker_course_ids:
                raise HTTPException(status_code=403, detail="Access denied")
            query["course_id"] = course_id
        else:
            query["course_id"] = {"$in": marker_course_ids}
    elif current_user["role"] == "student":
        # Students only see assignments for their enrolled course
        student_course_id = current_user.get("course_id")
        if not student_course_id:
            return []
        query["course_id"] = student_course_id
    
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
    
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    
    # Access control
    if current_user["role"] == "marker" and course["marker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user["role"] == "student" and current_user.get("course_id") != assignment["course_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
    
    # Seed default categories if none exist
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

# ============ SUBMISSION ENDPOINTS ============

@api_router.post("/submissions", response_model=SubmissionResponse)
async def create_submission(submission_data: SubmissionCreate, current_user: dict = Depends(require_student)):
    # Check assignment exists
    assignment = await db.assignments.find_one({"id": submission_data.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify student is enrolled in the assignment's course
    if current_user.get("course_id") != assignment["course_id"]:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")
    
    # ===== DEADLINE ENFORCEMENT (Backend authoritative check) =====
    if is_past_deadline(assignment.get("due_date")):
        raise HTTPException(
            status_code=403, 
            detail="Submission deadline has passed. No new submissions or resubmissions are accepted."
        )
    
    # Get previous submissions for this student/assignment
    prev_submissions = await db.submissions.find({
        "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"]
    }, {"_id": 0}).sort("attempt_number", -1).to_list(100)
    
    attempt_number = len(prev_submissions) + 1
    
    if attempt_number > assignment.get("max_attempts", 3):
        raise HTTPException(status_code=400, detail=f"Maximum attempts ({assignment.get('max_attempts', 3)}) reached")
    
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Mark previous submissions as not latest
    if prev_submissions:
        await db.submissions.update_many(
            {"assignment_id": submission_data.assignment_id, "student_id": current_user["id"]},
            {"$set": {"is_latest_attempt": False}}
        )
    
    submission_doc = {
        "id": submission_id,
        "assignment_id": submission_data.assignment_id,
        "student_id": current_user["id"],
        "code_content": submission_data.code_content,
        "filename": submission_data.filename or "main.py",
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
    
    return SubmissionResponse(**submission_doc)

@api_router.post("/submissions/upload", response_model=SubmissionResponse)
async def upload_submission(
    assignment_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_student)
):
    if not file.filename.endswith('.py'):
        raise HTTPException(status_code=400, detail="Only .py files are allowed")
    
    content = await file.read()
    code_content = content.decode('utf-8')
    
    submission_data = SubmissionCreate(
        assignment_id=assignment_id,
        code_content=code_content,
        filename=file.filename
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
        # Students only see their own submissions
        query["student_id"] = current_user["id"]
    elif current_user["role"] == "marker":
        # Markers only see submissions from their courses
        marker_courses = await db.courses.find({"marker_id": current_user["id"]}, {"_id": 0}).to_list(100)
        marker_course_ids = [c["id"] for c in marker_courses]
        
        if course_id:
            if course_id not in marker_course_ids:
                raise HTTPException(status_code=403, detail="Access denied")
            # Get assignments for this course
            course_assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(100)
            query["assignment_id"] = {"$in": [a["id"] for a in course_assignments]}
        else:
            # Get all assignments for marker's courses
            all_assignments = await db.assignments.find({"course_id": {"$in": marker_course_ids}}, {"_id": 0}).to_list(500)
            query["assignment_id"] = {"$in": [a["id"] for a in all_assignments]}
        
        if student_id:
            query["student_id"] = student_id
    
    if assignment_id:
        query["assignment_id"] = assignment_id
    
    if status:
        query["status"] = status
    
    submissions = await db.submissions.find(query, {"_id": 0}).sort("submission_time", -1).to_list(500)
    
    # Add student names and issue counts
    result = []
    for sub in submissions:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0})
        issues_count = await db.feedback_issues.count_documents({"submission_id": sub["id"]})
        sub["student_name"] = student["full_name"] if student else "Unknown"
        sub["issues_count"] = issues_count
        result.append(SubmissionResponse(**sub))
    
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
        # Verify marker owns the course
        assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
        course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
        if course["marker_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    student = await db.users.find_one({"id": submission["student_id"]}, {"_id": 0})
    issues_count = await db.feedback_issues.count_documents({"submission_id": submission_id})
    submission["student_name"] = student["full_name"] if student else "Unknown"
    submission["issues_count"] = issues_count
    
    return SubmissionResponse(**submission)

@api_router.get("/submissions/{submission_id}/history", response_model=List[SubmissionResponse])
async def get_submission_history(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get all submissions for this assignment/student
    history = await db.submissions.find({
        "assignment_id": submission["assignment_id"],
        "student_id": submission["student_id"]
    }, {"_id": 0}).sort("attempt_number", 1).to_list(100)
    
    result = []
    for sub in history:
        issues_count = await db.feedback_issues.count_documents({"submission_id": sub["id"]})
        sub["issues_count"] = issues_count
        result.append(SubmissionResponse(**sub))
    
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

# ============ "NO ISSUES FOUND" ENDPOINT ============

@api_router.post("/submissions/{submission_id}/mark-no-issues")
async def mark_no_issues(
    submission_id: str,
    request: MarkNoIssuesRequest,
    current_user: dict = Depends(require_marker)
):
    """
    Mark a submission as fully correct with no issues.
    This counts as a completed review for analytics.
    """
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Verify marker owns the course
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course["marker_id"] != current_user["id"]:
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

# ============ FEEDBACK ISSUE ENDPOINTS ============

@api_router.post("/issues", response_model=FeedbackIssueResponse)
async def create_issue(issue_data: FeedbackIssueCreate, current_user: dict = Depends(require_marker)):
    # Verify marker owns the course
    submission = await db.submissions.find_one({"id": issue_data.submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course["marker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    issue_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get category name
    category = await db.issue_categories.find_one({"id": issue_data.category_id}, {"_id": 0})
    
    issue_doc = {
        "id": issue_id,
        "submission_id": issue_data.submission_id,
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
    
    # Update submission status to in_review
    await db.submissions.update_one(
        {"id": issue_data.submission_id},
        {"$set": {"status": "in_review"}}
    )
    
    issue_doc["category_name"] = category["name"] if category else "Unknown"
    
    return FeedbackIssueResponse(**issue_doc)

@api_router.get("/issues", response_model=List[FeedbackIssueResponse])
async def get_issues(
    submission_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if submission_id:
        query["submission_id"] = submission_id
        
        # Students can only see issues for feedback_released submissions
        if current_user["role"] == "student":
            submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
            if not submission:
                raise HTTPException(status_code=404, detail="Submission not found")
            if submission["student_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            if submission["status"] not in ["feedback_released", "no_issues"]:
                return []  # No issues visible until feedback released
    
    issues = await db.feedback_issues.find(query, {"_id": 0}).to_list(500)
    
    # Add category names
    result = []
    for issue in issues:
        category = await db.issue_categories.find_one({"id": issue["category_id"]}, {"_id": 0})
        issue["category_name"] = category["name"] if category else "Unknown"
        result.append(FeedbackIssueResponse(**issue))
    
    return result

@api_router.get("/issues/{issue_id}", response_model=FeedbackIssueResponse)
async def get_issue(issue_id: str, current_user: dict = Depends(get_current_user)):
    issue = await db.feedback_issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    category = await db.issue_categories.find_one({"id": issue["category_id"]}, {"_id": 0})
    issue["category_name"] = category["name"] if category else "Unknown"
    
    return FeedbackIssueResponse(**issue)

@api_router.put("/issues/{issue_id}", response_model=FeedbackIssueResponse)
async def update_issue(
    issue_id: str,
    issue_data: FeedbackIssueCreate,
    current_user: dict = Depends(require_marker)
):
    update_doc = {
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
    
    # Verify student owns this submission
    submission = await db.submissions.find_one({"id": issue["submission_id"]}, {"_id": 0})
    if submission["student_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.feedback_issues.update_one(
        {"id": issue_id},
        {"$set": {"student_status": "fixed", "resolution_timestamp": now}}
    )
    
    return {"message": "Issue marked as fixed"}

@api_router.post("/submissions/{submission_id}/publish")
async def publish_feedback(submission_id: str, current_user: dict = Depends(require_marker)):
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Verify marker owns the course
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]}, {"_id": 0})
    course = await db.courses.find_one({"id": assignment["course_id"]}, {"_id": 0})
    if course["marker_id"] != current_user["id"]:
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

# ============ ANALYTICS ENDPOINTS (Course-Scoped) ============

@api_router.get("/analytics/marker", response_model=MarkerAnalyticsResponse)
async def get_marker_analytics(
    course_id: Optional[str] = None,
    current_user: dict = Depends(require_marker)
):
    """
    Get marker analytics. Always course-scoped.
    - No gamification data
    - No student-level metrics
    - High-signal, low-noise metrics only
    """
    # Get marker's courses
    query = {"marker_id": current_user["id"]}
    if course_id:
        query["id"] = course_id
    
    marker_courses = await db.courses.find(query, {"_id": 0}).to_list(100)
    
    total_feedback_given = 0
    total_pending_reviews = 0
    courses_analytics = []
    
    for course in marker_courses:
        # Get assignments for this course
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
                avg_turnaround_hours=None
            ))
            continue
        
        # Get submissions for these assignments
        submissions = await db.submissions.find(
            {"assignment_id": {"$in": assignment_ids}},
            {"_id": 0}
        ).to_list(1000)
        
        total_subs = len(submissions)
        pending = len([s for s in submissions if s["status"] == "pending"])
        in_review = len([s for s in submissions if s["status"] == "in_review"])
        completed = len([s for s in submissions if s["status"] == "feedback_released"])
        no_issues = len([s for s in submissions if s["status"] == "no_issues"])
        
        # Calculate average turnaround time for completed reviews
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
        
        # Count feedback issues given by this marker for this course
        feedback_count = await db.feedback_issues.count_documents({
            "marker_id": current_user["id"],
            "submission_id": {"$in": [s["id"] for s in submissions]}
        })
        
        total_feedback_given += feedback_count + no_issues  # no_issues also counts as feedback
        total_pending_reviews += pending
        
        courses_analytics.append(CourseAnalytics(
            course_id=course["id"],
            course_name=course["name"],
            total_submissions=total_subs,
            pending_reviews=pending,
            in_review_count=in_review,
            completed_reviews=completed,
            no_issues_count=no_issues,
            avg_turnaround_hours=round(avg_turnaround, 1) if avg_turnaround else None
        ))
    
    return MarkerAnalyticsResponse(
        total_feedback_given=total_feedback_given,
        total_pending_reviews=total_pending_reviews,
        active_courses=len([c for c in courses_analytics if c.total_submissions > 0]),
        courses=courses_analytics
    )

@api_router.get("/analytics/student", response_model=StudentProgressResponse)
async def get_student_progress(current_user: dict = Depends(require_student)):
    """
    Get student's own progress. No access to marker analytics or other students.
    """
    # Get student's submissions
    submissions = await db.submissions.find({"student_id": current_user["id"]}, {"_id": 0}).to_list(100)
    submission_ids = [s["id"] for s in submissions]
    
    # Get issues for these submissions (only from released feedback)
    released_submission_ids = [
        s["id"] for s in submissions 
        if s["status"] in ["feedback_released", "no_issues"]
    ]
    
    issues = await db.feedback_issues.find(
        {"submission_id": {"$in": released_submission_ids}},
        {"_id": 0}
    ).to_list(500)
    
    total_issues = len(issues)
    fixed_issues = len([i for i in issues if i.get("student_status") == "fixed"])
    open_issues = total_issues - fixed_issues
    
    # Count by category
    categories_count = {}
    for issue in issues:
        cat_id = issue.get("category_id", "unknown")
        category = await db.issue_categories.find_one({"id": cat_id}, {"_id": 0})
        cat_name = category["name"] if category else "Unknown"
        categories_count[cat_name] = categories_count.get(cat_name, 0) + 1
    
    # Build improvement trend
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
    
    return StudentProgressResponse(
        total_submissions=len(submissions),
        total_issues=total_issues,
        fixed_issues=fixed_issues,
        open_issues=open_issues,
        issues_by_category=categories_count,
        improvement_trend=improvement_trend
    )

# ============ DEADLINE CHECK ENDPOINT ============

@api_router.get("/assignments/{assignment_id}/deadline-status")
async def check_deadline_status(assignment_id: str, current_user: dict = Depends(get_current_user)):
    """
    Check if submissions are still open for an assignment.
    Returns deadline info with timezone-safe comparison.
    """
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
