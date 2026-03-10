# CodeFeedback Studio

A comprehensive code assessment and moderation platform for programming education. Features GitHub-style code review, multi-role team management, gamification, and full assignment lifecycle control.

![CodeFeedback Studio](https://img.shields.io/badge/version-2.2-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Dark Mode](https://img.shields.io/badge/dark%20mode-supported-purple)

---

## Features Overview

### For Students
- **Multi-file Submissions**: Upload multiple Python files per assignment
- **Real-time Feedback**: View inline, file-specific feedback from markers
- **Issue Tracking**: Mark issues as fixed and earn XP rewards
- **Gamification**: Earn badges, level up, and track progress
- **Progress Analytics**: View your submission history and improvement trends

### For Markers
- **GitHub-style Code Review**: Navigate files, select lines, add contextual feedback
- **Grading System**: Assign marks with deductions per issue
- **Feedback Templates**: Create reusable feedback for common issues
- **Gamification**: Earn XP (+25 per review) and badges for achievements
- **Analytics Dashboard**: Track reviews, turnaround time, and common issues

### For Module Leaders
- **Course Management**: Create courses and manage teams
- **Team Collaboration**: Add markers as collaborators or moderators
- **Moderation Workflow**: Review flagged submissions and resolve disputes
- **Leadership Transfer**: Delegate leadership to other markers

### UI/UX Features
- **Dark Mode**: Improved contrast and readability with manual toggle (light mode default)
- **Loading Screen**: Polished animated splash screen (6 seconds)
- **Responsive Design**: Works on desktop and tablet devices

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Tailwind CSS, shadcn/ui, Monaco Editor |
| **Backend** | FastAPI, Python 3.11+, Pydantic |
| **Database** | MongoDB with Motor (async driver) |
| **Authentication** | JWT (JSON Web Tokens) |
| **Theming** | CSS Variables with dark/light mode support |

---

## Assignment Lifecycle

CodeFeedback Studio provides three distinct controls for managing the assignment workflow:

### 1. Schedule Release (Yes/No)
Controls when the assignment becomes visible to students.

- **Yes**: Enter a date/time. Students only see the assignment after this time.
- **No**: Assignment is visible immediately after creation.

### 2. Set a Deadline (Yes/No)
Controls the submission window and marker access.

- **Yes**: Enter a date/time. Students can submit until the deadline. **Markers can only view submissions after the deadline passes.**
- **No**: No deadline. Submissions are visible to markers immediately after students submit.

### 3. Publish Results
A collective action to release all marks and feedback to students.

- After reviewing submissions, markers can schedule a publish date/time
- The system shows review progress (how many submissions reviewed vs. pending)
- If not all submissions are reviewed, a warning is displayed
- At the scheduled time, all students receive access to their marks and feedback together
- Students can only see their own feedback

---

## Gamification System

### Student Badges & XP

| Badge | Description | XP Reward |
|-------|-------------|-----------|
| **First Steps** | Submit your first assignment | +50 XP |
| **Bug Squasher** | Fix 10 issues across submissions | +100 XP |
| **Quick Learner** | Fix an issue within 24 hours | +75 XP |
| **Perfectionist** | Get a submission with no issues | +150 XP |
| **Rapid Improver** | Improve score by 20% on resubmission | +125 XP |
| **Consistent Performer** | Submit 5 assignments on time | +100 XP |

**Student Levels** (by XP):
1. Novice (0 XP)
2. Beginner (100 XP)
3. Learner (300 XP)
4. Practitioner (600 XP)
5. Competent (1000 XP)
6. Proficient (1500 XP)
7. Advanced (2200 XP)
8. Expert (3000 XP)
9. Master (4000 XP)
10. Grandmaster (5200 XP)

### Marker Badges & XP

| Badge | Description | XP Reward |
|-------|-------------|-----------|
| **First Review** | Complete your first code review | +50 XP |
| **Speed Reviewer** | Review 10 submissions | +100 XP |
| **On-Time Champion** | Review all assignments before deadline | +150 XP |
| **Thorough Reviewer** | Detailed feedback on 20 submissions | +150 XP |
| **Feedback Master** | Create 10 reusable feedback templates | +100 XP |
| **Mentor** | Help 5 students achieve perfect scores | +200 XP |
| **Consistent Marker** | Maintain 95% moderation approval rate | +175 XP |

**XP Earned Per Action**:
- Grading a submission: **+25 XP**
- Marking as "No Issues": **+15 XP**
- Creating a feedback template: **+10 XP**

---

## Local Development Setup

### Prerequisites

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows (PowerShell)
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   
   **Mac/Linux:**
   ```bash
   cat > .env << EOF
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=codefeedback_studio
   JWT_SECRET=your-super-secret-key-change-in-production
   EOF
   ```
   
   **Windows (PowerShell) - IMPORTANT:**
   ```powershell
   [System.IO.File]::WriteAllLines("$PWD\.env", @(
       "MONGO_URL=mongodb://localhost:27017",
       "DB_NAME=codefeedback_studio",
       "JWT_SECRET=your-super-secret-key-change-in-production"
   ), [System.Text.UTF8Encoding]::new($false))
   ```
   
   > ⚠️ **Windows Note**: PowerShell's `echo` and `>` operators create UTF-16 files which cause `UnicodeDecodeError`. Always use the PowerShell command above or create the file manually in VS Code with **UTF-8 encoding**.

5. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

6. **Run the backend:**
   ```bash
   uvicorn server:app --reload --port 8001
   ```
   
   Backend runs at: `http://localhost:8001`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Create `.env` file:**
   
   **Mac/Linux:**
   ```bash
   echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
   ```
   
   **Windows (PowerShell):**
   ```powershell
   [System.IO.File]::WriteAllText("$PWD\.env", "REACT_APP_BACKEND_URL=http://localhost:8001", [System.Text.UTF8Encoding]::new($false))
   ```

4. **For local development** (if you see Babel errors):
   ```bash
   # Rename craco config files
   mv craco.config.js craco.config.cloud.js
   mv craco.config.local.js craco.config.js
   ```

5. **Start the frontend:**
   ```bash
   yarn start
   ```
   
   Frontend runs at: `http://localhost:3000`

---

## API Documentation

**Interactive Docs**: `http://localhost:8001/docs` (Swagger UI)  
**Alternative Docs**: `http://localhost:8001/redoc` (ReDoc)

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register (student/marker) |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/courses` | GET/POST | List or create courses |
| `/api/assignments` | GET/POST | List or create assignments |
| `/api/assignments/{id}/publish-results` | POST | Schedule results publication |
| `/api/assignments/{id}/review-status` | GET | Get review progress |
| `/api/submissions` | GET/POST | List or submit code |
| `/api/submissions/{id}/grade` | POST | Grade a submission |
| `/api/issues` | GET/POST | List or create feedback |
| `/api/gamification/stats` | GET | XP, level, and badges |

---

## Database Schema

### Users
```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "role": "student | marker | moderator | module_leader",
  "course_ids": ["uuid"],
  "xp": 0,
  "badges": [],
  "created_at": "datetime"
}
```

### Assignments
```json
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

