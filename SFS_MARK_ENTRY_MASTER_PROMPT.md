# SFS Connect — Mark Entry System
## Complete Phase-wise Master Prompt
### St. Francis De Sales School, Laitkor, Shillong — Academic Year 2026–2027

---

> **HOW TO USE THIS DOCUMENT**
> This is a master build prompt. Each Phase section is a self-contained prompt you hand to Claude (or any AI coding assistant). Read the CONTEXT section first — it applies to every phase. Then work phase by phase. Do not skip phases.

---

## ─── CONTEXT (READ BEFORE EVERY PHASE) ───

### Project Identity
- **School:** St. Francis De Sales Secondary School, Laitkor, Shillong, Meghalaya
- **Affiliation:** CBSE
- **Phone:** 9612946550 | **Email:** sfslaitkor@gmail.com
- **Main App:** SFS Connect (single-file HTML/CSS/JS app, vanilla stack)
- **Firebase Project ID:** `sfs-laitkor-app`
- **Academic Session:** 2026–2027

### Existing Files (Do Not Break These)
```
sfds-reportcard/
├── index.html          ← Mark Entry Form (student-by-student, current form)
├── marksheet.html      ← Class Marksheet display (read from localStorage/JSON)
├── reportcard.html     ← Student Report Card display
├── assets/
│   └── logo.png
├── css/
│   ├── main.css
│   ├── marksheet.css
│   └── reportcard.css
└── js/
    ├── config.js       ← CRITICAL: class-subject config lives here
    ├── form.js         ← current mark entry logic
    ├── marksheet.js
    ├── render.js
    └── print.js
```

### Design System (Match Exactly)
- **Background:** `#f5f0e8` (warm parchment)
- **Dark surface:** `#1a1a2e` (near-black dark navy)
- **Gold accent:** `#c9a84c` (school gold)
- **Text on dark:** `#f5f0e8`
- **Font:** existing CSS — do not introduce new font imports unless specified
- **Section strips:** dark bar with `▸` marker and label in gold
- **Buttons:** `.btn-primary` (gold), `.btn-secondary` (muted), `.btn-warn` (red-ish)

### Mark Structure (Critical — Varies by Class)
Every mark entry follows this logic from `js/config.js`:

```javascript
// STANDARD subjects (most subjects):
{ IA: /10, UT: /30, TE: /60 } → Total: /100

// SPECIAL subjects (e.g. Spelling, Drawing, Computer — single entry):
{ singleMark: /100 } → Total: /100

// Consolidated (Annual):
HY Total + FT Total = Consol. /200
```

### Class-Subject Map (from config.js — preserve exactly)
Different classes have different subjects. The `config.js` `SUBJECTS` object controls this.
When building new files, always `import` or `<script src="js/config.js">` — never hardcode subjects.

```
Class III–V  (Primary):
  Mathematics, Science, Social Studies, Hindi, Spelling*, English I,
  English II, Khasi/Alt. English
  Grand Total: /800 (8 subjects × 100)
  *Spelling = single mark entry (no IA/UT/TE split)

Class VI–VIII (Middle):
  [Confirm from config.js — likely adds Computer/GK, drops Spelling]
  Grand Total: /900 or /1000

Class IX–X (Secondary):
  [Confirm from config.js — CBSE pattern, 5 main + optional]
  Grand Total: /500 (5 subjects × 100)
```

### Co-Scholastic Activities (All Classes)
Two dropdowns per activity (Term 1 grade, Term 2 grade).
Grades: `O, A+, A, B+, B, C`

```
Row 1: P.E. | Singing | Discipline
Row 2: G.K. | Arts & Craft | Neatness
Row 3: Val. Edu./Catechism (single item, two dropdowns)
```

### Terms
- `HY` = Half Yearly (Term 1)
- `FT` = Final Term (Term 2)
- Both terms are entered per student. Consol = HY + FT.

### Grading Scale
```
O  ≥ 90% | A+ 80–89% | A 70–79% | B+ 60–69% |
B  50–59% | C 40–49%  | D 33–39% | F < 33% (Fail)
Pass mark: 40/100 per subject
```

