<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MongoDB-6.0+-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🎓 CodeFeedback Studio</h1>

<p align="center">
  <strong>A modern code review platform for programming education</strong><br>
  GitHub PR-style feedback • Multi-file submissions • Gamification • Analytics
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-local-setup">Local Setup</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Local Setup](#-local-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [User Roles](#-user-roles)
- [Gamification System](#-gamification-system)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### For Course Leaders (Head Markers)
| Feature | Description |
|---------|-------------|
| 📚 **Course Management** | Create and manage courses with custom codes and semesters |
| 👥 **Collaborator Assignment** | Add/remove markers to help review submissions |
| 📝 **Assignment Creation** | Set assignments with deadlines and submission limits |
| 📊 **Full Analytics** | View course-wide statistics and collaborator activity |

### For Markers (Collaborators)
| Feature | Description |
|---------|-------------|
| 💻 **Code Review Interface** | GitHub PR-style review with Monaco editor |
| 📍 **File-Specific Feedback** | Add issues to specific files and line ranges |
| 🎯 **Severity Levels** | Categorize issues as Minor, Moderate, or Critical |
| ⚡ **Quick Actions** | "No Issues" for correct code, "Publish" to release feedback |

### For Students
| Feature | Description |
|---------|-------------|
| 📖 **Multi-Course Enrollment** | Enroll in multiple courses simultaneously |
| 📁 **Multi-File Submissions** | Submit multiple Python files per assignment |
| 🔗 **Click-to-Navigate** | Jump directly to flagged code sections |
| 🏆 **Gamification** | Earn XP and badges for fixing issues |
| 📈 **Progress Tracking** | View personal analytics per course |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router, Tailwind CSS, Shadcn/UI, Monaco Editor |
| **Backend** | FastAPI, Pydantic, Motor (async MongoDB driver) |
| **Database** | MongoDB |
| **Authentication** | JWT (JSON Web Tokens) |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/codefeedback-studio.git
cd codefeedback-studio

# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8001

# Setup Frontend (new terminal)
cd frontend
yarn install
cp .env.example .env
yarn start
```

🎉 Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 📦 Local Setup

### Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | 18.x or higher | [Download](https://nodejs.org/) |
| **Yarn** | 1.22.x or higher | `npm install -g yarn` |
| **Python** | 3.11 or higher | [Download](https://python.org/) |
| **MongoDB** | 6.0 or higher | [Download](https://mongodb.com/try/download/community) or use Docker |

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate (Linux/macOS)
   source venv/bin/activate
   
   # Activate (Windows CMD)
   venv\Scripts\activate
   
   # Activate (Windows PowerShell)
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your settings
   nano .env  # or use your preferred editor
   ```

5. **Start the backend server**
   ```bash
   # Development mode with hot reload
   uvicorn server:app --reload --host 0.0.0.0 --port 8001
   
   # Production mode
   uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
   ```

6. **Verify backend is running**
   ```bash
   curl http://localhost:8001/api/health
   # Expected: {"status":"healthy","timestamp":"..."}
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure environment variables**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env - set backend URL
   echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
   ```

4. **Start the development server**
   ```bash
   yarn start
   ```

5. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

#### Backend (`backend/.env`)

```env
# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
DB_NAME=codefeedback_studio

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

#### Frontend (`frontend/.env`)

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001
```

### MongoDB Setup Options

#### Option 1: Docker (Recommended)
```bash
# Pull and run MongoDB
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Verify it's running
docker ps | grep mongodb
```

#### Option 2: Local Installation
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Follow the installation wizard
3. Start MongoDB service:
   ```bash
   # Linux
   sudo systemctl start mongod
   
   # macOS
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   ```

#### Option 3: MongoDB Atlas (Cloud)
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `MONGO_URL` in `backend/.env`:
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net
   ```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CodeFeedback Studio                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │   Frontend (React)  │  HTTP   │   Backend (FastAPI) │           │
│  │   localhost:3000    │◄───────►│   localhost:8001    │           │
│  └─────────────────────┘   JWT   └──────────┬──────────┘           │
│                                             │                       │
│  Components:                                │  Endpoints:           │
│  ├── Authentication                         │  ├── /api/auth/*      │
│  ├── Course Management                      │  ├── /api/courses/*   │
│  ├── Code Review UI                         │  ├── /api/submissions/*│
│  ├── Feedback Viewer                        │  ├── /api/issues/*    │
│  ├── Analytics Dashboard                    │  ├── /api/analytics/* │
│  └── Gamification UI                        │  └── /api/gamification│
│                                             │                       │
│                                   ┌─────────▼─────────┐             │
│                                   │     MongoDB       │             │
│                                   │  localhost:27017  │             │
│                                   └───────────────────┘             │
│                                                                     │
│  Collections:                                                       │
│  ├── users (students, markers)                                      │
│  ├── courses (with leader + collaborators)                          │
│  ├── assignments                                                    │
│  ├── submissions (multi-file)                                       │
│  ├── feedback_issues (file-specific)                                │
│  ├── issue_categories                                               │
│  └── xp_logs                                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📖 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user info |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/public/courses` | List all courses (for registration) |
| `GET` | `/api/public/markers` | List all markers (for collaboration) |

### Courses

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/courses` | List accessible courses | Authenticated |
| `POST` | `/api/courses` | Create new course | Marker only |
| `GET` | `/api/courses/{id}` | Get course details | Authenticated |
| `PUT` | `/api/courses/{id}` | Update course | Leader/Collaborator |

### Student Enrollment

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students/courses` | Get enrolled courses |
| `POST` | `/api/students/enroll/{course_id}` | Enroll in course |
| `DELETE` | `/api/students/enroll/{course_id}` | Unenroll from course |

### Assignments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/assignments` | List assignments | Authenticated |
| `POST` | `/api/assignments` | Create assignment | Leader only |
| `GET` | `/api/assignments/{id}` | Get assignment details | Authenticated |

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/submissions` | List submissions |
| `POST` | `/api/submissions` | Submit code (multi-file) |
| `GET` | `/api/submissions/{id}` | Get submission details |
| `POST` | `/api/submissions/{id}/publish` | Publish feedback |
| `POST` | `/api/submissions/{id}/mark-no-issues` | Mark as correct |

### Feedback Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/issues` | List issues for submission |
| `POST` | `/api/issues` | Create issue |
| `PUT` | `/api/issues/{id}` | Update issue |
| `DELETE` | `/api/issues/{id}` | Delete issue |
| `POST` | `/api/issues/{id}/mark-fixed` | Mark as fixed (awards XP) |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/marker` | Marker analytics |
| `GET` | `/api/analytics/student` | Student analytics |
| `GET` | `/api/gamification/stats` | XP and badges |

---

## 👥 User Roles

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Course Leader                            │
│  • Creates courses (automatically becomes leader)            │
│  • Assigns collaborating markers                             │
│  • Creates/edits assignments                                 │
│  • Full analytics access                                     │
├─────────────────────────────────────────────────────────────┤
│                     Marker (Collaborator)                    │
│  • Can only access assigned courses                          │
│  • Reviews submissions                                       │
│  • Creates feedback issues                                   │
│  • Course-scoped analytics                                   │
├─────────────────────────────────────────────────────────────┤
│                     Student                                  │
│  • Enrolls in multiple courses                               │
│  • Views assignments and submits code                        │
│  • Views released feedback                                   │
│  • Earns XP and badges                                       │
└─────────────────────────────────────────────────────────────┘
```

### Permissions Matrix

| Action | Student | Marker | Leader |
|--------|:-------:|:------:|:------:|
| View courses | ✅ | ✅ | ✅ |
| Create courses | ❌ | ✅ | ✅ |
| Add collaborators | ❌ | ❌ | ✅ |
| Create assignments | ❌ | ❌ | ✅ |
| Submit code | ✅ | ❌ | ❌ |
| Review submissions | ❌ | ✅ | ✅ |
| View own analytics | ✅ | ✅ | ✅ |
| View course analytics | ❌ | ✅ | ✅ |
| View collaborator activity | ❌ | ❌ | ✅ |

---

## 🏆 Gamification System

### XP Awards

| Issue Severity | XP Awarded |
|----------------|:----------:|
| Minor | +10 XP |
| Moderate | +25 XP |
| Critical | +50 XP |

### Level Progression

| Level | Title | XP Required |
|:-----:|-------|:-----------:|
| 1 | Novice Coder | 0 |
| 2 | Bug Spotter | 100 |
| 3 | Issue Resolver | 300 |
| 4 | Apprentice Debugger | 600 |
| 5 | Competent Reviewer | 1,000 |
| 6 | Code Analyst | 1,500 |
| 7 | Quality Advocate | 2,200 |
| 8 | Refactoring Specialist | 3,000 |
| 9 | Software Craftsman | 4,000 |
| 10 | Engineering Practitioner | 5,200 |
| 11 | Code Quality Expert | 6,600 |
| 12 | Senior Practitioner | 8,200 |
| 13 | Principal Developer | 10,000 |
| 14 | Distinguished Engineer | 12,500 |
| 15 | Master Craftsman | 15,000 |

### Badges

| Category | Badges |
|----------|--------|
| **Debugging Mastery** | Error Hunter, Exception Architect, Debug Virtuoso |
| **Code Quality** | Complexity Reducer, DRY Advocate, Clean Code Practitioner |
| **Consistency** | Steady Improver, Feedback Embracer, Mastery Path Complete |
| **Milestones** | Getting Started (100 XP), Rising Star (500 XP), Dedicated Learner (1000 XP) |

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
yarn test
```

---

## 📁 Project Structure

```
codefeedback-studio/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── tests/              # Backend tests
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── layout/
│   │   │   └── ui/         # Shadcn/UI components
│   │   ├── contexts/       # React contexts
│   │   │   └── AuthContext.js
│   │   ├── pages/          # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── MarkerDashboard.js
│   │   │   ├── MarkerCoursePage.js
│   │   │   ├── MarkerAnalyticsPage.js
│   │   │   ├── StudentDashboard.js
│   │   │   ├── StudentFeedbackPage.js
│   │   │   ├── StudentAnalyticsPage.js
│   │   │   ├── StudentBadgesPage.js
│   │   │   └── CodeReviewPage.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
│
├── memory/
│   └── PRD.md              # Product requirements
│
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**

4. **Run tests**
   ```bash
   # Backend
   cd backend && pytest
   
   # Frontend
   cd frontend && yarn test
   ```

5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**

### Code Style

- **Python**: Follow PEP 8 guidelines
- **JavaScript/React**: Use ESLint and Prettier
- **Commits**: Use conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - Frontend library
- [Shadcn/UI](https://ui.shadcn.com/) - Beautiful UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

<p align="center">
  Built with ❤️ for programming education
</p>

<p align="center">
  <a href="#-codefeedback-studio">Back to top ↑</a>
</p>
