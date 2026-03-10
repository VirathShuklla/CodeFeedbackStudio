# CodeFeedback Studio

A comprehensive code assessment and moderation platform for programming education. Features GitHub-style code review, multi-role team management, gamification, and dark mode support.

![CodeFeedback Studio](https://img.shields.io/badge/version-2.1-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Dark Mode](https://img.shields.io/badge/dark%20mode-supported-purple)

---

## What's New in v2.1

- **Dark Mode**: Toggle between light and dark themes
- **Loading Screen**: Beautiful animated loading screen on app start
- **Improved Assignment Creation**: Yes/No toggles for deadline and release date
- **Fixed Marker Gamification**: Markers now earn XP when grading submissions
- **Database Reset**: Fresh start capability for testing

---

## Features

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
- **Dark Mode**: System-aware theme with manual toggle
- **Loading Screen**: Animated splash screen on first visit
- **Responsive Design**: Works on desktop and tablet devices

---

## Assignment Features

### Deadline Management
When creating an assignment, markers can choose:
- **Set a Deadline?** → Yes/No toggle
  - If **Yes**: Date/time picker becomes required
  - If **No**: No deadline is set (open-ended)

### Mark Release Scheduling
- **Schedule Mark Release?** → Yes/No toggle
  - If **Yes**: Marks are hidden until the specified date
  - If **No**: Marks are released immediately when graded

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
| **Error Hunter** | Fix 10 distinct runtime errors | +150 XP |
| **Exception Architect** | Fix 5 unhandled exception issues | +125 XP |
| **Complexity Reducer** | Reduce complexity in 5 submissions | +150 XP |
| **DRY Advocate** | Remove 10+ duplicated code blocks | +125 XP |
| **Coding Master** | Earn all student badges | +500 XP |

**Student Levels**: Novice Coder → Apprentice → Junior Developer → Developer → Senior Developer → Lead Developer → Architect → Senior Architect → Principal Engineer → Code Master

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
| **Marking Master** | Earn all marker badges | +500 XP |

**XP Earned Per Action**:
- Grading a submission: +25 XP
- Marking as "No Issues": +15 XP
- Creating a feedback template: +10 XP

**Marker Levels**: Apprentice Marker → Junior Marker → Marker → Senior Marker → Lead Marker → Expert Marker → Master Marker → Principal Marker → Distinguished Marker → Legendary Marker

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
   
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   
   **On Mac/Linux:**
   ```bash
   cat > .env << EOF
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=codefeedback_studio
   JWT_SECRET=your-super-secret-key-change-in-production
   EOF
   ```
   
   **On Windows (PowerShell) - IMPORTANT: Use this exact command:**
   ```powershell
   [System.IO.File]::WriteAllLines("$PWD\.env", @(
       "MONGO_URL=mongodb://localhost:27017",
       "DB_NAME=codefeedback_studio",
       "JWT_SECRET=your-super-secret-key-change-in-production"
   ), [System.Text.UTF8Encoding]::new($false))
   ```
   
   > **Note**: Windows PowerShell's `echo` and `>` operators create UTF-16 files which cause errors. Always use the PowerShell command above or create the file manually in VS Code/Notepad with UTF-8 encoding.

5. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

6. **Run the backend:**
   ```bash
   uvicorn server:app --reload --port 8001
   ```
   
   Backend: `http://localhost:8001`

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

4. **For local development, update craco config** (if you see Babel errors):
   ```bash
   mv craco.config.js craco.config.cloud.js
   mv craco.config.local.js craco.config.js
   ```

5. **Start the frontend:**
   ```bash
   yarn start
   ```
   
   Frontend: `http://localhost:3000`

---

## Troubleshooting

### `.env` file encoding issues (Windows)
**Error**: `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff`

**Solution**: The file was saved with UTF-16 encoding. Delete it and recreate using:
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

### Dark mode not working
- Clear browser cache and localStorage
- Check browser console for errors

---

## API Documentation

**Swagger UI**: `http://localhost:8001/docs`
**ReDoc**: `http://localhost:8001/redoc`

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register (student/marker) |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/courses` | GET/POST | List or create courses |
| `/api/assignments` | GET/POST | List or create assignments |
| `/api/submissions` | GET/POST | List or submit code |
| `/api/submissions/{id}/grade` | POST | Grade a submission |
| `/api/issues` | GET/POST | List or create feedback |
| `/api/gamification/stats` | GET | XP, level, and badges |
| `/api/gamification/badges` | GET | All badges |

---

## Tech Stack

- **Backend**: FastAPI, Python 3.11+, Motor (async MongoDB)
- **Frontend**: React 18, Tailwind CSS, shadcn/ui
- **Database**: MongoDB
- **Authentication**: JWT
- **Theming**: CSS Variables with dark mode support

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for programming education
