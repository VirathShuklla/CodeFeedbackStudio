# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a comprehensive code assessment and moderation platform ("CodeFeedback Studio") with:
- Multi-role system (Student, Marker, Moderator, Module Leader)
- Course and assignment management
- GitHub-style inline code feedback
- Gamification with XP and badges
- Three-phase assignment lifecycle (Schedule Release, Set Deadline, Publish Results)

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Monaco Editor
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **Database**: MongoDB with Motor (async driver)
- **Auth**: JWT-based authentication

## What's Been Implemented

### Core Features ✅
- [x] User registration (Student/Marker roles)
- [x] JWT-based authentication
- [x] Course creation and management
- [x] Role assignment (Leader, Collaborator, Moderator)
- [x] Multi-file code submissions
- [x] GitHub-style code review interface

### Assignment Workflow ✅ (Completed December 2025)
- [x] **Schedule Release** (Yes/No toggle)
  - If Yes: Students only see assignment after release date
  - If No: Assignment immediately visible
- [x] **Set Deadline** (Yes/No toggle)
  - If Yes: Submissions close at deadline; markers see submissions after deadline
  - If No: Markers see submissions immediately
- [x] **Publish Results** (collective action)
  - Review status tracking (X/Y reviewed)
  - Warning if not all submissions reviewed
  - Schedule publish date/time
  - Students see marks/feedback collectively at publish time

### Gamification ✅
- [x] XP system for students and markers
- [x] Badge categories:
  - **Students**: Getting Started, Bug Fixing, Excellence, Consistency, Debugging Mastery, Code Quality
  - **Markers**: Getting Started, Speed & Efficiency, Quality & Thoroughness, Impact & Mentoring, Mastery
- [x] Level progression (Novice → Grandmaster)
- [x] Dedicated badge pages for both roles

### UI/UX ✅
- [x] Dark mode toggle (light mode default)
- [x] Improved dark mode contrast and readability
- [x] 6-second animated loading screen
- [x] Clean, minimal card-based design

### Documentation ✅
- [x] Comprehensive README.md with:
  - Full tech stack
  - Local setup instructions (Windows/Mac/Linux)
  - Assignment lifecycle explanation
  - Gamification system details
  - Troubleshooting guide

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register (student/marker) |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/courses` | GET/POST | List or create courses |
| `/api/assignments` | GET/POST | List or create assignments |
| `/api/assignments/{id}` | GET | Get single assignment |
| `/api/assignments/{id}/review-status` | GET | Get review progress |
| `/api/assignments/{id}/publish-results` | POST | Schedule results publication |
| `/api/submissions` | GET/POST | List or submit code |
| `/api/submissions/{id}/grade` | POST | Grade a submission |
| `/api/issues` | GET/POST | List or create feedback |
| `/api/gamification/stats` | GET | XP, level, and badges |

## Database Schema

### Assignments
```json
{
  "id": "uuid",
  "course_id": "uuid",
  "title": "string",
  "description": "string",
  "has_deadline": false,
  "due_date": "datetime | null",
  "has_schedule_release": false,
  "schedule_release_date": "datetime | null",
  "results_publish_date": "datetime | null",
  "results_published": false,
  "total_marks": 100,
  "max_attempts": -1
}
```

## Prioritized Backlog

### P0 (Critical) - DONE
- ~~Assignment workflow with Schedule Release, Deadline, Publish Results~~
- ~~Dark mode improvements~~
- ~~Loading screen polish~~
- ~~README update~~

### P1 (High Priority)
- [ ] Email notifications via Resend when results are published
- [ ] ESLint `react-hooks/exhaustive-deps` warnings fix

### P2 (Medium Priority)
- [ ] Phase 3 - Analytics & Reporting dashboards
- [ ] System Modeling Documentation (Event B diagrams)
- [ ] Advanced filtering for submissions list

### P3 (Low Priority/Future)
- [ ] Bulk import students via CSV
- [ ] Code plagiarism detection
- [ ] Real-time collaboration for markers
- [ ] Mobile responsive improvements

## Test Credentials
- **Marker**: marker@test.com / password123
- **Student**: student@test.com / password123

## Known Issues
- Windows users may encounter `.env` encoding issues (UTF-16 instead of UTF-8)
  - Solution: Use PowerShell command in README or save with UTF-8 in VS Code

---
*Last Updated: December 2025*
