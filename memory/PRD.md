# CodeFeedback Studio - Product Requirements Document

## Overview
CodeFeedback Studio is a web-based platform designed to improve how programming assignments are reviewed and how students learn from feedback.

## User Personas

### Marker (Teacher/TA)
- Views all student submissions for an assignment
- Reviews code in structured Monaco editor
- Highlights specific lines and marks mistakes/issues
- Attaches clear, targeted feedback with categories/severity
- Publishes feedback once grading is complete
- Views dashboards and analytics

### Student
- Submits code assignments
- Tracks submission status (pending, in review, feedback ready)
- Views feedback after marker releases it
- Marks issues as "fixed" to track improvement
- Can resubmit assignments to improve

## Core Requirements

### Authentication
- JWT-based custom auth with email/password
- Role-based access (student/marker)

### Submission System
- Single .py file upload or Monaco editor input
- Submission history tracking
- Max attempts per assignment (configurable)
- Status tracking (pending → in_review → feedback_released)

### Code Review (Marker)
- Monaco Editor with Python syntax highlighting
- Line-by-line annotation capability
- Structured feedback: Title, Category, Severity, Explanation
- Issue categories: Logic Error, Style, Efficiency, Security, Best Practice, Documentation
- Severity levels: Minor, Moderate, Critical
- Publish feedback to release to students

### Feedback Viewing (Student)
- View code with highlighted issues
- See detailed feedback per issue
- Mark issues as "fixed"
- Track resolution progress

### Analytics
- Marker: Pending/In Review/Released counts, Resolution rate, Issues by category/severity
- Student: Total submissions, Issues fixed/open, Progress tracking

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- User registration and JWT authentication
- Course and assignment CRUD
- Submission creation with history tracking
- Feedback issue management (create, read, update, delete)
- Issue categories auto-seeding
- Publish feedback workflow
- Mark issue as fixed
- Analytics endpoints for marker and student

### Frontend (React + Tailwind + Shadcn/UI)
- Login/Register pages with role selection
- Marker Dashboard with Bento Grid layout
- Student Dashboard with progress tracking
- Assignments page with course/assignment creation (marker)
- Code submission via Monaco editor (student)
- Code Review page with issue creation panel
- Student Feedback page with issue list
- Analytics page with Recharts visualizations

## Technology Stack
- **Frontend**: React, Monaco Editor, Tailwind CSS, Shadcn/UI, Recharts
- **Backend**: FastAPI (Python), MongoDB with Motor async driver
- **Auth**: JWT with bcrypt password hashing

## Prioritized Backlog

### P0 (Critical - Done)
- ✅ User authentication
- ✅ Assignment submission
- ✅ Code review interface
- ✅ Feedback creation and publishing
- ✅ Student feedback viewing

### P1 (Important)
- Diff viewer comparing submissions
- Email notifications on feedback release
- File upload via .py file (in addition to editor)
- Issue templates for markers

### P2 (Nice to Have)
- Dark mode
- Multi-file (.zip) submission support
- AI-assisted feedback suggestions
- Gamification (badges, streaks)

## Next Action Items
1. Add diff viewer to compare current vs previous submission
2. Implement file upload functionality
3. Add email notifications
4. Consider AI feedback integration for future phase