### Submissions
```json
{
  "id": "uuid",
  "assignment_id": "uuid",
  "student_id": "uuid",
  "files": [{"id": "uuid", "filename": "main.py", "content": "..."}],
  "status": "pending | in_review | feedback_released | no_issues",
  "marks": 0,
  "attempt_number": 1,
  "submission_time": "datetime",
  "reviewed_by": "uuid | null"
}
```

---

## Troubleshooting

### `.env` file encoding issues (Windows)

**Error**: `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff`

**Solution**: The file was saved with UTF-16 encoding. Delete and recreate:
```powershell
Remove-Item .env -Force
[System.IO.File]::WriteAllLines("$PWD\.env", @(
    "MONGO_URL=mongodb://localhost:27017",
    "DB_NAME=codefeedback_studio",
    "JWT_SECRET=your-secret-key"
), [System.Text.UTF8Encoding]::new($false))
```

### MongoDB connection errors
- Ensure MongoDB is running: `mongod`
- For MongoDB Atlas, update `MONGO_URL` with your connection string

### CORS errors
- Ensure backend is running on port 8001
- Check `REACT_APP_BACKEND_URL` matches the backend URL

### Dark mode not applying
- Clear browser cache and localStorage
- Toggle the theme switch in the header

---

## Project Structure

```
/app/
├── README.md
├── backend/
│   ├── .env              # Environment variables
│   ├── requirements.txt  # Python dependencies
│   └── server.py         # FastAPI application
└── frontend/
    ├── .env              # Environment variables
    ├── package.json      # Node dependencies
    ├── craco.config.js   # Build configuration
    └── src/
        ├── App.js
        ├── components/
        │   ├── layout/AppLayout.js
        │   ├── LoadingScreen.js
        │   └── ui/           # shadcn/ui components
        ├── contexts/
        │   ├── AuthContext.js
        │   └── ThemeContext.js
        └── pages/
            ├── StudentDashboard.js
            ├── StudentBadgesPage.js
            ├── MarkerDashboard.js
            ├── MarkerCoursePage.js
            ├── MarkerBadgesPage.js
            ├── CodeReviewPage.js
            └── ...
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with care for programming education
