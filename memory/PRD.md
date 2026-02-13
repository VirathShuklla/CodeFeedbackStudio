# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a full-stack application for managing and reviewing code for programming assignments with:
- Two user roles: "Marker" (instructor) and "Student"
- Course leadership model with Head Marker + Collaborating Markers
- Multi-course enrollment for students
- Multi-file Python submissions
- GitHub PR-style code review with file-specific feedback
- Analytics dashboards for both roles
- Gamification system for students

## What's Been Implemented

### Phase 1: Core Architecture ✅
- [x] Course Leadership model (leader_id + collaborator_ids)
- [x] Multi-course enrollment for students
- [x] Role-based permissions (Student, Marker, Leader)
- [x] JWT authentication with role separation
- [x] Public endpoints for courses and markers

### Phase 2: Multi-File Submissions ✅
- [x] Submit multiple .py files per assignment
- [x] File upload via API (JSON with content)
- [x] File navigation in code review UI
- [x] Per-file issue tracking

### Phase 3: Code Review Experience ✅
- [x] GitHub PR-style code review interface
- [x] File sidebar with issue counts
- [x] Monaco editor with syntax highlighting
- [x] File-specific, line-specific issues
- [x] Issue severity levels (minor, moderate, critical)
- [x] Click-to-navigate from issue to code
- [x] "No Issues" option for correct code
- [x] Publish feedback workflow

### Phase 4: Analytics ✅
- [x] Marker analytics (per-course stats, pending reviews, turnaround time)
- [x] Course leader analytics (collaborator activity)
- [x] Student analytics (per-course progress, issues by category)
- [x] Fix rate tracking

### Phase 5: Gamification ✅
- [x] XP system with awards for fixing issues
- [x] Level progression (15 levels from Novice to Master)
- [x] Badge definitions and progress tracking
- [x] XP log for recent gains
- [x] Badges page UI

## Implementation Date: February 13, 2026

## Tech Stack
- **Frontend**: React 18, React Router, Tailwind CSS, Shadcn/UI, Monaco Editor
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Authentication**: JWT

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "full_name": "string",
  "role": "student | marker",
  "course_ids": ["uuid"],  // For students
  "xp": 0,
  "badges": [],
  "created_at": "datetime"
}
```

### courses
```json
{
  "id": "uuid",
  "name": "string",
  "code": "string",
  "description": "string",
  "year": 2026,
  "semester": "string",
  "leader_id": "uuid",      // Head marker
  "collaborator_ids": ["uuid"],  // Collaborating markers
  "created_at": "datetime"
}
```

### submissions
```json
{
  "id": "uuid",
  "assignment_id": "uuid",
  "student_id": "uuid",
  "files": [
    {"id": "uuid", "filename": "main.py", "content": "..."}
  ],
  "status": "pending | in_review | feedback_released | no_issues",
  "attempt_number": 1,
  "submission_time": "datetime",
  "review_completed_at": "datetime",
  "reviewed_by": "uuid"
}
```

### feedback_issues
```json
{
  "id": "uuid",
  "submission_id": "uuid",
  "file_id": "uuid",
  "marker_id": "uuid",
  "category_id": "uuid",
  "line_start": 1,
  "line_end": 5,
  "title": "string",
  "explanation": "string",
  "severity": "minor | moderate | critical",
  "suggested_fix": "string",
  "student_status": "open | fixed",
  "created_at": "datetime"
}
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Current user

### Public
- GET `/api/public/courses` - List courses
- GET `/api/public/markers` - List markers

### Courses
- GET/POST `/api/courses` - List/Create courses
- PUT `/api/courses/{id}` - Update (leader can modify collaborators)

### Students
- GET `/api/students/courses` - Enrolled courses
- POST/DELETE `/api/students/enroll/{course_id}` - Enroll/Unenroll

### Assignments
- GET/POST `/api/assignments` - List/Create
- GET `/api/assignments/{id}/deadline-status` - Check deadline

### Submissions
- GET/POST `/api/submissions` - List/Create
- POST `/api/submissions/{id}/publish` - Publish feedback
- POST `/api/submissions/{id}/mark-no-issues` - Mark correct

### Issues
- GET/POST `/api/issues` - List/Create
- POST `/api/issues/{id}/mark-fixed` - Mark fixed (awards XP)

### Analytics
- GET `/api/analytics/marker` - Marker stats
- GET `/api/analytics/student` - Student stats
- GET `/api/gamification/stats` - XP/Badges

## Test Credentials
- Marker: `marker@test.com` / `password123`
- Student: `student@test.com` / `password123`

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Email notifications when feedback is released
- [ ] Reusable feedback library for markers
- [ ] Bulk feedback actions

### P2 - Medium Priority
- [ ] Student leaderboard
- [ ] Course-wide badge unlocks
- [ ] Code diff between submission attempts
- [ ] Export analytics to CSV

### P3 - Nice to Have
- [ ] Support for additional file types (.js, .java)
- [ ] Automated code analysis suggestions
- [ ] Integration with GitHub Classroom