### Rank Rule
Dense ranking. A student gets a rank only if they pass ALL subjects (≥40 in each).
Ties share the same rank; next rank is not skipped.

---

## ─── FIREBASE STRUCTURE ───

```
Firestore Root
│
├── /teachers/{uid}
│     name: string
│     email: string
│     role: "subject_teacher" | "class_teacher" | "admin"
│     assignments: [
│         { class: "III", section: "A", subject: "Mathematics" },
│         { class: "IV",  section: "A", subject: "Mathematics" }
│     ]
│     classTeacherOf: string | null     // e.g. "III-A", null if not class teacher
│
├── /students/{studentId}
│     name: string
│     rollNo: number
│     admissionNo: string
│     class: string                     // "III", "IV" ... "X"
│     section: string                   // "A"
│     dob: string                       // "DD-MM-YYYY"
│     house: string
│     classId: string                   // "III-A"
│
├── /classes/{classId}                  // classId = "III-A", "IV-A", etc.
│     className: string                 // "III"
│     section: string                   // "A"
│     classTeacherId: string            // uid of class teacher
│     subjects: string[]               // from config.js for that class
│     studentIds: string[]
│
└── /marks/{classId_term}              // e.g. "III-A_HY", "III-A_FT"
      /{studentId}
          status: "draft" | "submitted" | "locked" | "published"
          lastUpdatedBy: string         // uid
          lastUpdatedAt: timestamp

          academics: {
              Mathematics: { IA: number, UT: number, TE: number, total: number }
              Spelling:    { singleMark: number, total: number }
              // ... one entry per subject
          }

          submittedSubjects: {
              Mathematics: { by: uid, at: timestamp, status: "submitted" }
              // ... tracks which subjects have been submitted
          }

          coScholastic: {
              PE:              { T1: string, T2: string }
              Singing:         { T1: string, T2: string }
              Discipline:      { T1: string, T2: string }
              GK:              { T1: string, T2: string }
              ArtsAndCraft:    { T1: string, T2: string }
              Neatness:        { T1: string, T2: string }
              ValEduCatechism: { T1: string, T2: string }
          }

          attendance: {
              present: number
              total: number
          }

          remarks: {
              halfYearly: string
              finalTerm:  string
              principal:  string
          }

          rank: {
              hyRank: number | null
              ftRank: number | null
              totalStudents: number
          }

          result: "PASS" | "FAIL" | "COMPARTMENT" | null
```

---

## ─── FIREBASE SECURITY RULES ───

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isLoggedIn() { return request.auth != null; }
    function getTeacher() { return get(/databases/$(database)/documents/teachers/$(request.auth.uid)).data; }
    function isAdmin() { return getTeacher().role == 'admin'; }
    function isClassTeacher(classId) {
      return getTeacher().classTeacherOf == classId;
    }
    function isSubjectTeacherFor(classId, subject) {
      return getTeacher().assignments.hasAny([{ class: classId.split('-')[0], section: classId.split('-')[1], subject: subject }]);
    }

    // Teachers collection
    match /teachers/{uid} {
      allow read: if isLoggedIn();
      allow write: if isAdmin() || request.auth.uid == uid;
    }

    // Students collection
    match /students/{studentId} {
      allow read: if isLoggedIn();
      allow write: if isAdmin();
    }

    // Classes collection
    match /classes/{classId} {
      allow read: if isLoggedIn();
      allow write: if isAdmin();
    }

    // Marks collection
    match /marks/{classTermId}/{studentId} {
      allow read: if isLoggedIn();

      // Subject teacher: can only write their subject's marks, only if not locked
      allow update: if isLoggedIn()
        && resource.data.status != 'locked'
        && resource.data.status != 'published';

      // Class teacher: can write coScholastic, attendance, remarks, rank, status
      // Admin: full write
      allow create: if isLoggedIn();
    }
  }
}
```

---

---

# PHASE 1 — Standalone Mark Entry Module (Subject Teacher Grid)

## Prompt for Phase 1

```
You are building Phase 1 of the SFS Connect Mark Entry System for
St. Francis De Sales School, Laitkor, Shillong. Read the full CONTEXT
section at the top of this document before writing any code.

