# Requirements Analysis
## CodeFeedback Studio

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete set of functional and non-functional requirements for CodeFeedback Studio, a multi-role code assessment and moderation platform for higher education. It serves as the canonical reference for development, testing, and validation.

### 1.2 Scope
CodeFeedback Studio supports four user roles (Student, Marker, Moderator, Module Leader) across the full lifecycle of code assignment submission, inline feedback, moderation, gamification, and reflective learning.

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| **Submission** | A student's uploaded code files for a specific assignment attempt |
| **Issue** | An inline feedback annotation placed on specific code lines by a marker |
| **Moderation** | Quality assurance review of marker feedback by moderators and module leaders |
| **Template** | A reusable feedback pattern that auto-fills issue fields |
| **Reflection** | A structured student self-assessment written before or after receiving feedback |
| **XP** | Experience points earned through positive academic behaviours |
| **Badge** | An achievement unlocked by meeting specific criteria |

---

## 2. Functional Requirements

### 2.1 Authentication & User Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-01 | The system shall allow users to register with email, password, full name, and role (student/marker) | P0 | Implemented |
| FR-AUTH-02 | The system shall enforce unique email addresses across all accounts | P0 | Implemented |
| FR-AUTH-03 | The system shall hash passwords using bcrypt before storage | P0 | Implemented |
| FR-AUTH-04 | The system shall issue a JWT token upon successful login, valid for 24 hours | P0 | Implemented |
| FR-AUTH-05 | The system shall reject expired or invalid tokens with HTTP 401 | P0 | Implemented |
| FR-AUTH-06 | The system shall return the authenticated user's profile via GET /api/auth/me | P0 | Implemented |
| FR-AUTH-07 | The system shall automatically promote a marker to module_leader when they create a course | P1 | Implemented |

### 2.2 Course Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-CRS-01 | Markers shall be able to create new courses with name, code, description, year, and semester | P0 | Implemented |
| FR-CRS-02 | Module leaders shall be able to add collaborators (other markers) to their courses | P0 | Implemented |
| FR-CRS-03 | Module leaders shall be able to add moderators to their courses | P0 | Implemented |
| FR-CRS-04 | Module leaders shall be able to transfer course leadership to another user | P1 | Implemented |
| FR-CRS-05 | Students shall be able to enroll in and unenroll from courses | P0 | Implemented |
| FR-CRS-06 | The system shall display course listings filtered by the user's role and associations | P0 | Implemented |
| FR-CRS-07 | Each course shall track student count, assignment count, and review statistics | P1 | Implemented |

### 2.3 Assignment Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-ASN-01 | Markers with course access shall be able to create assignments with title, description, and total marks | P0 | Implemented |
| FR-ASN-02 | Assignments shall support optional deadlines that close submissions after the due date | P0 | Implemented |
| FR-ASN-03 | Assignments shall support optional scheduled release dates that hide the assignment until a future time | P0 | Implemented |
| FR-ASN-04 | Assignments shall support configurable maximum attempt counts (-1 = unlimited) | P1 | Implemented |
| FR-ASN-05 | Module leaders shall be able to publish results, making grades and feedback visible to students | P0 | Implemented |
| FR-ASN-06 | Assignments shall support optional scheduled result publication dates | P1 | Implemented |
| FR-ASN-07 | Module leaders shall be able to delete assignments with cascading removal of all associated submissions, issues, and drafts | P0 | Implemented |
| FR-ASN-08 | Markers shall be able to upload marking scheme documents (PDF) | P2 | Implemented |
| FR-ASN-09 | The system shall track review progress (submissions reviewed / total submissions) per assignment | P1 | Implemented |

