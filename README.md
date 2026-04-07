# CodeFeedback Studio

A comprehensive code assessment, feedback, and moderation platform built for universities and educational institutions. Designed to streamline the assignment submission, marking, and feedback cycle while keeping students motivated through gamification.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features for Students](#features-for-students)
- [Features for Markers](#features-for-markers)
- [Features for Moderators & Module Leaders](#features-for-moderators--module-leaders)
- [Gamification System](#gamification-system)
  - [Student Badges](#student-badges)
  - [Marker Badges](#marker-badges)
  - [XP & Levels](#xp--levels)
- [Module Leaderboards](#module-leaderboards)
- [Custom Feedback Templates](#custom-feedback-templates)
- [How Feedback Works](#how-feedback-works)
- [Assignment Lifecycle](#assignment-lifecycle)
- [Local Setup Guide](#local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

CodeFeedback Studio is a multi-role platform where:

- **Students** submit code assignments, receive inline feedback, fix issues, and track their learning progress.
- **Markers** review submissions, provide GitHub-style inline code feedback with severity levels, use module-specific templates, and have their work auto-saved.
- **Moderators** audit marker feedback to ensure quality and consistency.
- **Module Leaders** manage courses, assignments, team members, and publish results.

The platform encourages positive academic behaviour through a gamification system with XP, badges, levels, and optional per-module leaderboards.

---

## Tech Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React 18, Tailwind CSS, shadcn/ui, Lucide Icons  |
| Backend     | FastAPI (Python 3.11+), Pydantic                 |
| Database    | MongoDB with Motor (async driver)                |
| Auth        | JWT-based authentication (bcrypt hashing)         |
| Code Editor | Monaco Editor (VS Code engine)                   |
| Build Tool  | CRACO (Create React App Configuration Override)   |

---

## Features for Students

| Feature | Description |
|---------|-------------|
| **Course Enrollment** | Browse and join available courses from the public course listing |
| **Code Submission** | Submit multi-file code through the Monaco Editor (VS Code engine) |
| **Multi-File Support** | Submit projects with multiple files, each reviewed independently |
| **Inline Feedback View** | See marker feedback highlighted directly on the code lines they relate to |
| **Issue Tracking** | View all open issues with severity levels (Minor, Moderate, Critical) |
| **Fix Issues & Earn XP** | Mark issues as fixed to earn XP based on severity and response time |
| **Resubmission** | Resubmit improved code (tracked by attempt number); markers see improvement over time |
| **Progress Analytics** | Personal dashboard with submission counts, fix rates, and per-course breakdowns |
| **Badges & Achievements** | Earn 14 unique badges for positive academic behaviour (see full list below) |
| **Module Leaderboard** | Opt-in to compete with peers using a private nickname — real name never shown |
| **Player Profile** | View your badges, XP, level, progress bar, and active leaderboard modules |
| **Dark Mode** | Toggle between light and dark themes |
| **Feedback View** | Dedicated feedback page showing all issues grouped by file with suggested fixes |

---

## Features for Markers

| Feature | Description |
|---------|-------------|
| **Submission Queue** | View all pending submissions per course and assignment with status indicators |
| **Code Review Interface** | Full Monaco Editor with syntax highlighting, line selection, and glyph margin markers |
| **Inline Issue Creation** | Select code lines → "Add Issue" with category, severity, explanation, suggested fix, and marks deduction |
| **Module-Specific Templates** | Create and reuse custom feedback templates scoped to a specific module or globally |
| **Template Auto-Fill** | Selecting a template auto-populates all issue fields (title, explanation, severity, fix, deduction) |
| **Template Search** | Search templates by name, category, or content |
| **Reuse Issues** | Copy any existing issue to a new location via the sidebar copy button |
| **Issue Reapply** | Apply the same template multiple times across different parts of the same submission |
| **Auto-Draft Saving** | All marker inputs (issues, form state, marks) automatically saved every 15 seconds |
| **Draft Recovery** | Resume marking after page refresh or interruption — drafts restored automatically |
| **Sidebar-Code Sync** | Click any issue in the sidebar to scroll to and highlight the exact code location |
| **Active Highlight** | Selected issue pulses in the code editor and is highlighted in the sidebar |
| **Grading** | Assign marks with auto-calculated deductions from issues |
| **No Issues Mark** | Mark submissions as correct with one click — awards full marks |
| **Publish Feedback** | Release feedback to the student when ready |
| **Badges & XP** | Earn 13 unique badges for review speed, thoroughness, and mentoring |
| **Module Leaderboard** | Opt-in marker leaderboard per module with privacy controls |
| **Course Management** | Create courses, manage collaborators and moderators |
| **Assignment Management** | Create, edit, delete assignments with deadline/release scheduling |
| **Moderation Access** | Course leaders can review moderation queue and approve/reject flags |

---

## Features for Moderators & Module Leaders

| Feature | Description |
|---------|-------------|
| **Moderation Queue** | Auto-sampled: all failed submissions + 10% random sample of passed ones |
| **Issue Flagging** | Raise moderation issues on marker feedback with severity and description |
| **Approve / Reject** | Module leaders can approve or reject moderation flags |
| **Course Settings** | Add/remove collaborators, moderators; transfer course leadership |
| **Assignment Lifecycle** | Full control over Schedule Release, Set Deadline, and Publish Results |
| **Delete Assignments** | Module leaders can delete assignments (cascading deletion) |
| **Dashboard Stats** | Course-wide moderation statistics and pending action counts |

---

## Gamification System

The gamification system rewards positive academic behaviour — not just raw scores. Both students and markers earn XP and badges for constructive participation.

### Student Badges

| Badge | How to Earn | XP |
|-------|-------------|-----|
| First Steps | Submit your first assignment | 50 |
| Bug Squasher | Fix 10 issues across your submissions | 100 |
| Quick Learner | Fix an issue within 24 hours of feedback | 75 |
| Zero to Hero | Fix every single issue in a submission | 100 |
| Perfectionist | Get a submission marked with no issues | 150 |
| Five Star Coder | Get 5 perfect submissions with no issues | 200 |
| Rapid Improver | Improve your score by 20% on a resubmission | 125 |
| Consistent Performer | Submit 5 assignments on time | 100 |
| Streak Warrior | Submit 3 assignments on time in a row | 80 |
| Early Bird | Submit an assignment 24 hours before the deadline | 60 |
| Feedback Champion | Fix at least 80% of all issues raised on your work | 120 |
| Tenacious | Resubmit and improve your score 3 times | 110 |
| Multi-Talented | Be active in 3 or more modules | 90 |
| Centurion | Earn a total of 500 XP | 75 |

### Marker Badges

| Badge | How to Earn | XP |
|-------|-------------|-----|
| First Review | Complete your first code review | 50 |
| Speed Reviewer | Review 10 submissions within deadline | 100 |
| On-Time Champion | Review all assignments before deadline for a course | 150 |
| Quick Turnaround | Review 5 submissions within 48 hours of submission | 110 |
| Thorough Reviewer | Provide detailed feedback on 20 submissions | 150 |
| Feedback Master | Create 10 reusable feedback templates | 100 |
| Detail Oriented | Average 3+ issues per review on at least 10 reviews | 125 |
| Template Architect | Create 20 reusable feedback templates | 150 |
| Mentor | Help 5 students achieve perfect scores | 200 |
| Consistent Marker | Maintain 95% moderation approval rate | 175 |
| Quality Guardian | 100% moderation approval on 10+ reviews | 200 |
| Multi-Course Expert | Actively review in 3 or more courses | 90 |
| Century Reviewer | Complete 100 code reviews | 250 |

### XP & Levels

| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Novice | 0 |
| 2 | Beginner | 100 |
| 3 | Learner | 300 |
| 4 | Practitioner | 600 |
| 5 | Competent | 1,000 |
| 6 | Proficient | 1,500 |
| 7 | Advanced | 2,200 |
| 8 | Expert | 3,000 |
| 9 | Master | 4,000 |
| 10 | Grandmaster | 5,200 |

**XP Sources:**
- Grading a submission: +25 XP (marker)
- Marking "No Issues": +15 XP (marker)
- Fixing an issue within 24h: full severity XP (student)
- Fixing an issue after 24h: half XP (student)
- Badge unlock: varies (50-250 XP)

---

## Module Leaderboards

Each course/module has separate, opt-in leaderboards for students and markers.

**Key Principles:**
- **Voluntary**: Joining is completely optional. You earn XP and badges regardless.
- **Private**: You pick a unique nickname per module. Your real name is never displayed.
- **Per-Module**: You can be on the leaderboard in one module but private in another.
- **Fair**: Rankings compare only within the same module, not across the platform.
- **Separate**: Student and marker leaderboards are independent — students never see marker rankings.

**Student Leaderboard Score** is based on:
- Submissions made (10 pts each)
- On-time submissions (15 pts bonus)
- Issues fixed (8 pts each)
- Perfect submissions (30 pts each)
- Quick fixes within 24h (5 pts bonus)

**Marker Leaderboard Score** is based on:
- Reviews completed (10 pts each)
- Issues found / thoroughness (5 pts each)
- Moderation approvals (20 pts each)
- Quick turnaround within 48h (8 pts bonus)

---

## Custom Feedback Templates

Templates allow markers to save common feedback patterns and reuse them across submissions:

- **Module-Specific**: Templates created for one module are only available within that module
- **Global Templates**: Optionally create templates available across all modules
- **Auto-Fill**: Selecting a template populates title, explanation, severity, suggested fix, and marks deduction
- **Editable**: All fields can be modified after template selection
- **Reusable**: Apply the same template to multiple locations in the same submission
- **Searchable**: Search templates by name, category, or content
- **Usage Tracking**: See how many times each template has been used

**Creating a Template:**
1. Fill out the "Add Issue" form with your feedback
2. Click "Save as Template" at the bottom of the dialog
3. Choose a name and scope (this module only or all modules)
4. The template is immediately available for future reviews

---

## How Feedback Works

1. **Marker opens a submission** in the code review interface (Monaco Editor).
2. **Selects lines of code** and creates an inline issue with:
   - Title and explanation
   - Category (Logic Error, Style, Efficiency, Security, Best Practice, Documentation)
   - Severity (Minor, Moderate, Critical)
   - Suggested fix and reference links
   - Marks deduction
3. **Or uses a template** to auto-fill all fields from a saved pattern.
4. **Student receives feedback** when results are published.
5. **Student fixes issues** and marks them as resolved — earning XP.
6. **Student can resubmit** with improved code for the next attempt.

The sidebar always stays synchronized with the code — clicking an issue scrolls to and highlights the relevant lines.

---

## Assignment Lifecycle

```
Create Assignment
       |
       v
 [Schedule Release?] --Yes--> Assignment hidden until release date
       |No
       v
 Assignment visible to students
       |
       v
 Students submit code
       |
       v
 [Has Deadline?] --Yes--> Submissions close at deadline
       |No                     Markers see submissions after deadline
       v
 Markers review & grade (any time)
       |
       v
 Module Leader: "Publish Results"
       |
       v
 [Schedule Publish?] --Yes--> Results visible at scheduled time
       |No
       v
 Results immediately visible to students
```

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

1. Open `http://localhost:3000` in your browser.
2. Register as a **Marker** to create courses and assignments.
3. Register as a **Student** to enroll in courses and submit code.
4. The marker who creates a course automatically becomes the **Module Leader**.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `codefeedback_studio` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API base URL | `http://localhost:8001` |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current user |

### Courses & Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/courses` | List/create courses |
| GET/POST | `/api/assignments` | List/create assignments |
| DELETE | `/api/assignments/{id}` | Delete assignment (leader only) |
| POST | `/api/assignments/{id}/publish-results` | Publish results |

### Submissions & Grading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/submissions` | List/create submissions |
| POST | `/api/submissions/{id}/grade` | Grade submission |
| POST | `/api/submissions/{id}/mark-no-issues` | Mark as correct |
| POST | `/api/submissions/{id}/publish` | Publish feedback |

### Feedback Issues
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/issues` | List/create issues |
| POST | `/api/issues/{id}/mark-fixed` | Student marks fixed |
| DELETE | `/api/issues/{id}` | Delete issue |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issue-templates?course_id=xxx` | List templates (module-specific) |
| POST | `/api/issue-templates` | Create template |
| DELETE | `/api/issue-templates/{id}` | Delete template |
| POST | `/api/issue-templates/{id}/use` | Increment usage count |

### Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drafts/{submission_id}` | Get saved draft |
| POST | `/api/drafts/save` | Save draft |

### Gamification & Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/stats` | XP, level, badges |
| POST | `/api/leaderboard/join` | Join module leaderboard |
| POST | `/api/leaderboard/leave` | Leave module leaderboard |
| GET | `/api/leaderboard/{course_id}/students` | Student leaderboard |
| GET | `/api/leaderboard/{course_id}/markers` | Marker leaderboard |
| GET | `/api/profile/{user_id}` | User profile |

### Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/queue` | Moderation queue |
| POST | `/api/moderation/issues` | Raise moderation issue |
| POST | `/api/moderation/issues/{id}/approve` | Approve issue |
| POST | `/api/moderation/issues/{id}/reject` | Reject issue |

---

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Set **Node.js Version** to `18.x` in Project Settings.
5. Add environment variable: `REACT_APP_BACKEND_URL` = your backend URL.
6. Deploy.

### Backend (Render.com)

1. Create a new **Web Service** on [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`.
6. Deploy.

---

## Troubleshooting

### Windows `.env` encoding error
If you see `UnicodeDecodeError` on startup, your `.env` file may be saved in UTF-16 (common with PowerShell). Fix:
```powershell
Set-Content -Path backend\.env -Value @"
MONGO_URL="mongodb://localhost:27017"
DB_NAME="codefeedback_studio"
JWT_SECRET="your-secret-key"
"@ -Encoding UTF8
```

### MongoDB connection refused
- Ensure MongoDB is running: `mongosh` should connect.
- Check your `MONGO_URL` in `backend/.env`.

### Frontend shows blank page
- Check browser console for errors.
- Verify `REACT_APP_BACKEND_URL` in `frontend/.env`.
- Ensure the backend is running and accessible.

---

Built with care for educators and learners.
