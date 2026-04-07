# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a comprehensive code assessment and moderation platform ("CodeFeedback Studio") with:
- Multi-role system (Student, Marker, Moderator, Module Leader)
- Course and assignment management
- GitHub-style inline code feedback
- Gamification with XP and badges
- Three-phase assignment lifecycle (Schedule Release, Set Deadline, Publish Results)
- Module-specific opt-in leaderboards with nicknames and privacy controls
- User profiles accessible from leaderboards

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Monaco Editor, Lucide Icons
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **Database**: MongoDB with Motor (async driver)
- **Auth**: JWT-based authentication (bcrypt)
- **Build**: CRACO

## What's Been Implemented

### Core Features
- [x] User registration (Student/Marker roles)
- [x] JWT-based authentication
- [x] Course creation and management
- [x] Role assignment (Leader, Collaborator, Moderator)
- [x] Multi-file code submissions
- [x] GitHub-style code review interface
- [x] Delete assignment (Module Leader only)
- [x] Reusable issue templates with category, severity, suggested fix

### Assignment Workflow
- [x] Schedule Release (Yes/No toggle)
- [x] Set Deadline (Yes/No toggle)
- [x] Publish Results (collective action with scheduling)

### Gamification (Extended Feb 2026)
- [x] 14 Student badges (First Steps, Bug Squasher, Quick Learner, Zero to Hero, Perfectionist, Five Star Coder, Rapid Improver, Consistent Performer, Streak Warrior, Early Bird, Feedback Champion, Tenacious, Multi-Talented, Centurion)
- [x] 13 Marker badges (First Review, Speed Reviewer, On-Time Champion, Quick Turnaround, Thorough Reviewer, Feedback Master, Detail Oriented, Template Architect, Mentor, Consistent Marker, Quality Guardian, Multi-Course Expert, Century Reviewer)
- [x] XP system with 10 levels (Novice to Grandmaster)
- [x] Centralized badge evaluation on stats fetch
- [x] XP history logging

### Module Leaderboards (New - Feb 2026)
- [x] Per-module opt-in leaderboards for students and markers
- [x] Unique nicknames per module with real-time availability check
- [x] Privacy-first: real names never shown on leaderboard
- [x] Student scoring: submissions, on-time, fixes, perfects, quick fixes
- [x] Marker scoring: reviews, issues found, approvals, turnaround
- [x] Leave/rejoin anytime without losing XP/badges
- [x] Profile modal with badges, XP, level, and active modules

### Moderation
- [x] Moderation queue (all failed + 10% sample of passed)
- [x] Moderation dashboard with per-course stats
- [x] Issue workflow: create → approve/reject → resolve
- [x] Course leaders can access moderation for their courses

### UI/UX
- [x] Dark mode toggle (light mode default)
- [x] Fast loading screen (~1.5s assembly animation)
- [x] Leaderboard page with podium, ranked table, profile modal

### Documentation
- [x] Comprehensive README with setup guide, badge guide, feature docs

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register |
| `/api/auth/login` | POST | Login |
| `/api/courses` | GET/POST | Courses |
| `/api/assignments` | GET/POST | Assignments |
| `/api/assignments/{id}` | DELETE | Delete assignment |
| `/api/assignments/{id}/publish-results` | POST | Publish results |
| `/api/submissions` | GET/POST | Submissions |
| `/api/submissions/{id}/grade` | POST | Grade |
| `/api/issues` | GET/POST | Feedback issues |
| `/api/gamification/stats` | GET | XP, level, badges |
| `/api/leaderboard/join` | POST | Join leaderboard |
| `/api/leaderboard/leave` | POST | Leave leaderboard |
| `/api/leaderboard/check-nickname` | GET | Nickname availability |
| `/api/leaderboard/{course_id}/students` | GET | Student leaderboard |
| `/api/leaderboard/{course_id}/markers` | GET | Marker leaderboard |
| `/api/profile/{user_id}` | GET | User profile |

## Database Schema

### leaderboard_settings (New)
```json
{
  "id": "uuid",
  "user_id": "string",
  "course_id": "string",
  "nickname": "string",
  "joined": true,
  "role": "student|marker",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Prioritized Backlog

### P1 (High Priority)
- [ ] Email notifications via Resend when results are published
- [ ] N+1 query optimization (MongoDB $lookup aggregation)
- [ ] Refactor server.py into modular routers

### P2 (Medium Priority)
- [ ] ESLint react-hooks/exhaustive-deps warnings fix
- [ ] Phase 3 - Analytics & Reporting dashboards

### P3 (Low Priority/Future)
- [ ] Code plagiarism detection
- [ ] Bulk import students via CSV
- [ ] Real-time collaboration for markers
- [ ] System Modeling Documentation (Event B)

## Test Credentials
- **Marker**: marker@test.com / password123
- **Student**: student@test.com / password123

## Known Issues
- Windows users may encounter `.env` encoding issues (UTF-16)

---
*Last Updated: February 2026*