### 2.4 Code Submission

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-SUB-01 | Students shall be able to submit multi-file code through the Monaco Editor interface | P0 | Implemented |
| FR-SUB-02 | Each submission shall be assigned a sequential attempt number per student per assignment | P0 | Implemented |
| FR-SUB-03 | Submissions shall be created with status 'pending' and moderation_status null | P0 | Implemented |
| FR-SUB-04 | The system shall block submissions after the deadline (if configured) | P0 | Implemented |
| FR-SUB-05 | The system shall block submissions exceeding the maximum attempt count | P1 | Implemented |
| FR-SUB-06 | Only students enrolled in the assignment's course shall be able to submit | P0 | Implemented |

### 2.5 Code Review & Feedback

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-REV-01 | Markers shall view submitted code in a read-only Monaco Editor with syntax highlighting | P0 | Implemented |
| FR-REV-02 | Markers shall be able to select a range of code lines and create an inline issue | P0 | Implemented |
| FR-REV-03 | Each issue shall include: title, explanation, category, severity (minor/moderate/critical), suggested fix, marks deduction, and line range | P0 | Implemented |
| FR-REV-04 | Adding the first issue to a pending submission shall transition it to 'in_review' status | P0 | Implemented |
| FR-REV-05 | Markers shall be able to delete issues before feedback is published | P0 | Implemented |
| FR-REV-06 | Markers shall be able to grade submissions by assigning marks and optional feedback text | P0 | Implemented |
| FR-REV-07 | Markers shall be able to mark a submission as 'no issues' (awards full marks) | P0 | Implemented |
| FR-REV-08 | Markers shall be able to publish feedback, transitioning the submission to 'feedback_released' | P0 | Implemented |
| FR-REV-09 | Publishing feedback shall set moderation_status to 'pending' | P0 | Implemented |
| FR-REV-10 | Students shall see issues highlighted on exact code lines with severity-coded colours | P0 | Implemented |
| FR-REV-11 | Students shall be able to mark individual issues as 'fixed', earning XP | P0 | Implemented |
| FR-REV-12 | Clicking an issue in the sidebar shall scroll to and highlight the corresponding code lines | P1 | Implemented |
| FR-REV-13 | The issue categories shall be: Logic Error, Style, Efficiency, Security, Best Practice, Documentation | P1 | Implemented |

### 2.6 Feedback Templates

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-TPL-01 | Markers shall be able to save issue configurations as reusable templates | P1 | Implemented |
| FR-TPL-02 | Templates shall support module-specific scope (visible only within one course) | P1 | Implemented |
| FR-TPL-03 | Templates shall support global scope (visible across all modules) | P1 | Implemented |
| FR-TPL-04 | Selecting a template shall auto-fill all issue form fields (title, explanation, severity, fix, deduction) | P1 | Implemented |
| FR-TPL-05 | Templates shall be searchable by name, category, and content | P1 | Implemented |
| FR-TPL-06 | The system shall track usage count per template | P2 | Implemented |
| FR-TPL-07 | Only the template creator shall be able to delete their own templates | P1 | Implemented |

### 2.7 Auto-Draft Saving

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-DFT-01 | The system shall auto-save marker review state (issue form, grade data) every 15 seconds | P1 | Implemented |
| FR-DFT-02 | Marker drafts shall be restored on page load | P1 | Implemented |
| FR-DFT-03 | A visual indicator shall show draft status (Saved / Saving / Unsaved) | P1 | Implemented |
| FR-DFT-04 | The system shall auto-save student reflection drafts every 10 seconds | P1 | Implemented |
| FR-DFT-05 | Reflection drafts shall be restored when switching between reflection types | P1 | Implemented |

### 2.8 Moderation

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-MOD-01 | The moderation queue shall contain all failed submissions plus a 10% random sample of passed submissions | P0 | Implemented |
| FR-MOD-02 | Moderators shall be able to raise moderation issues on reviewed submissions with severity and description | P0 | Implemented |
| FR-MOD-03 | Raising a moderation issue shall set the submission's moderation_status to 'flagged' | P0 | Implemented |
| FR-MOD-04 | Module leaders shall be able to approve moderation issues (status → 'resolved', moderation_status → 'flagged_approved') | P0 | Implemented |
| FR-MOD-05 | Module leaders shall be able to reject moderation issues (status → 'discarded') | P0 | Implemented |
| FR-MOD-06 | Moderators shall be able to confirm submissions have no moderation concerns (moderation_status → 'approved') | P0 | Implemented |
| FR-MOD-07 | The moderation dashboard shall display pending, approved, and flagged counts | P1 | Implemented |

