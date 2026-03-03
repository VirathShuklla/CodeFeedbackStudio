# 🎓 CodeFeedback Studio

A comprehensive code assessment and moderation management system for programming education.

---

## ✨ Features

### 👥 Role-Based System
| Role | Permissions |
|------|-------------|
| **Module Leader** | Full control: create courses, assignments, manage markers/moderators, approve/reject moderation issues |
| **Moderator** | Review submissions (all failed + 10% random sample), raise issues against markers |
| **Marker** | Review student submissions, provide feedback, grade assignments |
| **Student** | Enroll in courses, submit assignments, view feedback, earn XP/badges |

### 📝 Marking & Grading
- ✅ Upload marking scheme (PDF) per assignment
- ✅ Grade submissions with marks and feedback
- ✅ Scheduled mark release (immediate or at specified time)
- ✅ "No Issues" option for correct submissions

### 🔍 Moderation Workflow
- ✅ Moderators review all failed submissions
- ✅ Moderators review 10% random sample of passed submissions
- ✅ Raise issues against marker's grading
- ✅ Module leaders approve/reject flagged issues
- ✅ Leaders can view which marker created issues
- ✅ Leaders can discard issues (markers cannot discard their own)

### 📁 Multi-File Submissions
- ✅ Submit multiple Python files per assignment
- ✅ File-specific, line-specific feedback
- ✅ Click-to-navigate from issue to code
- ✅ GitHub PR-style code review interface

### 🎮 Gamification System

#### Student Badges
| Badge | How to Earn | XP |
|-------|-------------|-----|
| 🚀 **First Steps** | Submit your first assignment | +50 |
| 🐛 **Bug Squasher** | Fix 10 issues | +100 |
| ⚡ **Quick Learner** | Fix an issue within 24 hours | +75 |
| ⭐ **Perfectionist** | Get a submission with no issues | +150 |
| 📅 **Consistent Performer** | Submit 5 assignments on time | +100 |
| 📈 **Rapid Improver** | Improve score by 20% on resubmission | +125 |

#### Marker Badges
| Badge | How to Earn | XP |
|-------|-------------|-----|
| ✅ **First Review** | Complete your first code review | +50 |
| ⚡ **Speed Reviewer** | Review 10 submissions within deadline | +100 |
| 🔍 **Thorough Reviewer** | Provide detailed feedback on 20 submissions | +150 |
| 🏆 **Mentor** | Help 5 students achieve perfect scores | +200 |
| 🎯 **Consistent Marker** | Maintain 95% moderation approval rate | +175 |
| ⏰ **On-Time Champion** | Review all assignments before deadline | +150 |
| 📄 **Feedback Master** | Create 10 reusable feedback templates | +100 |

#### XP System
- **Quick Fix** (within 24 hours): Full XP
- **Delayed Fix**: Half XP
- Minor Issue: 10 XP | Moderate: 25 XP | Critical: 50 XP

#### Levels
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

### 📊 Feedback Templates
- Save common issues as reusable templates
- Pre-defined marks deduction
- Quick apply during reviews

### 🔔 Notifications
- In-app notifications for:
  - Marks released
  - Badge earned
  - Moderation issues raised/resolved

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, Tailwind CSS, Shadcn/UI, Monaco Editor |
| **Backend** | FastAPI, Pydantic, Motor (async MongoDB) |
| **Database** | MongoDB |
| **Auth** | JWT Tokens |

---

## 📦 Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 6.0+
- Yarn

### Step 1: Start MongoDB

```bash
# Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start local MongoDB service
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "MONGO_URL=mongodb://localhost:27017" > .env
echo "DB_NAME=codefeedback_studio" >> .env
echo "JWT_SECRET=your-secret-key" >> .env

# Start server
uvicorn server:app --reload --port 8001
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# IMPORTANT: For local development
# Delete the 'plugins' folder if it exists
rm -rf plugins  # macOS/Linux
rmdir /s /q plugins  # Windows

# Replace craco config (if craco.config.local.js exists)
mv craco.config.js craco.config.cloud.js
mv craco.config.local.js craco.config.js

# Create .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Start
yarn start
```

### Step 4: Access Application

Open http://localhost:3000

---

## 📖 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (roles: student, marker, moderator, module_leader) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/courses` | List all courses (public) |
| POST | `/api/courses` | Create course (becomes module_leader) |
| PUT | `/api/courses/{id}` | Update course (add moderators/collaborators) |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assignments` | Create assignment |
| POST | `/api/assignments/{id}/marking-scheme` | Upload marking scheme PDF |
| GET | `/api/assignments` | List assignments |

### Submissions & Grading
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Submit code (student) |
| POST | `/api/submissions/{id}/grade` | Grade submission (marker) |
| POST | `/api/submissions/{id}/release-marks` | Release marks |
| POST | `/api/submissions/{id}/mark-no-issues` | Mark as correct |

### Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/submissions?for_moderation=true` | Get submissions for moderation |
| POST | `/api/moderation/issues` | Raise moderation issue |
| POST | `/api/moderation/issues/{id}/approve` | Approve issue (leader) |
| POST | `/api/moderation/issues/{id}/reject` | Reject issue (leader) |
| POST | `/api/moderation/submissions/{id}/confirm` | Confirm no issues |

### Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/issues` | Create feedback issue |
| POST | `/api/issues/{id}/mark-fixed` | Mark as fixed (student) |
| DELETE | `/api/issues/{id}` | Delete issue (leader only) |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/issue-templates` | Create reusable template |
| GET | `/api/issue-templates` | List templates |

### Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/badges` | Get all badges |
| GET | `/api/analytics/student` | Student analytics + XP |
| GET | `/api/analytics/marker` | Marker analytics |

---

## 🔧 Troubleshooting

### CORS Error
Make sure your backend has CORS enabled. The server.py includes:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

### "Internal Server Error"
Check MongoDB is running and .env file exists with correct values.

### Frontend Build Error ("traverse")
Delete the `plugins` folder and use `craco.config.local.js`.

---

## 📄 License

MIT License

---

Built with ❤️ for programming education
