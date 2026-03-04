# CodeFeedback Studio

A comprehensive code assessment and moderation platform for programming education. Features GitHub-style code review, multi-role team management, and gamification systems for both students and markers.

![CodeFeedback Studio](https://img.shields.io/badge/version-2.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

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
- **Gamification**: Earn badges for reviewing speed, thoroughness, and mentorship
- **Analytics Dashboard**: Track reviews, turnaround time, and common issues

### For Module Leaders
- **Course Management**: Create courses and manage teams
- **Team Collaboration**: Add markers as collaborators or moderators
- **Moderation Workflow**: Review flagged submissions and resolve disputes
- **Leadership Transfer**: Delegate leadership to other markers

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

**Student Levels:**
1. Novice Coder (0 XP)
2. Apprentice (100 XP)
3. Junior Developer (250 XP)
4. Developer (500 XP)
5. Senior Developer (800 XP)
6. Lead Developer (1200 XP)
7. Architect (1800 XP)
8. Senior Architect (2500 XP)
9. Principal Engineer (3500 XP)
10. Code Master (5000 XP)

### Marker Badges & XP

| Badge | Description | XP Reward |
|-------|-------------|-----------|
| **First Review** | Complete your first code review | +50 XP |
| **Speed Reviewer** | Review 10 submissions within deadline | +100 XP |
| **On-Time Champion** | Review all assignments before deadline | +150 XP |
| **Thorough Reviewer** | Detailed feedback on 20 submissions | +150 XP |
| **Feedback Master** | Create 10 reusable feedback templates | +100 XP |
| **Mentor** | Help 5 students achieve perfect scores | +200 XP |
| **Consistent Marker** | Maintain 95% moderation approval rate | +175 XP |
| **Marking Master** | Earn all marker badges | +500 XP |

**Marker Levels:**
1. Apprentice Marker (0 XP)
2. Junior Marker (100 XP)
3. Marker (250 XP)
4. Senior Marker (500 XP)
5. Lead Marker (800 XP)
6. Expert Marker (1200 XP)
7. Master Marker (1800 XP)
8. Principal Marker (2500 XP)
9. Distinguished Marker (3500 XP)
10. Legendary Marker (5000 XP)

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

4. **Create `.env` file** (UTF-8 encoding, no BOM):
   
   **On Mac/Linux:**
   ```bash
   cat > .env << EOF
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=codefeedback_studio
   JWT_SECRET=your-super-secret-key-change-in-production
   EOF
   ```
   
   **On Windows (PowerShell):**
   ```powershell
   [System.IO.File]::WriteAllLines("$PWD\.env", @(
       "MONGO_URL=mongodb://localhost:27017",
       "DB_NAME=codefeedback_studio",
       "JWT_SECRET=your-super-secret-key-change-in-production"
   ), [System.Text.UTF8Encoding]::new($false))
   ```
   
   **Or manually create `.env` with Notepad/VS Code (Save as UTF-8):**
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=codefeedback_studio
   JWT_SECRET=your-super-secret-key-change-in-production
   ```

5. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

6. **Run the backend:**
   ```bash
   uvicorn server:app --reload --port 8001
   ```
   
   Backend will be available at: `http://localhost:8001`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
   ```
   
   **On Windows (PowerShell):**
   ```powershell
   [System.IO.File]::WriteAllText("$PWD\.env", "REACT_APP_BACKEND_URL=http://localhost:8001", [System.Text.UTF8Encoding]::new($false))
   ```

4. **For local development, update craco config:**
   
   If you encounter Babel plugin errors, rename the config files:
   ```bash
   mv craco.config.js craco.config.cloud.js
   mv craco.config.local.js craco.config.js
   ```

5. **Start the frontend:**
   ```bash
   yarn start
   # or
   npm start
   ```
   
   Frontend will be available at: `http://localhost:3000`

### Troubleshooting

**`.env` file encoding issues (Windows):**
- Error: `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff`
- Solution: The `.env` file was saved with UTF-16 encoding. Re-save it as UTF-8 without BOM using the PowerShell commands above or manually in VS Code/Notepad.

**MongoDB connection errors:**
- Ensure MongoDB is running: `mongod --dbpath /path/to/data`
- For MongoDB Atlas, update `MONGO_URL` with your connection string

**CORS errors:**
- Ensure backend is running on port 8001
- Check that `REACT_APP_BACKEND_URL` matches the backend URL

---

## User Roles

| Role | Description | How to Become |
|------|-------------|---------------|
| **Student** | Submit code, receive feedback, earn badges | Register as Student |
| **Marker** | Review code, provide feedback, grade submissions | Register as Marker |
| **Module Leader** | Manage courses, teams, and moderation | Create a course (auto-promoted) |
| **Moderator** | Review submissions for quality assurance | Assigned by Module Leader |

---

## API Documentation

Once the backend is running, access the interactive API docs at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (student/marker) |
| `/api/auth/login` | POST | Login and get JWT token |
| `/api/courses` | GET/POST | List or create courses |
| `/api/assignments` | GET/POST | List or create assignments |
| `/api/submissions` | GET/POST | List or submit code |
| `/api/issues` | GET/POST | List or create feedback issues |
| `/api/gamification/stats` | GET | Get user's XP, level, and badges |
| `/api/gamification/badges` | GET | Get all badges (earned and available) |

---

## Tech Stack

- **Backend**: FastAPI, Python 3.11+, Motor (async MongoDB)
- **Frontend**: React 18, Tailwind CSS, shadcn/ui
- **Database**: MongoDB
- **Authentication**: JWT

---

## Project Structure

```
CodeFeedbackStudio/
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── .env              # Environment variables
│   └── uploads/          # Uploaded marking schemes
├── frontend/
│   ├── src/
│   │   ├── pages/        # React page components
│   │   ├── components/   # Reusable UI components
│   │   └── contexts/     # React contexts (Auth)
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with love for programming education