### 2.9 Gamification

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-GAM-01 | Students shall earn XP for fixing issues (full XP within 24h, half XP after) | P1 | Implemented |
| FR-GAM-02 | Markers shall earn XP for grading submissions (+25) and marking no issues (+15) | P1 | Implemented |
| FR-GAM-03 | The system shall support 14 student badges and 13 marker badges | P1 | Implemented |
| FR-GAM-04 | Badges shall be awarded automatically when criteria are met (idempotent — no duplicate awards) | P1 | Implemented |
| FR-GAM-05 | Earning a badge shall award its associated XP bonus | P1 | Implemented |
| FR-GAM-06 | The system shall calculate user level (1–10) from total XP using defined thresholds | P1 | Implemented |
| FR-GAM-07 | Users shall have a profile showing XP, level, badges, and progress to next level | P1 | Implemented |

### 2.10 Module Leaderboards

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-LDB-01 | Each course shall have separate opt-in leaderboards for students and markers | P1 | Implemented |
| FR-LDB-02 | Users shall join leaderboards by providing a unique nickname per module | P1 | Implemented |
| FR-LDB-03 | Nicknames shall be unique within a module's leaderboard | P1 | Implemented |
| FR-LDB-04 | Real names shall never be displayed on leaderboards | P0 | Implemented |
| FR-LDB-05 | Students shall only see the student leaderboard; markers shall only see the marker leaderboard | P0 | Implemented |
| FR-LDB-06 | Users shall be able to leave a module's leaderboard at any time | P1 | Implemented |
| FR-LDB-07 | Student leaderboard scores shall be based on: submissions, on-time submissions, issues fixed, perfect submissions, quick fixes | P1 | Implemented |
| FR-LDB-08 | Marker leaderboard scores shall be based on: reviews completed, issues found, moderation approvals, turnaround time | P1 | Implemented |

### 2.11 PDF Feedback Export

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PDF-01 | The system shall generate a professional PDF report for any submission's feedback | P1 | Implemented |
| FR-PDF-02 | The PDF shall include: student info, module/assignment details, issues summary, detailed issue list, and annotated code | P1 | Implemented |
| FR-PDF-03 | Students shall be able to export only their own submissions' PDFs | P1 | Implemented |
| FR-PDF-04 | Markers shall be able to export any submission's PDF | P1 | Implemented |
| FR-PDF-05 | Issue lines in the code section shall be marked with `>>>` indicators | P2 | Implemented |

### 2.12 Cross-Student Comparison

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-CMP-01 | Markers shall be able to view two submissions side by side in synchronized Monaco editors | P1 | Implemented |
| FR-CMP-02 | The primary (left) panel shall display the student's issues in a sidebar | P1 | Implemented |
| FR-CMP-03 | The reference (right) panel shall be strictly read-only with no issues exposed | P0 | Implemented |
| FR-CMP-04 | Scroll positions shall be synchronized by default, with a toggle to disable | P1 | Implemented |
| FR-CMP-05 | Each panel shall have an independent file selector | P1 | Implemented |
| FR-CMP-06 | Only markers and above shall access the comparison feature | P0 | Implemented |

### 2.13 Student Reflections

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-REF-01 | Students shall write pre-submission reflections at any time before grading | P1 | Implemented |
| FR-REF-02 | Students shall write post-feedback reflections only after feedback is released | P1 | Implemented |
| FR-REF-03 | Each reflection type shall have 3 guided prompts with individual text areas | P1 | Implemented |
| FR-REF-04 | Students shall have a free-form notes area in addition to guided prompts | P1 | Implemented |
| FR-REF-05 | Reflections shall use upsert semantics (one per submission per type per student) | P1 | Implemented |
| FR-REF-06 | Reflection drafts shall auto-save every 10 seconds | P1 | Implemented |
| FR-REF-07 | Only students shall be able to write reflections; only on their own submissions | P0 | Implemented |

