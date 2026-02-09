# CodeFeedback Studio

A web-based platform for structured code review and feedback-driven learning in programming education.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Student Gamification System](#student-gamification-system)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

### What the Platform Does

CodeFeedback Studio transforms the process of reviewing programming assignments by creating a **feedback-driven learning loop**. Instead of generic grades and comments, the platform enables:

- **Precise, line-level feedback** attached directly to problematic code
- **Structured issue categorization** (logic errors, style violations, security concerns)
- **Iterative improvement tracking** across multiple submission attempts
- **Measurable learning outcomes** based on issue resolution patterns

### User Roles

| Role | Primary Responsibility | Focus |
|------|----------------------|-------|
| **Marker** (Teacher/TA) | Reviews submissions, creates structured feedback, publishes assessments | Teaching and assessment quality |
| **Student** | Submits code, reviews feedback, corrects issues, resubmits | Learning and demonstrable improvement |

### Educational Purpose

This platform is designed for **pedagogical feedback**, not grading automation. The goal is to:

1. Help students understand *why* their code is problematic
2. Provide actionable guidance for improvement
3. Track whether students actually learn from feedback
4. Create accountability through structured issue resolution

CodeFeedback Studio assumes that **learning happens when students actively correct their mistakes**—not when they passively receive scores.

---

## Key Features

### Student Features

- **Code Submission**: Submit Python code via integrated Monaco editor
- **Submission History**: View all previous attempts for an assignment
- **Feedback Viewer**: See marker feedback with highlighted code regions
- **Issue Resolution**: Mark issues as "fixed" upon correction
- **Progress Tracking**: Monitor personal improvement metrics
- **Gamification System**: Earn XP, badges, and levels based on verified corrections *(see dedicated section below)*

### Marker Features

- **Submission Queue**: View all pending submissions across assignments
- **Code Review Interface**: Monaco editor with line selection and annotation
- **Structured Feedback Creation**: Create issues with:
  - Category (Logic Error, Style, Efficiency, Security, Best Practice, Documentation)
  - Severity (Minor, Moderate, Critical)
  - Explanation and suggested fix
  - Verification criteria
- **Feedback Publishing**: Control when students can view feedback
- **Analytics Dashboard**: View cohort-level metrics (issue distribution, resolution rates)

> **Note**: Markers have no visibility into the gamification system. XP, badges, streaks, and levels are exclusively student-facing. This separation ensures that assessment remains objective and pedagogically focused.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS, Shadcn/UI, Monaco Editor, Recharts |
| Backend | FastAPI (Python 3.11+), Pydantic |
| Database | MongoDB with Motor async driver |
| Authentication | JWT with bcrypt password hashing |
| Package Manager | Yarn (frontend), pip (backend) |

---

## Prerequisites

Ensure the following are installed on your system:

| Requirement | Version | Verification Command |
|-------------|---------|---------------------|
| Node.js | 18.x or higher | `node --version` |
| Yarn | 1.22.x or higher | `yarn --version` |
| Python | 3.11 or higher | `python --version` |
| MongoDB | 6.0 or higher | `mongod --version` |
| pip | Latest | `pip --version` |

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/codefeedback-studio.git
cd codefeedback-studio
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install
```

### 4. Environment Configuration

Create `.env` files in both `backend/` and `frontend/` directories.

#### Backend `.env`

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `codefeedback_studio` |
| `JWT_SECRET` | Secret key for JWT signing (use a strong random string) | `your-256-bit-secret-key-here` |
| `CORS_ORIGINS` | Allowed origins for CORS | `http://localhost:3000` |

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="codefeedback_studio"
JWT_SECRET="generate-a-secure-random-string-minimum-32-characters"
CORS_ORIGINS="http://localhost:3000"
```

#### Frontend `.env`

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `REACT_APP_BACKEND_URL` | Backend API base URL | `http://localhost:8001` |

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 5. Database Setup

Start MongoDB locally:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Seed Data**: Issue categories are automatically seeded on first API call to `/api/categories`. No manual migration required.

---

## Running the Application

### Start Backend

```bash
cd backend
source venv/bin/activate  # If not already activated
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Start Frontend

```bash
cd frontend
yarn start
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| API Documentation | http://localhost:8001/docs |

### Verify Installation

1. Open http://localhost:3000 — you should see the login page
2. Open http://localhost:8001/api/ — you should see `{"message": "CodeFeedback Studio API", "status": "running"}`
3. Register a new user and verify login works

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` on frontend | Backend not running | Start backend with `uvicorn server:app --reload --port 8001` |
| MongoDB connection error | MongoDB not running | Start MongoDB service |
| JWT decode error | Invalid or expired token | Clear localStorage and log in again |
| CORS errors | Backend CORS not configured | Verify `CORS_ORIGINS` in backend `.env` includes frontend URL |
| Monaco editor blank | Package not installed | Run `yarn add @monaco-editor/react` in frontend |
| Import errors (Python) | Virtual environment not active | Run `source venv/bin/activate` |

---

## Student Gamification System

### Scope and Principles

The gamification system in CodeFeedback Studio is **exclusively visible to students**. Markers never see XP totals, badges, streaks, or levels. This separation ensures that:

- Assessment remains objective and pedagogically focused
- Students are motivated by genuine improvement, not performance theater
- Markers evaluate code quality, not gamification metrics

#### Design Principles

| Principle | Description |
|-----------|-------------|
| **Quality over Quantity** | Submitting more does not earn more. Only verified corrections count. |
| **Mastery over Speed** | No rewards for fast fixes. Depth of understanding is prioritized. |
| **Evidence-Based Improvement** | All progress requires demonstrable change in submitted code. |
| **Anti-Gaming by Default** | The system actively prevents trivial, repetitive, or self-introduced fixes from counting. |

---

### What Qualifies as a Valid Correction

XP and badge progress are awarded **only** when all of the following conditions are met:

1. **The issue was externally identified** — flagged by the system (linter, tests) or by a marker
2. **The issue is resolved in a subsequent submission** — not in the same submission where it was introduced
3. **The fix is correct** — the underlying problem is actually solved
4. **The fix is minimal** — no workaround hacks, no unrelated changes bundled in
5. **The fix introduces no regressions** — other tests still pass, no new warnings introduced

#### Correction Categories (Increasing Difficulty)

| Category | Description | Difficulty |
|----------|-------------|------------|
| **Compiler/Runtime Error Resolution** | Code that previously failed to execute now runs | Low |
| **Failing Test → Passing Test** | An existing test that failed now passes (student cannot add tests to game this) | Low-Medium |
| **Non-Trivial Lint Fixes** | Structural lint issues (unused variables, unreachable code, type errors) — not whitespace | Medium |
| **Complexity Reduction Refactors** | Measurable reduction in cyclomatic complexity | Medium-High |
| **Duplication Removal** | Consolidating repeated code blocks into reusable abstractions | Medium-High |
| **Naming and Structure Improvements** | Renaming for clarity, restructuring for readability (marker-verified) | Medium |
| **Performance Improvements** | Validated by metrics (time complexity, memory usage) without correctness loss | High |
| **Security Fixes** | Addressing injection risks, unsafe input handling, hardcoded secrets | High |
| **Logical Correctness Bugs** | Code that passed tests but contained incorrect logic (marker-identified) | Very High |

---

### XP System

#### XP Award Rules

| Rule | Description |
|------|-------------|
| XP is awarded **per resolved issue** | Not per submission. A submission with 5 fixes earns 5 separate XP awards. |
| XP is **severity-weighted** | Critical issues award more than minor issues. |
| XP is **capped per assignment** | Maximum 500 XP per assignment to prevent grinding. |
| XP is **capped per day** | Maximum 200 XP per day to encourage sustained effort over cramming. |

#### XP Values by Severity

| Severity | Base XP | With Hint Penalty | Cap per Category |
|----------|---------|-------------------|------------------|
| Minor | 10 XP | 5 XP | 50 XP/assignment |
| Moderate | 25 XP | 15 XP | 150 XP/assignment |
| Critical | 50 XP | 30 XP | 300 XP/assignment |

#### Hard Constraints (No XP Awarded)

| Scenario | Reason |
|----------|--------|
| Fixing the same issue type more than 3 times per assignment | Prevents gaming through repetitive trivial fixes |
| Fixing issues introduced by the student in the same session | Self-introduced bugs cannot be farmed for XP |
| Cosmetic-only changes (whitespace, comments, formatting) | No learning demonstrated |
| Fixes that introduce new warnings or test failures | Regressions negate the improvement |
| Excessive hint usage (>3 hints per issue) | Reduces XP by 50-100% |

#### Diminishing Returns

After the third fix in the same category within an assignment, XP awards decrease:

| Fix Number | XP Multiplier |
|------------|---------------|
| 1-3 | 100% |
| 4-5 | 50% |
| 6+ | 0% |

---

### Badge Philosophy

Badges in CodeFeedback Studio are **milestone markers**, not participation trophies. They must:

- Represent sustained, verified improvement
- Require multiple corrections across multiple submissions
- Often require consistency over weeks, not hours
- Be impossible to farm in a single session

**There are no "first fix" or "easy win" badges.** Every badge requires demonstrable competence.

---

### Badge System

#### Debugging Mastery Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Error Hunter** | Demonstrates ability to resolve runtime errors | Fix 10 distinct runtime errors across ≥3 assignments | Error logs before/after |
| **Exception Architect** | Properly handles edge cases that caused crashes | Fix 5 unhandled exception issues with proper try/catch or validation | Code diff showing handling logic |
| **Null Safety Sentinel** | Eliminates null/undefined reference errors | Fix 8 null-related bugs without introducing new ones | Static analysis report |
| **Type Discipline** | Resolves type mismatch errors systematically | Fix 15 type errors across ≥5 assignments | Type checker output |
| **Debug Virtuoso** | Demonstrates advanced debugging across categories | Earn all other Debugging Mastery badges | Cumulative |

#### Testing Discipline Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Test Restorer** | Fixes code to pass previously failing tests | Fix 20 test failures across ≥5 assignments without modifying tests | Test output logs |
| **Edge Case Survivor** | Fixes boundary condition failures | Fix 10 edge-case-related test failures | Test case descriptions + fixes |
| **Regression Guardian** | Maintains test suite integrity over time | Submit 15 consecutive submissions with no test regressions | CI/test history |
| **Coverage Contributor** | Fixes issues identified by coverage gaps | Fix 8 issues in previously uncovered code paths (marker-identified) | Coverage diff reports |
| **Test Discipline Master** | Sustained excellence in test-related fixes | Earn all other Testing Discipline badges | Cumulative |

#### Code Quality & Design Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Complexity Reducer** | Simplifies convoluted code | Reduce cyclomatic complexity by ≥20% in 5 separate submissions | Complexity metrics before/after |
| **Refactor Architect** | Major structural improvements | Reduce cyclomatic complexity by ≥30% across 3 assignments without new warnings | Metric reports + clean lint |
| **DRY Advocate** | Eliminates code duplication | Remove ≥10 duplicated code blocks across ≥4 assignments | Duplication analysis diff |
| **Naming Craftsman** | Improves code readability through naming | Receive marker approval on 10 naming improvements | Marker verification |
| **Clean Code Practitioner** | Consistent code quality improvements | Earn Complexity Reducer + DRY Advocate + Naming Craftsman | Cumulative |

#### Performance & Efficiency Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Algorithm Optimizer** | Improves time complexity | Reduce time complexity class (e.g., O(n²) → O(n log n)) in 3 submissions | Big-O analysis |
| **Memory Steward** | Reduces memory usage | Achieve ≥25% memory reduction in 3 separate fixes | Memory profiler output |
| **Loop Efficiency Expert** | Optimizes iteration patterns | Fix 8 inefficient loop constructs | Before/after code + metrics |
| **Lazy Evaluation Adopter** | Implements efficient data loading | Convert 5 eager computations to lazy evaluation where appropriate | Code diff + performance test |
| **Performance Engineer** | Comprehensive efficiency mastery | Earn Algorithm Optimizer + Memory Steward + one other Performance badge | Cumulative |

#### Security Awareness Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Input Sanitizer** | Properly validates user input | Fix 8 input validation vulnerabilities | Security scan before/after |
| **Injection Preventer** | Eliminates injection attack vectors | Fix 5 SQL/command/code injection risks | Vulnerability report |
| **Secret Keeper** | Removes hardcoded credentials | Fix 5 hardcoded secret issues + implement proper config | Code diff + config setup |
| **Auth Guardian** | Fixes authentication/authorization flaws | Fix 4 auth-related security issues | Security audit findings |
| **Security Champion** | Comprehensive security awareness | Earn 4 of the 5 Security Awareness badges | Cumulative |

#### Consistency & Growth Badges

| Badge | Description | Unlock Criteria | Evidence Required |
|-------|-------------|-----------------|-------------------|
| **Steady Improver** | Demonstrates consistent learning | Earn XP in ≥10 separate weeks (not consecutive required) | XP history log |
| **Feedback Embracer** | Actively responds to marker feedback | Resolve ≥80% of marker-flagged issues across 5 assignments | Resolution rate metrics |
| **Zero Regression Streak** | Maintains code quality over time | 20 consecutive submissions with no new issues introduced | Submission history |
| **Cross-Category Learner** | Improves across multiple dimensions | Earn at least one badge from 4 different badge categories | Badge inventory |
| **Mastery Path Complete** | Ultimate demonstration of growth | Earn 15 total badges including at least one "Master" level badge | Badge inventory |

---

### Levels and Titles

Progression is intentionally slow. Levels represent genuine competence accumulation, not time spent.

| Level | Title | Total XP Required | XP Gap from Previous |
|-------|-------|-------------------|---------------------|
| 1 | Novice Coder | 0 | — |
| 2 | Bug Spotter | 100 | 100 |
| 3 | Issue Resolver | 300 | 200 |
| 4 | Apprentice Debugger | 600 | 300 |
| 5 | Competent Reviewer | 1,000 | 400 |
| 6 | Code Analyst | 1,500 | 500 |
| 7 | Quality Advocate | 2,200 | 700 |
| 8 | Refactoring Specialist | 3,000 | 800 |
| 9 | Software Craftsman | 4,000 | 1,000 |
| 10 | Engineering Practitioner | 5,200 | 1,200 |
| 11 | Code Quality Expert | 6,600 | 1,400 |
| 12 | Senior Practitioner | 8,200 | 1,600 |
| 13 | Principal Developer | 10,000 | 1,800 |
| 14 | Distinguished Engineer | 12,500 | 2,500 |
| 15 | Master Craftsman | 15,000 | 2,500 |

**Note**: Reaching Level 15 requires sustained, high-quality improvement over an extended period. It is not achievable through volume alone.

---

### Feedback-Driven Progression

The gamification system reinforces learning by providing clear, actionable feedback:

| Feedback Type | Description |
|---------------|-------------|
| **XP Award Explanation** | Students see exactly why XP was awarded: which issue, what category, what severity |
| **XP Denial Explanation** | When XP is not awarded, students see why: "Same issue type fixed 4th time (diminishing returns)" |
| **Diff-Based Evidence** | Visual diff showing what changed between submissions |
| **Badge Progress Indicators** | Clear progress toward next badge milestone |

#### What Students Do NOT See

- **No public leaderboards** — Avoids toxic competition and gaming incentives
- **No peer XP comparisons** — Focus is on personal growth
- **No daily streaks** — Encourages quality over daily login habits
- **No time-based bonuses** — Speed is not rewarded

---

### Example Scenarios

#### Scenario 1: Multiple Fixes, One Badge

**Context**: A student submits Assignment 3 with multiple issues. Over the next two weeks, they submit three revisions.

| Submission | Issues Fixed | XP Earned | Badges Earned |
|------------|--------------|-----------|---------------|
| Revision 1 | 2 minor lint issues, 1 runtime error | 30 XP (10+10+10) | None |
| Revision 2 | 1 moderate logic error, 1 minor style issue | 35 XP (25+10) | None |
| Revision 3 | 1 critical security issue (SQL injection) | 50 XP | None |

**Total**: 115 XP earned, 0 badges.

**Why no badges?** The student fixed real issues but:
- Did not meet the threshold for any badge (e.g., "Input Sanitizer" requires 8 fixes)
- Fixes were spread across categories without depth in any single area
- This is expected—badges require sustained, focused improvement

---

#### Scenario 2: Many Submissions, No XP

**Context**: A student submits 12 times for Assignment 4 in one day.

| Submission | Changes Made | XP Earned | Reason |
|------------|--------------|-----------|--------|
| 1-3 | Fixed 3 whitespace issues | 0 XP | Cosmetic-only changes |
| 4-6 | Fixed same "unused variable" warning 3 times | 30 XP | Valid (first 3) |
| 7-9 | Fixed same "unused variable" pattern 3 more times | 15 XP | Diminishing returns (50%) |
| 10-12 | Introduced bug, then fixed it, then "improved" it | 0 XP | Self-introduced issues |

**Total**: 45 XP earned (out of potential 360 XP if all were valid).

**Why so little?** The system detected:
- Repetitive fixes in the same category
- Self-introduced bugs being "fixed" for XP
- Cosmetic changes with no learning value
- Daily cap would have limited further earnings anyway

---

#### Scenario 3: Long-Term Improvement Leading to Major Badge

**Context**: A student works across 8 weeks on multiple assignments.

| Week | Activity | XP Earned | Badge Progress |
|------|----------|-----------|----------------|
| 1 | Fixed 2 complexity issues in Assignment 1 | 50 XP | Complexity Reducer: 2/5 |
| 2 | No submissions | 0 XP | — |
| 3 | Fixed 1 complexity issue in Assignment 2 | 25 XP | Complexity Reducer: 3/5 |
| 4 | Fixed 3 duplication issues in Assignment 2 | 75 XP | DRY Advocate: 3/10 |
| 5 | Fixed 2 complexity issues in Assignment 3 | 50 XP | **Complexity Reducer: 5/5 ✓** |
| 6 | Fixed 4 duplication issues in Assignment 3 | 100 XP | DRY Advocate: 7/10 |
| 7 | Fixed 2 naming issues, 3 duplication issues | 75 XP | **DRY Advocate: 10/10 ✓**, Naming: 2/10 |
| 8 | Fixed 3 naming issues in Assignment 4 | 30 XP | Naming: 5/10 |

**Result after 8 weeks**:
- **Total XP**: 405 XP (Level 5: Competent Reviewer)
- **Badges earned**: Complexity Reducer, DRY Advocate
- **In progress**: Naming Craftsman (5/10), Clean Code Practitioner (2/3 prerequisites)

**Why this works**: The student demonstrated:
- Sustained effort over time (not cramming)
- Improvement across multiple assignments
- Depth in specific categories
- No gaming patterns detected

---

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
yarn test
```

### API Testing

```bash
# Health check
curl http://localhost:8001/api/

# Register user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "full_name": "Test User", "role": "student"}'
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

### Code Style

- **Python**: Follow PEP 8, use Black for formatting
- **JavaScript/React**: Follow ESLint configuration, use Prettier
- **Commits**: Use conventional commit messages

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Monaco Editor for the code editing experience
- Shadcn/UI for accessible component primitives
- FastAPI for high-performance Python APIs
