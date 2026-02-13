# CodeFeedback Studio

A comprehensive code review platform for programming education, featuring GitHub PR-style feedback, multi-file submissions, course management, and gamification.

## 🎯 Features

### For Course Leaders (Head Markers)
- **Course Management**: Create and manage courses with collaborating markers
- **Assignment Creation**: Set assignments with deadlines and submission limits
- **Collaborator Assignment**: Add/remove markers to help review submissions
- **Full Analytics**: View course-wide statistics and collaborator activity

### For Markers (Collaborators)
- **Code Review Interface**: GitHub PR-style review with syntax highlighting
- **File-Specific Feedback**: Add issues to specific files and line ranges
- **Severity Levels**: Categorize issues as Minor, Moderate, or Critical
- **Quick Actions**: "No Issues" for correct code, "Publish" to release feedback

### For Students
- **Multi-Course Enrollment**: Enroll in multiple courses simultaneously
- **Multi-File Submissions**: Submit multiple Python files per assignment
- **Click-to-Navigate Feedback**: Jump directly to flagged code sections
- **Progress Tracking**: View analytics per course
- **Gamification**: Earn XP and badges for fixing issues

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CodeFeedback Studio                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)          │  Backend (FastAPI)              │
│  ├── Authentication        │  ├── JWT Authentication         │
│  ├── Course Management     │  ├── Course/Assignment CRUD     │
│  ├── Code Review UI        │  ├── Multi-file Submissions     │
│  ├── Feedback Viewer       │  ├── Issue Management           │
│  ├── Analytics Dashboard   │  ├── Analytics Engine           │
│  └── Gamification UI       │  └── XP/Badge System            │
├─────────────────────────────────────────────────────────────┤
│                    MongoDB Database                          │
│  ├── users (students, markers with roles)                    │
│  ├── courses (with leader_id and collaborator_ids)           │
│  ├── assignments (with deadlines)                            │
│  ├── submissions (multi-file support)                        │
│  ├── feedback_issues (file-specific, line-specific)          │
│  ├── issue_categories                                        │
│  └── xp_logs (gamification tracking)                         │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection string

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Set REACT_APP_BACKEND_URL to your backend URL

# Run the development server
yarn start
```

## 📚 API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (student/marker) |
| `/api/auth/login` | POST | Login and receive JWT token |
| `/api/auth/me` | GET | Get current user info |

### Public Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/courses` | GET | List all courses (for registration) |
| `/api/public/markers` | GET | List all markers (for collaboration) |

### Courses (Marker only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses` | GET | List accessible courses |
| `/api/courses` | POST | Create new course (becomes leader) |
| `/api/courses/{id}` | PUT | Update course (leader can modify collaborators) |

### Student Enrollment
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/students/courses` | GET | Get enrolled courses |
| `/api/students/enroll/{course_id}` | POST | Enroll in course |
| `/api/students/enroll/{course_id}` | DELETE | Unenroll from course |

### Assignments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assignments` | GET | List assignments (filtered by course) |
| `/api/assignments` | POST | Create assignment (leader only) |

### Submissions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/submissions` | GET | List submissions |
| `/api/submissions` | POST | Submit code (multi-file) |
| `/api/submissions/{id}` | GET | Get submission details |
| `/api/submissions/{id}/publish` | POST | Publish feedback (marker) |
| `/api/submissions/{id}/mark-no-issues` | POST | Mark as correct (marker) |

### Feedback Issues
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/issues` | GET | List issues for submission |
| `/api/issues` | POST | Create issue (marker) |
| `/api/issues/{id}/mark-fixed` | POST | Mark issue as fixed (student) |

### Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/marker` | GET | Marker analytics (course-scoped) |
| `/api/analytics/student` | GET | Student analytics (per-course progress) |
| `/api/gamification/stats` | GET | XP, level, and badges |

## 🎮 Gamification System

### XP Awards
- **Minor Issue Fixed**: +10 XP
- **Moderate Issue Fixed**: +25 XP
- **Critical Issue Fixed**: +50 XP

### Levels
| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Novice Coder | 0 |
| 2 | Bug Spotter | 100 |
| 3 | Issue Resolver | 300 |
| 4 | Apprentice Debugger | 600 |
| 5 | Competent Reviewer | 1,000 |
| ... | ... | ... |
| 15 | Master Craftsman | 15,000 |

### Badges
- **Debugging Mastery**: Error Hunter, Exception Architect, Debug Virtuoso
- **Code Quality**: Complexity Reducer, DRY Advocate, Clean Code Practitioner
- **Consistency**: Steady Improver, Feedback Embracer, Mastery Path Complete
- **Milestones**: Getting Started (100 XP), Rising Star (500 XP), Dedicated Learner (1000 XP)

## 👥 User Roles & Permissions

### Course Leader (Head Marker)
- Creates courses (automatically becomes leader)
- Assigns collaborating markers
- Creates/edits assignments
- Reviews all submissions
- Full analytics access including collaborator activity

### Marker (Collaborator)
- Can only access assigned courses
- Reviews submissions
- Creates feedback issues
- Course-scoped analytics

### Student
- Enrolls in multiple courses
- Views assignments and submits code
- Views released feedback
- Earns XP and badges
- Personal progress analytics

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS, Shadcn/UI, Monaco Editor
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for programming education