---

## 3. Non-Functional Requirements

| ID | Category | Requirement | Priority | Status |
|----|----------|-------------|----------|--------|
| NFR-01 | **Security** | Passwords shall be hashed with bcrypt (salt rounds ≥ 10) | P0 | Implemented |
| NFR-02 | **Security** | All API endpoints (except register/login) shall require JWT authentication | P0 | Implemented |
| NFR-03 | **Security** | Role-based access control shall be enforced at the API level, not just the frontend | P0 | Implemented |
| NFR-04 | **Security** | Student submission content shall not be exposed in comparison reference panels | P0 | Implemented |
| NFR-05 | **Security** | Environment variables shall never be hardcoded or committed to version control | P0 | Implemented |
| NFR-06 | **Performance** | API responses shall complete within 500ms for standard CRUD operations | P1 | Implemented |
| NFR-07 | **Performance** | MongoDB queries shall use aggregation pipelines to prevent N+1 query patterns | P1 | Implemented |
| NFR-08 | **Performance** | Auto-draft save operations shall be non-blocking and failure-tolerant | P1 | Implemented |
| NFR-09 | **Usability** | The UI shall support dark mode with consistent theming | P2 | Implemented |
| NFR-10 | **Usability** | Micro-animations shall provide visual feedback for user interactions | P2 | Implemented |
| NFR-11 | **Usability** | All interactive elements shall have data-testid attributes for automated testing | P1 | Implemented |
| NFR-12 | **Usability** | Toast notifications shall confirm all user actions (success/error) | P1 | Implemented |
| NFR-13 | **Reliability** | Draft data shall persist across page refreshes and browser crashes | P1 | Implemented |
| NFR-14 | **Reliability** | Badge awards shall be idempotent (no duplicate badges) | P1 | Implemented |
| NFR-15 | **Scalability** | The backend shall use async I/O throughout (FastAPI + Motor) | P1 | Implemented |
| NFR-16 | **Compatibility** | The frontend shall work on Chrome, Firefox, Safari, and Edge (latest versions) | P1 | Implemented |
| NFR-17 | **Portability** | The application shall be deployable on Vercel (frontend) and Render (backend) | P2 | Implemented |
| NFR-18 | **Maintainability** | All MongoDB responses shall exclude the `_id` field to prevent serialization errors | P0 | Implemented |

---

## 4. Requirements Summary

| Category | Total | P0 | P1 | P2 | Implemented |
|----------|-------|----|----|----|-------------|
| Authentication | 7 | 6 | 1 | 0 | 7/7 |
| Course Management | 7 | 4 | 3 | 0 | 7/7 |
| Assignment Management | 9 | 4 | 3 | 2 | 9/9 |
| Code Submission | 6 | 4 | 2 | 0 | 6/6 |
| Code Review & Feedback | 13 | 9 | 4 | 0 | 13/13 |
| Feedback Templates | 7 | 0 | 6 | 1 | 7/7 |
| Auto-Draft Saving | 5 | 0 | 5 | 0 | 5/5 |
| Moderation | 7 | 5 | 2 | 0 | 7/7 |
| Gamification | 7 | 0 | 7 | 0 | 7/7 |
| Leaderboards | 8 | 2 | 6 | 0 | 8/8 |
| PDF Export | 5 | 0 | 4 | 1 | 5/5 |
| Comparison | 6 | 2 | 4 | 0 | 6/6 |
| Reflections | 7 | 1 | 6 | 0 | 7/7 |
| Non-Functional | 18 | 5 | 9 | 4 | 18/18 |
| **Total** | **112** | **42** | **62** | **8** | **112/112** |

---

*Document Version: 1.0 — April 2026*
