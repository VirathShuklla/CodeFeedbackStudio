# CodeFeedback Studio

A comprehensive code assessment, feedback, and moderation platform built for universities and educational institutions. Designed to streamline the assignment submission, marking, and feedback cycle while keeping students motivated through gamification.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
  - [For Students](#for-students)
  - [For Markers](#for-markers)
  - [For Moderators & Module Leaders](#for-moderators--module-leaders)
- [Gamification System](#gamification-system)
  - [Student Badges](#student-badges)
  - [Marker Badges](#marker-badges)
  - [XP & Levels](#xp--levels)
- [Module Leaderboards](#module-leaderboards)
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
- **Markers** review submissions, provide GitHub-style inline code feedback with severity levels, and use reusable templates.
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

## Features

### For Students

| Feature                  | Description                                                         |
|--------------------------|---------------------------------------------------------------------|
| Course Enrollment        | Browse and join available courses                                   |
| Code Submission          | Submit multi-file code via Monaco Editor                            |
| Inline Feedback          | View GitHub-style line-by-line feedback from markers                |
| Issue Tracking           | See open issues, mark them as fixed to earn XP                      |
| Resubmission             | Resubmit improved code (tracked by attempt number)                  |
| Progress Analytics       | Dashboard with per-course stats, fix rates, and issue breakdowns    |
| Badges & XP              | Earn badges for good practices (on-time submissions, fixing issues) |
| Module Leaderboard       | Opt-in to compete with peers using a private nickname               |
| Profile                  | View your badges, XP, level, and active leaderboard modules         |

### For Markers

| Feature                  | Description                                                         |
|--------------------------|---------------------------------------------------------------------|
| Submission Queue         | View all pending submissions per course/assignment                  |
| Code Review Interface    | Full Monaco Editor with line selection for inline feedback          |
| Issue Templates          | Create and reuse common feedback templates                          |
| Grading                  | Assign marks, add feedback, or mark submissions as "No Issues"      |
| Publish Results          | Schedule when students see their marks                              |
| Badges & XP              | Earn badges for review speed, thoroughness, and mentoring           |
| Module Leaderboard       | Opt-in marker leaderboard per module                                |
| Analytics                | Track reviews completed, pending reviews, per-course breakdowns     |

### For Moderators & Module Leaders

| Feature                  | Description                                                         |
|--------------------------|---------------------------------------------------------------------|
| Moderation Queue         | Auto-sampled queue: all failed + 10% random sample of passed        |
| Issue Flagging           | Raise moderation issues on marker feedback                          |
| Approve / Reject         | Module leaders can approve or reject moderation flags               |
| Course Management        | Add/remove collaborators, moderators; transfer leadership           |
| Assignment Management    | Create, edit, delete assignments; set deadlines and release dates    |
| Dashboard Stats          | Course-wide moderation statistics                                   |

---

## Gamification System

The gamification system is designed to reward positive academic behaviour rather than raw scores. Both students and markers earn XP and badges for constructive participation.

### Student Badges

| Badge                | How to Earn                                           | XP   |
|----------------------|-------------------------------------------------------|------|
| First Steps          | Submit your first assignment                          | 50   |
| Bug Squasher         | Fix 10 issues across your submissions                 | 100  |
| Quick Learner        | Fix an issue within 24 hours of feedback              | 75   |
| Zero to Hero         | Fix every single issue in a submission                | 100  |
| Perfectionist        | Get a submission marked with no issues                | 150  |
| Five Star Coder      | Get 5 perfect submissions with no issues              | 200  |
| Rapid Improver       | Improve your score by 20% on a resubmission           | 125  |
| Consistent Performer | Submit 5 assignments on time                          | 100  |
| Streak Warrior       | Submit 3 assignments on time in a row                 | 80   |
| Early Bird           | Submit an assignment 24 hours before the deadline      | 60   |
| Feedback Champion    | Fix at least 80% of all issues raised on your work    | 120  |
| Tenacious            | Resubmit and improve your score 3 times               | 110  |
| Multi-Talented       | Be active in 3 or more modules                        | 90   |
| Centurion            | Earn a total of 500 XP                                | 75   |

### Marker Badges

| Badge                | How to Earn                                            | XP   |
|----------------------|--------------------------------------------------------|------|
| First Review         | Complete your first code review                        | 50   |
| Speed Reviewer       | Review 10 submissions within deadline                  | 100  |
| On-Time Champion     | Review all assignments before deadline for a course    | 150  |
| Quick Turnaround     | Review 5 submissions within 48 hours of submission     | 110  |
| Thorough Reviewer    | Provide detailed feedback on 20 submissions            | 150  |
| Feedback Master      | Create 10 reusable feedback templates                  | 100  |
| Detail Oriented      | Average 3+ issues per review on at least 10 reviews    | 125  |
| Template Architect   | Create 20 reusable feedback templates                  | 150  |
| Mentor               | Help 5 students achieve perfect scores                 | 200  |
| Consistent Marker    | Maintain 95% moderation approval rate                  | 175  |
| Quality Guardian     | 100% moderation approval on 10+ reviews                | 200  |
| Multi-Course Expert  | Actively review in 3 or more courses                   | 90   |
| Century Reviewer     | Complete 100 code reviews                              | 250  |

### XP & Levels

XP is earned through actions and badge unlocks:

| Level | Title         | XP Required |
|-------|---------------|-------------|
| 1     | Novice        | 0           |
| 2     | Beginner      | 100         |
| 3     | Learner       | 300         |
| 4     | Practitioner  | 600         |
| 5     | Competent     | 1,000       |
| 6     | Proficient    | 1,500       |
| 7     | Advanced      | 2,200       |
| 8     | Expert        | 3,000       |
| 9     | Master        | 4,000       |
| 10    | Grandmaster   | 5,200       |

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
- **Separate**: Student and marker leaderboards are independent.

**Student Leaderboard Score** is based on:
- Submissions made (10 pts each)
- On-time submissions (15 pts each)
- Issues fixed (8 pts each)
- Perfect submissions (30 pts each)
- Quick fixes within 24h (5 pts bonus)

**Marker Leaderboard Score** is based on:
- Reviews completed (10 pts each)
- Issues found / thoroughness (5 pts each)
- Moderation approvals (20 pts each)
- Quick turnaround within 48h (8 pts bonus)

---

## How Feedback Works

1. **Marker opens a submission** in the code review interface (Monaco Editor).
2. **Selects lines of code** and creates an inline issue with:
   - Title and explanation
   - Category (Logic Error, Style, Efficiency, Security, Best Practice)
   - Severity (Minor, Moderate, Critical)
   - Suggested fix and reference links
   - Marks deduction
3. **Student receives feedback** when results are published.
4. **Student fixes issues** and marks them as resolved — earning XP.
5. **Student can resubmit** with improved code for the next attempt.

Templates allow markers to save common feedback patterns (e.g., "Missing null check", "Inefficient loop") and reuse them across submissions for consistency.

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

# Activate (choose your OS):
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create environment file
# Create backend/.env with:
MONGO_URL="mongodb://localhost:27017"
DB_NAME="codefeedback_studio"
JWT_SECRET="your-secret-key-change-this-in-production"

# 5. Make sure MongoDB is running
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# 6. Start the backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# 1. Open a new terminal
cd frontend

# 2. Install dependencies
yarn install

# 3. Create environment file
# Create frontend/.env with:
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

| Variable     | Description                   | Example                        |
|--------------|-------------------------------|--------------------------------|
| `MONGO_URL`  | MongoDB connection string     | `mongodb://localhost:27017`    |
| `DB_NAME`    | Database name                 | `codefeedback_studio`          |
| `JWT_SECRET` | Secret key for JWT tokens     | `your-secret-key`             |

### Frontend (`frontend/.env`)

| Variable                  | Description            | Example                  |
|---------------------------|------------------------|--------------------------|
| `REACT_APP_BACKEND_URL`   | Backend API base URL   | `http://localhost:8001`  |

---

## API Reference

### Authentication
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | `/api/auth/register`  | Register new user    |
| POST   | `/api/auth/login`     | Login, get JWT token |
| GET    | `/api/auth/me`        | Get current user     |

### Courses
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/courses`                | List accessible courses  |
| POST   | `/api/courses`                | Create course (marker)   |
| GET    | `/api/courses/{id}`           | Get course details       |
| PUT    | `/api/courses/{id}`           | Update course settings   |

### Assignments
| Method | Endpoint                                    | Description                |
|--------|---------------------------------------------|----------------------------|
| GET    | `/api/assignments`                          | List assignments           |
| POST   | `/api/assignments`                          | Create assignment          |
| DELETE | `/api/assignments/{id}`                     | Delete (leader only)       |
| POST   | `/api/assignments/{id}/publish-results`     | Schedule results           |
| GET    | `/api/assignments/{id}/review-status`       | Review progress            |

### Submissions & Grading
| Method | Endpoint                                    | Description                |
|--------|---------------------------------------------|----------------------------|
| GET    | `/api/submissions`                          | List submissions           |
| POST   | `/api/submissions`                          | Submit code (student)      |
| POST   | `/api/submissions/{id}/grade`               | Grade (marker)             |
| POST   | `/api/submissions/{id}/mark-no-issues`      | Mark perfect (marker)      |

### Feedback Issues
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/issues`                 | List issues              |
| POST   | `/api/issues`                 | Create inline issue      |
| POST   | `/api/issues/{id}/mark-fixed` | Mark issue fixed         |

### Gamification
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/gamification/stats` | XP, level, badges        |
| GET    | `/api/gamification/badges`| All badge definitions    |

### Leaderboard
| Method | Endpoint                                  | Description                    |
|--------|-------------------------------------------|--------------------------------|
| GET    | `/api/leaderboard/check-nickname`         | Check nickname availability    |
| POST   | `/api/leaderboard/join`                   | Join module leaderboard        |
| POST   | `/api/leaderboard/leave`                  | Leave module leaderboard       |
| GET    | `/api/leaderboard/settings/{course_id}`   | Get opt-in status              |
| GET    | `/api/leaderboard/{course_id}/students`   | Student leaderboard            |
| GET    | `/api/leaderboard/{course_id}/markers`    | Marker leaderboard             |

### Profile
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/profile/{user_id}`  | Public profile with badges, XP, stats |

### Moderation
| Method | Endpoint                                        | Description              |
|--------|-------------------------------------------------|--------------------------|
| GET    | `/api/moderation/queue`                         | Moderation queue         |
| GET    | `/api/moderation/dashboard`                     | Moderation stats         |
| POST   | `/api/moderation/issues`                        | Raise moderation issue   |
| POST   | `/api/moderation/issues/{id}/approve`           | Approve issue            |
| POST   | `/api/moderation/issues/{id}/reject`            | Reject issue             |

---

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Set **Node.js Version** to `18.x` in Project Settings.
5. Add environment variable: `REACT_APP_BACKEND_URL` = your backend URL.
6. Deploy.

The repository includes `.nvmrc` (Node 18) and `.npmrc` (legacy-peer-deps) for compatibility.

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
If you see `UnicodeDecodeError` on startup, your `.env` file may be saved in UTF-16 (common with PowerShell `>` redirect). Fix:
```powershell
# Re-create the file with UTF-8 encoding
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
- Verify `REACT_APP_BACKEND_URL` in `frontend/.env` points to the correct backend.
- Ensure the backend is running and accessible.

### CORS errors
- The backend allows all origins by default (`CORS_ORIGINS="*"`).
- For production, restrict to your frontend domain.

---

Built with care for educators and learners.