BUILD: A standalone file called `markentry.html` inside the existing
`sfds-reportcard/` folder. This file MUST work independently (no main
app dependency yet). It uses its own simple email/password Firebase Auth
for now (will be replaced by shared auth in Phase 3).

─── WHAT TO BUILD ───

FILE: sfds-reportcard/markentry.html
SCRIPTS TO USE: js/config.js (already exists — contains SUBJECTS map)
NEW SCRIPTS: js/firebase-init.js, js/markentry.js
STYLE: Create css/markentry.css matching the existing design system exactly.

─── SCREEN 1: LOGIN ───
Simple centered login card. Dark theme. School logo at top.
Fields: Email, Password. Button: "Sign In as Teacher".
On success → load Screen 2.
On fail → show inline error in gold/red.
Firebase Auth: email/password provider.

─── SCREEN 2: TEACHER DASHBOARD ───
After login, fetch /teachers/{uid} from Firestore.
Display: "Welcome, [Teacher Name]" in header.
Show a table of assignments:

┌────────────────┬─────────┬──────────────┬─────────────────────┐
│ Class          │ Section │ Subject      │ Action              │
├────────────────┼─────────┼──────────────┼─────────────────────┤
│ III            │ A       │ Mathematics  │ [HY Marks] [FT Marks]│
│ IV             │ A       │ Mathematics  │ [HY Marks] [FT Marks]│
└────────────────┴─────────┴──────────────┴─────────────────────┘

Each row shows status badge for each term:
- 🔘 Not Started (grey)
- ✏️ Draft (yellow)
- ✅ Submitted (green)
- 🔒 Locked (dark, no action button)

Check /marks/{classId_term}/{each studentId} submittedSubjects field
to determine status for each assignment.

─── SCREEN 3: CLASS GRID (Mark Entry) ───
Triggered when teacher clicks [HY Marks] or [FT Marks].

Header shows: "Class III-A | Mathematics | Half Yearly"
Back button returns to Dashboard.

Fetch all students for that class from /students where classId = "III-A",
ordered by rollNo ascending.

Display as a spreadsheet-style grid:

┌────┬──────────────────────┬─────────┬─────────┬─────────┬───────┐
│ #  │ Student Name         │ IA /10  │ UT /30  │ TE /60  │ Total │
├────┼──────────────────────┼─────────┼─────────┼─────────┼───────┤
│ 1  │ Anando               │ [  ]    │ [  ]    │ [  ]    │  —    │
│ 2  │ Beatrice             │ [  ]    │ [  ]    │ [  ]    │  —    │
└────┴──────────────────────┴─────────┴─────────┴─────────┴───────┘

For SPECIAL subjects (e.g. Spelling): show only one input column "Marks /100".
Check config.js SUBJECTS map for the subject type.

BEHAVIOUR:
- Tab key moves: IA → UT → TE → next student's IA (natural flow)
- Enter key on last field of a row jumps to next row's first field
- Total auto-calculates on blur (IA + UT + TE)
- Total shown in gold if ≥ 40 (pass), red if < 40 (fail)
- Inputs validate: IA max 10, UT max 30, TE max 60. Show inline error if exceeded.
- Auto-save to Firestore as draft on every field blur (debounced 800ms)
- "Saving..." indicator in top-right corner during save
- Pre-populate grid from existing Firestore data on load (resume draft)

BUTTONS:
[ Save Draft ] — saves current state, status stays "draft"
[ Submit to Class Teacher ] — validates all rows have marks, sets
  submittedSubjects.{subject}.status = "submitted", shows confirmation modal

─── FIREBASE WRITES (Phase 1) ───
On draft save (per student, per field change):
  /marks/{classId_term}/{studentId}
  → academics.{subject}.IA = value
  → academics.{subject}.UT = value
  → academics.{subject}.TE = value
  → academics.{subject}.total = computed
  → status = "draft" (only if not already submitted/locked)
  → lastUpdatedBy = uid
  → lastUpdatedAt = serverTimestamp()

