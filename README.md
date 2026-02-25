# 🎓 CodeFeedback Studio

A modern code review platform for programming education with GitHub PR-style feedback, multi-file submissions, and gamification.

---

## 📦 Local Setup Guide

Follow these steps to run CodeFeedback Studio on your local machine.

---

### Step 1: Prerequisites

Make sure you have these installed:

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18.x or higher | https://nodejs.org/ |
| Yarn | 1.22.x or higher | Run: `npm install -g yarn` |
| Python | 3.11 or higher | https://python.org/ |
| MongoDB | 6.0 or higher | https://mongodb.com/try/download/community |

**Verify installations:**
```bash
node --version    # Should show v18.x.x or higher
yarn --version    # Should show 1.22.x or higher
python --version  # Should show 3.11.x or higher
```

---

### Step 2: Start MongoDB

**Option A: Using Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: Local MongoDB Installation**
- Windows: MongoDB should start automatically as a service
- macOS: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

**Verify MongoDB is running:**
```bash
# Using Docker
docker ps | grep mongodb

# Or try connecting
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

### Step 3: Setup Backend

Open a terminal and run these commands:

```bash
# 1. Navigate to backend folder
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# On Windows (Command Prompt):
venv\Scripts\activate

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On macOS/Linux:
source venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Create environment file
# On Windows:
copy .env.example .env

# On macOS/Linux:
cp .env.example .env

# 6. Start the backend server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**✅ Backend is running when you see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Started reloader process
```

**Test it:** Open http://localhost:8001/api/health in your browser. You should see:
```json
{"status":"healthy","timestamp":"..."}
```

---

### Step 4: Setup Frontend

Open a **new terminal** (keep backend running) and run:

```bash
# 1. Navigate to frontend folder
cd frontend

# 2. Install dependencies
yarn install

# 3. Create environment file
# On Windows:
copy .env.example .env

# On macOS/Linux:
cp .env.example .env

# 4. IMPORTANT: For local development, rename the craco config
# On Windows:
rename craco.config.js craco.config.cloud.js
rename craco.config.local.js craco.config.js

# On macOS/Linux:
mv craco.config.js craco.config.cloud.js
mv craco.config.local.js craco.config.js

# 5. Delete the plugins folder (not needed locally)
# On Windows:
rmdir /s /q plugins

# On macOS/Linux:
rm -rf plugins

# 6. Start the frontend server
yarn start
```

**✅ Frontend is running when you see:**
```
Compiled successfully!
You can now view the app in the browser.
Local: http://localhost:3000
```

---

### Step 5: Access the Application

🎉 **Open your browser and go to:** http://localhost:3000

You should see the login page!

---

## 🔧 Environment Configuration

### Backend (`backend/.env`)

```env
# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
DB_NAME=codefeedback_studio

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-key-change-in-production

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🚀 Quick Start Commands

After initial setup, use these commands to start the app:

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate    # Windows
# or: source venv/bin/activate  # macOS/Linux
uvicorn server:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

---

## 📋 Troubleshooting

### "Cannot read properties of null (reading 'traverse')"

This error means the Emergent cloud plugins are still active. Fix:
```bash
cd frontend
# Rename craco config
mv craco.config.js craco.config.cloud.js
mv craco.config.local.js craco.config.js
# Delete plugins folder
rm -rf plugins
```

### "ECONNREFUSED" or "Network Error"

The backend is not running. Make sure:
1. Backend terminal is open and showing "Uvicorn running"
2. Port 8001 is not blocked by firewall
3. `.env` file exists in both `backend/` and `frontend/` folders

### "MongoDB connection failed"

Make sure MongoDB is running:
```bash
# If using Docker
docker start mongodb

# If local installation
# Windows: Check Services app for "MongoDB Server"
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port already in use

```bash
# Find and kill process on port 8001 (backend)
# Windows:
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :8001
kill -9 <PID>

# Same for port 3000 (frontend)
```

---

## ✨ Features

### For Markers (Instructors)
- 📚 Create and manage courses
- 👥 Add collaborating markers
- 📝 Create assignments with deadlines
- 💻 GitHub PR-style code review
- 📊 View analytics and statistics

### For Students
- 📖 Enroll in multiple courses
- 📁 Submit multiple Python files
- 🔗 Click-to-navigate feedback
- 🏆 Earn XP and badges
- 📈 Track progress

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind CSS, Monaco Editor |
| Backend | FastAPI, Pydantic |
| Database | MongoDB |
| Auth | JWT Tokens |

---

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | Login |
| `/api/courses` | GET/POST | List/Create courses |
| `/api/assignments` | GET/POST | List/Create assignments |
| `/api/submissions` | GET/POST | List/Submit code |
| `/api/issues` | GET/POST | List/Create feedback |
| `/api/analytics/marker` | GET | Marker statistics |
| `/api/analytics/student` | GET | Student progress |

---

## 🎮 Gamification

| Action | XP Earned |
|--------|-----------|
| Fix minor issue | +10 XP |
| Fix moderate issue | +25 XP |
| Fix critical issue | +50 XP |

**Levels:** Novice Coder → Bug Spotter → Issue Resolver → ... → Master Craftsman (15 levels)

---

## 📄 License

MIT License

---

<p align="center">
  Built with ❤️ for programming education
</p>
