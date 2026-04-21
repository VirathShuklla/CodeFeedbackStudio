# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a comprehensive code assessment and moderation platform ("CodeFeedback Studio") with:
- Multi-role system (Student, Marker, Moderator, Module Leader)
- Course and assignment management
- GitHub-style inline code feedback with module-specific templates
- Auto-draft saving for markers
- Gamification with XP, badges, and module-specific leaderboards
- Privacy-first leaderboards with unique nicknames
- PDF Feedback Export for students and markers
- Cross-Student Side-by-Side Comparison for markers
- Student Reflection & Notes System with auto-drafting

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Monaco Editor, Lucide Icons
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **Database**: MongoDB with Motor (async driver)
- **Auth**: JWT-based authentication (bcrypt)
- **PDF**: ReportLab, Pygments
- **Build**: CRACO

## What's Been Implemented

### Core Features
- [x] User registration (Student/Marker roles) with JWT auth
- [x] Course creation, enrollment, and management
- [x] Multi-file code submissions with Monaco Editor
- [x] GitHub-style inline code review interface
- [x] Role-based access control (Leader, Collaborator, Moderator)

### Feedback & Templates System
- [x] Module-specific custom feedback templates (scoped by course_id)
- [x] Global templates available across all modules
- [x] Template auto-fill, search, CRUD, and usage tracking
- [x] Copy button on sidebar issues for quick reuse
- [x] Sidebar-code sync: clicking issue scrolls to and highlights code
- [x] Auto-draft saving every 15 seconds (server-side)
- [x] Draft recovery on page refresh

### PDF Feedback Export (NEW - Apr 2026)
- [x] Backend: Professional PDF generation with ReportLab (student info, issues summary, severity breakdown, code with line highlighting)
- [x] Frontend: Export PDF button on CodeReviewPage (marker view, both in-progress and completed states)
- [x] Frontend: Export PDF button on StudentFeedbackPage (student view)
- [x] Access control: Students export own, markers export any

### Cross-Student Side-by-Side Comparison (NEW - Apr 2026)
- [x] Backend: GET /api/compare/submissions for submission listing, GET /api/compare/{a}/{b} for comparison data
- [x] Frontend: ComparisonPage with assignment selector and two submission selectors
- [x] Synchronized scrolling between two Monaco editor panels
- [x] Primary panel (annotatable) with issues sidebar, Reference panel (read-only, no issues exposed)
- [x] Compare nav link in marker navigation bar
- [x] Quick-compare button on CodeReviewPage linking to compare with pre-selected assignment/submission
- [x] Marker-only access control

### Student Reflection & Notes System (NEW - Apr 2026)
- [x] Backend: POST/GET /api/reflections, POST /api/reflections/auto-save, GET /api/reflections/draft
- [x] Frontend: Reflections panel on StudentFeedbackPage with toggle button
- [x] Pre-submission and Post-feedback reflection tabs
- [x] Guided prompts (3 per type) with individual text areas
- [x] Free-form notes area
- [x] Auto-draft saving every 10 seconds
- [x] Draft status indicator (Saved/Saving/Draft)
- [x] Post-feedback reflections only available after receiving feedback
- [x] Saved reflection confirmation with timestamp

### Assignment Workflow
- [x] Schedule Release, Set Deadline, Publish Results
- [x] Delete assignment with cascading deletion (Module Leader only)

### Gamification
- [x] 14 Student badges + 13 Marker badges
- [x] XP system with 10 levels (Novice to Grandmaster)
- [x] Module-specific opt-in leaderboards with privacy controls

### Moderation
- [x] Queue with sampling, issue workflow, course leader access

### UI/UX
- [x] Dark mode toggle, fast loading screen
- [x] Micro-animations: slide-up, fade-in, scale-in, stagger
- [x] Code highlight pulse for active issues

## Prioritized Backlog

### P1 (High Priority)
- [ ] Email notifications via Resend when results are published
- [ ] Refactor server.py (~2945 lines) into modular routers

### P2 (Medium Priority)
- [ ] ESLint react-hooks/exhaustive-deps warnings fix
- [ ] Use StreamingResponse for PDF export instead of writing to disk
- [ ] Add Pydantic model for reflection auto-save endpoint

### P3 (Low Priority/Future)
- [ ] Phase 3 - Analytics & Reporting dashboards
- [ ] Code plagiarism detection
- [x] System Modeling Documentation (Event-B) — `/app/docs/event-b/README.md`
- [x] Requirements Analysis (112 requirements) — `/app/docs/requirements-analysis.md`
- [x] UML Class Diagram (PNG image) — `/app/docs/uml/class-diagram.png`
- [x] UML Package Diagram (PNG image) — `/app/docs/uml/package-diagram.png`
- [x] Testing & Evaluation Report (9 iterations) — `/app/docs/testing-evaluation-report.md`

## Test Credentials
- **Marker**: marker@test.com / password123
- **Student**: student@test.com / password123

---
*Last Updated: April 2026*
