# Event-B System Modeling Documentation
## CodeFeedback Studio

### Table of Contents
1. [Overview](#1-overview)
2. [Context C0 — Types and Constants](#2-context-c0--types-and-constants)
3. [Context C1 — Gamification Constants](#3-context-c1--gamification-constants)
4. [Machine M0 — Access Control](#4-machine-m0--access-control)
5. [Machine M1 — Course and Assignment Management](#5-machine-m1--course-and-assignment-management)
6. [Machine M2 — Submission Lifecycle](#6-machine-m2--submission-lifecycle)
7. [Machine M3 — Feedback and Review](#7-machine-m3--feedback-and-review)
8. [Machine M4 — Moderation Workflow](#8-machine-m4--moderation-workflow)
9. [Machine M5 — Gamification Engine](#9-machine-m5--gamification-engine)
10. [Machine M6 — Student Reflections](#10-machine-m6--student-reflections)
11. [Requirements Traceability Matrix](#11-requirements-traceability-matrix)
12. [State Diagrams](#12-state-diagrams)
13. [Proof Obligations Summary](#13-proof-obligations-summary)

---

## 1. Overview

This document provides a formal Event-B specification of the **CodeFeedback Studio** platform — a multi-role code assessment, feedback, and moderation system. The specification uses Event-B notation to define:

- **Contexts**: Static structure (carrier sets, constants, axioms)
- **Machines**: Dynamic behaviour (variables, invariants, events with guards and actions)

The model is structured as a layered refinement:

```
C0 (Types) ──────────── C1 (Gamification Constants)
    │                        │
    ▼                        ▼
M0 (Access Control)     M5 (Gamification)
    │
    ▼
M1 (Courses & Assignments)
    │
    ▼
M2 (Submission Lifecycle)
    │
    ├──► M3 (Feedback & Review)
    │        │
    │        ▼
    │    M4 (Moderation)
    │
    └──► M6 (Reflections)
```

### Notation Conventions

| Symbol | Meaning |
|--------|---------|
| `∈` | Element of |
| `⊆` | Subset of |
| `↦` | Maplet (pair) |
| `→` | Total function |
| `⇸` | Partial function |
| `ℙ(S)` | Power set of S |
| `ℕ` | Natural numbers |
| `∅` | Empty set |
| `dom(f)` | Domain of function f |
| `ran(f)` | Range of function f |
| `▷` | Range restriction |
| `⩤` | Domain subtraction |
| `≔` | Becomes equal to (assignment) |

---

## 2. Context C0 — Types and Constants

This context defines the foundational carrier sets (types) and constants shared across all machines.

```event-b
CONTEXT C0_Types
SETS
    USER            /* Set of all user identifiers */
    COURSE          /* Set of all course identifiers */
    ASSIGNMENT      /* Set of all assignment identifiers */
    SUBMISSION      /* Set of all submission identifiers */
    FILE            /* Set of all file identifiers */
    ISSUE           /* Set of all feedback issue identifiers */
    MOD_ISSUE       /* Set of all moderation issue identifiers */
    TEMPLATE        /* Set of all feedback template identifiers */
    REFLECTION      /* Set of all reflection identifiers */
    CATEGORY        /* Set of all issue category identifiers */

    ROLE = {student, marker, moderator, module_leader}

    SUBMISSION_STATUS = {
        pending,
        in_review,
        feedback_released,
        no_issues,
        graded
    }

    MODERATION_STATUS = {
        mod_none,
        mod_pending,
        mod_approved,
        mod_flagged,
        mod_flagged_approved
    }

    STUDENT_ISSUE_STATUS = {issue_open, issue_fixed}

    SEVERITY = {critical, moderate, minor}

    MOD_ISSUE_STATUS = {mod_open, mod_resolved, mod_discarded}

    LEADER_RESPONSE = {lr_none, lr_approved, lr_rejected}

    REFLECTION_TYPE = {pre_submission, post_feedback}

CONSTANTS
    role_hierarchy       /* Partial order on roles */

AXIOMS
    @axm1  role_hierarchy ∈ ROLE ↔ ROLE
    @axm2  role_hierarchy = {
               student ↦ student,
               marker ↦ marker,
               marker ↦ student,
               moderator ↦ moderator,
               moderator ↦ marker,
               moderator ↦ student,
               module_leader ↦ module_leader,
               module_leader ↦ moderator,
               module_leader ↦ marker,
               module_leader ↦ student
           }
    /* module_leader ⊇ moderator ⊇ marker ⊇ student (in terms of permissions) */

    @axm3  ∀r1,r2,r3 · r1↦r2 ∈ role_hierarchy ∧ r2↦r3 ∈ role_hierarchy
                       ⇒ r1↦r3 ∈ role_hierarchy
    /* Transitivity of role hierarchy */

END
```

### Explanation

The role hierarchy encodes that each higher role **subsumes** the permissions of lower roles. A `module_leader` can perform any action a `moderator`, `marker`, or `student` can. The `role_hierarchy` relation is reflexive and transitive.

---

## 3. Context C1 — Gamification Constants

```event-b
CONTEXT C1_Gamification
EXTENDS C0_Types

SETS
    STUDENT_BADGE = {
        first_submission, bug_squasher, quick_learner, perfectionist,
        consistent, improver, streak_warrior, early_bird,
        feedback_engaged, zero_to_hero, five_star, multi_module,
        tenacious, centurion
    }

    MARKER_BADGE = {
        first_review, speed_reviewer, thorough_reviewer, mentor,
        consistent_marker, on_time_champion, feedback_master,
        detail_oriented, turnaround_king, multi_course,
        quality_guardian, century_reviewer, template_architect
    }

CONSTANTS
    LEVEL_COUNT         /* Total number of levels: 10 */
    level_threshold     /* Level → minimum XP required */
    level_name          /* Level → display name */
    badge_xp_student    /* Student badge → XP reward */
    badge_xp_marker     /* Marker badge → XP reward */
    MAX_LEVEL           /* Maximum achievable level */

AXIOMS
    @axm1  LEVEL_COUNT = 10
    @axm2  MAX_LEVEL = 10
    @axm3  level_threshold ∈ 1‥LEVEL_COUNT → ℕ
    @axm4  level_threshold = {
               1↦0, 2↦100, 3↦300, 4↦600, 5↦1000,
               6↦1500, 7↦2200, 8↦3000, 9↦4000, 10↦5200
           }
    @axm5  level_name ∈ 1‥LEVEL_COUNT → STRING
    @axm6  level_name = {
               1↦"Novice", 2↦"Beginner", 3↦"Learner",
               4↦"Practitioner", 5↦"Competent", 6↦"Proficient",
               7↦"Advanced", 8↦"Expert", 9↦"Master", 10↦"Grandmaster"
           }
    @axm7  ∀i · i ∈ 1‥(LEVEL_COUNT−1) ⇒ level_threshold(i) < level_threshold(i+1)
           /* Thresholds are strictly increasing */

    @axm8  badge_xp_student ∈ STUDENT_BADGE → ℕ
    @axm9  badge_xp_student = {
               first_submission↦50, bug_squasher↦100, quick_learner↦75,
               perfectionist↦150, consistent↦100, improver↦125,
               streak_warrior↦80, early_bird↦60, feedback_engaged↦120,
               zero_to_hero↦100, five_star↦200, multi_module↦90,
               tenacious↦110, centurion↦75
           }

    @axm10 badge_xp_marker ∈ MARKER_BADGE → ℕ
    @axm11 badge_xp_marker = {
               first_review↦50, speed_reviewer↦100, thorough_reviewer↦150,
               mentor↦200, consistent_marker↦175, on_time_champion↦150,
               feedback_master↦100, detail_oriented↦125, turnaround_king↦110,
               multi_course↦90, quality_guardian↦200, century_reviewer↦250,
               template_architect↦150
           }

END
```

---

## 4. Machine M0 — Access Control

Models user registration, authentication, and role-based access control.

```event-b
MACHINE M0_AccessControl
SEES C0_Types

VARIABLES
    users           /* Set of registered users */
    user_role       /* Mapping: user → role */
    user_email      /* Mapping: user → email string (unique) */
    user_password   /* Mapping: user → hashed password */
    active_tokens   /* Set of currently valid authentication tokens */
    token_user      /* Mapping: token → user */

INVARIANTS
    @inv1  users ⊆ USER
    @inv2  user_role ∈ users → ROLE
    @inv3  user_email ∈ users → STRING
    @inv4  user_password ∈ users → STRING
    @inv5  ∀u1,u2 · u1 ∈ users ∧ u2 ∈ users ∧ u1 ≠ u2
                   ⇒ user_email(u1) ≠ user_email(u2)
           /* Email uniqueness constraint */
    @inv6  active_tokens ⊆ TOKEN
    @inv7  token_user ∈ active_tokens → users
    /* Every active token maps to a registered user */

EVENTS

  INITIALISATION
    BEGIN
      @act1  users ≔ ∅
      @act2  user_role ≔ ∅
      @act3  user_email ≔ ∅
      @act4  user_password ≔ ∅
      @act5  active_tokens ≔ ∅
      @act6  token_user ≔ ∅
    END

  /* ─── Register a new user ─── */
  EVENT RegisterUser
    ANY u, email, pwd_hash, role
    WHERE
      @grd1  u ∈ USER ∧ u ∉ users
      @grd2  email ∈ STRING
      @grd3  pwd_hash ∈ STRING
      @grd4  role ∈ ROLE
      @grd5  ∀v · v ∈ users ⇒ user_email(v) ≠ email
             /* No duplicate email */
    THEN
      @act1  users ≔ users ∪ {u}
      @act2  user_role ≔ user_role ∪ {u ↦ role}
      @act3  user_email ≔ user_email ∪ {u ↦ email}
      @act4  user_password ≔ user_password ∪ {u ↦ pwd_hash}
    END

  /* ─── Login (password verified externally; event models token issuance) ─── */
  EVENT Login
    ANY u, t
    WHERE
      @grd1  u ∈ users
      @grd2  t ∈ TOKEN ∧ t ∉ active_tokens
      /* Password verification is an external oracle — abstracted here */
    THEN
      @act1  active_tokens ≔ active_tokens ∪ {t}
      @act2  token_user ≔ token_user ∪ {t ↦ u}
    END

  /* ─── Logout ─── */
  EVENT Logout
    ANY t
    WHERE
      @grd1  t ∈ active_tokens
    THEN
      @act1  active_tokens ≔ active_tokens ∖ {t}
      @act2  token_user ≔ {t} ⩤ token_user
    END

  /* ─── Token Expiration ─── */
  EVENT TokenExpired
    ANY t
    WHERE
      @grd1  t ∈ active_tokens
      /* Expiry condition checked by external clock oracle */
    THEN
      @act1  active_tokens ≔ active_tokens ∖ {t}
      @act2  token_user ≔ {t} ⩤ token_user
    END

  /* ─── Access Check (guard predicate used by other machines) ─── */
  /* This is modeled as a theorem, not an event:
     has_access(token, required_role) ≡
       token ∈ active_tokens ∧
       token_user(token) ↦ required_role ∈ role_hierarchy
  */

END
```

### Key Invariants Proven

- **INV5** (email uniqueness): Preserved by `RegisterUser` guard `@grd5`.
- **INV7** (token→user mapping): `Login` adds to both sets atomically; `Logout` and `TokenExpired` remove from both.

---

## 5. Machine M1 — Course and Assignment Management

```event-b
MACHINE M1_CourseAssignment
SEES C0_Types
REFINES M0_AccessControl

VARIABLES
    /* Inherited: users, user_role, ... */
    courses             /* Set of course identifiers */
    course_leader       /* course → leader (user with module_leader role) */
    course_collaborators /* course → set of marker users */
    course_moderators   /* course → set of moderator users */
    course_students     /* course → set of enrolled students */

    assignments         /* Set of assignment identifiers */
    assign_course       /* assignment → course */
    assign_title        /* assignment → title string */
    assign_deadline     /* assignment → optional deadline timestamp */
    assign_released     /* assignment → boolean (is visible to students) */
    assign_results_pub  /* assignment → boolean (are results published) */

INVARIANTS
    @inv1  courses ⊆ COURSE
    @inv2  course_leader ∈ courses → users
    @inv3  ∀c · c ∈ courses ⇒ user_role(course_leader(c)) ↦ module_leader ∈ role_hierarchy
           /* Leader must have module_leader-level access */
    @inv4  course_collaborators ∈ courses → ℙ(users)
    @inv5  course_moderators ∈ courses → ℙ(users)
    @inv6  course_students ∈ courses → ℙ(users)
    @inv7  ∀c · c ∈ courses ⇒ course_students(c) ∩ course_collaborators(c) = ∅
           /* A user cannot be both a student and a collaborator in the same course */

    @inv8  assignments ⊆ ASSIGNMENT
    @inv9  assign_course ∈ assignments → courses
    @inv10 assign_released ∈ assignments → BOOL
    @inv11 assign_results_pub ∈ assignments → BOOL

    @inv12 ∀a · a ∈ assignments ∧ assign_results_pub(a) = TRUE
                ⇒ assign_released(a) = TRUE
           /* Results can only be published for released assignments */

EVENTS

  EVENT CreateCourse
    ANY c, leader
    WHERE
      @grd1  c ∈ COURSE ∧ c ∉ courses
      @grd2  leader ∈ users
      @grd3  user_role(leader) = module_leader ∨ user_role(leader) = marker
             /* Markers become module_leader of courses they create */
    THEN
      @act1  courses ≔ courses ∪ {c}
      @act2  course_leader ≔ course_leader ∪ {c ↦ leader}
      @act3  course_collaborators ≔ course_collaborators ∪ {c ↦ ∅}
      @act4  course_moderators ≔ course_moderators ∪ {c ↦ ∅}
      @act5  course_students ≔ course_students ∪ {c ↦ ∅}
      @act6  user_role(leader) ≔ module_leader
             /* Role promotion: creator becomes module_leader */
    END

  EVENT EnrollStudent
    ANY c, s
    WHERE
      @grd1  c ∈ courses
      @grd2  s ∈ users ∧ user_role(s) = student
      @grd3  s ∉ course_students(c)
    THEN
      @act1  course_students(c) ≔ course_students(c) ∪ {s}
    END

  EVENT UnenrollStudent
    ANY c, s
    WHERE
      @grd1  c ∈ courses
      @grd2  s ∈ course_students(c)
    THEN
      @act1  course_students(c) ≔ course_students(c) ∖ {s}
    END

  EVENT CreateAssignment
    ANY a, c, creator
    WHERE
      @grd1  a ∈ ASSIGNMENT ∧ a ∉ assignments
      @grd2  c ∈ courses
      @grd3  creator ∈ users
      @grd4  user_role(creator) ↦ marker ∈ role_hierarchy
             /* Must have at least marker access */
      @grd5  creator = course_leader(c) ∨ creator ∈ course_collaborators(c)
    THEN
      @act1  assignments ≔ assignments ∪ {a}
      @act2  assign_course ≔ assign_course ∪ {a ↦ c}
      @act3  assign_released ≔ assign_released ∪ {a ↦ FALSE}
      @act4  assign_results_pub ≔ assign_results_pub ∪ {a ↦ FALSE}
    END

  EVENT ReleaseAssignment
    ANY a
    WHERE
      @grd1  a ∈ assignments
      @grd2  assign_released(a) = FALSE
    THEN
      @act1  assign_released(a) ≔ TRUE
    END

  EVENT PublishResults
    ANY a
    WHERE
      @grd1  a ∈ assignments
      @grd2  assign_released(a) = TRUE
      @grd3  assign_results_pub(a) = FALSE
    THEN
      @act1  assign_results_pub(a) ≔ TRUE
    END

  EVENT DeleteAssignment
    ANY a, requester
    WHERE
      @grd1  a ∈ assignments
      @grd2  requester ∈ users
      @grd3  requester = course_leader(assign_course(a))
             /* Only the course leader can delete */
    THEN
      @act1  assignments ≔ assignments ∖ {a}
      @act2  assign_course ≔ {a} ⩤ assign_course
      @act3  assign_released ≔ {a} ⩤ assign_released
      @act4  assign_results_pub ≔ {a} ⩤ assign_results_pub
      /* Cascading deletion of submissions, issues, etc. abstracted */
    END

END
```

---

## 6. Machine M2 — Submission Lifecycle

The core state machine for submission progression.

```event-b
MACHINE M2_SubmissionLifecycle
SEES C0_Types
REFINES M1_CourseAssignment

VARIABLES
    /* Inherited */
    submissions         /* Set of submission identifiers */
    sub_student         /* submission → student (owner) */
    sub_assignment      /* submission → assignment */
    sub_status          /* submission → SUBMISSION_STATUS */
    sub_mod_status      /* submission → MODERATION_STATUS */
    sub_marks           /* submission → ℕ (optional, 0 if ungraded) */
    sub_attempt         /* submission → ℕ (attempt number) */
    sub_files           /* submission → set of files */
    sub_reviewer        /* submission ⇸ user (the marker who reviewed) */

INVARIANTS
    @inv1  submissions ⊆ SUBMISSION
    @inv2  sub_student ∈ submissions → users
    @inv3  ∀s · s ∈ submissions ⇒ user_role(sub_student(s)) = student
           /* Only students own submissions */
    @inv4  sub_assignment ∈ submissions → assignments
    @inv5  sub_status ∈ submissions → SUBMISSION_STATUS
    @inv6  sub_mod_status ∈ submissions → MODERATION_STATUS
    @inv7  sub_marks ∈ submissions ⇸ ℕ
    @inv8  sub_attempt ∈ submissions → ℕ1
    @inv9  sub_files ∈ submissions → ℙ(FILE)
    @inv10 sub_reviewer ∈ submissions ⇸ users

    /* ── Status consistency invariants ── */

    @inv11 ∀s · s ∈ submissions ∧ sub_status(s) = pending
                ⇒ s ∉ dom(sub_reviewer)
           /* Pending submissions have no reviewer */

    @inv12 ∀s · s ∈ submissions ∧ sub_status(s) = feedback_released
                ⇒ s ∈ dom(sub_reviewer)
           /* Released submissions must have a reviewer */

    @inv13 ∀s · s ∈ submissions ∧ sub_status(s) = no_issues
                ⇒ s ∈ dom(sub_marks) ∧ sub_marks(s) = assign_total_marks(sub_assignment(s))
           /* No-issue submissions receive full marks */

    @inv14 ∀s · s ∈ submissions ∧ sub_status(s) ∈ {feedback_released, no_issues}
                ⇒ sub_mod_status(s) ∈ {mod_pending, mod_approved, mod_flagged, mod_flagged_approved}
           /* Reviewed submissions enter the moderation pipeline */

    @inv15 ∀s · s ∈ submissions ∧ sub_status(s) = pending
                ⇒ sub_mod_status(s) = mod_none

    /* ── Attempt ordering ── */
    @inv16 ∀s1,s2 · s1 ∈ submissions ∧ s2 ∈ submissions
                   ∧ sub_student(s1) = sub_student(s2)
                   ∧ sub_assignment(s1) = sub_assignment(s2)
                   ∧ s1 ≠ s2
                   ⇒ sub_attempt(s1) ≠ sub_attempt(s2)
           /* Unique attempt numbers per student per assignment */

EVENTS

  EVENT SubmitWork
    ANY s, student, a, files, attempt_num
    WHERE
      @grd1  s ∈ SUBMISSION ∧ s ∉ submissions
      @grd2  student ∈ users ∧ user_role(student) = student
      @grd3  a ∈ assignments ∧ assign_released(a) = TRUE
      @grd4  student ∈ course_students(assign_course(a))
             /* Student must be enrolled in the course */
      @grd5  files ⊆ FILE ∧ files ≠ ∅
      @grd6  attempt_num ∈ ℕ1
    THEN
      @act1  submissions ≔ submissions ∪ {s}
      @act2  sub_student ≔ sub_student ∪ {s ↦ student}
      @act3  sub_assignment ≔ sub_assignment ∪ {s ↦ a}
      @act4  sub_status ≔ sub_status ∪ {s ↦ pending}
      @act5  sub_mod_status ≔ sub_mod_status ∪ {s ↦ mod_none}
      @act6  sub_attempt ≔ sub_attempt ∪ {s ↦ attempt_num}
      @act7  sub_files ≔ sub_files ∪ {s ↦ files}
    END

  EVENT BeginReview
    /* First issue added transitions submission from pending to in_review */
    ANY s, reviewer
    WHERE
      @grd1  s ∈ submissions
      @grd2  sub_status(s) = pending
      @grd3  reviewer ∈ users
      @grd4  user_role(reviewer) ↦ marker ∈ role_hierarchy
    THEN
      @act1  sub_status(s) ≔ in_review
      @act2  sub_reviewer ≔ sub_reviewer ∪ {s ↦ reviewer}
    END

  EVENT PublishFeedback
    /* Marker publishes their feedback — submission moves to feedback_released */
    ANY s
    WHERE
      @grd1  s ∈ submissions
      @grd2  sub_status(s) = in_review
      @grd3  s ∈ dom(sub_reviewer)
    THEN
      @act1  sub_status(s) ≔ feedback_released
      @act2  sub_mod_status(s) ≔ mod_pending
    END

  EVENT MarkNoIssues
    /* Marker declares no issues — submission gets full marks */
    ANY s, reviewer, full_marks
    WHERE
      @grd1  s ∈ submissions
      @grd2  sub_status(s) = pending ∨ sub_status(s) = in_review
      @grd3  reviewer ∈ users
      @grd4  user_role(reviewer) ↦ marker ∈ role_hierarchy
      @grd5  full_marks ∈ ℕ
    THEN
      @act1  sub_status(s) ≔ no_issues
      @act2  sub_marks ≔ sub_marks ∪ {s ↦ full_marks}
      @act3  sub_mod_status(s) ≔ mod_pending
      @act4  sub_reviewer ≔ sub_reviewer ◁ {s ↦ reviewer}
    END

  EVENT GradeSubmission
    /* Marker assigns marks after issues have been added */
    ANY s, marks
    WHERE
      @grd1  s ∈ submissions
      @grd2  sub_status(s) = in_review ∨ sub_status(s) = feedback_released
      @grd3  marks ∈ ℕ
    THEN
      @act1  sub_marks ≔ sub_marks ◁ {s ↦ marks}
    END

END
```

### Submission State Transition Diagram

```
                  SubmitWork
                     │
                     ▼
               ┌──────────┐
               │  PENDING  │
               └────┬──┬───┘
                    │  │
       BeginReview  │  │  MarkNoIssues
                    │  │
                    ▼  └──────────────┐
            ┌────────────┐            │
            │  IN_REVIEW  │            ▼
            └──────┬─────┘      ┌───────────┐
                   │            │ NO_ISSUES  │
       PublishFeedback          │ (full marks)│
                   │            └─────┬──────┘
                   ▼                  │
         ┌──────────────────┐         │
         │ FEEDBACK_RELEASED │         │
         └────────┬─────────┘         │
                  │                   │
                  └──────┬────────────┘
                         │
                         ▼
                  [Moderation Pipeline]
                  mod_pending → mod_approved
                             → mod_flagged → mod_flagged_approved
```

---

## 7. Machine M3 — Feedback and Review

```event-b
MACHINE M3_Feedback
SEES C0_Types
REFINES M2_SubmissionLifecycle

VARIABLES
    /* Inherited */
    issues              /* Set of feedback issue identifiers */
    issue_submission    /* issue → submission */
    issue_file          /* issue → file */
    issue_severity      /* issue → SEVERITY */
    issue_line_start    /* issue → ℕ */
    issue_line_end      /* issue → ℕ */
    issue_student_status /* issue → STUDENT_ISSUE_STATUS */
    issue_marks_ded     /* issue → ℕ (marks deduction) */

    templates           /* Set of feedback templates */
    tmpl_course         /* template ⇸ course (NULL = global) */
    tmpl_creator        /* template → user */
    tmpl_usage_count    /* template → ℕ */

INVARIANTS
    @inv1  issues ⊆ ISSUE
    @inv2  issue_submission ∈ issues → submissions
    @inv3  issue_file ∈ issues → FILE
    @inv4  ∀i · i ∈ issues ⇒ issue_file(i) ∈ sub_files(issue_submission(i))
           /* Issue's file must belong to the submission */
    @inv5  issue_severity ∈ issues → SEVERITY
    @inv6  issue_line_start ∈ issues → ℕ1
    @inv7  issue_line_end ∈ issues → ℕ1
    @inv8  ∀i · i ∈ issues ⇒ issue_line_start(i) ≤ issue_line_end(i)
           /* Line range is well-formed */
    @inv9  issue_student_status ∈ issues → STUDENT_ISSUE_STATUS
    @inv10 issue_marks_ded ∈ issues → ℕ

    @inv11 templates ⊆ TEMPLATE
    @inv12 tmpl_course ∈ templates ⇸ courses
    @inv13 tmpl_creator ∈ templates → users
    @inv14 tmpl_usage_count ∈ templates → ℕ

    /* ── Consistency: issues only on pending/in_review submissions ── */
    @inv15 ∀i · i ∈ issues
                ⇒ sub_status(issue_submission(i)) ∈ {in_review, feedback_released, no_issues}
           /* Issues exist only on reviewed submissions */

EVENTS

  EVENT AddIssue
    ANY i, s, f, sev, ls, le, ded, reviewer
    WHERE
      @grd1  i ∈ ISSUE ∧ i ∉ issues
      @grd2  s ∈ submissions
      @grd3  sub_status(s) ∈ {pending, in_review}
      @grd4  f ∈ sub_files(s)
      @grd5  sev ∈ SEVERITY
      @grd6  ls ∈ ℕ1 ∧ le ∈ ℕ1 ∧ ls ≤ le
      @grd7  ded ∈ ℕ
      @grd8  reviewer ∈ users
      @grd9  user_role(reviewer) ↦ marker ∈ role_hierarchy
    THEN
      @act1  issues ≔ issues ∪ {i}
      @act2  issue_submission ≔ issue_submission ∪ {i ↦ s}
      @act3  issue_file ≔ issue_file ∪ {i ↦ f}
      @act4  issue_severity ≔ issue_severity ∪ {i ↦ sev}
      @act5  issue_line_start ≔ issue_line_start ∪ {i ↦ ls}
      @act6  issue_line_end ≔ issue_line_end ∪ {i ↦ le}
      @act7  issue_student_status ≔ issue_student_status ∪ {i ↦ issue_open}
      @act8  issue_marks_ded ≔ issue_marks_ded ∪ {i ↦ ded}
      /* Side-effect: if submission was pending, move to in_review */
    END

  EVENT DeleteIssue
    ANY i, requester
    WHERE
      @grd1  i ∈ issues
      @grd2  requester ∈ users
      @grd3  user_role(requester) ↦ marker ∈ role_hierarchy
      @grd4  sub_status(issue_submission(i)) = in_review
             /* Can only delete issues before publishing */
    THEN
      @act1  issues ≔ issues ∖ {i}
      @act2  issue_submission ≔ {i} ⩤ issue_submission
      @act3  issue_file ≔ {i} ⩤ issue_file
      @act4  issue_severity ≔ {i} ⩤ issue_severity
      @act5  issue_line_start ≔ {i} ⩤ issue_line_start
      @act6  issue_line_end ≔ {i} ⩤ issue_line_end
      @act7  issue_student_status ≔ {i} ⩤ issue_student_status
      @act8  issue_marks_ded ≔ {i} ⩤ issue_marks_ded
    END

  EVENT StudentMarkFixed
    ANY i, student
    WHERE
      @grd1  i ∈ issues
      @grd2  issue_student_status(i) = issue_open
      @grd3  student ∈ users ∧ user_role(student) = student
      @grd4  sub_student(issue_submission(i)) = student
             /* Only the submission owner can mark their issues */
      @grd5  sub_status(issue_submission(i)) ∈ {feedback_released, no_issues}
             /* Feedback must be released before student can interact */
    THEN
      @act1  issue_student_status(i) ≔ issue_fixed
    END

  EVENT ApplyTemplate
    ANY t
    WHERE
      @grd1  t ∈ templates
    THEN
      @act1  tmpl_usage_count(t) ≔ tmpl_usage_count(t) + 1
    END

  EVENT SaveTemplate
    ANY t, creator, c_opt
    WHERE
      @grd1  t ∈ TEMPLATE ∧ t ∉ templates
      @grd2  creator ∈ users
      @grd3  user_role(creator) ↦ marker ∈ role_hierarchy
      @grd4  c_opt ∈ courses ∪ {∅}
             /* Module-scoped or global */
    THEN
      @act1  templates ≔ templates ∪ {t}
      @act2  tmpl_creator ≔ tmpl_creator ∪ {t ↦ creator}
      @act3  tmpl_usage_count ≔ tmpl_usage_count ∪ {t ↦ 0}
      @act4  IF c_opt ∈ courses THEN tmpl_course ≔ tmpl_course ∪ {t ↦ c_opt} END
    END

  EVENT DeleteTemplate
    ANY t, requester
    WHERE
      @grd1  t ∈ templates
      @grd2  requester ∈ users
      @grd3  tmpl_creator(t) = requester
             /* Only the creator can delete their template */
    THEN
      @act1  templates ≔ templates ∖ {t}
      @act2  tmpl_creator ≔ {t} ⩤ tmpl_creator
      @act3  tmpl_usage_count ≔ {t} ⩤ tmpl_usage_count
      @act4  tmpl_course ≔ {t} ⩤ tmpl_course
    END

END
```

---

## 8. Machine M4 — Moderation Workflow

```event-b
MACHINE M4_Moderation
SEES C0_Types
REFINES M3_Feedback

VARIABLES
    /* Inherited */
    mod_issues          /* Set of moderation issue identifiers */
    mod_submission      /* mod_issue → submission */
    mod_raised_by       /* mod_issue → user (moderator) */
    mod_status          /* mod_issue → MOD_ISSUE_STATUS */
    mod_leader_resp     /* mod_issue → LEADER_RESPONSE */
    mod_severity        /* mod_issue → SEVERITY */

INVARIANTS
    @inv1  mod_issues ⊆ MOD_ISSUE
    @inv2  mod_submission ∈ mod_issues → submissions
    @inv3  ∀m · m ∈ mod_issues
                ⇒ sub_status(mod_submission(m)) ∈ {feedback_released, no_issues}
           /* Moderation only applies to reviewed submissions */
    @inv4  mod_raised_by ∈ mod_issues → users
    @inv5  ∀m · m ∈ mod_issues
                ⇒ user_role(mod_raised_by(m)) ↦ moderator ∈ role_hierarchy
           /* Only moderators (or above) can raise moderation issues */
    @inv6  mod_status ∈ mod_issues → MOD_ISSUE_STATUS
    @inv7  mod_leader_resp ∈ mod_issues → LEADER_RESPONSE
    @inv8  mod_severity ∈ mod_issues → SEVERITY

    /* ── Response consistency ── */
    @inv9  ∀m · m ∈ mod_issues ∧ mod_status(m) = mod_open
                ⇒ mod_leader_resp(m) = lr_none
    @inv10 ∀m · m ∈ mod_issues ∧ mod_status(m) = mod_resolved
                ⇒ mod_leader_resp(m) = lr_approved
    @inv11 ∀m · m ∈ mod_issues ∧ mod_status(m) = mod_discarded
                ⇒ mod_leader_resp(m) = lr_rejected

EVENTS

  EVENT RaiseModerationIssue
    ANY mi, s, moderator, sev
    WHERE
      @grd1  mi ∈ MOD_ISSUE ∧ mi ∉ mod_issues
      @grd2  s ∈ submissions
      @grd3  sub_status(s) ∈ {feedback_released, no_issues}
      @grd4  moderator ∈ users
      @grd5  user_role(moderator) ↦ moderator ∈ role_hierarchy
      @grd6  sev ∈ SEVERITY
    THEN
      @act1  mod_issues ≔ mod_issues ∪ {mi}
      @act2  mod_submission ≔ mod_submission ∪ {mi ↦ s}
      @act3  mod_raised_by ≔ mod_raised_by ∪ {mi ↦ moderator}
      @act4  mod_status ≔ mod_status ∪ {mi ↦ mod_open}
      @act5  mod_leader_resp ≔ mod_leader_resp ∪ {mi ↦ lr_none}
      @act6  mod_severity ≔ mod_severity ∪ {mi ↦ sev}
      @act7  sub_mod_status(s) ≔ mod_flagged
    END

  EVENT ApproveModerationIssue
    /* Module leader approves the moderator's concern */
    ANY mi, leader
    WHERE
      @grd1  mi ∈ mod_issues
      @grd2  mod_status(mi) = mod_open
      @grd3  leader ∈ users
      @grd4  user_role(leader) = module_leader
    THEN
      @act1  mod_status(mi) ≔ mod_resolved
      @act2  mod_leader_resp(mi) ≔ lr_approved
      @act3  sub_mod_status(mod_submission(mi)) ≔ mod_flagged_approved
    END

  EVENT RejectModerationIssue
    /* Module leader rejects/discards the moderator's concern */
    ANY mi, leader
    WHERE
      @grd1  mi ∈ mod_issues
      @grd2  mod_status(mi) = mod_open
      @grd3  leader ∈ users
      @grd4  user_role(leader) = module_leader
    THEN
      @act1  mod_status(mi) ≔ mod_discarded
      @act2  mod_leader_resp(mi) ≔ lr_rejected
    END

  EVENT ConfirmNoModerationIssue
    /* Moderator confirms a submission has no moderation concerns */
    ANY s, moderator
    WHERE
      @grd1  s ∈ submissions
      @grd2  sub_mod_status(s) = mod_pending
      @grd3  moderator ∈ users
      @grd4  user_role(moderator) ↦ moderator ∈ role_hierarchy
    THEN
      @act1  sub_mod_status(s) ≔ mod_approved
    END

END
```

### Moderation State Diagram

```
Submission Reviewed
        │
        ▼
  ┌─────────────┐
  │ mod_pending  │
  └──────┬──┬───┘
         │  │
  Confirm│  │ RaiseModerationIssue
         │  │
         ▼  ▼
  ┌────────┐  ┌─────────────┐
  │approved│  │  mod_flagged │
  └────────┘  └──────┬──┬───┘
                     │  │
          Approve    │  │  Reject
          (Leader)   │  │  (Leader)
                     ▼  ▼
          ┌──────────────────┐   ┌──────────────┐
          │flagged_approved  │   │  (discarded)  │
          └──────────────────┘   └──────────────┘
```

---

## 9. Machine M5 — Gamification Engine

```event-b
MACHINE M5_Gamification
SEES C0_Types, C1_Gamification

VARIABLES
    user_xp             /* user → total XP */
    user_level          /* user → current level (1..10) */
    user_badges_student /* user → set of earned student badges */
    user_badges_marker  /* user → set of earned marker badges */

    /* Leaderboard opt-in */
    leaderboard_members /* course → set of opted-in users */
    leaderboard_nick    /* (user, course) → nickname string */

INVARIANTS
    @inv1  user_xp ∈ users → ℕ
    @inv2  user_level ∈ users → 1‥LEVEL_COUNT
    @inv3  ∀u · u ∈ users ⇒ user_xp(u) ≥ level_threshold(user_level(u))
           /* XP is at least the threshold for the current level */
    @inv4  ∀u · u ∈ users ∧ user_level(u) < MAX_LEVEL
                ⇒ user_xp(u) < level_threshold(user_level(u) + 1)
           /* XP is below the next level's threshold (unless max level) */

    @inv5  user_badges_student ∈ users → ℙ(STUDENT_BADGE)
    @inv6  user_badges_marker ∈ users → ℙ(MARKER_BADGE)

    @inv7  ∀u · u ∈ users ∧ user_role(u) = student
                ⇒ user_badges_marker(u) = ∅
           /* Students cannot hold marker badges */
    @inv8  ∀u · u ∈ users ∧ user_role(u) = marker
                ⇒ user_badges_student(u) = ∅
           /* Markers cannot hold student badges (in their capacity as marker) */

    @inv9  leaderboard_members ∈ courses → ℙ(users)
    @inv10 leaderboard_nick ∈ (users × courses) ⇸ STRING

    @inv11 ∀u,c · u ∈ leaderboard_members(c)
                 ⇒ (u ↦ c) ∈ dom(leaderboard_nick)
           /* Opted-in members must have a nickname */

EVENTS

  EVENT AwardXP
    ANY u, amount
    WHERE
      @grd1  u ∈ users
      @grd2  amount ∈ ℕ1
    THEN
      @act1  user_xp(u) ≔ user_xp(u) + amount
      @act2  /* Recalculate level — abstracted as: */
             user_level(u) ≔ max({l | l ∈ 1‥LEVEL_COUNT ∧ level_threshold(l) ≤ user_xp(u) + amount})
    END

  EVENT AwardStudentBadge
    ANY u, b
    WHERE
      @grd1  u ∈ users ∧ user_role(u) = student
      @grd2  b ∈ STUDENT_BADGE
      @grd3  b ∉ user_badges_student(u)
             /* Badge not already earned (idempotent) */
    THEN
      @act1  user_badges_student(u) ≔ user_badges_student(u) ∪ {b}
      @act2  user_xp(u) ≔ user_xp(u) + badge_xp_student(b)
      @act3  /* Recalculate level */
    END

  EVENT AwardMarkerBadge
    ANY u, b
    WHERE
      @grd1  u ∈ users
      @grd2  user_role(u) ↦ marker ∈ role_hierarchy
      @grd3  b ∈ MARKER_BADGE
      @grd4  b ∉ user_badges_marker(u)
    THEN
      @act1  user_badges_marker(u) ≔ user_badges_marker(u) ∪ {b}
      @act2  user_xp(u) ≔ user_xp(u) + badge_xp_marker(b)
    END

  EVENT JoinLeaderboard
    ANY u, c, nick
    WHERE
      @grd1  u ∈ users
      @grd2  c ∈ courses
      @grd3  u ∉ leaderboard_members(c)
      @grd4  nick ∈ STRING ∧ nick ≠ ""
      /* Nickname uniqueness within module */
      @grd5  ∀v · v ∈ leaderboard_members(c) ⇒ leaderboard_nick(v ↦ c) ≠ nick
    THEN
      @act1  leaderboard_members(c) ≔ leaderboard_members(c) ∪ {u}
      @act2  leaderboard_nick ≔ leaderboard_nick ∪ {(u ↦ c) ↦ nick}
    END

  EVENT LeaveLeaderboard
    ANY u, c
    WHERE
      @grd1  u ∈ users
      @grd2  c ∈ courses
      @grd3  u ∈ leaderboard_members(c)
    THEN
      @act1  leaderboard_members(c) ≔ leaderboard_members(c) ∖ {u}
      @act2  leaderboard_nick ≔ {(u ↦ c)} ⩤ leaderboard_nick
    END

END
```

---

## 10. Machine M6 — Student Reflections

```event-b
MACHINE M6_Reflections
SEES C0_Types
REFINES M2_SubmissionLifecycle

VARIABLES
    /* Inherited */
    reflections         /* Set of reflection identifiers */
    ref_submission      /* reflection → submission */
    ref_student         /* reflection → student (author) */
    ref_type            /* reflection → REFLECTION_TYPE */
    ref_content         /* reflection → free-form text */
    ref_prompted        /* reflection → prompted response map */

    ref_drafts          /* (submission, reflection_type) ⇸ draft content */

INVARIANTS
    @inv1  reflections ⊆ REFLECTION
    @inv2  ref_submission ∈ reflections → submissions
    @inv3  ref_student ∈ reflections → users
    @inv4  ∀r · r ∈ reflections ⇒ user_role(ref_student(r)) = student
           /* Only students write reflections */
    @inv5  ∀r · r ∈ reflections ⇒ ref_student(r) = sub_student(ref_submission(r))
           /* Students can only reflect on their own submissions */
    @inv6  ref_type ∈ reflections → REFLECTION_TYPE
    @inv7  ref_content ∈ reflections → STRING

    /* ── Type constraints ── */
    @inv8  ∀r · r ∈ reflections ∧ ref_type(r) = post_feedback
                ⇒ sub_status(ref_submission(r)) ∈ {feedback_released, no_issues}
           /* Post-feedback reflections require feedback to exist */

    /* ── Uniqueness: at most one reflection per (submission, type) per student ── */
    @inv9  ∀r1,r2 · r1 ∈ reflections ∧ r2 ∈ reflections ∧ r1 ≠ r2
                   ⇒ ¬(ref_submission(r1) = ref_submission(r2) ∧ ref_type(r1) = ref_type(r2) ∧ ref_student(r1) = ref_student(r2))

EVENTS

  EVENT SaveReflection
    /* Create or update a reflection */
    ANY r, s, student, rtype, content, prompted
    WHERE
      @grd1  s ∈ submissions
      @grd2  student ∈ users ∧ user_role(student) = student
      @grd3  sub_student(s) = student
      @grd4  rtype ∈ REFLECTION_TYPE
      @grd5  rtype = post_feedback
             ⇒ sub_status(s) ∈ {feedback_released, no_issues}
      @grd6  content ∈ STRING
    THEN
      /* Upsert semantics: if reflection exists for (s, student, rtype), update; else create */
      @act1  IF ∃r0 · r0 ∈ reflections ∧ ref_submission(r0) = s ∧ ref_type(r0) = rtype ∧ ref_student(r0) = student
             THEN ref_content(r0) ≔ content
             ELSE
               reflections ≔ reflections ∪ {r}
               ref_submission ≔ ref_submission ∪ {r ↦ s}
               ref_student ≔ ref_student ∪ {r ↦ student}
               ref_type ≔ ref_type ∪ {r ↦ rtype}
               ref_content ≔ ref_content ∪ {r ↦ content}
             END
    END

  EVENT AutoSaveDraft
    /* Save an in-progress draft (does NOT create a formal reflection) */
    ANY s, student, rtype, content
    WHERE
      @grd1  s ∈ submissions
      @grd2  student ∈ users ∧ user_role(student) = student
      @grd3  sub_student(s) = student
      @grd4  rtype ∈ REFLECTION_TYPE
    THEN
      @act1  ref_drafts ≔ ref_drafts ◁ {(s ↦ rtype) ↦ content}
    END

  EVENT GetReflectionDraft
    /* Read-only observation — modeled for completeness */
    ANY s, rtype
    WHERE
      @grd1  s ∈ submissions
      @grd2  rtype ∈ REFLECTION_TYPE
      @grd3  (s ↦ rtype) ∈ dom(ref_drafts)
    THEN
      skip /* Read-only: returns ref_drafts(s ↦ rtype) */
    END

END
```

---

## 11. Requirements Traceability Matrix

| Req ID | Requirement | Event-B Machine | Events | Invariants |
|--------|-------------|-----------------|--------|------------|
| R01 | Users register with unique emails | M0 | RegisterUser | inv5 (email uniqueness) |
| R02 | JWT-based authentication | M0 | Login, Logout, TokenExpired | inv7 (token→user mapping) |
| R03 | Role-based access control hierarchy | C0, M0 | All guarded events | axm2 (role_hierarchy), inv2 |
| R04 | Course creation with leader promotion | M1 | CreateCourse | inv3 (leader has correct role) |
| R05 | Student enrollment in courses | M1 | EnrollStudent, UnenrollStudent | inv6 (course_students), inv7 (no overlap) |
| R06 | Assignment lifecycle (create, release, publish) | M1 | CreateAssignment, ReleaseAssignment, PublishResults | inv12 (publish requires release) |
| R07 | Assignment deletion (leader only) | M1 | DeleteAssignment | grd3 (leader check) |
| R08 | Students submit code files | M2 | SubmitWork | inv3 (student-only), inv16 (unique attempts) |
| R09 | Submission status transitions | M2 | BeginReview, PublishFeedback, MarkNoIssues | inv11-inv15 (status consistency) |
| R10 | Markers add inline feedback issues | M3 | AddIssue | inv4 (file∈submission), inv8 (valid line range) |
| R11 | Students mark issues as fixed | M3 | StudentMarkFixed | grd4 (ownership), grd5 (feedback released) |
| R12 | Module-specific feedback templates | M3 | SaveTemplate, ApplyTemplate, DeleteTemplate | inv12-inv14 |
| R13 | Moderation: raise concerns | M4 | RaiseModerationIssue | inv3 (reviewed submissions only), inv5 (moderator access) |
| R14 | Moderation: leader approve/reject | M4 | ApproveModerationIssue, RejectModerationIssue | inv9-inv11 (response consistency) |
| R15 | Moderation: confirm no issues | M4 | ConfirmNoModerationIssue | — |
| R16 | XP system with 10 levels | M5 | AwardXP | inv3-inv4 (level-XP consistency) |
| R17 | 14 student + 13 marker badges | C1, M5 | AwardStudentBadge, AwardMarkerBadge | inv5-inv8 (role-badge alignment) |
| R18 | Module-specific opt-in leaderboards | M5 | JoinLeaderboard, LeaveLeaderboard | inv9-inv11 (nickname uniqueness) |
| R19 | Pre/post-submission reflections | M6 | SaveReflection | inv8 (post_feedback timing), inv9 (uniqueness) |
| R20 | Reflection auto-draft saving | M6 | AutoSaveDraft, GetReflectionDraft | — |
| R21 | Students can only reflect on own work | M6 | SaveReflection | inv5 (ownership) |
| R22 | Post-feedback requires released feedback | M6 | SaveReflection | grd5, inv8 |

---

## 12. State Diagrams

### 12.1 User Authentication States

```
                Register
   [∅] ──────────────────► [Registered]
                                │
                           Login│
                                ▼
                          [Authenticated]
                           │         │
                   Logout  │         │ TokenExpired
                           ▼         ▼
                      [Registered] ◄──┘
```

### 12.2 Submission Lifecycle (Complete)

```
        SubmitWork              BeginReview (1st issue added)
  [∅] ──────────► [PENDING] ────────────────────────► [IN_REVIEW]
                      │                                     │
                      │ MarkNoIssues                        │ PublishFeedback
                      │                                     │
                      ▼                                     ▼
                [NO_ISSUES]                        [FEEDBACK_RELEASED]
                      │                                     │
                      │ (auto)                              │ GradeSubmission
                      │                                     │
                      ▼                                     ▼
              [mod_pending] ◄───────────────────── [mod_pending]
                      │                                     │
           ┌──────────┼──────────┐           ┌──────────────┼──────────┐
           │          │          │           │              │          │
     Confirm   RaiseIssue       │     Confirm        RaiseIssue      │
           │          │         │           │              │          │
           ▼          ▼         │           ▼              ▼          │
    [mod_approved] [mod_flagged]│    [mod_approved]  [mod_flagged]   │
                      │         │                         │          │
              ┌───────┼─────┐   │                 ┌───────┼──────┐   │
              │       │     │   │                 │       │      │   │
          Approve  Reject   │   │             Approve  Reject    │   │
              │       │     │   │                 │       │      │   │
              ▼       ▼     │   │                 ▼       ▼      │   │
        [flagged_  [disc.]  │   │           [flagged_  [disc.]   │   │
         approved]          │   │            approved]           │   │
                            │   │                               │   │
                            └───┘                               └───┘
```

### 12.3 Moderation Issue Lifecycle

```
  RaiseModerationIssue
     [∅] ───────────► [OPEN]
                        │  │
            Approve     │  │  Reject
            (Leader)    │  │  (Leader)
                        ▼  ▼
               [RESOLVED]  [DISCARDED]
```

### 12.4 Feedback Issue Student Status

```
  AddIssue                    StudentMarkFixed
    [∅] ──────► [OPEN] ─────────────────────► [FIXED]
```

---

## 13. Proof Obligations Summary

Event-B generates proof obligations (POs) for each event to ensure invariant preservation. Below are the key POs for this specification:

### Machine M0 — Access Control

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M0/inv5/RegisterUser | INV | RegisterUser | Email uniqueness | Discharged by @grd5 |
| M0/inv7/Login | INV | Login | token→user totality | Discharged by @grd1, @act1-2 |
| M0/inv7/Logout | INV | Logout | token→user totality | Discharged by synchronized removal |

### Machine M2 — Submission Lifecycle

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M2/inv3/SubmitWork | INV | SubmitWork | Student-only ownership | Discharged by @grd2 |
| M2/inv11/BeginReview | INV | BeginReview | Pending ⇒ no reviewer | Discharged by status change to in_review |
| M2/inv12/PublishFeedback | INV | PublishFeedback | Released ⇒ has reviewer | Discharged by @grd3 |
| M2/inv15/SubmitWork | INV | SubmitWork | Pending ⇒ mod_none | Discharged by @act5 |

### Machine M3 — Feedback

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M3/inv4/AddIssue | INV | AddIssue | File ∈ submission's files | Discharged by @grd4 |
| M3/inv8/AddIssue | INV | AddIssue | Line range well-formed | Discharged by @grd6 |

### Machine M4 — Moderation

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M4/inv9/RaiseModIssue | INV | RaiseModerationIssue | Open ⇒ lr_none | Discharged by @act5 |
| M4/inv10/ApproveModIssue | INV | ApproveModerationIssue | Resolved ⇒ lr_approved | Discharged by @act1-2 |
| M4/inv11/RejectModIssue | INV | RejectModerationIssue | Discarded ⇒ lr_rejected | Discharged by @act1-2 |

### Machine M5 — Gamification

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M5/inv3/AwardXP | INV | AwardXP | XP ≥ level threshold | Discharged by level recalculation in @act2 |
| M5/inv7/AwardStudentBadge | INV | AwardStudentBadge | Student no marker badges | Discharged by @grd1 (role=student) |

### Machine M6 — Reflections

| PO | Type | Event | Invariant | Status |
|----|------|-------|-----------|--------|
| M6/inv5/SaveReflection | INV | SaveReflection | Owner-only | Discharged by @grd3 |
| M6/inv8/SaveReflection | INV | SaveReflection | Post-feedback timing | Discharged by @grd5 |
| M6/inv9/SaveReflection | INV | SaveReflection | Uniqueness | Discharged by upsert semantics in @act1 |

---

## Appendix A — Glossary

| Term | Definition |
|------|-----------|
| **Carrier Set** | An abstract type declared in a context (e.g., `USER`, `SUBMISSION`) |
| **Invariant** | A property that must hold in every reachable state of a machine |
| **Guard** | A predicate that must be true for an event to fire |
| **Action** | A state update performed when an event fires |
| **Proof Obligation** | A logical formula that must be proven to ensure correctness |
| **Refinement** | Adding detail to an abstract model while preserving its properties |
| **Upsert** | Insert if not exists, update if exists (used in reflections) |

## Appendix B — File Reference

| Event-B Component | Implementation File | Lines |
|-------------------|-------------------|-------|
| M0 (Access Control) | `backend/server.py` | 270–345 (auth helpers) |
| M1 (Courses) | `backend/server.py` | 786–980 |
| M2 (Submissions) | `backend/server.py` | 1330–1600 |
| M3 (Feedback) | `backend/server.py` | 1600–1780 |
| M4 (Moderation) | `backend/server.py` | 1798–1960 |
| M5 (Gamification) | `backend/server.py` | 386–750 |
| M6 (Reflections) | `backend/server.py` | 2836–2926 |
| Frontend (Comparison) | `frontend/src/pages/ComparisonPage.js` | Full file |
| Frontend (Reflections) | `frontend/src/pages/StudentFeedbackPage.js` | Full file |
| Frontend (PDF Export) | `frontend/src/pages/CodeReviewPage.js` | Lines 340–360 |

---

*Document generated: April 2026*
*Model covers CodeFeedback Studio v2.0 — all implemented features as of this date*
