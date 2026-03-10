# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a comprehensive code assessment and moderation platform for programming education with:
- Two registration roles: Student and Marker
- Role elevation through course management (Marker → Module Leader when creating courses)
- Course leadership model with Module Leader + Collaborating Markers + Moderators
- Ability for leaders to transfer leadership to other markers
- Multi-course enrollment for students
- Multi-file Python submissions with resubmission support
- GitHub PR-style code review with file-specific, line-specific feedback
- Grading system with marking schemes and scheduled mark release
- Full moderation workflow for quality assurance
- Analytics dashboards for both roles
- **Gamification system for students and markers with XP, levels, and badges**

## What's Been Implemented

### Phase 1 & 2: Core Architecture & Advanced Features ✅ (March 3, 2026)
- [x] Two registration roles (Student, Marker)
- [x] Role elevation: Marker → Module Leader when creating course
- [x] Course team management: add collaborators, moderators, transfer leadership
- [x] Role-based permissions and access control
- [x] Course Leadership model (leader_id + collaborator_ids + moderator_ids)
- [x] Multi-course enrollment for students
- [x] JWT authentication with role separation
- [x] Multi-file Python submissions
- [x] GitHub PR-style code review interface
- [x] Grading system with marks and feedback
- [x] Marks deduction per issue
- [x] Scheduled mark release dates
- [x] Marking scheme upload (PDF)
- [x] Moderation workflow (raise/approve/reject issues)
- [x] Feedback templates for markers
- [x] Student gamification (XP, badges, levels)
- [x] Marker gamification (XP, badges, levels)

### Gamification System ✅ (March 4, 2026)
- [x] Student badges page with rich UI (11 badges across categories)
- [x] Marker badges page with rich UI (8 badges across categories)
- [x] XP-based leveling system (10 levels for each role)
- [x] Progress tracking and quick stats
- [x] Badge categories: Getting Started, Bug Fixing, Excellence, Consistency, Debugging Mastery, Code Quality, Mastery
- [x] Marker categories: Getting Started, Speed & Efficiency, Quality & Thoroughness, Impact & Mentoring, Mastery
- [x] Marker XP awarding (+25 XP per graded submission, +15 XP for "no issues")

### UI/UX Improvements ✅ (March 10, 2026)
- [x] Dark mode with system-aware toggle
- [x] Animated loading screen on first visit
- [x] Assignment creation with Yes/No toggles for deadline/release date
- [x] Improved CSS with dark mode support
- [x] Database reset capability for testing

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
  "role": "student | marker | moderator | module_leader",
  "course_ids": ["uuid"],  // For students
  "xp": 0,
  "level": 1,
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
  "leader_id": "uuid",           // Module leader
  "collaborator_ids": ["uuid"],  // Collaborating markers
  "moderator_ids": ["uuid"],     // Course moderators
  "created_at": "datetime"
}
```

### assignments
```json
{
  "id": "uuid",
  "course_id": "uuid",
  "title": "string",
  "description": "string",
  "due_date": "datetime",
  "max_attempts": -1,  // -1 = unlimited
  "total_marks": 100,
  "marks_release_date": "datetime",
  "marking_scheme_url": "string",
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
  "marks": 0,
  "grade_feedback": "string",
  "moderation_status": "pending | approved | flagged",
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
  "marks_deduction": 5,
  "student_status": "open | fixed",
  "created_at": "datetime"
}
```

### moderation_issues
```json
{
  "id": "uuid",
  "submission_id": "uuid",
  "marker_id": "uuid",
  "moderator_id": "uuid",
  "issue_description": "string",
  "severity": "minor | moderate | critical",
  "status": "open | approved | rejected",
  "leader_response": "string",
  "created_at": "datetime"
}
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register user (roles: student, marker, moderator, module_leader)
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Current user

### Public
- GET `/api/public/courses` - List courses
- GET `/api/public/users` - List all users (for collaborator/moderator selection)

### Courses
- GET/POST `/api/courses` - List/Create courses
- PUT `/api/courses/{id}` - Update (leader can modify collaborators/moderators)

### Students
- GET `/api/students/courses` - Enrolled courses
- POST/DELETE `/api/students/enroll/{course_id}` - Enroll/Unenroll

### Assignments
- GET/POST `/api/assignments` - List/Create
- POST `/api/assignments/{id}/marking-scheme` - Upload marking scheme PDF
- GET `/api/assignments/{id}/deadline-status` - Check deadline

### Submissions & Grading
- GET/POST `/api/submissions` - List/Create
- POST `/api/submissions/{id}/grade` - Grade with marks and feedback
- POST `/api/submissions/{id}/publish` - Publish feedback
- POST `/api/submissions/{id}/mark-no-issues` - Mark as correct

### Issues
- GET/POST `/api/issues` - List/Create (with marks_deduction)
- POST `/api/issues/{id}/mark-fixed` - Mark fixed (awards XP)
- DELETE `/api/issues/{id}` - Delete issue (leader only)

### Moderation
- GET `/api/submissions?for_moderation=true` - Get submissions for moderation
- POST `/api/moderation/issues` - Raise moderation issue
- POST `/api/moderation/issues/{id}/approve` - Approve issue (leader)
- POST `/api/moderation/issues/{id}/reject` - Reject issue (leader)
- POST `/api/moderation/submissions/{id}/confirm` - Confirm no issues
- GET `/api/moderation/issues` - List moderation issues

### Templates
- GET/POST `/api/issue-templates` - List/Create reusable feedback templates

### Analytics
- GET `/api/analytics/marker` - Marker stats
- GET `/api/analytics/student` - Student stats
- GET `/api/gamification/stats` - XP/Badges

## Test Credentials
Create new accounts via registration page:
- Module Leader: `leader@test.com` / `password123`
- Moderator: `moderator@test.com` / `password123`
- Marker: `marker@test.com` / `password123`
- Student: `student@test.com` / `password123`

## Backlog / Future Tasks

### P0 - Critical (Phase 3)
- [ ] Analytics dashboards for students (progress tracking)
- [ ] Analytics dashboards for markers (class-wide stats)
- [ ] Marker evaluation and scaling system
- [ ] Moderation tracking reports

### P1 - High Priority (Phase 4)
- [ ] Email notifications when feedback/marks are released
- [ ] Email notifications for moderation issues
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
