# CodeFeedback Studio - Product Requirements Document

## Overview
CodeFeedback Studio is a web-based platform designed to improve how programming assignments are reviewed and how students learn from feedback.

## User Personas

### Marker (Teacher/TA)
- Views submissions ONLY from their own courses
- Reviews code in structured Monaco editor
- Highlights specific lines and marks mistakes/issues
- Attaches clear, targeted feedback with categories/severity
- Can mark submissions as "No Issues Found" (fully correct)
- Publishes feedback once grading is complete
- Views course-scoped dashboards and analytics

### Student
- Must enroll in a course during registration
- Submits code assignments to their enrolled course
- Tracks submission status (pending, in review, feedback ready, no issues)
- Views feedback after marker releases it
- Marks issues as "fixed" to track improvement
- Can resubmit assignments before deadline

## Core Requirements

### Authentication
- JWT-based custom auth with email/password
- Role-based access (student/marker)
- Students MUST select a course during registration

### Course & Class Structure
- Markers create courses (name, code, year, semester)
- Students enroll in exactly one course at registration
- Submissions are linked to courses via assignments
- Access control: markers see only their courses

### Submission Deadline Mechanism
- Markers set optional due_date per assignment (ISO 8601 with timezone)
- Frontend: disabled submit button + "Submissions Closed" badge after deadline
- Backend: 403 "Submission deadline has passed" response (authoritative)
- 1-minute grace period for clock skew
- Students cannot submit or resubmit after deadline

### Code Review (Marker)
- Monaco Editor with Python syntax highlighting
- Line-by-line annotation capability
- Structured feedback: Title, Category, Severity, Explanation
- Issue categories: Logic Error, Style, Efficiency, Security, Best Practice, Documentation
- Severity levels: Minor, Moderate, Critical
- "No Issues Found" option for fully correct submissions
- Publish feedback to release to students

### Feedback Viewing (Student)
- View code with highlighted issues
- See detailed feedback per issue
- "No Issues" submissions show congratulatory message + marker comment
- Mark issues as "fixed"
- Track resolution progress

### Analytics (Marker-Only, Course-Scoped)
- Total feedback given
- Pending reviews (across all marker's courses)
- Active courses count
- Per-course breakdown: submissions, pending, completed, no-issues, avg turnaround
- NO gamification data (student-only)
- NO vanity metrics

## What's Been Implemented (February 2026)

### Backend (FastAPI + MongoDB)
- User registration with course enrollment for students
- JWT authentication with role-based access
- Course CRUD with marker ownership
- Assignment CRUD with deadline support
- Submission creation with deadline enforcement
- Feedback issue management
- "No Issues Found" endpoint (mark-no-issues)
- Course-scoped marker analytics
- Student progress analytics

### Frontend (React + Tailwind + Shadcn/UI)
- Login/Register pages with course selection for students
- Marker Dashboard with course-scoped metrics
- Student Dashboard with progress tracking
- Assignments page with deadline display
- Code submission with deadline warnings
- Code Review page with "No Issues" option
- Student Feedback page with "No Issues" display
- Analytics page with course filter

## Technology Stack
- **Frontend**: React, Monaco Editor, Tailwind CSS, Shadcn/UI, Recharts
- **Backend**: FastAPI (Python), MongoDB with Motor async driver
- **Auth**: JWT with bcrypt password hashing

## Prioritized Backlog

### P0 (Critical - Done)
- ✅ User authentication with course enrollment
- ✅ Submission deadlines with backend enforcement
- ✅ Course-scoped access control
- ✅ "No Issues Found" feedback option
- ✅ Course-scoped marker analytics

### P1 (Important)
- Diff viewer comparing submissions
- Email notifications on feedback release
- Assignment editing (update deadline)
- Bulk issue templates

### P2 (Nice to Have)
- Dark mode
- Multi-file (.zip) submission support
- Student gamification system (XP, badges, levels)
- AI-assisted feedback suggestions

## Next Action Items
1. Implement diff viewer for submission comparisons
2. Add email notifications system
3. Build student gamification backend
4. Consider AI feedback integration