On submit:
  → submittedSubjects.{subject} = { by: uid, at: serverTimestamp(), status: "submitted" }

─── FIREBASE INIT ───
Create js/firebase-init.js:
  Use Firebase v9 compat SDK (CDN, same version as main SFS Connect app).
  Firebase config: { projectId: "sfs-laitkor-app", ... }
  Export: auth, db
  (Actual API key/config values will be filled in by developer — leave
   placeholder comments: // TODO: Replace with your Firebase config)

─── IMPORTANT ───
- Do NOT modify index.html, marksheet.html, reportcard.html
- Do NOT modify any existing JS or CSS files
- New CSS goes in css/markentry.css only
- New JS goes in js/markentry.js and js/firebase-init.js only
- markentry.html loads: firebase-init.js, config.js, markentry.js
- Match the gold/dark/parchment design system exactly
- The file must work offline for the grid UI; only saves require internet
```

---

# PHASE 2 — Class Teacher Review, Lock & Co-Scholastic

## Prompt for Phase 2

```
You are building Phase 2 of the SFS Connect Mark Entry System.
Phase 1 (markentry.html, js/markentry.js, js/firebase-init.js,
css/markentry.css) is already complete and working.

Read the full CONTEXT section of the master prompt before coding.

─── WHAT TO BUILD ───

Add a Class Teacher mode to the existing markentry.html.
When a logged-in teacher has role = "class_teacher" (and classTeacherOf
is set), they see a completely different dashboard from subject teachers.

DO NOT create a new file. Extend markentry.html and markentry.js.
Use CSS classes to show/hide subject teacher vs class teacher views.

─── CLASS TEACHER SCREEN 1: REVIEW DASHBOARD ───

Header: "Class Teacher Dashboard — Class III-A"

Show two panels side by side: HY Status | FT Status

For each term, show a subject-status table:

┌───────────────────┬────────────────────┬──────────────────┐
│ Subject           │ Entered By         │ Status           │
├───────────────────┼────────────────────┼──────────────────┤
│ Mathematics       │ Mr. Joseph         │ ✅ Submitted     │
│ Science           │ Ms. Rita           │ ⏳ Draft         │
│ Social Studies    │ Mr. Kumar          │ ✅ Submitted     │
│ Hindi             │ Ms. Priya          │ ✅ Submitted     │
│ Spelling          │ Ms. Priya          │ 🔘 Not Started   │
│ English I         │ Mr. Thomas         │ ✅ Submitted     │
│ English II        │ Mr. Thomas         │ ✅ Submitted     │
│ Khasi/Alt.English │ Mr. Bah            │ ⏳ Draft         │
└───────────────────┴────────────────────┴──────────────────┘

[Review All Students & Lock →]  ← enabled only when ALL subjects submitted

Progress bar: "6 of 8 subjects submitted"

─── CLASS TEACHER SCREEN 2: STUDENT REVIEW LIST ───

A list of all students in the class. Each row shows:

┌────┬──────────────┬────────┬────────┬─────────┬──────────────┐
│ #  │ Name         │ HY Tot │ FT Tot │ Consol  │ Action       │
├────┼──────────────┼────────┼────────┼─────────┼──────────────┤
│ 1  │ Anando       │ 740    │ 720    │ 1460    │ [Fill & Lock]│
│ 2  │ Beatrice     │ 680    │ 650    │ 1330    │ [Fill & Lock]│
└────┴──────────────┴────────┴────────┴─────────┴──────────────┘

Totals auto-calculated from /marks data.
Each student row shows lock status: 🔓 Open | 🔒 Locked

Bulk action: [ Lock All Records ] (locks entire class at once, after confirmation modal)

─── CLASS TEACHER SCREEN 3: INDIVIDUAL STUDENT COMPLETION FORM ───

Triggered by clicking [Fill & Lock] for a student.

LAYOUT (matches existing form design):
──────────────────────────────────────────
SECTION A: Academic Summary (READ ONLY)
  Show the marks table exactly as in current index.html style:
  Subject | IA | UT | TE | HY Total | FT Total | Consol /200 | Grade
  Auto-calculated totals. Class teacher CANNOT edit these.
  Show grand totals row.

SECTION B: Co-Scholastic Grades (EDITABLE by class teacher)
  Match existing Section D layout from index.html exactly:
  P.E. | Singing | Discipline
  G.K. | Arts & Craft | Neatness
  Val. Edu./Catechism
  Each activity: two dropdowns (Term 1, Term 2), grades: O, A+, A, B+, B, C

SECTION C: Attendance (EDITABLE)
  HY: Days Present [ ] / Total Working Days [ ]
  FT: Days Present [ ] / Total Working Days [ ]

SECTION D: Remarks (EDITABLE)
  Half Yearly Remark: [textarea]
  Final Term Remark: [textarea]
  Principal's Remark: [textarea]  ← class teacher fills on behalf of principal

SECTION E: Rank (EDITABLE, with auto-suggestion)
  HY Rank [ ]  |  FT Rank [ ]  |  Total Students in Class [ ]
  Show note: "Only students passing all subjects (≥40 each) are ranked."
  Auto-suggest rank based on class totals if all students are locked —
  show suggested rank in grey, teacher can override.

SECTION F: Result (AUTO-CALCULATED, display only)
  PASS if all subjects ≥ 40 in both terms.
  FAIL if any subject < 40 in both terms.
  COMPARTMENT if failed in one term only.
  Show badge in green/red/amber.

BUTTONS:
[ Save Draft ]       ← saves co-scholastic, attendance, remarks, rank
[ 🔒 Lock Record ]   ← sets status = "locked", shows confirmation modal:
                        "Lock this record? Subject teachers will no longer
                        be able to edit marks. This cannot be undone."
                        [Confirm Lock] [Cancel]
[ ← Back to List ]

─── FIREBASE WRITES (Phase 2) ───

Class teacher writes to:
  /marks/{classId_term}/{studentId}
  → coScholastic (all fields)
  → attendance
  → remarks
  → rank
  → result (computed, set on lock)
  → status = "locked" (on lock action)
  → lastUpdatedBy = uid
  → lastUpdatedAt = serverTimestamp()

Class teacher CANNOT write to:
  → academics (any subject marks)
  → submittedSubjects

─── VISUAL LOCK STATE ───
Once a record is locked:
- Academic marks table shows a 🔒 icon in the section header
- All academic inputs are visually disabled (not just HTML disabled — add a
  .locked-overlay div with a lock icon and "Locked by Class Teacher" text)
- Co-scholastic, attendance, remarks fields remain editable by class teacher
  (class teacher can still amend these after lock, but not academic marks)
- Lock button changes to "🔓 Unlock (Admin Only)" — greyed out for class teacher

─── IMPORTANT ───
- Extend markentry.js, do not rewrite from scratch
- All new CSS goes in css/markentry.css under a .ct-* namespace
- Do not touch any other existing file
- Respect the SUBJECTS config — pull subjects for the class from config.js
```

---

# PHASE 3 — Integration with SFS Connect Main App

## Prompt for Phase 3

```
You are building Phase 3 of the SFS Connect Mark Entry System.
Phases 1 and 2 (markentry.html, markentry.js, markentry.css,
firebase-init.js) are complete and working standalone.

This phase connects the mark entry module to the main SFS Connect app
(the main index.html of SFS Connect — the school management portal,
NOT the sfds-reportcard/index.html).

Read the full CONTEXT section of the master prompt before coding.

─── GOAL ───
Teachers already log into the main SFS Connect app via Firebase Auth.
The mark entry module should use that same session — no second login.

─── STEP 1: Remove Standalone Login from markentry.html ───

In markentry.html, replace the login screen logic with:

  firebase.auth().onAuthStateChanged(user => {
      if (!user) {
          // Not logged in — redirect to main app
          window.location.href = '../index.html'; // adjust path as needed
      } else {
          loadTeacherApp(user.uid);
      }
  });

Remove the login form HTML from markentry.html (or hide it behind a flag).
Keep all other screens intact.

─── STEP 2: Add "Enter Marks" Entry Point in Main SFS Connect App ───

In the main SFS Connect app's Teacher Portal section, add:

A. A prominent card/button in the Teacher Dashboard:
   ┌────────────────────────────────┐
   │ 📝 Mark Entry                  │
   │ Enter and submit student marks │
   │ for your assigned subjects.    │
   │ [ Open Mark Entry → ]          │
   └────────────────────────────────┘

B. The button's click handler:
   document.getElementById('btnMarkEntry').addEventListener('click', () => {
       window.location.href = 'sfds-reportcard/markentry.html';
       // OR if hosted separately: adjust path accordingly
   });

C. For Class Teachers, show an additional card:
   ┌────────────────────────────────┐
   │ 🔒 Review & Lock Records       │
   │ Class III-A — 6/8 submitted    │
   │ [ Open Review Dashboard → ]    │
   └────────────────────────────────┘
   The "6/8 submitted" count is fetched from Firestore on dashboard load.

─── STEP 3: Shared Firebase Init ───

The main SFS Connect app already has a Firebase init. Make sure
both apps use the SAME firebase app instance to avoid double-initialization:

In markentry.html, change firebase-init.js to check:
  if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();
  const auth = firebase.auth();

This prevents "Firebase app already initialized" errors when the user
navigates back and forth.

─── STEP 4: Back Navigation ───

In markentry.html header, add a back button:
[ ← Back to SFS Connect ]
Which goes to: window.history.back() OR '../index.html'

─── STEP 5: Unified Notification System ───

In the main SFS Connect Teacher Portal, add a notification badge:

If a class teacher has pending reviews (subjects submitted but not locked):
  Show a red badge: "⚠ 3 records pending review"
  Clicking it goes directly to markentry.html#review

Fetch count from Firestore on portal load:
  Query /marks/{classId_term} where status == "submitted" (not yet locked)
  for the teacher's classTeacherOf class.

─── IMPORTANT ───
- Do not break any existing main SFS Connect functionality
- Only add new UI elements; do not modify existing portal HTML structure
- Keep the path references correct (markentry.html is inside sfds-reportcard/)
- Both apps share firebase project sfs-laitkor-app — no new project needed
```

---

# PHASE 4 — Report Card & Marksheet Pull from Firebase

## Prompt for Phase 4

```
You are building Phase 4 of the SFS Connect Mark Entry System.
Phases 1–3 are complete. Mark data now lives in Firestore at
/marks/{classId_term}/{studentId}.

Currently, reportcard.html and marksheet.html read from localStorage or
a passed JSON object. This phase makes them read from Firestore instead.

Read the full CONTEXT section of the master prompt before coding.

─── GOAL ───
reportcard.html and marksheet.html should:
1. Accept a studentId + classId + term (or classId + term for marksheet)
   as URL parameters
2. Fetch the locked record from Firestore
3. Render identically to how they render now (do not change visual design)
4. Only render if status = "locked" or "published"

─── STEP 1: URL Parameter Scheme ───

reportcard.html accepts:
  ?studentId=abc123&classId=III-A&session=2026-27

marksheet.html accepts:
  ?classId=III-A&term=HY&session=2026-27
  (term = HY or FT)

─── STEP 2: Update reportcard.html ───

In js/render.js (or a new js/rc-firebase.js), add:

  async function loadFromFirebase(studentId, classId) {
      const hyDoc = await db.collection('marks')
          .doc(`${classId}_HY`).collection('students')
          .doc(studentId).get();
      const ftDoc = await db.collection('marks')
          .doc(`${classId}_FT`).collection('students')
          .doc(studentId).get();
      const studentDoc = await db.collection('students').doc(studentId).get();

      if (!hyDoc.exists || !ftDoc.exists) {
          showError('Record not found or not yet locked.');
          return;
      }

      if (hyDoc.data().status !== 'locked' && hyDoc.data().status !== 'published') {
          showError('This record has not been locked yet.');
          return;
      }

      const data = {
          student: studentDoc.data(),
          hy: hyDoc.data(),
          ft: ftDoc.data()
      };

      renderReportCard(data); // existing render function — pass this data object
  }

  // On page load:
  const params = new URLSearchParams(window.location.search);
  if (params.get('studentId')) {
      loadFromFirebase(params.get('studentId'), params.get('classId'));
  }
  // Fallback: if no URL params, try localStorage (backward compat)

─── STEP 3: Update marksheet.html ───

In js/marksheet.js, add:

  async function loadClassFromFirebase(classId, term) {
      const classDoc = await db.collection('classes').doc(classId).get();
      const studentIds = classDoc.data().studentIds;

      const termKey = `${classId}_${term}`;
      const snapshots = await Promise.all(
          studentIds.map(id =>
              db.collection('marks').doc(termKey)
              .collection('students').doc(id).get()
          )
      );

      const rows = snapshots
          .filter(s => s.exists && s.data().status === 'locked')
          .map(s => ({ id: s.id, ...s.data() }));

      if (rows.length === 0) {
          showError('No locked records found for this class and term.');
          return;
      }

      renderMarksheet(classId, term, rows); // existing render function
  }

─── STEP 4: Generate Report Card Links from Mark Entry Module ───

In markentry.html, after a record is locked, show:

  ✅ Record locked successfully.
  [ 👁 Preview Report Card ]   ← opens reportcard.html?studentId=...&classId=...
  [ 🖨 Print Report Card ]      ← same URL + window.print()

In the Class Teacher student list, after all records are locked:
  [ 📋 View Class Marksheet ]   ← opens marksheet.html?classId=III-A&term=HY

─── STEP 5: Backward Compatibility ───

Keep the localStorage/JSON fallback in both render.js and marksheet.js.
If URL params are absent, fall back to old behavior.
This ensures the existing index.html (old mark entry form) still works
for offline/demo use without breaking.

─── STEP 6: Admin — Publish All Records ───

Add a simple admin action in the main SFS Connect Admin Portal:

  [ 📢 Publish Class III-A Report Cards ]

This sets status = "published" for all locked records in a class.
Only published records are visible in the Student Portal
(student can see their report card only after admin publishes).

Firestore write:
  Batch update all docs in /marks/III-A_HY and /marks/III-A_FT
  where status == "locked" → status = "published"

─── IMPORTANT ───
- Do NOT change the visual design of reportcard.html or marksheet.html
- Preserve all existing CSS classes and IDs exactly
- The data object passed to renderReportCard() must match the shape
  that render.js already expects — map Firebase fields to the existing
  expected keys (check render.js field names before mapping)
- Add firebase-init.js script tag to both reportcard.html and marksheet.html
- Backward compat localStorage path must still work for demo mode
```

---

# PHASE 5 — Auto-Rank Calculation (Optional but Recommended)

## Prompt for Phase 5

```
You are building Phase 5 (optional) of the SFS Connect Mark Entry System.
Phases 1–4 are complete.

─── GOAL ───
Auto-calculate class ranks once all records are locked.
Class teacher should not need to manually enter ranks.

─── LOGIC ───
1. Trigger: When class teacher clicks [Lock All Records] in Phase 2 Screen 2.
2. Fetch all student final totals (HY + FT consolidated) from the locked records.
3. Apply dense ranking:
   - Only eligible students (passed ALL subjects ≥ 40 in BOTH terms) get a rank.
   - Sort eligible students by consolidated total descending.
   - Ties get the same rank. Next rank is not skipped.
   - Ineligible students get rank = null.
4. Write rank back to each student's mark document:
   /marks/{classId_term}/{studentId} → rank.ftRank, rank.hyRank, rank.totalStudents
5. Show a summary modal after ranking:
   "Ranks calculated for 28 of 30 students. 2 students failed and are unranked."

─── EDGE CASES ───
- Student absent for one term (partial marks): treat as 0 for ranking purposes
- All students tied: everyone gets Rank 1
- Single student: Rank 1 automatically

─── IMPLEMENTATION ───
Add function: calculateAndSaveRanks(classId) in markentry.js
Call it automatically after all records are locked.
Also add a manual [Recalculate Ranks] button in Class Teacher dashboard
in case teacher unlocks and re-locks a record.
```

---

# QUICK REFERENCE — Key IDs & Field Names

```
── index.html (existing mark entry form) ──
#classSelect, #sectionInput, #studentName, #rollNumber
#admissionNo, #dob, #classTeacher, #house, #session
#halfYearlyTable, #halfYearlyBody, #hyGrandTotal, #hyPercentage, #hyGrade
#finalTermTable, #finalTermBody, #ftGrandTotal, #ftPercentage, #ftGrade
#hyPresent, #hyTotalDays, #ftPresent, #ftTotalDays
#coScholasticContainer
#hyRemark, #ftRemark
#hyRank, #ftRank, #totalStudents
#resultBadge
#btnPreview, #btnPrint, #btnSaveJson, #btnLoadJson, #btnClear,
#btnAddToClass, #btnViewMarksheet

── reportcard.html (display) ──
#rcStudentName, #rcRollNo, #rcSection, #rcSection2, #rcClass2
#rcAdmissionNo, #rcDob, #rcHouse, #rcClassSection
#rcHyAttPct, #rcHyAttBar, #rcFtAttPct, #rcFtAttBar
#rcResultBadge, #rcOverallGrade, #rcOverallPct, #rcOverallRank
#rcHyRemark, #rcFtRemark, #rcPrincipalRemark
#rcHyTable, #rcHyTableHead, #rcHyTableBody, #rcHyTableFoot
#rcFtTable, #rcFtTableHead, #rcFtTableBody, #rcFtTableFoot
#rcHyCoscholastic
#rcSumTotal, #rcSumMax, #rcSumPct, #rcSumGrade, #rcSumRank,
#rcSumTotalStudents, #rcSumResult, #rcSumAtt
#rcGradeScale

── marksheet.html (display) ──
#msSchoolName, #msClass, #msTerm, #msSession, #msDate
#msTable, #msTableHead, #msTableBody, #msTableFoot
```

---

# BUILD CHECKLIST

```
PHASE 1 ── Subject Teacher Mark Entry
  □ js/firebase-init.js created (with TODO placeholder for config)
  □ css/markentry.css created (matches existing design system)
  □ markentry.html created with Login + Dashboard + Grid screens
  □ Tab/Enter key navigation working in grid
  □ Auto-save to Firestore on blur (debounced)
  □ Pre-populate from existing Firestore data on load
  □ Submit button sets submittedSubjects field
  □ Status badges on dashboard assignments

PHASE 2 ── Class Teacher Review & Lock
  □ Role detection on login (subject_teacher vs class_teacher)
  □ Class Teacher Dashboard with subject status table
  □ Student review list with totals
  □ Individual student completion form
  □ Academic marks READ ONLY for class teacher
  □ Co-scholastic, attendance, remarks, rank EDITABLE
  □ Lock confirmation modal
  □ Visual lock overlay on locked records

PHASE 3 ── Main App Integration
  □ Standalone login removed from markentry.html
  □ onAuthStateChanged redirect to main app if not logged in
  □ "Enter Marks" card added to Teacher Portal
  □ "Review & Lock" card added for class teachers
  □ Notification badge for pending reviews
  □ Back button in markentry.html header

PHASE 4 ── Firebase-driven Report Cards
  □ reportcard.html accepts URL params
  □ marksheet.html accepts URL params
  □ Both fetch from /marks collection
  □ Both fall back to localStorage if no URL params
  □ Preview/Print links generated after lock
  □ Admin publish action in Admin Portal

PHASE 5 ── Auto-Rank (Optional)
  □ calculateAndSaveRanks() function
  □ Called on lock-all action
  □ Dense ranking logic correct
  □ Handles ineligible (fail) students
  □ Manual recalculate button
```

---

*Document Version: 1.0 | Project: SFS Connect — sfs-laitkor-app | Session: 2026–2027*
*St. Francis De Sales School, Laitkor, Shillong, Meghalaya — Affiliated to CBSE*
