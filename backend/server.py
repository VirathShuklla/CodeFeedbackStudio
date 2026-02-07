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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: str

class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class CourseResponse(BaseModel):
    id: str
    name: str
    description: str
    marker_id: str
    created_at: str

class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    max_attempts: int = 3

class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str
    due_date: Optional[str]
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
    status: str  # pending, in_review, feedback_released
    attempt_number: int
    previous_submission_id: Optional[str]
    submission_time: str
    issues_count: Optional[int] = 0

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

class PublishFeedbackRequest(BaseModel):
    submission_id: str

class MarkIssueFixedRequest(BaseModel):
    issue_id: str

class AnalyticsResponse(BaseModel):
    total_submissions: int
    pending_count: int
    in_review_count: int
    feedback_released_count: int
    avg_review_time_hours: float
    total_issues: int
    issues_by_category: dict
    issues_by_severity: dict
    resolution_rate: float

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
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
        created_at=current_user["created_at"]
    )

# ============ COURSE ENDPOINTS ============

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, current_user: dict = Depends(require_marker)):
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    course_doc = {
        "id": course_id,
        "name": course_data.name,
        "description": course_data.description or "",
        "marker_id": current_user["id"],
        "created_at": now
    }
    
    await db.courses.insert_one(course_doc)
    
    return CourseResponse(**course_doc)

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "marker":
        courses = await db.courses.find({"marker_id": current_user["id"]}, {"_id": 0}).to_list(100)
    else:
        # Students see all courses (simplified for MVP)
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    return [CourseResponse(**c) for c in courses]

# ============ ASSIGNMENT ENDPOINTS ============

@api_router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(assignment_data: AssignmentCreate, current_user: dict = Depends(require_marker)):
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
    
    return AssignmentResponse(**assignment_doc)

@api_router.get("/assignments", response_model=List[AssignmentResponse])
async def get_assignments(course_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if course_id:
        query["course_id"] = course_id
    
    assignments = await db.assignments.find(query, {"_id": 0}).to_list(100)
    return [AssignmentResponse(**a) for a in assignments]

@api_router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return AssignmentResponse(**assignment)

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
async def create_submission(submission_data: SubmissionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit")
    
    # Check assignment exists and get max attempts
    assignment = await db.assignments.find_one({"id": submission_data.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
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
        "is_latest_attempt": True
    }
    
    await db.submissions.insert_one(submission_doc)
    
    return SubmissionResponse(**submission_doc)

@api_router.post("/submissions/upload", response_model=SubmissionResponse)
async def upload_submission(
    assignment_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit")
    
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
    student_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "student":
        query["student_id"] = current_user["id"]
    elif student_id:
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
    
    # Students can only see their own submissions or published feedback
    if current_user["role"] == "student":
        if submission["student_id"] != current_user["id"]:
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
    valid_statuses = ["pending", "in_review", "feedback_released"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    result = await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Status updated", "status": status}

# ============ FEEDBACK ISSUE ENDPOINTS ============

@api_router.post("/issues", response_model=FeedbackIssueResponse)
async def create_issue(issue_data: FeedbackIssueCreate, current_user: dict = Depends(require_marker)):
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
            if submission["status"] != "feedback_released":
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
async def mark_issue_fixed(issue_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can mark issues as fixed")
    
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
    
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": "feedback_released"}}
    )
    
    return {"message": "Feedback published"}

# ============ ANALYTICS ENDPOINTS ============

@api_router.get("/analytics/marker", response_model=AnalyticsResponse)
async def get_marker_analytics(current_user: dict = Depends(require_marker)):
    # Get all submissions
    submissions = await db.submissions.find({}, {"_id": 0}).to_list(1000)
    
    total = len(submissions)
    pending = len([s for s in submissions if s["status"] == "pending"])
    in_review = len([s for s in submissions if s["status"] == "in_review"])
    released = len([s for s in submissions if s["status"] == "feedback_released"])
    
    # Get all issues
    issues = await db.feedback_issues.find({}, {"_id": 0}).to_list(5000)
    total_issues = len(issues)
    
    # Count by category
    categories_count = {}
    for issue in issues:
        cat_id = issue.get("category_id", "unknown")
        category = await db.issue_categories.find_one({"id": cat_id}, {"_id": 0})
        cat_name = category["name"] if category else "Unknown"
        categories_count[cat_name] = categories_count.get(cat_name, 0) + 1
    
    # Count by severity
    severity_count = {}
    for issue in issues:
        sev = issue.get("severity", "moderate")
        severity_count[sev] = severity_count.get(sev, 0) + 1
    
    # Resolution rate
    fixed_issues = len([i for i in issues if i.get("student_status") == "fixed"])
    resolution_rate = (fixed_issues / total_issues * 100) if total_issues > 0 else 0
    
    return AnalyticsResponse(
        total_submissions=total,
        pending_count=pending,
        in_review_count=in_review,
        feedback_released_count=released,
        avg_review_time_hours=2.5,  # Placeholder - would need timestamp tracking
        total_issues=total_issues,
        issues_by_category=categories_count,
        issues_by_severity=severity_count,
        resolution_rate=resolution_rate
    )

@api_router.get("/analytics/student", response_model=StudentProgressResponse)
async def get_student_progress(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    # Get student's submissions
    submissions = await db.submissions.find({"student_id": current_user["id"]}, {"_id": 0}).to_list(100)
    submission_ids = [s["id"] for s in submissions]
    
    # Get issues for these submissions
    issues = await db.feedback_issues.find({"submission_id": {"$in": submission_ids}}, {"_id": 0}).to_list(500)
    
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
    
    # Build improvement trend (issues per submission over time)
    improvement_trend = []
    for sub in sorted(submissions, key=lambda x: x.get("submission_time", "")):
        sub_issues = [i for i in issues if i["submission_id"] == sub["id"]]
        improvement_trend.append({
            "submission_id": sub["id"],
            "attempt_number": sub.get("attempt_number", 1),
            "total_issues": len(sub_issues),
            "fixed_issues": len([i for i in sub_issues if i.get("student_status") == "fixed"])
        })
    
    return StudentProgressResponse(
        total_submissions=len(submissions),
        total_issues=total_issues,
        fixed_issues=fixed_issues,
        open_issues=open_issues,
        issues_by_category=categories_count,
        improvement_trend=improvement_trend
    )

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
