# CodeFeedback Studio

<div align="center">

![CodeFeedback Studio](https://img.shields.io/badge/CodeFeedback-Studio-6366f1?style=for-the-badge&logo=code&logoColor=white)
![Version](https://img.shields.io/badge/version-2.5.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

**A comprehensive code assessment and feedback platform for programming education**

[Features](#-features) • [Quick Start](#-quick-start) • [Gamification](#-gamification-system) • [API Docs](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [User Roles](#-user-roles)
- [Assignment Lifecycle](#-assignment-lifecycle)
- [Gamification System](#-gamification-system)
- [Moderation System](#-moderation-system)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

**CodeFeedback Studio** is a full-featured code assessment platform designed for universities and coding bootcamps. It enables instructors to provide GitHub-style inline code reviews, manage assignments with flexible deadlines, and motivate both students and markers through a comprehensive gamification system.

### Why CodeFeedback Studio?

| Traditional Methods | CodeFeedback Studio |
|---------------------|---------------------|
| Email-based submissions | Centralized submission portal |
| Generic feedback | Line-by-line inline comments |
| No progress tracking | XP, badges, and level progression |
| Manual moderation | Automated sampling + moderation workflow |
| Inconsistent grading | Reusable feedback templates |

---

## ✨ Features

### 📝 Code Submission & Review

- **Multi-file Submissions**: Students can submit multiple Python files per assignment
- **GitHub-style Code Review**: Markers can select specific lines and add contextual feedback
- **Syntax Highlighting**: Monaco Editor integration with full Python syntax support
- **Diff Comparison**: Compare current submission with previous attempts
- **Issue Categorization**: Organize feedback by category (Logic, Style, Performance, etc.)
- **Severity Levels**: Mark issues as Critical, Moderate, or Minor
- **Suggested Fixes**: Provide actionable improvement suggestions

### 📚 Course Management

- **Course Creation**: Create courses with code, name, semester, and year
- **Team Collaboration**: Add collaborators and moderators to courses
- **Student Enrollment**: Students can browse and enroll in available courses
- **Role Assignment**: Assign Module Leader, Collaborator, or Moderator roles
- **Leadership Transfer**: Transfer course ownership to another marker

### 📋 Assignment Lifecycle

Three distinct controls give markers full flexibility:

| Control | Options | Behavior |
|---------|---------|----------|
| **Schedule Release** | Yes/No | Controls when students can see the assignment |
| **Set Deadline** | Yes/No | Controls submission window and marker access |
| **Publish Results** | Date/Time | When all students receive marks collectively |

### 🎮 Gamification

- **XP System**: Earn experience points for completing actions
- **Badge Unlocks**: Achieve milestones to unlock badges
- **Level Progression**: Progress from Novice to Grandmaster
- **Progress Tracking**: Visual progress bars and statistics
- **Leaderboards**: Compare progress with peers (coming soon)

### 🛡️ Moderation

- **Automatic Sampling**: 100% of failed submissions + 10% random sample of passed
- **Issue Workflow**: Moderators raise issues, Module Leaders approve/reject
- **Audit Trail**: Full history of moderation decisions
- **Consistency Badge**: Markers earn badges for high approval rates

### 🎨 User Experience

- **Dark Mode**: Toggle between light and dark themes
- **Fast Loading**: Optimized 1.5-second loading screen with assembly animation
- **Responsive Design**: Works on desktop and tablet devices
- **Toast Notifications**: Real-time feedback for all actions
- **Keyboard Shortcuts**: Quick navigation and actions

---

## 👥 User Roles

### 🎓 Student

Students are the primary users who submit code and receive feedback.

**Capabilities:**
- Browse and enroll in courses
- View released assignments
- Submit code (single or multiple files)
- View inline feedback and marks (after publication)
- Mark issues as "fixed" and resubmit
- Track XP, badges, and level progress

**Dashboard Features:**
- Active assignments list
- Submission history
- Feedback overview
- Gamification stats

---

### ✏️ Marker

Markers are instructors who review code and provide feedback.

**Capabilities:**
- Create and manage courses
- Create assignments with flexible scheduling
- Review student submissions with inline comments
- Grade submissions and assign marks
- Create reusable feedback templates
- View analytics and statistics

**Special Features:**
- Can only view submissions after deadline (if set)
- Earn XP for completing reviews
- Track review statistics

---

### 🛡️ Moderator

Moderators ensure grading quality and consistency.

**Capabilities:**
- Access moderation queue (failed + 10% sample)
- Raise issues against marker grading
- Confirm submissions as "No Issue"
- View moderation dashboard and statistics

**Access Rules:**
- Can only moderate courses they're assigned to
- Cannot modify marks directly
- Issues go to Module Leader for final decision

---

### 👑 Module Leader

Module Leaders have full control over their courses.

**Capabilities:**
- All Marker capabilities
- All Moderator capabilities
- Approve or reject moderation issues
- Transfer course leadership
- Manage team (add/remove collaborators and moderators)
- Delete assignments

**Special Powers:**
- Final authority on grading disputes
- Can publish results for entire assignment
- Access to all course analytics

---

## 📅 Assignment Lifecycle

### Phase 1: Creation

The Module Leader creates an assignment with three key settings:

```
┌─────────────────────────────────────────────────────────────┐
│                    CREATE ASSIGNMENT                        │
├─────────────────────────────────────────────────────────────┤
│  Title: Week 3 - Functions                                  │
│  Description: Practice writing reusable functions           │
│  Total Marks: 100                                           │
│  Max Attempts: 3                                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Schedule Release?  [No] ←→ [Yes]                    │   │
│  │ If Yes: Students see assignment after release date  │   │
│  │ If No: Visible immediately                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Set a Deadline?  [No] ←→ [Yes]                      │   │
│  │ If Yes: Submissions close at deadline               │   │
│  │         Markers see submissions AFTER deadline      │   │
│  │ If No: Markers see submissions immediately          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Student Submission

```
Student View:
┌─────────────────────────────────────────┐
│ Week 3 - Functions                      │
│ Due: March 15, 2026 at 11:59 PM         │
│ Attempts: 0/3                           │
│                                         │
│ [Upload Files]  [Submit]                │
└─────────────────────────────────────────┘

Rules:
✓ Can submit multiple files (.py)
✓ Can resubmit until deadline (if set)
✓ Can resubmit until max attempts reached
✗ Cannot submit after deadline passes
✗ Cannot see other students' work
```

### Phase 3: Marker Review

```
Marker View (after deadline):
┌─────────────────────────────────────────────────────────────┐
│ Submissions for "Week 3 - Functions"                        │
├─────────────────────────────────────────────────────────────┤
│ ○ Alice Johnson    │ Pending    │ Attempt 2 │ [Review]     │
│ ○ Bob Smith        │ Pending    │ Attempt 1 │ [Review]     │
│ ● Carol Davis      │ Reviewed   │ 85/100    │ [View]       │
└─────────────────────────────────────────────────────────────┘

Review Interface:
┌─────────────────────────────────────────────────────────────┐
│  main.py                                                    │
├─────────────────────────────────────────────────────────────┤
│  1 │ def calculate_sum(numbers):                            │
│  2 │     total = 0                    ← [Add Issue]         │
│  3 │     for n in numbers:                                  │
│  4 │         total = total + n        ← [Add Issue]         │
│  5 │     return total                                       │
├─────────────────────────────────────────────────────────────┤
│ Issue: Use += operator for cleaner code                     │
│ Category: Style │ Severity: Minor │ Deduction: -2           │
│ [Add Issue]                                                 │
├─────────────────────────────────────────────────────────────┤
│ Final Grade: [85] / 100                                     │
│ [Grade Submission]  [Mark as No Issues]                     │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: Results Publication

```
Publish Results Dialog:
┌─────────────────────────────────────────────────────────────┐
│              PUBLISH RESULTS                                │
├─────────────────────────────────────────────────────────────┤
│ Review Progress:                                            │
│ ████████████████████░░░░  16/20 reviewed (80%)              │
│                                                             │
│ ⚠️ 4 submissions still pending review                       │
│    Students with unreviewed submissions won't receive       │
│    feedback yet.                                            │
├─────────────────────────────────────────────────────────────┤
│ Publish Date & Time:                                        │
│ [March 20, 2026] [12:00 PM]                                 │
│                                                             │
│ At this time, ALL students will receive their marks         │
│ and feedback simultaneously.                                │
├─────────────────────────────────────────────────────────────┤
│ [Cancel]                    [Schedule Publication]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 Gamification System

CodeFeedback Studio features a comprehensive gamification system designed to motivate both students and markers through XP, badges, and level progression.

### XP (Experience Points)

XP is the primary currency of progress. Users earn XP by completing actions within the platform.

#### Student XP Sources

| Action | XP Earned | Notes |
|--------|-----------|-------|
| Submit assignment | +10 XP | First submission only |
| Mark issue as fixed | +5 XP | Per issue |
| Receive perfect score | +25 XP | No issues found |
| Improve on resubmission | +15 XP | Score improvement ≥20% |

#### Marker XP Sources

| Action | XP Earned | Notes |
|--------|-----------|-------|
| Grade a submission | +25 XP | Per submission graded |
| Mark as "No Issues" | +15 XP | Perfect submission |
| Create feedback template | +10 XP | Reusable template |
| Badge unlock | +50-200 XP | Varies by badge |

---

### 🏅 Student Badges

Students can earn 6 unique badges across different categories:

#### Getting Started

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 🚀 | **First Steps** | Submit your first assignment | +50 XP |

*Unlocks automatically on first submission.*

#### Bug Fixing

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 🐛 | **Bug Squasher** | Fix 10 issues across all submissions | +100 XP |

*Tracks cumulative issue fixes. Progress shown on badges page.*

#### Quick Response

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| ⚡ | **Quick Learner** | Fix an issue within 24 hours of receiving feedback | +75 XP |

*Rewards fast response to feedback.*

#### Excellence

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| ⭐ | **Perfectionist** | Receive a submission graded as "No Issues" | +150 XP |

*Awarded when a marker marks submission as perfect.*

#### Consistency

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 📅 | **Consistent Performer** | Submit 5 assignments before their deadlines | +100 XP |

*Tracks on-time submissions.*

#### Improvement

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 📈 | **Rapid Improver** | Improve your score by 20% or more on a resubmission | +125 XP |

*Compares current attempt to previous attempt.*

---

### 🏆 Marker Badges

Markers can earn 7 unique badges across different categories:

#### Getting Started

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| ✅ | **First Review** | Complete your first code review | +50 XP |

*Unlocks automatically on first graded submission.*

#### Speed & Efficiency

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| ⚡ | **Speed Reviewer** | Review 10 submissions | +100 XP |
| ⏰ | **On-Time Champion** | Review all assignments before deadline for a course | +150 XP |

*Speed Reviewer tracks total reviews. On-Time Champion requires 100% completion before any deadline.*

#### Quality & Thoroughness

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 🔍 | **Thorough Reviewer** | Provide detailed feedback (20+ issues created) | +150 XP |
| 📝 | **Feedback Master** | Create 10 reusable feedback templates | +100 XP |

*Thorough Reviewer counts total issues created. Feedback Master encourages template usage.*

#### Impact & Mentoring

| Badge | Name | Description | XP Reward |
|-------|------|-------------|-----------|
| 👥 | **Mentor** | Help 5 students achieve perfect scores | +200 XP |
| 🎯 | **Consistent Marker** | Maintain 95% moderation approval rate | +175 XP |

*Mentor tracks "No Issues" grades. Consistent Marker requires 20+ moderated submissions with 95% approval.*

---

### 📊 Level Progression

Both students and markers progress through 10 levels based on total XP:

| Level | Title | Min XP | XP to Next |
|-------|-------|--------|------------|
| 1 | Novice | 0 | 100 |
| 2 | Beginner | 100 | 200 |
| 3 | Learner | 300 | 300 |
| 4 | Practitioner | 600 | 400 |
| 5 | Competent | 1,000 | 500 |
| 6 | Proficient | 1,500 | 700 |
| 7 | Advanced | 2,200 | 800 |
| 8 | Expert | 3,000 | 1,000 |
| 9 | Master | 4,000 | 1,200 |
| 10 | Grandmaster | 5,200 | Max |

#### Level Progress Calculation

```
Progress % = (Current XP - Current Level Threshold) / 
             (Next Level Threshold - Current Level Threshold) × 100

Example: User with 450 XP
- Current Level: 3 (Learner, threshold 300)
- Next Level: 4 (Practitioner, threshold 600)
- Progress = (450 - 300) / (600 - 300) × 100 = 50%
```

---

### 🎯 Gamification Best Practices

#### For Course Designers

1. **Set reasonable deadlines** to allow students to earn the "Consistent Performer" badge
2. **Encourage resubmissions** to enable the "Rapid Improver" badge
3. **Provide detailed feedback** so students can earn "Bug Squasher" by fixing issues

#### For Markers

1. **Create templates** for common issues to earn "Feedback Master"
2. **Review promptly** to unlock "Speed Reviewer" and "On-Time Champion"
3. **Be thorough** in feedback to help students improve and earn "Mentor"

#### For Students

1. **Submit early** to have time for resubmissions
2. **Fix issues promptly** (within 24 hours) for "Quick Learner"
3. **Address all feedback** to work toward "Bug Squasher"

---

## 🛡️ Moderation System

The moderation system ensures fair and consistent grading across all submissions.

### Moderation Queue

The moderation queue automatically selects submissions for review:

```
Selection Algorithm:
1. Include ALL failed submissions (marks < 50%)
2. Add 10% random sample of passed submissions
3. Exclude already-moderated submissions

Example:
- Total reviewed: 100 submissions
- Failed (< 50%): 15 submissions
- Passed (≥ 50%): 85 submissions
- Sample size: ceil(85 × 0.10) = 9 submissions
- Moderation queue: 15 + 9 = 24 submissions
```

### Moderation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   MODERATION WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  Submission  │
                    │   Graded     │
                    └──────┬───────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  In Moderation Queue?  │
              └───────────┬────────────┘
                          │
            ┌─────────────┴─────────────┐
            │ Yes                       │ No
            ▼                           ▼
    ┌───────────────┐           ┌──────────────┐
    │   Moderator   │           │   Complete   │
    │    Reviews    │           │  (No action) │
    └───────┬───────┘           └──────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌───────────┐
│   No    │   │   Issue   │
│  Issue  │   │  Raised   │
└────┬────┘   └─────┬─────┘
     │              │
     ▼              ▼
┌─────────┐   ┌───────────────┐
│ Approved│   │ Module Leader │
│         │   │   Decides     │
└─────────┘   └───────┬───────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
      ┌──────────┐        ┌──────────┐
      │ Approve  │        │  Reject  │
      │  Issue   │        │  Issue   │
      └────┬─────┘        └────┬─────┘
           │                   │
           ▼                   ▼
      ┌──────────┐        ┌──────────┐
      │  Marker  │        │  Issue   │
      │ Notified │        │ Discarded│
      └──────────┘        └──────────┘
```

### Moderation Dashboard

Module Leaders and Moderators have access to comprehensive statistics:

```
┌─────────────────────────────────────────────────────────────┐
│              MODERATION DASHBOARD                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total Submissions: 245    Reviewed: 198    Pending: 47    │
│                                                             │
│  Issues Summary:                                            │
│  ● Open: 12       ● Resolved: 34       ● Discarded: 8      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  By Course:                                                 │
│  ┌────────────────┬──────────┬────────┬────────┬────────┐  │
│  │ Course         │ Reviewed │ Issues │ Open   │ Resolved│  │
│  ├────────────────┼──────────┼────────┼────────┼────────┤  │
│  │ CS101          │ 85       │ 18     │ 5      │ 13     │  │
│  │ CS201          │ 63       │ 12     │ 3      │ 9      │  │
│  │ CS301          │ 50       │ 16     │ 4      │ 12     │  │
│  └────────────────┴──────────┴────────┴────────┴────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component Library |
| Monaco Editor | 0.45.x | Code Editor |
| Axios | 1.x | HTTP Client |
| React Router | 6.x | Navigation |
| Lucide React | Latest | Icons |
| Sonner | Latest | Toast Notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.104.x | Web Framework |
| Python | 3.11+ | Runtime |
| Motor | 3.x | Async MongoDB Driver |
| Pydantic | 2.x | Data Validation |
| PyJWT | 2.x | Authentication |
| Uvicorn | 0.24.x | ASGI Server |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | 7.x | Primary Database |
| MongoDB Atlas | - | Cloud Hosting (optional) |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 7.0+ (local or Atlas)
- Git

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/codefeedback-studio.git
cd codefeedback-studio
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=codefeedback_studio
JWT_SECRET=your-super-secret-key-change-in-production
EOF

# Start backend
uvicorn server:app --reload --port 8001
```

**Windows Users:** Create `.env` with proper encoding:
```powershell
[System.IO.File]::WriteAllLines("$PWD\.env", @(
    "MONGO_URL=mongodb://localhost:27017",
    "DB_NAME=codefeedback_studio",
    "JWT_SECRET=your-super-secret-key"
), [System.Text.UTF8Encoding]::new($false))
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Start frontend
yarn start
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## 📚 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user |

### Courses

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses` | GET | List all courses |
| `/api/courses` | POST | Create course (Marker) |
| `/api/courses/{id}` | GET | Get course details |
| `/api/courses/{id}` | PUT | Update course (Leader) |

### Assignments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assignments` | GET | List assignments |
| `/api/assignments` | POST | Create assignment |
| `/api/assignments/{id}` | GET | Get assignment |
| `/api/assignments/{id}` | DELETE | Delete assignment (Leader) |
| `/api/assignments/{id}/review-status` | GET | Get review progress |
| `/api/assignments/{id}/publish-results` | POST | Schedule publication |

### Submissions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/submissions` | GET | List submissions |
| `/api/submissions` | POST | Create submission (Student) |
| `/api/submissions/{id}` | GET | Get submission |
| `/api/submissions/{id}/grade` | POST | Grade submission (Marker) |
| `/api/submissions/{id}/mark-no-issues` | POST | Mark perfect (Marker) |

### Gamification

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gamification/stats` | GET | Get XP, level, badges |
| `/api/gamification/badges` | GET | List all badges |

### Moderation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/moderation/queue` | GET | Get moderation queue |
| `/api/moderation/dashboard` | GET | Get moderation stats |
| `/api/moderation/issues` | GET | List moderation issues |
| `/api/moderation/issues` | POST | Create issue (Moderator) |
| `/api/moderation/issues/{id}/approve` | POST | Approve issue (Leader) |
| `/api/moderation/issues/{id}/reject` | POST | Reject issue (Leader) |

---

## 💾 Database Schema

### Users Collection

```javascript
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "full_name": "string",
  "role": "student | marker | moderator | module_leader",
  "course_ids": ["uuid"],
  "xp": 0,
  "badges": ["badge_id"],
  "created_at": "datetime"
}
```

### Courses Collection

```javascript
{
  "id": "uuid",
  "name": "string",
  "code": "string",
  "description": "string",
  "year": 2026,
  "semester": "Spring | Summer | Fall | Winter",
  "leader_id": "uuid",
  "collaborator_ids": ["uuid"],
  "moderator_ids": ["uuid"],
  "created_at": "datetime"
}
```

### Assignments Collection

```javascript
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
  "max_attempts": -1,
  "created_at": "datetime"
}
```

### Submissions Collection

```javascript
{
  "id": "uuid",
  "assignment_id": "uuid",
  "student_id": "uuid",
  "files": [
    {
      "id": "uuid",
      "filename": "main.py",
      "content": "string"
    }
  ],
  "status": "pending | in_review | feedback_released | no_issues",
  "marks": 85,
  "marker_feedback": "string",
  "attempt_number": 1,
  "reviewed_by": "uuid",
  "submission_time": "datetime",
  "review_completed_at": "datetime"
}
```

### Feedback Issues Collection

```javascript
{
  "id": "uuid",
  "submission_id": "uuid",
  "file_id": "uuid",
  "marker_id": "uuid",
  "line_start": 5,
  "line_end": 7,
  "category_id": "uuid",
  "severity": "critical | moderate | minor",
  "explanation": "string",
  "suggested_fix": "string",
  "marks_deducted": 5,
  "student_status": "open | acknowledged | fixed",
  "created_at": "datetime"
}
```

---

## ❓ Troubleshooting

### Backend Issues

#### `UnicodeDecodeError` on Windows

The `.env` file was saved with UTF-16 encoding.

**Fix:**
```powershell
Remove-Item .env -Force
[System.IO.File]::WriteAllLines("$PWD\.env", @(
    "MONGO_URL=mongodb://localhost:27017",
    "DB_NAME=codefeedback_studio",
    "JWT_SECRET=your-secret-key"
), [System.Text.UTF8Encoding]::new($false))
```

#### MongoDB Connection Failed

Ensure MongoDB is running:
```bash
mongod --dbpath /path/to/data
```

### Frontend Issues

#### `Cannot find module 'ajv/dist/compile/codegen'`

Node.js version is too new. Use Node 18:
```bash
nvm use 18
yarn install
yarn start
```

#### Badges Not Updating

The gamification stats endpoint automatically checks and awards badges. Refresh the page or call `/api/gamification/stats` again.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for Programming Education**

[Report Bug](https://github.com/your-repo/codefeedback-studio/issues) • [Request Feature](https://github.com/your-repo/codefeedback-studio/issues)

</div>
