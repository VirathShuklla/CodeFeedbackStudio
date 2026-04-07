# CodeFeedback Studio - Product Requirements Document

## Original Problem Statement
Build a comprehensive code assessment and moderation platform ("CodeFeedback Studio") with:
- Multi-role system (Student, Marker, Moderator, Module Leader)
- Course and assignment management
- GitHub-style inline code feedback with module-specific templates
- Auto-draft saving for markers
- Gamification with XP, badges, and module-specific leaderboards
- Privacy-first leaderboards with unique nicknames

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Monaco Editor, Lucide Icons
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **Database**: MongoDB with Motor (async driver)
- **Auth**: JWT-based authentication (bcrypt)
- **Build**: CRACO

## What's Been Implemented

### Core Features
- [x] User registration (Student/Marker roles) with JWT auth
- [x] Course creation, enrollment, and management
- [x] Multi-file code submissions with Monaco Editor
- [x] GitHub-style inline code review interface
- [x] Role-based access control (Leader, Collaborator, Moderator)

### Feedback & Templates System (NEW - Feb 2026)
- [x] Module-specific custom feedback templates (scoped by course_id)
- [x] Global templates available across all modules
- [x] Template auto-fill: selecting a template populates title, explanation, severity, fix, deduction
- [x] Template search by name, category, or content
- [x] Save as Template from Add Issue dialog with module/global scope
- [x] Template usage tracking (usage_count incremented per use)
- [x] Template CRUD with delete protection (can only delete own)
- [x] Copy button on sidebar issues for quick reuse
- [x] Sidebar-code sync: clicking issue scrolls to and highlights code with pulse animation
- [x] Auto-draft saving every 15 seconds (server-side)
- [x] Draft recovery on page refresh (form state, marks, issues)
- [x] Draft status indicator (Saved/Unsaved/Saving) in header

### Assignment Workflow
- [x] Schedule Release, Set Deadline, Publish Results
- [x] Delete assignment with cascading deletion (Module Leader only)

### Gamification
- [x] 14 Student badges + 13 Marker badges
- [x] XP system with 10 levels (Novice to Grandmaster)
- [x] Centralized badge evaluation

### Module Leaderboards
- [x] Per-module opt-in with unique nicknames
- [x] Role-separated: students only see student board, markers only see marker board
- [x] Profile modal with badges, XP, level, active modules

### Moderation
- [x] Queue with sampling, issue workflow, course leader access
- [x] Fixed race condition in data fetching

### UI/UX
- [x] Dark mode toggle, fast loading screen (~0.5s)
- [x] Micro-animations: slide-up, fade-in, scale-in, stagger
- [x] Code highlight pulse for active issues
- [x] Card hover effects, animated loading spinners

### Documentation
- [x] Comprehensive README with full feature lists for students & markers, badge guide, setup guide

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
- [ ] System Modeling Documentation (Event B)

## Test Credentials
- **Marker**: marker@test.com / password123
- **Student**: student@test.com / password123

---
*Last Updated: February 2026*
