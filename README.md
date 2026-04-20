# CodeFeedback Studio

A comprehensive code assessment, feedback, and moderation platform built for universities and educational institutions. Designed to streamline the entire assignment submission, marking, moderation, and feedback cycle — while keeping students and markers motivated through gamification.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [System Architecture Diagram](#system-architecture-diagram)
  - [Directory Structure](#directory-structure)
  - [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [Features for Students](#features-for-students)
- [Features for Markers](#features-for-markers)
- [Features for Moderators & Module Leaders](#features-for-moderators--module-leaders)
- [PDF Feedback Export](#pdf-feedback-export)
- [Cross-Student Side-by-Side Comparison](#cross-student-side-by-side-comparison)
- [Student Reflection & Notes System](#student-reflection--notes-system)
- [Gamification System](#gamification-system)
  - [Student Badges (14)](#student-badges-14)
  - [Marker Badges (13)](#marker-badges-13)
  - [XP & Levels](#xp--levels)
  - [XP Award Breakdown](#xp-award-breakdown)
- [Module Leaderboards](#module-leaderboards)
- [Custom Feedback Templates](#custom-feedback-templates)
- [How the Feedback Workflow Works](#how-the-feedback-workflow-works)
- [Assignment Lifecycle](#assignment-lifecycle)
- [Moderation Pipeline](#moderation-pipeline)
- [Auto-Draft Saving](#auto-draft-saving)
- [Dark Mode & UI/UX](#dark-mode--uiux)
- [Local Setup Guide](#local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running the App](#running-the-app)
  - [Seed Data](#seed-data)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Courses & Enrollment](#courses--enrollment)
  - [Assignments](#assignments)
  - [Submissions & Grading](#submissions--grading)
  - [Feedback Issues](#feedback-issues)
  - [Feedback Templates](#feedback-templates)
  - [Auto-Draft](#auto-draft)
  - [PDF Export](#pdf-export)
  - [Cross-Student Comparison](#cross-student-comparison)
  - [Student Reflections](#student-reflections)
  - [Gamification & Leaderboard](#gamification--leaderboard)
  - [Moderation](#moderation)
- [Deployment](#deployment)
  - [Frontend (Vercel)](#frontend-vercel)
  - [Backend (Render.com)](#backend-rendercom)
  - [MongoDB Atlas](#mongodb-atlas)
- [Event-B Formal Specification](#event-b-formal-specification)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

CodeFeedback Studio is a multi-role platform designed to replace ad-hoc marking workflows in computer science departments. It provides:

| Who | What They Do |
|-----|-------------|
| **Students** | Submit multi-file code assignments, receive inline feedback highlighted on exact code lines, mark issues as fixed to earn XP, write pre/post-submission reflections, export feedback as professional PDFs, and track progress via badges and leaderboards. |
| **Markers** | Review submissions in a GitHub-style code review interface, provide inline feedback with severity levels and suggested fixes, use and create module-specific feedback templates, compare two students' submissions side by side, and have their work auto-saved every 15 seconds. |
| **Moderators** | Audit a quality-controlled sample of marked work (all fails + 10% random pass sample), flag concerns for the module leader to review, and confirm feedback quality. |
| **Module Leaders** | Manage courses, assignments, and team members (collaborators, moderators). Control the full assignment lifecycle from creation to results publication. Approve or reject moderation flags. Delete assignments with cascading cleanup. |

The platform encourages positive academic behaviour through a gamification system with XP, 27 unique badges, 10 levels (Novice to Grandmaster), and optional per-module privacy-first leaderboards.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | Component-based UI framework |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible component library |
| Icons | Lucide React | Consistent, lightweight icon set |
| Code Editor | Monaco Editor (@monaco-editor/react) | VS Code's editor engine for syntax highlighting, glyph margins, and line selection |
| Backend | FastAPI (Python 3.11+) | High-performance async REST API framework |
| Validation | Pydantic | Request/response data validation and serialization |
| Database | MongoDB 6.0+ | Document database for flexible schema |
| DB Driver | Motor 3.3+ | Async MongoDB driver for Python |
| Auth | JWT (PyJWT) + bcrypt | Stateless token-based authentication with secure password hashing |
| PDF Generation | ReportLab + Pygments | Professional PDF reports with syntax-highlighted code |
| Build Tool | CRACO | Create React App configuration override |
| Package Manager | Yarn (frontend), pip (backend) | Dependency management |

---

## Architecture

### System Architecture Diagram

```
                                    ┌──────────────────┐
                                    │   MongoDB Atlas   │
                                    │  (or local Mongo) │
                                    └────────┬─────────┘
                                             │ Motor (async)
                                             │
┌─────────────────┐   HTTP/JSON    ┌─────────┴──────────┐
│   React SPA     │ ◄────────────► │   FastAPI Backend   │
│  (Port 3000)    │   /api/*       │    (Port 8001)      │
│                 │                │                     │
│ - Monaco Editor │                │ - JWT Auth          │
│ - shadcn/ui     │                │ - RBAC middleware   │
│ - Tailwind CSS  │                │ - Gamification eng. │
│ - React Router  │                │ - PDF generator     │
│ - Axios         │                │ - Moderation logic  │
│ - Sonner toasts │                │ - Auto-draft system │
└─────────────────┘                └─────────────────────┘
```

All frontend API calls use `REACT_APP_BACKEND_URL` and are prefixed with `/api`. The backend serves all routes under an `/api` router. In production (Kubernetes/Vercel), an ingress controller proxies `/api/*` requests to the backend on port 8001.

### Directory Structure

```
/app/
├── README.md                          # This file
├── docs/
│   └── event-b/
│       └── README.md                  # Formal Event-B specification
├── memory/
│   ├── PRD.md                         # Product Requirements Document
│   └── test_credentials.md            # Test account credentials
├── backend/
│   ├── .env                           # Backend environment variables
│   ├── requirements.txt               # Python dependencies (pip freeze)
│   ├── server.py                      # FastAPI application (all routes)
│   ├── data/                          # Generated PDFs and uploads
│   └── tests/
│       └── test_iteration9_*.py       # Pytest suite for latest features
└── frontend/
    ├── .env                           # Frontend environment variables
    ├── package.json                   # Node.js dependencies
    ├── tailwind.config.js             # Tailwind CSS configuration
    ├── craco.config.js                # CRACO build overrides
    └── src/
        ├── App.js                     # Root component with routing
        ├── App.css                    # Custom CSS animations
        ├── index.css                  # Tailwind base imports
        ├── index.js                   # React entry point
        ├── components/
        │   ├── LoadingScreen.js       # Animated loading splash
        │   ├── layout/
        │   │   └── AppLayout.js       # Shared navigation bar
        │   └── ui/                    # shadcn/ui components
        │       ├── button.jsx
        │       ├── badge.jsx
        │       ├── dialog.jsx
        │       ├── select.jsx
        │       ├── textarea.jsx
        │       ├── scroll-area.jsx
        │       ├── sonner.tsx         # Toast notifications
        │       ├── dropdown-menu.jsx
        │       └── ...
        ├── contexts/
        │   ├── AuthContext.js          # JWT auth + API instance
        │   └── ThemeContext.js         # Dark mode toggle
        ├── hooks/
        │   └── use-toast.js           # Toast hook
        ├── lib/
        │   └── utils.js               # Utility helpers (cn)
        └── pages/
            ├── LoginPage.js            # Login form
            ├── RegisterPage.js         # Registration with role selection
            ├── MarkerDashboard.js      # Marker home: courses + stats
            ├── MarkerCoursePage.js     # Course detail: assignments + submissions
            ├── CodeReviewPage.js       # Full code review interface (873 lines)
            ├── MarkerAnalyticsPage.js  # Marker performance analytics
            ├── MarkerBadgesPage.js     # Marker badge showcase
            ├── ModerationPage.js       # Moderation queue and actions
            ├── StudentDashboard.js     # Student home: courses + progress
            ├── StudentFeedbackPage.js  # Feedback viewer + reflections panel
            ├── StudentAnalyticsPage.js # Student performance analytics
            ├── StudentBadgesPage.js    # Student badge showcase
            ├── LeaderboardPage.js      # Module-specific leaderboards
            └── ComparisonPage.js       # Side-by-side submission comparison
```

### Database Schema

CodeFeedback Studio uses MongoDB with the following collections:

#### `users`
```json
{
  "id": "uuid",
  "email": "unique string",
  "password_hash": "bcrypt hash",
  "full_name": "string",
  "role": "student | marker | moderator | module_leader",
  "xp": 0,
  "level": 1,
  "badges": ["badge_id", ...],
  "leaderboard_settings": {
    "course_id": { "opted_in": true, "nickname": "string" }
  },
  "created_at": "ISO 8601"
}
```

#### `courses`
```json
{
  "id": "uuid",
  "code": "CS101",
  "name": "Introduction to Programming",
  "description": "string",
  "term": "Spring 2026",
  "leader_id": "user.id (module_leader)",
  "collaborator_ids": ["user.id", ...],
  "moderator_ids": ["user.id", ...],
  "student_ids": ["user.id", ...],
  "created_at": "ISO 8601"
}
```

#### `assignments`
```json
{
  "id": "uuid",
  "course_id": "course.id",
  "title": "string",
  "description": "string",
  "due_date": "ISO 8601 | null",
  "has_deadline": true,
  "has_schedule_release": false,
  "release_date": "ISO 8601 | null",
  "results_publish_date": "ISO 8601 | null",
  "results_published": false,
  "max_attempts": -1,
  "total_marks": 100,
  "marking_scheme_url": "string | null",
  "created_at": "ISO 8601"
}
```

#### `submissions`
```json
{
  "id": "uuid",
  "student_id": "user.id",
  "assignment_id": "assignment.id",
  "attempt_number": 1,
  "status": "pending | in_review | feedback_released | no_issues",
  "moderation_status": "null | pending | approved | flagged | flagged_approved",
  "marks": null,
  "marks_released": false,
  "marker_comment": "string | null",
  "reviewed_by": "user.id | null",
  "review_completed_at": "ISO 8601 | null",
  "submission_time": "ISO 8601",
  "files": [
    { "id": "uuid", "filename": "main.py", "content": "..." }
  ]
}
```

#### `feedback_issues`
```json
{
  "id": "uuid",
  "submission_id": "submission.id",
  "file_id": "file.id within submission",
  "category_id": "category.id",
  "title": "Variable naming convention",
  "explanation": "Detailed explanation...",
  "severity": "critical | moderate | minor",
  "suggested_fix": "string | null",
  "marks_deduction": 5,
  "line_start": 10,
  "line_end": 12,
  "student_status": "open | fixed",
  "resolution_timestamp": "ISO 8601 | null",
  "created_at": "ISO 8601",
  "created_by": "user.id"
}
```

#### `issue_categories`
```json
{
  "id": "uuid",
  "name": "Logic Error | Style | Efficiency | Security | Best Practice | Documentation",
  "description": "string"
}
```

#### `issue_templates`
```json
{
  "id": "uuid",
  "title": "string",
  "explanation": "string",
  "category_id": "category.id",
  "severity": "critical | moderate | minor",
  "suggested_fix": "string | null",
  "marks_deduction": 5,
  "course_id": "course.id | null (null = global)",
  "created_by": "user.id",
  "usage_count": 0,
  "created_at": "ISO 8601"
}
```

#### `moderation_issues`
```json
{
  "id": "uuid",
  "submission_id": "submission.id",
  "raised_by": "user.id (moderator)",
  "title": "string",
  "explanation": "string",
  "severity": "critical | moderate | minor",
  "status": "open | resolved | discarded",
  "leader_response": "null | approved | rejected",
  "resolved_at": "ISO 8601 | null",
  "created_at": "ISO 8601"
}
```

#### `marker_drafts`
```json
{
  "submission_id": "submission.id",
  "user_id": "user.id",
  "form_state": {
    "newIssue": { "title": "...", "severity": "..." },
    "gradeData": { "marks": 85, "feedback": "..." }
  },
  "updated_at": "ISO 8601"
}
```

#### `reflections`
```json
{
  "id": "uuid",
  "submission_id": "submission.id",
  "user_id": "user.id (student)",
  "reflection_type": "pre_submission | post_feedback",
  "content": "Free-form text...",
  "prompted_responses": {
    "q0": "Answer to prompt 1...",
    "q1": "Answer to prompt 2...",
    "q2": "Answer to prompt 3..."
  },
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

#### `reflection_drafts`
```json
{
  "submission_id": "submission.id",
  "user_id": "user.id",
  "reflection_type": "pre_submission | post_feedback",
  "content": "Draft text...",
  "prompted_responses": { ... },
  "updated_at": "ISO 8601"
}
```

---

## User Roles & Permissions

CodeFeedback Studio implements a hierarchical role-based access control system. Each higher role inherits all permissions of the roles below it.

```
Module Leader (highest)
    ├── All Moderator permissions
    ├── Approve / reject moderation flags
    ├── Delete assignments (cascading)
    ├── Transfer course leadership
    └── Manage collaborators & moderators

Moderator
    ├── All Marker permissions
    ├── View moderation queue
    ├── Raise moderation issues
    └── Confirm "no moderation issues"

Marker
    ├── Create courses (becomes Module Leader of that course)
    ├── Create assignments
    ├── Review submissions (code review interface)
    ├── Add / delete inline feedback issues
    ├── Grade submissions
    ├── Publish feedback
    ├── Create and manage feedback templates
    ├── Cross-student side-by-side comparison
    └── Export feedback as PDF

Student (base role)
    ├── Browse and enroll in courses
    ├── Submit multi-file code assignments
    ├── View inline feedback on own submissions
    ├── Mark issues as fixed (earns XP)
    ├── Write pre/post-submission reflections
    ├── Export own feedback as PDF
    ├── View personal analytics
    ├── View badge showcase
    └── Opt into module leaderboards
```

**Role Promotion**: When a marker creates a course, they are automatically promoted to `module_leader`. This is the only automatic role change in the system.

---

## Features for Students

| Feature | Description |
|---------|-------------|
| **Course Enrollment** | Browse available courses and enroll with one click. Unenroll at any time. |
| **Code Submission** | Submit multi-file code projects through the built-in Monaco Editor (the same engine that powers VS Code). Supports syntax highlighting for 30+ languages. |
| **Multi-File Support** | Submit projects with multiple files (e.g., `main.py`, `utils.py`, `test_main.py`). Each file is reviewed independently with its own issue annotations. |
| **Inline Feedback View** | See marker feedback highlighted directly on the exact code lines they relate to. Issues appear as coloured glyph margin markers and line highlights. |
| **Issue Severity Levels** | Issues are tagged as **Minor** (blue), **Moderate** (amber), or **Critical** (red), so you know what to prioritize fixing first. |
| **Fix Issues & Earn XP** | Mark issues as "fixed" to earn XP. Fix within 24 hours for full XP; after 24 hours you still earn half. |
| **Resubmission** | Resubmit improved code (tracked by attempt number). Markers can see your improvement across attempts. |
| **Progress Analytics** | Personal dashboard showing submission counts, fix rates, XP breakdown, and per-course performance. |
| **Badges & Achievements** | Earn 14 unique badges for positive academic behaviours like early submissions, issue fixing streaks, and consistent participation (see full list below). |
| **Module Leaderboard** | Opt-in to compete with peers using a private nickname. Your real name is never shown. Rankings are per-module. |
| **Player Profile** | View your badges, XP, level, progress bar to next level, and active leaderboard modules. |
| **Pre/Post Reflections** | Write structured reflections before submitting (what you learned, challenges) and after receiving feedback (key takeaways, improvement plans). Guided prompts help you think critically. |
| **PDF Export** | Download a professional PDF report of your feedback including all issues, severity breakdown, suggested fixes, and annotated code. Perfect for portfolio building or advisor meetings. |
| **Dark Mode** | Toggle between light and dark themes. Preference is persisted across sessions. |
| **Feedback Navigation** | Click any issue in the sidebar to instantly scroll to the exact code location with a highlight animation. |

---

## Features for Markers

| Feature | Description |
|---------|-------------|
| **Submission Queue** | View all pending submissions per course and assignment with colour-coded status indicators (pending, in review, completed). |
| **Code Review Interface** | Full Monaco Editor with syntax highlighting, line selection, glyph margin markers, and keyboard shortcuts. The editor is read-only — markers annotate, not edit. |
| **Inline Issue Creation** | Select code lines, click "Add Issue", and fill in: category, severity, title, explanation, suggested fix, and marks deduction. The issue appears as a highlighted annotation on the code. |
| **Module-Specific Templates** | Create and reuse custom feedback templates scoped to a specific module. Common feedback patterns like "missing docstring" or "O(n^2) algorithm" can be applied in seconds. |
| **Global Templates** | Create templates available across all modules for universal feedback patterns. |
| **Template Auto-Fill** | Selecting a template auto-populates all issue fields: title, explanation, severity, suggested fix, and marks deduction. Fields remain editable after auto-fill. |
| **Template Search** | Search templates by name, category, or content. Filter between module-specific and global templates. |
| **Copy & Reuse** | Copy any existing issue to a new code location via the sidebar copy button. Apply the same template multiple times across different parts of the same submission. |
| **Auto-Draft Saving** | All marker inputs (issue form state, grade data) are automatically saved to the server every 15 seconds. A cloud status indicator shows Saved/Saving/Unsaved. |
| **Draft Recovery** | Resume marking after page refresh, browser crash, or interruption. Drafts are restored automatically — nothing is lost. |
| **Sidebar-Code Sync** | Click any issue in the sidebar to scroll to and highlight the exact code location with a pulse animation. The issue card also highlights in the sidebar. |
| **Grading** | Assign marks with auto-calculated deductions. The suggested grade is `total_marks - sum(deductions)`, but markers can override. |
| **No Issues Mark** | Mark a submission as "correct" with one click. This awards full marks and triggers the `perfectionist` badge check for the student. |
| **Publish Feedback** | Release feedback to the student when the review is complete. Feedback enters the moderation pipeline automatically. |
| **Cross-Student Comparison** | Open two students' submissions side by side in synchronized Monaco editors. The primary panel shows issues; the reference panel is read-only. Perfect for calibrating marking consistency. |
| **PDF Export** | Export any submission's feedback as a professional PDF (even mid-review). Useful for external examiners, records, or student meetings. |
| **Badges & XP** | Earn 13 unique badges for review speed, thoroughness, template creation, and mentoring. |
| **Module Leaderboard** | Opt-in marker leaderboard per module. Rankings are based on reviews completed, issues found, moderation approval rate, and turnaround speed. |
| **Course Management** | Create courses (auto-promotes to Module Leader), add collaborators and moderators, manage student enrollment. |
| **Assignment Management** | Create, edit, and delete assignments with configurable deadlines, scheduled releases, and scheduled result publication. |

---

## Features for Moderators & Module Leaders

| Feature | Description |
|---------|-------------|
| **Moderation Queue** | A quality-controlled sample: **all failed submissions** (those with issues) + **10% random sample of passed submissions** (no issues). This ensures both positive and negative feedback are audited. |
| **Issue Flagging** | Moderators raise concerns on specific marker feedback. Each flag includes a title, explanation, severity, and the specific issue being questioned. |
| **Approve / Reject** | Module leaders review moderation flags and either approve (agreeing with the moderator's concern) or reject (dismissing it). Approved flags update the submission's moderation status. |
| **Confirm No Issues** | Moderators can confirm that a submission's feedback looks correct, moving it from `mod_pending` to `mod_approved`. |
| **Course Settings** | Add/remove collaborators (other markers), add/remove moderators, transfer course leadership. |
| **Assignment Lifecycle** | Full control over: Schedule Release (make visible at future date), Set Deadline (close submissions), Publish Results (release grades and feedback to students). |
| **Delete Assignments** | Module leaders can permanently delete assignments. This cascades: all submissions, issues, drafts, and related data are removed. |
| **Dashboard Statistics** | Course-wide moderation statistics: pending reviews, approved count, flagged count, and overall approval rate. |

---

## PDF Feedback Export

Both markers and students can export submission feedback as a professional, print-ready PDF report.

**What the PDF includes:**
- CodeFeedback Studio header and branding
- Student information (name, email)
- Module and assignment details (course name, code, assignment title)
- Submission metadata (attempt number, submission date, status, marks)
- Reviewer information and review date
- **Issues Summary**: Total count broken down by severity (Critical/Moderate/Minor), fixed count, total marks deducted
- **Detailed Issue List**: Each issue with severity badge, title, file and line location, explanation, suggested fix, and open/fixed status
- **Annotated Code**: Each submitted file with line numbers and `>>>` markers on lines with issues
- Footer with generation timestamp

**How to use:**
- **Students**: Click the "PDF" button in the feedback page header
- **Markers**: Click the "PDF" button in the code review page header (available both during and after review)

**Access control:**
- Students can only export their own submissions
- Markers can export any submission they have access to

---

## Cross-Student Side-by-Side Comparison

Markers can compare two students' submissions side by side to calibrate marking consistency.

**How it works:**
1. Navigate to **Compare** in the marker navigation bar (or click "Compare" from within a code review)
2. Select an **assignment** from the dropdown
3. Choose **Student A** (Primary — annotatable) and **Student B** (Reference — read-only)
4. Click **Compare**

**Features:**
- **Synchronized scrolling**: Both editors scroll in sync by default. Toggle off with the "Sync Scroll" checkbox.
- **Primary panel (left)**: Shows the primary student's code with all their issues in a sidebar. Click issues to jump to the code location.
- **Reference panel (right)**: Shows the reference student's code as read-only. No issues are exposed (privacy protection).
- **File switching**: Each panel has its own file selector to switch between submitted files independently.
- **Student info**: Student name, attempt number, and marks percentage displayed in each panel header.

**Access control:**
- Marker-only feature. Students cannot access the comparison page.
- Issues for the reference student are never exposed to maintain assessment integrity.

---

## Student Reflection & Notes System

Students can write structured reflections at two key points in the learning cycle:

### Pre-Submission Reflections
Written **before or during** the submission process. Guided prompts:
1. "What was the most challenging part of this assignment?"
2. "What concepts did you apply or learn while completing this?"
3. "Is there anything you're unsure about in your code?"

### Post-Feedback Reflections
Available **after receiving feedback** (submission status is `feedback_released` or `no_issues`). Guided prompts:
1. "What did you learn from the marker's feedback?"
2. "What would you do differently next time?"
3. "Which feedback point was most helpful?"

**Features:**
- **Guided prompts**: 3 prompts per reflection type, each with its own text area
- **Free-form notes**: An additional text area for any extra thoughts, goals, or notes
- **Auto-draft saving**: Reflection drafts auto-save to the server every 10 seconds. A status indicator shows Saved/Saving/Draft.
- **Draft recovery**: Switch tabs or close the browser — your draft is recovered on return
- **Upsert semantics**: Save overwrites the existing reflection for that (submission, type) pair. You can keep refining.
- **Confirmation**: A green banner shows when the reflection was last saved with a timestamp.
- **Toggle panel**: Click "Reflections" in the feedback page header to show/hide the panel (the issues panel hides when reflections are open).

**Access control:**
- Student-only. Markers can view student reflections through the API but the UI focus is on the student experience.
- Post-feedback reflections are blocked until feedback has been released (enforced by both frontend and backend).

---

## Gamification System

The gamification system rewards positive academic behaviour — not just raw scores. Both students and markers earn XP and badges for constructive participation.

### Student Badges (14)

| Badge | Name | How to Earn | XP |
|-------|------|-------------|-----|
| First Steps | First Steps | Submit your first assignment | 50 |
| Bug Squasher | Bug Squasher | Fix 10 issues across your submissions | 100 |
| Quick Learner | Quick Learner | Fix an issue within 24 hours of feedback | 75 |
| Zero to Hero | Zero to Hero | Fix every single issue in a submission | 100 |
| Perfectionist | Perfectionist | Get a submission marked with no issues | 150 |
| Five Star Coder | Five Star Coder | Get 5 perfect submissions with no issues | 200 |
| Rapid Improver | Rapid Improver | Improve your score by 20% on a resubmission | 125 |
| Consistent Performer | Consistent Performer | Submit 5 assignments on time | 100 |
| Streak Warrior | Streak Warrior | Submit 3 assignments on time in a row | 80 |
| Early Bird | Early Bird | Submit an assignment 24 hours before the deadline | 60 |
| Feedback Champion | Feedback Champion | Fix at least 80% of all issues raised on your work | 120 |
| Tenacious | Tenacious | Resubmit and improve your score 3 times | 110 |
| Multi-Talented | Multi-Talented | Be active in 3 or more modules | 90 |
| Centurion | Centurion | Earn a total of 500 XP | 75 |

### Marker Badges (13)

| Badge | Name | How to Earn | XP |
|-------|------|-------------|-----|
| First Review | First Review | Complete your first code review | 50 |
| Speed Reviewer | Speed Reviewer | Review 10 submissions within deadline | 100 |
| On-Time Champion | On-Time Champion | Review all assignments before deadline for a course | 150 |
| Quick Turnaround | Quick Turnaround | Review 5 submissions within 48 hours of submission | 110 |
| Thorough Reviewer | Thorough Reviewer | Provide detailed feedback on 20 submissions | 150 |
| Feedback Master | Feedback Master | Create 10 reusable feedback templates | 100 |
| Detail Oriented | Detail Oriented | Average 3+ issues per review on at least 10 reviews | 125 |
| Template Architect | Template Architect | Create 20 reusable feedback templates | 150 |
| Mentor | Mentor | Help 5 students achieve perfect scores | 200 |
| Consistent Marker | Consistent Marker | Maintain 95% moderation approval rate (20+ reviews) | 175 |
| Quality Guardian | Quality Guardian | Achieve 100% moderation approval on 10+ reviews | 200 |
| Multi-Course Expert | Multi-Course Expert | Actively review in 3 or more courses | 90 |
| Century Reviewer | Century Reviewer | Complete 100 code reviews | 250 |

### XP & Levels

| Level | Title | XP Required | XP to Next |
|-------|-------|-------------|-----------|
| 1 | Novice | 0 | 100 |
| 2 | Beginner | 100 | 200 |
| 3 | Learner | 300 | 300 |
| 4 | Practitioner | 600 | 400 |
| 5 | Competent | 1,000 | 500 |
| 6 | Proficient | 1,500 | 700 |
| 7 | Advanced | 2,200 | 800 |
| 8 | Expert | 3,000 | 1,000 |
| 9 | Master | 4,000 | 1,200 |
| 10 | Grandmaster | 5,200 | -- |

### XP Award Breakdown

| Action | Who | XP Earned |
|--------|-----|-----------|
| Submit an assignment | Student | Badge-triggered (First Steps = 50) |
| Fix an issue within 24h | Student | Full severity XP (varies) |
| Fix an issue after 24h | Student | Half severity XP |
| Grade a submission | Marker | +25 XP |
| Mark "No Issues" | Marker | +15 XP |
| Earn a new badge | Both | Badge XP value (50–250) |

---

## Module Leaderboards

Each course/module has separate, opt-in leaderboards for students and markers.

**Key Principles:**
- **Voluntary**: Joining is completely optional. You earn XP and badges regardless of leaderboard participation.
- **Private**: You pick a unique nickname per module. Your real name is never displayed on the leaderboard.
- **Per-Module**: You can be on the leaderboard in one module but private in another. Each module is independent.
- **Fair**: Rankings compare only within the same module, not across the entire platform.
- **Separated**: Student and marker leaderboards are completely independent. Students never see marker rankings and vice versa.

**Student Leaderboard Scoring:**
| Action | Points |
|--------|--------|
| Submission made | 10 |
| On-time submission | 15 (bonus) |
| Issue fixed | 8 |
| Perfect submission (no issues) | 30 |
| Quick fix within 24h | 5 (bonus) |

**Marker Leaderboard Scoring:**
| Action | Points |
|--------|--------|
| Review completed | 10 |
| Issue found (thoroughness) | 5 |
| Moderation approval | 20 |
| Quick turnaround within 48h | 8 (bonus) |

---

## Custom Feedback Templates

Templates allow markers to save common feedback patterns and reuse them across submissions within a module or globally.

**Template Scope:**
- **Module-Specific**: Templates created for a specific course are only visible within that course's reviews
- **Global**: Templates created without a course scope are available across all modules

**Template Fields:**
- Title (e.g., "Missing docstring")
- Explanation (e.g., "All public functions should have a docstring explaining their purpose")
- Category (Logic Error, Style, Efficiency, Security, Best Practice, Documentation)
- Severity (Minor, Moderate, Critical)
- Suggested fix (optional)
- Marks deduction (optional)

**How to create a template:**
1. Fill out the "Add Issue" form in the code review interface
2. Click "Save as Template" at the bottom of the dialog
3. Choose a name and scope (this module only or all modules)
4. The template is immediately available for future reviews

**Template Features:**
- **Auto-fill**: Selecting a template populates all fields instantly
- **Editable after fill**: All auto-filled fields can be modified before saving the issue
- **Searchable**: Search by name, category, or content
- **Usage tracking**: See how many times each template has been used (`usage_count`)
- **Deletable**: Only the template creator can delete their templates

---

## How the Feedback Workflow Works

```
Step 1: Marker opens a submission
        ├── Monaco Editor loads with all submitted files
        ├── File sidebar shows each file with issue count badges
        └── Draft is restored if one exists

Step 2: Marker selects code lines
        ├── Click or drag to select line range
        └── Status bar shows selected filename + line range

Step 3: Marker creates feedback issue
        ├── Click "Add Issue" or use a template
        ├── Fill in: title, category, severity, explanation, fix, deduction
        └── Issue appears as a coloured annotation on the code

Step 4: Repeat for all issues
        ├── Auto-draft saves every 15 seconds
        ├── Sidebar shows all issues, grouped by severity
        └── Click any issue to scroll to its code location

Step 5: Marker grades (optional)
        ├── Click "Grade" → enter marks + additional feedback
        └── Auto-calculated from total_marks - sum(deductions)

Step 6: Marker publishes feedback
        ├── Click "Publish" → feedback released to student
        ├── Submission enters moderation pipeline (mod_pending)
        └── XP awarded to marker

Step 7: Student views feedback
        ├── Issues shown inline on code with severity colours
        ├── Sidebar lists all issues with explanations and suggested fixes
        └── Student can navigate between files

Step 8: Student fixes issues
        ├── Click "Mark as Fixed" on each resolved issue
        ├── XP awarded based on severity and response time
        └── Progress bar updates (X/Y fixed)

Step 9: Student writes reflections (optional)
        ├── Pre-submission: before or during submission
        └── Post-feedback: after receiving feedback

Step 10: Student exports PDF (optional)
         └── Professional report with all feedback for records
```

---

## Assignment Lifecycle

```
    Module Leader creates assignment
                │
                ▼
    ┌─────────────────────────┐
    │  Has Scheduled Release? │
    └────────┬────────┬───────┘
          Yes│        │No
             ▼        ▼
    Hidden until    Immediately
    release date    visible
             │        │
             └───┬────┘
                 ▼
    Students can submit code
                 │
                 ▼
    ┌──────────────────────┐
    │    Has Deadline?     │
    └───────┬────────┬─────┘
         Yes│        │No
            ▼        ▼
    Submissions    Open-ended
    close at       (submit anytime)
    deadline
            │        │
            └───┬────┘
                ▼
    Markers review & grade
    (auto-draft, templates, comparison)
                │
                ▼
    Module Leader: "Publish Results"
                │
                ▼
    ┌──────────────────────────────┐
    │  Has Scheduled Publish Date? │
    └───────┬──────────────┬───────┘
         Yes│              │No
            ▼              ▼
    Results visible    Results immediately
    at scheduled time  visible to students
            │              │
            └──────┬───────┘
                   ▼
    Students see grades, feedback, and can
    write post-feedback reflections
```

---

## Moderation Pipeline

The moderation system ensures feedback quality through a structured audit process:

```
    Submission reviewed by marker
                │
                ▼
    ┌───────────────────────────────────────┐
    │  Enters moderation queue (mod_pending) │
    │                                        │
    │  Queue = ALL failed submissions        │
    │        + 10% random pass sample        │
    └───────────┬───────────────────────────┘
                │
         Moderator reviews
                │
        ┌───────┴───────┐
        │               │
    No concerns     Raise flag
        │               │
        ▼               ▼
    mod_approved    mod_flagged
                        │
              Module Leader reviews
                        │
                ┌───────┴───────┐
                │               │
            Approve         Reject
            (valid concern) (dismiss)
                │               │
                ▼               ▼
        flagged_approved    (discarded)
```

**Moderation Statuses:**
| Status | Meaning |
|--------|---------|
| `null` | Not yet reviewed (pending submission) |
| `pending` | In the moderation queue, awaiting moderator review |
| `approved` | Moderator confirmed feedback is appropriate |
| `flagged` | Moderator raised a concern — awaiting leader review |
| `flagged_approved` | Module leader agreed with the moderator's concern |

---

## Auto-Draft Saving

CodeFeedback Studio automatically saves work-in-progress to prevent data loss:

### Marker Drafts
- **What's saved**: Issue form state (title, explanation, severity, etc.) and grade data (marks, feedback text)
- **Save interval**: Every 15 seconds
- **Recovery**: On page load, drafts are restored from the server. Form fields, marks, and feedback text are all recovered.
- **Status indicator**: Cloud icon in the header shows Saved (green), Saving (amber pulse), or Unsaved (grey)
- **Storage**: Server-side in `marker_drafts` collection, keyed by (submission_id, user_id)

### Reflection Drafts
- **What's saved**: Free-form content and prompted responses for each reflection type
- **Save interval**: Every 10 seconds
- **Recovery**: When switching between reflection types (pre/post), the draft is loaded from the server
- **Status indicator**: Cloud icon in the reflections panel header
- **Storage**: Server-side in `reflection_drafts` collection, keyed by (submission_id, user_id, reflection_type)

---

## Dark Mode & UI/UX

- **Dark mode toggle** in the navigation bar (sun/moon icon). Uses CSS variables for consistent theming.
- **Animated loading screen** on first visit (~0.5s) with the CodeFeedback logo
- **Micro-animations** throughout the app:
  - Slide-up for header elements (`animate-slide-down`)
  - Fade-in for content sections (`animate-fade-in`)
  - Scale-in for badges and issue counts (`animate-scale-in`)
  - Staggered reveals for lists (`animate-stagger`)
  - Pulse highlight for active code issues
  - Hover effects on cards and buttons
  - Smooth transitions on all interactive elements
- **Toast notifications** (Sonner) for all user actions — success, error, and info
- **Monaco Editor** with JetBrains Mono font, custom glyph margin markers, and line highlighting

---

## Local Setup Guide

### Prerequisites

- **Node.js** 18.x or later ([download](https://nodejs.org))
- **Python** 3.11+ ([download](https://python.org))
- **MongoDB** 6.0+ ([download](https://www.mongodb.com/try/download/community))
- **Yarn** 1.22+ (`npm install -g yarn`)

### Backend Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd codefeedback-studio

# 2. Create a virtual environment
cd backend
python -m venv venv

# Activate:
# Windows PowerShell: .\venv\Scripts\Activate.ps1
# macOS / Linux:      source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create environment file (backend/.env):
MONGO_URL="mongodb://localhost:27017"
DB_NAME="codefeedback_studio"
JWT_SECRET="your-secret-key-change-this-in-production"

# 5. Make sure MongoDB is running
# Windows:  net start MongoDB
# macOS:    brew services start mongodb-community
# Linux:    sudo systemctl start mongod

# 6. Start the backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# 1. Open a new terminal
cd frontend

# 2. Install dependencies
yarn install

# 3. Create environment file (frontend/.env):
REACT_APP_BACKEND_URL=http://localhost:8001

# 4. Start the frontend
yarn start
```

### Running the App

1. Open `http://localhost:3000` in your browser
2. Register as a **Marker** to create courses and assignments
3. Register as a **Student** to enroll in courses and submit code
4. The marker who creates a course automatically becomes the **Module Leader**

### Seed Data

On first startup, the backend automatically seeds:
- 6 issue categories (Logic Error, Style, Efficiency, Security, Best Practice, Documentation)
- Default admin account if configured

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGO_URL` | Yes | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Yes | Database name | `codefeedback_studio` |
| `JWT_SECRET` | Yes | Secret key for JWT token signing (min 32 chars recommended) | `your-secret-key-change-in-production` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API base URL (no trailing slash) | `http://localhost:8001` |

**Important**: Never commit `.env` files to version control. Add them to `.gitignore`.

---

## API Reference

All endpoints are prefixed with `/api`. Authentication is via `Authorization: Bearer <JWT_TOKEN>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | None | Register a new user. Body: `{email, password, full_name, role}` |
| `POST` | `/api/auth/login` | None | Login. Returns `{token, user}` |
| `GET` | `/api/auth/me` | Required | Get current authenticated user profile |

### Courses & Enrollment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/courses` | Required | List all courses (filtered by role) |
| `POST` | `/api/courses` | Marker+ | Create a new course |
| `GET` | `/api/courses/{id}` | Required | Get course details with stats |
| `PUT` | `/api/courses/{id}` | Marker+ | Update course settings |
| `POST` | `/api/courses/{id}/enroll` | Student | Enroll in a course |
| `POST` | `/api/courses/{id}/unenroll` | Student | Unenroll from a course |

### Assignments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/assignments` | Required | List assignments (filtered by user's courses) |
| `POST` | `/api/assignments` | Marker+ | Create assignment |
| `GET` | `/api/assignments/{id}` | Required | Get assignment details |
| `DELETE` | `/api/assignments/{id}` | Leader | Delete assignment (cascading) |
| `POST` | `/api/assignments/{id}/publish-results` | Marker+ | Publish results to students |
| `GET` | `/api/assignments/{id}/review-status` | Marker+ | Get review progress stats |

### Submissions & Grading

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/submissions` | Marker+ | List submissions (with filters) |
| `POST` | `/api/submissions` | Student | Submit code files |
| `GET` | `/api/submissions/{id}` | Required | Get submission details with files |
| `POST` | `/api/submissions/{id}/grade` | Marker+ | Assign marks. Body: `{marks, feedback}` |
| `POST` | `/api/submissions/{id}/mark-no-issues` | Marker+ | Mark as correct (full marks) |
| `POST` | `/api/submissions/{id}/publish` | Marker+ | Publish feedback to student |

### Feedback Issues

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/issues?submission_id=X` | Required | List issues for a submission |
| `POST` | `/api/issues` | Marker+ | Create inline feedback issue |
| `DELETE` | `/api/issues/{id}` | Marker+ | Delete issue (before publishing) |
| `POST` | `/api/issues/{id}/mark-fixed` | Student | Mark issue as fixed (earns XP) |
| `GET` | `/api/categories` | Required | List issue categories |

### Feedback Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/issue-templates?course_id=X` | Marker+ | List templates for a module |
| `POST` | `/api/issue-templates` | Marker+ | Create template |
| `DELETE` | `/api/issue-templates/{id}` | Marker+ | Delete template (creator only) |
| `POST` | `/api/issue-templates/{id}/use` | Marker+ | Increment usage count |

### Auto-Draft

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/drafts/{submission_id}` | Marker+ | Get saved marker draft |
| `POST` | `/api/drafts/save` | Marker+ | Save marker draft |

### PDF Export

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/submissions/{id}/export-pdf` | Required | Generate and download PDF report |

Returns `application/pdf` with `Content-Disposition: attachment`. Students can only export their own submissions.

### Cross-Student Comparison

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/compare/submissions?assignment_id=X` | Marker+ | List all submissions for comparison picker |
| `GET` | `/api/compare/{id_a}/{id_b}` | Marker+ | Get two submissions side by side |

The comparison response includes issues for submission A (primary) but strips issues from submission B (reference/read-only) for privacy.

### Student Reflections

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/reflections` | Student | Save/update a reflection. Body: `{submission_id, reflection_type, content, prompted_responses}` |
| `GET` | `/api/reflections/{submission_id}` | Required | Get reflections (pre + post) |
| `POST` | `/api/reflections/auto-save` | Student | Auto-save reflection draft |
| `GET` | `/api/reflections/draft/{submission_id}/{type}` | Student | Get saved draft |

`reflection_type` must be `"pre_submission"` or `"post_feedback"`. Post-feedback reflections are blocked until submission status is `feedback_released` or `no_issues`.

### Gamification & Leaderboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/gamification/stats` | Required | Get user's XP, level, badges |
| `GET` | `/api/gamification/leaderboard/{course_id}` | Required | Get module leaderboard |
| `POST` | `/api/leaderboard/join` | Required | Join module leaderboard. Body: `{course_id, nickname}` |
| `POST` | `/api/leaderboard/leave` | Required | Leave module leaderboard. Body: `{course_id}` |
| `GET` | `/api/leaderboard/{course_id}/students` | Required | Student leaderboard rankings |
| `GET` | `/api/leaderboard/{course_id}/markers` | Marker+ | Marker leaderboard rankings |
| `GET` | `/api/profile/{user_id}` | Required | User profile (badges, XP, modules) |

### Moderation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/moderation/queue` | Moderator+ | Get moderation queue (sampled) |
| `GET` | `/api/moderation/issues` | Moderator+ | List moderation issues |
| `POST` | `/api/moderation/issues` | Moderator+ | Raise moderation issue |
| `POST` | `/api/moderation/issues/{id}/approve` | Leader | Approve moderation flag |
| `POST` | `/api/moderation/issues/{id}/reject` | Leader | Reject moderation flag |
| `POST` | `/api/moderation/submissions/{id}/confirm` | Moderator+ | Confirm no moderation issues |
| `GET` | `/api/moderation/dashboard` | Moderator+ | Moderation statistics |

---

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to Create React App
5. Set **Node.js Version** to `18.x` in Project Settings
6. Add environment variable: `REACT_APP_BACKEND_URL` = your backend URL (e.g., `https://api.codefeedback.example.com`)
7. Deploy

### Backend (Render.com)

1. Create a new **Web Service** on [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `MONGO_URL` = your MongoDB Atlas connection string
   - `DB_NAME` = `codefeedback_studio`
   - `JWT_SECRET` = a strong, random 64-character secret
6. Deploy

### MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write access
3. Whitelist your backend's IP address (or `0.0.0.0/0` for development)
4. Copy the connection string and use it as `MONGO_URL` in your backend `.env`
5. The application creates collections automatically on first use

---

## Event-B Formal Specification

A complete formal Event-B specification of the system is available at [`/docs/event-b/README.md`](docs/event-b/README.md).

This includes:
- **2 Contexts** (C0, C1): Type definitions, role hierarchy axioms, gamification constants
- **6 Machines** (M0–M5 + M6): Access Control, Course Management, Submission Lifecycle, Feedback & Review, Moderation Workflow, Gamification Engine, Student Reflections
- **22 requirements** traced to formal events and invariants
- **State transition diagrams** for submissions, moderation, and authentication
- **Proof obligations summary** demonstrating invariant preservation

---

## Troubleshooting

### Windows `.env` encoding error
If you see `UnicodeDecodeError` on startup, your `.env` file may be saved in UTF-16 (common with PowerShell's `>` redirect). Fix:
```powershell
Set-Content -Path backend\.env -Value @"
MONGO_URL="mongodb://localhost:27017"
DB_NAME="codefeedback_studio"
JWT_SECRET="your-secret-key"
"@ -Encoding UTF8
```

### MongoDB connection refused
- Ensure MongoDB is running: `mongosh` should connect
- Check your `MONGO_URL` in `backend/.env`
- If using Atlas, check IP whitelist and credentials

### Frontend shows blank page
- Check browser console (F12) for errors
- Verify `REACT_APP_BACKEND_URL` in `frontend/.env` (no trailing slash)
- Ensure the backend is running and accessible at the configured URL
- Try clearing `localStorage` in the browser console: `localStorage.clear()`

### Monaco Editor not loading
- Ensure `@monaco-editor/react` is installed: `yarn add @monaco-editor/react`
- Check network tab for blocked CDN requests (Monaco loads its worker from a CDN)
- If behind a corporate proxy, you may need to configure the Monaco loader

### PDF export fails
- Ensure `reportlab` is installed in the backend: `pip install reportlab`
- Check that the `backend/data/` directory exists and is writable
- Check backend logs for detailed error messages

### Draft not saving
- Ensure the backend is running and accessible
- Check the browser console for 401 errors (expired token — re-login)
- Auto-save only triggers when content changes (not on page load)

### Badges not appearing
- Badge evaluation runs after specific trigger events (submission, fix, review completion)
- Check `GET /api/gamification/stats` for current badge list
- Some badges require multiple actions (e.g., "Bug Squasher" needs 10 fixed issues)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `cd backend && pytest tests/`
5. Lint frontend: `cd frontend && npx eslint src/`
6. Commit with a descriptive message
7. Push and create a Pull Request

**Code Style:**
- Backend: Follow PEP 8, use type hints, async/await for all DB operations
- Frontend: React functional components with hooks, Tailwind CSS for styling, shadcn/ui for components
- All interactive elements must have `data-testid` attributes

---

## License

This project is proprietary software built for educational institutions. All rights reserved.

---

Built with care for educators and learners.
