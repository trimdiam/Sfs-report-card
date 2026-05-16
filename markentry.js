/**
 * markentry.js — SFS Connect Mark Entry System — Phase 1 & 2
 * Subject Teacher: Login → Dashboard → Class Grid
 * Class Teacher:   Login → CT Dashboard → Student List → Student Form
 */

'use strict';

// ─── ROMAN NUMERAL → INTEGER ─────────────────────────────────────────────────
const ROMAN_TO_INT = { I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10 };
function classNumFromId(classId) {
  // "IX-A" → 9, "3-A" → 3, "III" → 3
  const raw = String(classId).split('-')[0].trim().toUpperCase();
  return ROMAN_TO_INT[raw] || parseInt(raw) || null;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
const ME = {
  user:         null,
  teacher:      null,      // full teacher document data
  isClassTeacher: false,
  ctClassId:    null,      // e.g. "III-A"
  ctClassNum:   null,      // e.g. 3
  activeClass:  null,      // subject teacher grid context
  activeStudent: null,     // { studentId, studentData, hyData, ftData }
  saveTimer:    null,
  pendingSaves: new Map()
};

// ─── GRADES ───────────────────────────────────────────────────────────────────
const GRADES = ['O','A+','A','B+','B','C'];

function computeGrade(total, max = 100) {
  const pct = (total / max) * 100;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
}

// ─── DOM HELPERS ──────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function showScreen(id) {
  document.querySelectorAll('.me-screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function showSaveIndicator(text = 'Saving…') {
  const ind = $('saveIndicator');
  ind.textContent = text;
  ind.classList.add('visible');
}
function hideSaveIndicator(text = '') {
  const ind = $('saveIndicator');
  if (text) { ind.textContent = text; setTimeout(() => ind.classList.remove('visible'), 1800); }
  else ind.classList.remove('visible');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function subjectToKey(subjectLabel, classNum) {
  const cfg = CONFIG[parseInt(classNum)];
  if (!cfg) return '';
  const found = cfg.subjects.find(s => s.label === subjectLabel);
  return found ? found.key : '';
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// Force LOCAL persistence so the session survives a navigation from the
// teacher portal (same Firebase project, same origin → no re-login needed).
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err =>
  console.warn('setPersistence failed:', err.message)
);

auth.onAuthStateChanged(async user => {
  if (user) {
    ME.user = user;
    await loadTeacherAndRoute(user.uid);
  } else {
    ME.user = null;
    ME.teacher = null;
    showScreen('screenLogin');
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function idToEmail(id) {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '@stfrancis.school';
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = idToEmail($('loginEmail').value);
  const password = $('loginPassword').value;
  const errEl    = $('loginError');
  errEl.textContent = '';
  $('btnLogin').disabled = true;
  $('btnLogin').textContent = 'Signing in…';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    $('btnLogin').disabled = false;
    $('btnLogin').textContent = 'Sign In as Teacher';
  }
});

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email':          'Invalid Teacher ID.',
    'auth/user-not-found':         'No account found for this ID.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/too-many-requests':      'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return map[code] || 'Sign-in failed. Please try again.';
}

$('btnLogout').addEventListener('click', () => auth.signOut());

// ─── LOAD TEACHER & ROUTE ─────────────────────────────────────────────────────
async function loadTeacherAndRoute(uid) {
  try {
    let teacherData = null;

    // Try master-prompt structure: /teachers/{uid}
    const directSnap = await db.collection('teachers').doc(uid).get();
    if (directSnap.exists) {
      teacherData = directSnap.data();
    } else {
      // Fall back to existing site structure: /users/{uid} → /teachers?teacherId=...
      const userSnap = await db.collection('users').doc(uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        const tid = userData.teacherId || userData.loginId || '';
        if (tid) {
          // Try exact match on teacherId field
          let tSnap = await db.collection('teachers')
            .where('teacherId', '==', tid).limit(1).get();
          // Try case-insensitive variant (uppercase)
          if (tSnap.empty) {
            tSnap = await db.collection('teachers')
              .where('teacherId', '==', tid.toUpperCase()).limit(1).get();
          }
          // Try loginId field mirror (set by createTeacherLogin)
          if (tSnap.empty) {
            tSnap = await db.collection('teachers')
              .where('loginId', '==', tid).limit(1).get();
          }
          if (!tSnap.empty) teacherData = tSnap.docs[0].data();
        }
      }
    }

    if (!teacherData) {
      showScreen('screenDashboard');
      $('dashboardBody').innerHTML = '<tr><td colspan="5" class="me-empty">Teacher record not found. Contact admin.</td></tr>';
      return;
    }

    ME.teacher = { uid, ...teacherData };
    $('headerTeacherName').textContent = ME.teacher.name || '';

    // Detect class teacher role
    ME.isClassTeacher = (ME.teacher.role === 'class_teacher') ||
                        !!ME.teacher.classTeacherOf ||
                        !!ME.teacher.classTeacher;

    // Determine CT's classId ("III-A" format)
    if (ME.isClassTeacher) {
      if (ME.teacher.classTeacherOf) {
        ME.ctClassId = ME.teacher.classTeacherOf;          // "III-A"
      } else if (ME.teacher.classTeacher) {
        ME.ctClassId = ME.teacher.classTeacher + '-A';     // "III" → "III-A"
      }
      ME.ctClassNum = ME.ctClassId ? classNumFromId(ME.ctClassId) : null;
    }

    // ─── PHASE 3: URL param deep-linking ───────────────────────────────────
    const params      = new URLSearchParams(window.location.search);
    const urlClassId  = params.get('classId');
    const urlSubject  = params.get('subject');
    const urlTerm     = params.get('term') || 'HY';
    const urlAction   = params.get('action');

    if (urlClassId && urlSubject) {
      // Deep-link: go directly to mark entry grid
      const classNumInt = classNumFromId(urlClassId);
      const section     = urlClassId.split('-')[1] || 'A';
      const subjectCfg  = CONFIG[classNumInt]?.subjects.find(s => s.key === urlSubject);
      const subjectLbl  = subjectCfg?.label || urlSubject;
      await openGrid(urlClassId, classNumInt, section, subjectLbl, urlSubject, urlTerm);
      return;
    }

    if (urlClassId && urlAction === 'review' && ME.isClassTeacher) {
      // Deep-link: go directly to class teacher student list
      ME.ctClassId  = urlClassId;
      ME.ctClassNum = classNumFromId(urlClassId);
      await openStudentList(urlTerm);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (ME.isClassTeacher) {
      await renderCTDashboard();
      showScreen('screenCTDashboard');
    } else {
      $('teacherName').textContent = ME.teacher.name || 'Teacher';
      await renderSubjectDashboard();
      showScreen('screenDashboard');
    }
  } catch (err) {
    console.error(err);
    showScreen('screenDashboard');
    $('dashboardBody').innerHTML = `<tr><td colspan="5" class="me-empty">Error: ${err.message}</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SUBJECT TEACHER — DASHBOARD & GRID (Phase 1)
// ════════════════════════════════════════════════════════════════════════════════

async function renderSubjectDashboard() {
  const assignments = ME.teacher.assignments || [];
  if (!assignments.length) {
    $('dashboardBody').innerHTML = '<tr><td colspan="5" class="me-empty">No subject assignments found. Contact admin.</td></tr>';
    return;
  }

  // Phase 3 format has classId directly; legacy format uses asgn.class + asgn.section
  const isNewFormat = assignments[0].classId !== undefined;

  if (isNewFormat) {
    await renderSubjectDashboardNew(assignments);
  } else {
    await renderSubjectDashboardLegacy(assignments);
  }
}

// Phase 3 format: { subjectKey, subjectLabel, classId, classNum, section, term }
async function renderSubjectDashboardNew(assignments) {
  // Fetch statuses per termKey
  const statusMap = {};
  const termSets = new Set(assignments.map(a => `${a.classId}_${a.term}`));
  for (const termKey of termSets) {
    try {
      const snap = await db.collection('marks').doc(termKey).collection('students').limit(200).get();
      snap.forEach(doc => {
        const data = doc.data();
        const submitted = data.submittedSubjects || {};
        assignments.filter(a => `${a.classId}_${a.term}` === termKey).forEach(a => {
          const mapKey = `${termKey}__${a.subjectKey}`;
          if (data.status === 'locked')
            statusMap[mapKey] = 'locked';
          else if (submitted[a.subjectKey]?.status === 'submitted')
            statusMap[mapKey] = statusMap[mapKey] === 'locked' ? 'locked' : 'submitted';
          else if (data.status === 'draft')
            statusMap[mapKey] = statusMap[mapKey] || 'draft';
        });
      });
    } catch (_) {}
  }

  const tbody = $('dashboardBody');
  tbody.innerHTML = '';

  // Update header for new layout (Class | Subject | Term | Status | Action)
  const thead = tbody.closest('table').querySelector('thead tr');
  if (thead) thead.innerHTML = '<th>Class</th><th>Subject</th><th>Term</th><th>Status</th><th>Action</th>';

  for (const asgn of assignments) {
    const { subjectKey, subjectLabel, classId, classNum, section, term } = asgn;
    const classNumParsed = classNum || parseInt(classId.split('-')[0]);
    const sec = section || classId.split('-')[1] || 'A';
    const mapKey = `${classId}_${term}__${subjectKey}`;
    const status = statusMap[mapKey] || 'not-started';

    const tr = el('tr');
    tr.innerHTML = `
      <td>${classId}</td>
      <td>${escHtml(subjectLabel)}</td>
      <td>${term === 'HY' ? 'Half Yearly' : 'Final Term'}</td>
      <td>${statusBadge(status)}</td>
      <td>${status !== 'locked'
        ? `<button class="btn btn-sm btn-secondary me-enter-btn"
             data-classid="${classId}" data-classnum="${classNumParsed}"
             data-section="${sec}" data-subject="${escHtml(subjectLabel)}"
             data-subjectkey="${subjectKey}" data-term="${term}">
             Enter Marks &rarr;
           </button>`
        : '<span style="color:var(--me-muted);font-size:0.82rem;">&#128274; Locked</span>'
      }</td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.me-enter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openGrid(btn.dataset.classid, btn.dataset.classnum, btn.dataset.section,
               btn.dataset.subject, btn.dataset.subjectkey, btn.dataset.term);
    });
  });
}

// Legacy format: { class, section, subject } — also handles mixed (subjectLabel/subjectKey present)
async function renderSubjectDashboardLegacy(assignments) {
  const rows = [];
  for (const asgn of assignments) {
    const classId    = asgn.classId || `${asgn.class}-${asgn.section}`;
    const subjectRef = asgn.subjectKey || asgn.subject || asgn.subjectLabel || '';
    for (const term of ['HY', 'FT']) rows.push({ ...asgn, classId, term, _subjectRef: subjectRef });
  }

  const statusMap = await fetchAssignmentStatuses(rows);
  const tbody = $('dashboardBody');
  tbody.innerHTML = '';

  const seen = new Set();
  for (const asgn of assignments) {
    const classId      = asgn.classId || `${asgn.class}-${asgn.section}`;
    const classNum     = asgn.classNum || asgn.class;
    const section      = asgn.section || classId.split('-')[1] || 'A';
    const subjectName  = asgn.subject || asgn.subjectLabel || '—';
    const subjectKey   = asgn.subjectKey || subjectToKey(subjectName, classNum);

    const key = `${classId}__${subjectKey || subjectName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const hyStatus = statusMap[`${classId}_HY__${subjectKey || subjectName}`] || 'not-started';
    const ftStatus = statusMap[`${classId}_FT__${subjectKey || subjectName}`] || 'not-started';

    const tr = el('tr');
    tr.innerHTML = `
      <td>${classNum}</td>
      <td>${section}</td>
      <td>${escHtml(subjectName)}</td>
      <td>${statusBadge(hyStatus)} ${actionBtn(classId, classNum, section, subjectName, subjectKey, 'HY', hyStatus)}</td>
      <td>${statusBadge(ftStatus)} ${actionBtn(classId, classNum, section, subjectName, subjectKey, 'FT', ftStatus)}</td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.me-enter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openGrid(btn.dataset.classid, btn.dataset.classnum, btn.dataset.section,
               btn.dataset.subject, btn.dataset.subjectkey, btn.dataset.term);
    });
  });
}

async function fetchAssignmentStatuses(rows) {
  const statusMap = {};
  const termSets = new Set(rows.map(r => `${r.classId}_${r.term}`));

  for (const termKey of termSets) {
    try {
      const snap = await db.collection('marks').doc(termKey).collection('students').limit(200).get();
      snap.forEach(doc => {
        const data = doc.data();
        const submitted = data.submittedSubjects || {};
        rows.filter(r => `${r.classId}_${r.term}` === termKey).forEach(r => {
          const subRef = r._subjectRef || r.subjectKey || r.subject || '';
          const mapKey = `${termKey}__${subRef}`;
          if (data.status === 'locked')
            statusMap[mapKey] = 'locked';
          else if (submitted[subRef]?.status === 'submitted')
            statusMap[mapKey] = statusMap[mapKey] === 'locked' ? 'locked' : 'submitted';
          else if (data.status === 'draft')
            statusMap[mapKey] = statusMap[mapKey] || 'draft';
        });
      });
    } catch (_) { /* collection may not exist yet */ }
  }
  return statusMap;
}

function statusBadge(status) {
  const map = {
    'not-started': ['status-not-started', '&#9711; Not Started'],
    'draft':       ['status-draft',       '&#9998; Draft'],
    'submitted':   ['status-submitted',   '&#10003; Submitted'],
    'locked':      ['status-locked',      '&#128274; Locked']
  };
  const [cls, label] = map[status] || map['not-started'];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function actionBtn(classId, classNum, section, subject, subjectKey, term, status) {
  if (status === 'locked') return '';
  const key   = subjectKey || subjectToKey(subject, classNum);
  const label = term === 'HY' ? 'HY Marks' : 'FT Marks';
  return `<button class="btn btn-sm btn-secondary me-enter-btn"
    data-classid="${classId}" data-classnum="${classNum}" data-section="${section}"
    data-subject="${escHtml(subject)}" data-subjectkey="${key}" data-term="${term}">
    ${label}
  </button>`;
}

// ─── GRID ─────────────────────────────────────────────────────────────────────
async function openGrid(classId, classNum, section, subjectLabel, subjectKey, term) {
  // Resolve classNum as integer (handles Roman numerals like "IX" → 9)
  const classNumInt = classNumFromId(classId) || parseInt(classNum) || classNum;
  ME.activeClass = { classId, classNum: classNumInt, section, subjectLabel, subjectKey, term };

  showScreen('screenGrid');
  $('gridTitle').textContent = `Class ${classId} — ${subjectLabel} — ${term === 'HY' ? 'Half Yearly' : 'Final Term'}`;
  $('gridSubtitle').textContent = 'Academic Year 2026–2027';
  $('gridTableWrap').innerHTML = '<div class="me-loading"><div class="me-spinner"></div><br>Loading students…</div>';

  try {
    // Students are stored with separate 'class' and 'section' fields, not a combined classId
    const classStr = String(classNumInt || classNumFromId(classId));

    const studSnap = await db.collection('students')
      .where('class', '==', classStr)
      .get();

    if (studSnap.empty) {
      $('gridTableWrap').innerHTML = `<div class="me-empty">No students found for Class ${classId}.</div>`;
      return;
    }

    // Sort by rollNo client-side (avoids composite index requirement)
    const students = studSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0));
    const termKey  = `${classId}_${term}`;
    const existing = {};

    try {
      const markSnaps = await Promise.all(
        students.map(s => db.collection('marks').doc(termKey).collection('students').doc(s.id).get())
      );
      markSnaps.forEach((snap, i) => { if (snap.exists) existing[students[i].id] = snap.data(); });
    } catch (_) {}

    renderGrid(students, existing);
  } catch (err) {
    console.error(err);
    $('gridTableWrap').innerHTML = `<div class="me-empty">Error: ${err.message}</div>`;
  }
}

function renderGrid(students, existing) {
  const { classNum, subjectKey } = ME.activeClass;
  const cfg      = CONFIG[classNum];
  const subj     = cfg?.subjects.find(s => s.key === subjectKey);
  const isSingle = subj?.singleTotal === true;
  const isSenior = cfg?.markScheme === 'senior';
  const wrap     = $('gridTableWrap');
  wrap.innerHTML  = '';

  // Build column headers based on mark scheme
  let colHeaders;
  if (isSingle) {
    colHeaders = '<th>Marks /100</th>';
  } else if (isSenior) {
    colHeaders = '<th>IA /20</th><th>TE /80</th>';
  } else {
    colHeaders = '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  }

  const table = el('table', 'me-grid-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th><th>Student Name</th>
        ${colHeaders}
        <th>Total</th>
      </tr>
    </thead>
    <tbody id="gridTbody"></tbody>
  `;
  wrap.appendChild(table);

  const tbody    = table.querySelector('#gridTbody');
  const allInputs = [];

  students.forEach((student, idx) => {
    const existData = existing[student.id]?.academics?.[subjectKey] || {};
    const isLocked  = existing[student.id]?.status === 'locked';
    const tr = el('tr');
    tr.dataset.studentId = student.id;

    if (isSingle) {
      const val = existData.singleMark ?? '';
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escHtml(student.name)}</td>
        <td><input type="number" class="me-mark-input single" data-field="singleMark" data-max="100" value="${val}" min="0" max="100" ${isLocked ? 'disabled' : ''}></td>
        <td class="me-total-cell empty" data-total>—</td>
      `;
    } else if (isSenior) {
      const ia = existData.IA ?? '', te = existData.TE ?? '';
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escHtml(student.name)}</td>
        <td><input type="number" class="me-mark-input" data-field="IA" data-max="20"  value="${ia}" min="0" max="20"  ${isLocked ? 'disabled' : ''}></td>
        <td><input type="number" class="me-mark-input" data-field="TE" data-max="80"  value="${te}" min="0" max="80"  ${isLocked ? 'disabled' : ''}></td>
        <td class="me-total-cell empty" data-total>—</td>
      `;
    } else {
      const ia = existData.IA ?? '', ut = existData.UT ?? '', te = existData.TE ?? '';
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escHtml(student.name)}</td>
        <td><input type="number" class="me-mark-input" data-field="IA" data-max="10"  value="${ia}" min="0" max="10"  ${isLocked ? 'disabled' : ''}></td>
        <td><input type="number" class="me-mark-input" data-field="UT" data-max="30"  value="${ut}" min="0" max="30"  ${isLocked ? 'disabled' : ''}></td>
        <td><input type="number" class="me-mark-input" data-field="TE" data-max="60"  value="${te}" min="0" max="60"  ${isLocked ? 'disabled' : ''}></td>
        <td class="me-total-cell empty" data-total>—</td>
      `;
    }

    tbody.appendChild(tr);
    const inputs = tr.querySelectorAll('.me-mark-input');
    inputs.forEach(inp => allInputs.push(inp));
    updateRowTotal(tr, isSingle);

    if (!isLocked) {
      inputs.forEach(inp => {
        inp.addEventListener('input',  () => { validateInput(inp); updateRowTotal(tr, isSingle); });
        inp.addEventListener('blur',   () => { validateInput(inp); updateRowTotal(tr, isSingle); scheduleSave(student.id, tr, isSingle); });
      });
    }
  });

  allInputs.forEach((inp, i) => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const next = allInputs[i + 1]; if (next) next.focus(); }
    });
  });
}

function validateInput(inp) {
  const max = parseInt(inp.dataset.max);
  const val = parseFloat(inp.value);
  if (inp.value !== '' && (isNaN(val) || val < 0 || val > max)) {
    inp.classList.add('error');
    inp.title = `Maximum allowed: ${max}`;
    return false;
  }
  inp.classList.remove('error');
  inp.title = '';
  return true;
}

function updateRowTotal(tr, isSingle) {
  const totalCell = tr.querySelector('[data-total]');
  const cfg = CONFIG[ME.activeClass?.classNum];
  const passmark = cfg?.passmark ?? 40;
  let total = null;

  if (isSingle) {
    const inp = tr.querySelector('[data-field="singleMark"]');
    if (inp.value !== '') total = parseFloat(inp.value) || 0;
  } else {
    const ia = tr.querySelector('[data-field="IA"]');
    const ut = tr.querySelector('[data-field="UT"]');
    const te = tr.querySelector('[data-field="TE"]');
    const fields = [ia, te];
    if (ut) fields.splice(1, 0, ut);
    if (fields.some(f => f && f.value !== ''))
      total = fields.reduce((sum, f) => sum + (f ? (parseFloat(f.value) || 0) : 0), 0);
  }

  if (total === null) {
    totalCell.textContent = '—';
    totalCell.className = 'me-total-cell empty';
  } else {
    totalCell.textContent = total;
    totalCell.className = `me-total-cell ${total >= passmark ? 'pass' : 'fail'}`;
  }
}

function scheduleSave(studentId, tr, isSingle) {
  ME.pendingSaves.set(studentId, collectRowData(tr, isSingle));
  clearTimeout(ME.saveTimer);
  ME.saveTimer = setTimeout(() => flushSaves(), 800);
}

function collectRowData(tr, isSingle) {
  const { subjectKey, classNum } = ME.activeClass;
  const cfg = CONFIG[classNum];
  const isSenior = cfg?.markScheme === 'senior';
  const academic = {};
  if (isSingle) {
    const val = parseFloat(tr.querySelector('[data-field="singleMark"]').value);
    academic[subjectKey] = { singleMark: isNaN(val) ? null : val, total: isNaN(val) ? null : val };
  } else if (isSenior) {
    const ia = parseFloat(tr.querySelector('[data-field="IA"]').value);
    const te = parseFloat(tr.querySelector('[data-field="TE"]').value);
    const total = (!isNaN(ia)||!isNaN(te)) ? (isNaN(ia)?0:ia)+(isNaN(te)?0:te) : null;
    academic[subjectKey] = { IA: isNaN(ia)?null:ia, TE: isNaN(te)?null:te, total };
  } else {
    const ia = parseFloat(tr.querySelector('[data-field="IA"]').value);
    const ut = parseFloat(tr.querySelector('[data-field="UT"]').value);
    const te = parseFloat(tr.querySelector('[data-field="TE"]').value);
    const total = (!isNaN(ia)||!isNaN(ut)||!isNaN(te))
      ? (isNaN(ia)?0:ia)+(isNaN(ut)?0:ut)+(isNaN(te)?0:te) : null;
    academic[subjectKey] = { IA: isNaN(ia)?null:ia, UT: isNaN(ut)?null:ut, TE: isNaN(te)?null:te, total };
  }
  return academic;
}

async function flushSaves() {
  if (!ME.pendingSaves.size || !ME.activeClass) return;
  const { classId, term } = ME.activeClass;
  const termKey = `${classId}_${term}`;
  const batch   = db.batch();
  showSaveIndicator('Saving…');

  for (const [studentId, academic] of ME.pendingSaves) {
    const ref = db.collection('marks').doc(termKey).collection('students').doc(studentId);
    // Pass the nested object — set({merge:true}) recursively merges nested maps,
    // so academics.{otherSubject} is preserved. Dot-notation keys ("academics.x")
    // would NOT work here: set() treats them as literal top-level field names
    // with a dot in them; only update() interprets dots as field paths.
    batch.set(ref, {
      academics:     academic,
      status:        'draft',
      lastUpdatedBy: ME.user.uid,
      lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  ME.pendingSaves.clear();

  try {
    await batch.commit();
    hideSaveIndicator('Saved ✓');
  } catch (err) {
    console.error('Save failed:', err);
    hideSaveIndicator('Save failed ✗');
    alert('Save failed: ' + (err.message || err.code || 'unknown error') +
          '\n\nMost likely cause: Firestore security rules for /marks are not deployed.' +
          '\nRun:  firebase deploy --only firestore:rules');
  }
}

$('btnSaveDraft').addEventListener('click', async () => {
  collectAllRowsAndSchedule();
  await flushSaves();
});

function collectAllRowsAndSchedule() {
  const { subjectKey, classNum } = ME.activeClass;
  const cfg      = CONFIG[classNum];
  const subj     = cfg?.subjects.find(s => s.key === subjectKey);
  const isSingle = subj?.singleTotal === true;
  document.querySelectorAll('#gridTbody tr').forEach(tr => {
    const sid = tr.dataset.studentId;
    if (sid) ME.pendingSaves.set(sid, collectRowData(tr, isSingle));
  });
}

$('btnSubmit').addEventListener('click', () => {
  const { subjectKey, classNum } = ME.activeClass;
  const subj     = CONFIG[classNum]?.subjects.find(s => s.key === subjectKey);
  const isSingle = subj?.singleTotal === true;
  const isSenior = CONFIG[classNum]?.markScheme === 'senior';
  let hasEmpty    = false;
  let hasOverLimit = false;

  document.querySelectorAll('#gridTbody tr').forEach(tr => {
    const fields = isSingle ? ['singleMark'] : (isSenior ? ['IA','TE'] : ['IA','UT','TE']);
    fields.forEach(f => {
      const inp = tr.querySelector(`[data-field="${f}"]`);
      if (!inp) return;
      if (inp.value === '') { hasEmpty = true; return; }
      const max = parseInt(inp.dataset.max);
      const val = parseFloat(inp.value);
      if (isNaN(val) || val < 0 || val > max) {
        hasOverLimit = true;
        inp.classList.add('error');
        inp.title = `Maximum allowed: ${max}`;
      }
    });
  });

  let msg = '';
  let canSubmit = true;

  if (hasOverLimit) {
    const scheme = isSingle ? 'Max /100'
      : isSenior ? 'IA max: 20, TE max: 80'
      : 'IA max: 10, UT max: 30, TE max: 60';
    msg = `Some marks exceed the allowed maximum (${scheme}). The highlighted cells must be corrected before submitting. You can still save a draft.`;
    canSubmit = false;
  } else if (hasEmpty) {
    msg = 'Some students have missing marks. Please fill all entries before submitting.';
    canSubmit = false;
  } else {
    msg = 'This will notify the class teacher that marks are ready for review. You will not be able to edit marks once submitted.';
  }

  $('submitModalMsg').textContent = msg;
  $('btnConfirmSubmit').style.display = canSubmit ? '' : 'none';
  $('submitModal').classList.remove('hidden');
});

$('btnCancelSubmit').addEventListener('click', () => $('submitModal').classList.add('hidden'));

$('btnConfirmSubmit').addEventListener('click', async () => {
  $('submitModal').classList.add('hidden');
  $('btnSubmit').disabled = true;
  showSaveIndicator('Submitting…');
  collectAllRowsAndSchedule();

  const { classId, term, subjectLabel, subjectKey } = ME.activeClass;
  const termKey   = `${classId}_${term}`;
  const submitKey = subjectKey || subjectLabel;
  const batch     = db.batch();
  const stamp     = firebase.firestore.FieldValue.serverTimestamp();

  // Single atomic batch: marks + submission flag together.
  // Either everything succeeds, or nothing changes — no half-submitted state.
  // Use nested-map syntax (NOT dot-notation keys) because set({merge:true})
  // performs deep merge on nested maps and treats dotted keys as literal names.
  document.querySelectorAll('#gridTbody tr').forEach(tr => {
    const sid = tr.dataset.studentId;
    if (!sid) return;
    const ref = db.collection('marks').doc(termKey).collection('students').doc(sid);

    const payload = {
      status:             'draft',
      lastUpdatedBy:      ME.user.uid,
      lastUpdatedAt:      stamp,
      submittedSubjects:  { [submitKey]: { by: ME.user.uid, at: stamp, status: 'submitted' } }
    };
    const academic = ME.pendingSaves.get(sid);
    if (academic) payload.academics = academic;

    batch.set(ref, payload, { merge: true });
  });
  ME.pendingSaves.clear();

  try {
    await batch.commit();
    hideSaveIndicator('Submitted ✓');
    document.querySelectorAll('.me-mark-input').forEach(inp => inp.disabled = true);
    $('btnSubmit').textContent = '✓ Submitted';
  } catch (err) {
    console.error(err);
    hideSaveIndicator('Submit failed ✗');
    $('btnSubmit').disabled = false;
    alert('Submit failed: ' + (err.message || err.code || 'unknown error'));
  }
});

$('btnBackToDashboard').addEventListener('click', async () => {
  clearTimeout(ME.saveTimer);
  if (ME.pendingSaves.size) await flushSaves();
  ME.activeClass = null;
  await renderSubjectDashboard();
  showScreen('screenDashboard');
});

// ════════════════════════════════════════════════════════════════════════════════
// CLASS TEACHER — PHASE 2
// ════════════════════════════════════════════════════════════════════════════════

// ─── CT DASHBOARD ─────────────────────────────────────────────────────────────
async function renderCTDashboard() {
  const classId  = ME.ctClassId;
  const classNum = ME.ctClassNum;
  const cfg      = CONFIG[classNum];

  $('ctDashTitle').textContent   = `Class Teacher Dashboard — Class ${classId}`;
  $('ctDashTeacher').textContent = ME.teacher.name || '';

  if (!cfg || !classId) {
    $('ctHyStatusBody').innerHTML = '<tr><td colspan="3" class="me-empty">Class config not found.</td></tr>';
    return;
  }

  // Subjects that count (non-aggregate or leaf entries teachers enter)
  const enterableSubjects = cfg.subjects.filter(s => !s.isAggregate);

  for (const term of ['HY', 'FT']) {
    const termKey  = `${classId}_${term}`;
    const tbody    = $(term === 'HY' ? 'ctHyStatusBody' : 'ctFtStatusBody');
    const progEl   = $(term === 'HY' ? 'ctHyProgress'  : 'ctFtProgress');
    const lockBtn  = $(term === 'HY' ? 'ctBtnReviewHY' : 'ctBtnReviewFT');
    tbody.innerHTML = '<tr><td colspan="3" class="me-loading"><div class="me-spinner"></div></td></tr>';

    try {
      // Scan a wide sample (not just 1 doc) and AGGREGATE submission state across
      // students — otherwise a single student missing marks would mis-report a
      // subject as "not submitted" for the whole class.
      const snap = await db.collection('marks').doc(termKey).collection('students').limit(100).get();
      const submitted = {};
      let isLocked = false;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.status === 'locked') isLocked = true;
        const sub = d.submittedSubjects || {};
        for (const [k, v] of Object.entries(sub)) {
          // Keep the "best" record: prefer submitted > anything-else
          if (!submitted[k] || (v?.status === 'submitted' && submitted[k]?.status !== 'submitted')) {
            submitted[k] = v;
          }
        }
      });
      const sampleData = { submittedSubjects: submitted, status: isLocked ? 'locked' : (snap.empty ? '' : 'draft') };

      let submittedCount = 0;
      tbody.innerHTML = '';

      enterableSubjects.forEach(subj => {
        const sub = submitted[subj.key] || submitted[subj.label] || {};
        let status = 'not-started';
        if (isLocked) status = 'locked';
        else if (sub.status === 'submitted') { status = 'submitted'; submittedCount++; }
        else if (sampleData.status === 'draft') status = 'draft';

        const tr = el('tr');
        tr.innerHTML = `
          <td>${escHtml(subj.label)}</td>
          <td style="font-size:0.8rem;color:var(--me-muted)">${sub.by ? '(submitted)' : '—'}</td>
          <td>${statusBadge(status)}</td>
        `;
        tbody.appendChild(tr);
      });

      const total = enterableSubjects.length;
      progEl.textContent = isLocked
        ? `All records locked`
        : `${submittedCount} of ${total} subjects submitted`;

      lockBtn.disabled = !isLocked && submittedCount < total;
      lockBtn.dataset.term = term;
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="3" class="me-empty">No data yet.</td></tr>';
      if (progEl) progEl.textContent = '0 of ' + enterableSubjects.length + ' subjects submitted';
      if (lockBtn) lockBtn.disabled = true;
    }
  }
}

$('ctBtnReviewHY').addEventListener('click', () => openStudentList('HY'));
$('ctBtnReviewFT').addEventListener('click', () => openStudentList('FT'));
$('ctBtnLogout').addEventListener('click', () => auth.signOut());
$('ctBtnRefresh').addEventListener('click', async () => { await renderCTDashboard(); });

// ─── STUDENT LIST ─────────────────────────────────────────────────────────────
async function openStudentList(term) {
  const classId  = ME.ctClassId;
  const classNum = ME.ctClassNum;
  ME.activeClass = { classId, classNum, term };

  showScreen('screenStudentList');
  $('slTitle').textContent    = `Class ${classId} — ${term === 'HY' ? 'Half Yearly' : 'Final Term'} — Student Records`;
  $('slSubtitle').textContent = 'Academic Year 2026–2027';
  $('slTableBody').innerHTML  = '<tr><td colspan="8" class="me-loading"><div class="me-spinner"></div><br>Loading…</td></tr>';

  try {
    const ctClassStr = String(classNumFromId(classId));
    const studSnap = await db.collection('students')
      .where('class', '==', ctClassStr)
      .get();

    const students = studSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0));

    // Fetch BOTH terms for all students in parallel
    const [hySnaps, ftSnaps] = await Promise.all([
      Promise.all(students.map(s => db.collection('marks').doc(`${classId}_HY`).collection('students').doc(s.id).get())),
      Promise.all(students.map(s => db.collection('marks').doc(`${classId}_FT`).collection('students').doc(s.id).get()))
    ]);
    const existingHY = {}, existingFT = {};
    hySnaps.forEach((snap, i) => { if (snap.exists) existingHY[students[i].id] = snap.data(); });
    ftSnaps.forEach((snap, i) => { if (snap.exists) existingFT[students[i].id] = snap.data(); });

    // Compute grand totals for every student
    const cfg = CONFIG[classNum];
    const maxMarks = cfg?.grandTotalMax || 0;

    const hyEntries = students.map(s => ({ id: s.id, total: calcStudentTotal(existingHY[s.id], classNum) }));
    const ftEntries = students.map(s => ({ id: s.id, total: calcStudentTotal(existingFT[s.id], classNum) }));

    const hyRanks = computeRanks(hyEntries);
    const ftRanks = computeRanks(ftEntries);

    // Auto-save computed ranks to Firestore
    await autoSaveRanks(students, existingHY, existingFT, hyRanks, ftRanks, classId);

    renderStudentList(students, existingHY, existingFT, hyRanks, ftRanks, maxMarks, term, classNum);
  } catch (err) {
    $('slTableBody').innerHTML = `<tr><td colspan="8" class="me-empty">Error: ${err.message}</td></tr>`;
  }
}

function calcStudentTotal(markData, classNum) {
  const cfg = CONFIG[classNum];
  if (!cfg || !markData?.academics) return null;
  const acad = markData.academics;
  let total = 0;
  cfg.subjects.filter(s => s.countInTotal).forEach(subj => {
    if (subj.isAggregate) {
      subj.components.forEach(cKey => {
        total += (acad[cKey]?.total ?? 0);
      });
    } else {
      total += (acad[subj.key]?.total ?? 0);
    }
  });
  return total;
}

// Returns true only if every countInTotal (non-aggregate leaf) subject has a total entered
function isStudentTotalComplete(markData, classNum) {
  const cfg = CONFIG[classNum];
  if (!cfg || !markData?.academics) return false;
  const acad = markData.academics;
  const leafSubjects = cfg.subjects.filter(s => s.countInTotal && !s.isAggregate);
  return leafSubjects.every(subj => acad[subj.key]?.total != null);
}

// Compute ranks for all students given a list of { id, total } entries.
// Students with null/incomplete totals are unranked.
function computeRanks(entries) {
  const ranked = entries.filter(e => e.total !== null && e.total !== undefined);
  ranked.sort((a, b) => b.total - a.total);
  const rankMap = {};
  ranked.forEach((e, i) => { rankMap[e.id] = i + 1; });
  return rankMap;
}

async function autoSaveRanks(students, existingHY, existingFT, hyRanks, ftRanks, classId) {
  const totalStudents = students.length;
  try {
    const batch = db.batch();
    students.forEach(s => {
      const hyRank = hyRanks[s.id] || null;
      const ftRank = ftRanks[s.id] || null;
      const rankPayload = { hyRank, ftRank, totalStudents, autoComputed: true };
      for (const t of ['HY', 'FT']) {
        const ref = db.collection('marks').doc(`${classId}_${t}`)
                      .collection('students').doc(s.id);
        batch.set(ref, { rank: rankPayload, lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.warn('autoSaveRanks failed:', err);
  }
}

function renderStudentList(students, existingHY, existingFT, hyRanks, ftRanks, maxMarks, term, classNum) {
  const tbody = $('slTableBody');
  tbody.innerHTML = '';

  // Update table header to show both terms
  const thead = tbody.closest('table')?.querySelector('thead tr');
  if (thead) {
    thead.innerHTML = '<th>#</th><th>Student Name</th><th>HY Total</th><th>HY%</th><th>FT Total</th><th>FT%</th><th>Rank</th><th>Status</th><th>Action</th>';
  }

  const fmt = v => (Math.round(v * 10) / 10).toFixed(1);

  students.forEach((student, idx) => {
    const hyData   = existingHY[student.id] || {};
    const ftData   = existingFT[student.id] || {};
    const termData = term === 'HY' ? hyData : ftData;
    const isLocked = termData.status === 'locked';

    const hyTotal = calcStudentTotal(hyData, classNum);
    const ftTotal = calcStudentTotal(ftData, classNum);
    const hyPct   = (maxMarks > 0 && hyTotal !== null) ? fmt((hyTotal / maxMarks) * 100) + '%' : '—';
    const ftPct   = (maxMarks > 0 && ftTotal !== null) ? fmt((ftTotal / maxMarks) * 100) + '%' : '—';
    const hyRank  = hyRanks[student.id] || '—';
    const ftRank  = ftRanks[student.id] || '—';
    const rankDisplay = term === 'HY' ? hyRank : ftRank;

    const tr = el('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="font-weight:500">${escHtml(student.name)}</td>
      <td>${hyTotal !== null ? hyTotal : '—'}</td>
      <td style="color:var(--me-primary);font-weight:600">${hyPct}</td>
      <td>${ftTotal !== null ? ftTotal : '—'}</td>
      <td style="color:var(--me-primary);font-weight:600">${ftPct}</td>
      <td style="font-weight:700">${rankDisplay}</td>
      <td>${isLocked
        ? '<span class="status-badge status-locked">&#128274; Locked</span>'
        : '<span class="status-badge status-draft">&#128275; Open</span>'}</td>
      <td>
        <button class="btn btn-sm btn-primary ct-fill-btn" data-sid="${student.id}">
          ${isLocked ? '&#128274; View' : '&#9998; Fill &amp; Lock'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const allStudents = students;
  tbody.querySelectorAll('.ct-fill-btn').forEach(btn => {
    btn.addEventListener('click', () => openStudentForm(btn.dataset.sid, allStudents, term === 'HY' ? existingHY : existingFT));
  });

  // Lock All button
  const existing = term === 'HY' ? existingHY : existingFT;
  const allLocked = students.every(s => existing[s.id]?.status === 'locked');
  $('btnLockAll').disabled = allLocked;
  $('btnLockAll').textContent = allLocked ? '&#128274; All Locked' : '&#128274; Lock All Records';
}

$('btnBackToCTDash').addEventListener('click', async () => {
  ME.activeClass = null;
  await renderCTDashboard();
  showScreen('screenCTDashboard');
});

$('btnLockAll').addEventListener('click', () => {
  $('lockModalMsg').textContent = `Lock ALL student records for Class ${ME.ctClassId}? Subject teachers will no longer be able to edit marks. This cannot be undone.`;
  $('lockModal').dataset.mode = 'all';
  $('lockModal').classList.remove('hidden');
});

// ─── STUDENT FORM ─────────────────────────────────────────────────────────────
async function openStudentForm(studentId, students, existing) {
  const student  = students.find(s => s.id === studentId);
  const classId  = ME.ctClassId;
  const classNum = ME.ctClassNum;
  const term     = ME.activeClass.term;
  const termKey  = `${classId}_${term}`;

  ME.activeStudent = { studentId, student, classId, classNum, term };

  showScreen('screenStudentForm');
  $('sfStudentName').textContent = student.name || '—';
  $('sfClass').textContent       = `Class ${classId}`;
  $('sfTerm').textContent        = term === 'HY' ? 'Half Yearly' : 'Final Term';
  $('sfRollNo').textContent      = student.rollNo || '—';

  // Fetch both terms
  let hyData = {}, ftData = {};
  try {
    const [hySnap, ftSnap] = await Promise.all([
      db.collection('marks').doc(`${classId}_HY`).collection('students').doc(studentId).get(),
      db.collection('marks').doc(`${classId}_FT`).collection('students').doc(studentId).get()
    ]);
    if (hySnap.exists) hyData = hySnap.data();
    if (ftSnap.exists) ftData = ftSnap.data();
  } catch (_) {}

  ME.activeStudent.hyData = hyData;
  ME.activeStudent.ftData = ftData;

  const isLocked = (term === 'HY' ? hyData : ftData).status === 'locked';

  renderAcademicSummary(hyData, ftData, classNum);
  renderCoScholastic(hyData, ftData, classNum, isLocked);
  renderAttendance(hyData, ftData, isLocked);
  renderRemarks(hyData, ftData, isLocked);
  renderRank(hyData, ftData, isLocked);
  renderResult(hyData, ftData, classNum);

  $('btnLockRecord').style.display = isLocked ? 'none' : '';
  $('sfLockStatus').style.display  = isLocked ? '' : 'none';
  $('btnSaveCT').disabled           = isLocked;
}

function getSubjectTotal(academics, key, subj) {
  const a = academics?.[key];
  if (!a) return null;
  return a.total ?? null;
}

function renderAcademicSummary(hyData, ftData, classNum) {
  const cfg  = CONFIG[classNum];
  const wrap = $('sfAcademicTable');
  if (!cfg) { wrap.innerHTML = '<p class="me-empty">Config not found.</p>'; return; }

  const subjects = cfg.subjects.filter(s => s.countInTotal);
  let hyGrand = 0, ftGrand = 0;

  const rows = subjects.map(subj => {
    const hyAcad = hyData.academics || {};
    const ftAcad = ftData.academics || {};

    let hyTotal = null, ftTotal = null;

    if (subj.isAggregate) {
      // Sum components
      let hySum = 0, ftSum = 0, hyOk = true, ftOk = true;
      subj.components.forEach(cKey => {
        const hc = hyAcad[cKey]?.total; const fc = ftAcad[cKey]?.total;
        if (hc == null) hyOk = false; else hySum += hc;
        if (fc == null) ftOk = false; else ftSum += fc;
      });
      hyTotal = hyOk ? hySum : null;
      ftTotal = ftOk ? ftSum : null;
    } else {
      hyTotal = hyAcad[subj.key]?.total ?? null;
      ftTotal = ftAcad[subj.key]?.total ?? null;
    }

    const consol = (hyTotal != null && ftTotal != null) ? hyTotal + ftTotal : null;
    if (hyTotal != null) hyGrand += hyTotal;
    if (ftTotal != null) ftGrand += ftTotal;

    const hyGrade = hyTotal != null ? computeGrade(hyTotal) : '—';
    const ftGrade = ftTotal != null ? computeGrade(ftTotal) : '—';

    return `<tr>
      <td>${escHtml(subj.label)}</td>
      <td class="${hyTotal != null && hyTotal < 40 ? 'ct-fail-cell' : ''}">${hyTotal ?? '—'}</td>
      <td class="${ftTotal != null && ftTotal < 40 ? 'ct-fail-cell' : ''}">${ftTotal ?? '—'}</td>
      <td>${consol ?? '—'}</td>
      <td><span class="grade-pill">${hyGrade}</span></td>
      <td><span class="grade-pill">${ftGrade}</span></td>
    </tr>`;
  }).join('');

  const grandTotalMax = cfg.grandTotalMax || 0;
  const fmtPct = v => grandTotalMax > 0 ? (Math.round((v / grandTotalMax) * 1000) / 10).toFixed(1) + '%' : '—';
  const hyGrade  = computeGrade(hyGrand, grandTotalMax);
  const ftGrade  = computeGrade(ftGrand, grandTotalMax);

  wrap.innerHTML = `
    <table class="me-table ct-academic-table">
      <thead><tr>
        <th>Subject</th><th>HY Total</th><th>FT Total</th>
        <th>Consol /200</th><th>HY Grade</th><th>FT Grade</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="ct-grand-row">
          <td>Grand Total</td>
          <td>${hyGrand}</td><td>${ftGrand}</td>
          <td>${hyGrand + ftGrand}</td><td>—</td><td>—</td>
        </tr>
        <tr class="ct-grand-row" style="background:rgba(var(--me-primary-rgb,61,79,42),0.08)">
          <td>Percentage</td>
          <td style="font-weight:700;color:var(--me-primary)">${fmtPct(hyGrand)}</td>
          <td style="font-weight:700;color:var(--me-primary)">${fmtPct(ftGrand)}</td>
          <td style="font-weight:700;color:var(--me-primary)">${grandTotalMax > 0 ? (Math.round(((hyGrand + ftGrand) / (grandTotalMax * 2)) * 1000) / 10).toFixed(1) + '%' : '—'}</td>
          <td><span class="grade-pill">${hyGrade}</span></td>
          <td><span class="grade-pill">${ftGrade}</span></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderCoScholastic(hyData, ftData, classNum, isLocked) {
  const cfg  = CONFIG[classNum];
  const wrap = $('sfCoScholastic');
  if (!cfg) { wrap.innerHTML = ''; return; }

  const coSch = hyData.coScholastic || ftData.coScholastic || {};
  const dis   = isLocked ? 'disabled' : '';

  wrap.innerHTML = cfg.coScholastic.map(act => {
    const t1 = coSch[act.key]?.T1 || '';
    const t2 = coSch[act.key]?.T2 || '';
    const opts = g => GRADES.map(gr => `<option value="${gr}" ${gr===g?'selected':''}>${gr}</option>`).join('');
    return `
      <div class="ct-cosch-item">
        <span class="ct-cosch-label">${escHtml(act.label)}</span>
        <select class="ct-cosch-select" data-key="${act.key}" data-term="T1" ${dis}>
          <option value="">T1</option>${opts(t1)}
        </select>
        <select class="ct-cosch-select" data-key="${act.key}" data-term="T2" ${dis}>
          <option value="">T2</option>${opts(t2)}
        </select>
      </div>`;
  }).join('');
}

function renderAttendance(hyData, ftData, isLocked) {
  const dis = isLocked ? 'disabled' : '';
  const ha  = hyData.attendance || {};
  const fa  = ftData.attendance || {};
  $('sfHyPresent').value   = ha.present ?? '';
  $('sfHyTotal').value     = ha.total   ?? '';
  $('sfFtPresent').value   = fa.present ?? '';
  $('sfFtTotal').value     = fa.total   ?? '';
  [$('sfHyPresent'),$('sfHyTotal'),$('sfFtPresent'),$('sfFtTotal')].forEach(inp => inp.disabled = isLocked);
}

function renderRemarks(hyData, ftData, isLocked) {
  const r   = hyData.remarks || ftData.remarks || {};
  const dis = isLocked;
  $('sfHyRemark').value        = r.halfYearly  || '';
  $('sfFtRemark').value        = r.finalTerm   || '';
  $('sfPrincipalRemark').value = r.principal   || '';
  [$('sfHyRemark'),$('sfFtRemark'),$('sfPrincipalRemark')].forEach(ta => ta.disabled = dis);
}

function renderRank(hyData, ftData, isLocked) {
  const rank = hyData.rank || ftData.rank || {};
  $('sfHyRank').value        = rank.hyRank        ?? '';
  $('sfFtRank').value        = rank.ftRank        ?? '';
  $('sfTotalStudents').value = rank.totalStudents ?? '';

  // If auto-computed, mark fields as read-only (still allow CT override by unlocking)
  const autoComputed = !!rank.autoComputed;
  [$('sfHyRank'), $('sfFtRank'), $('sfTotalStudents')].forEach(inp => {
    inp.disabled   = isLocked || autoComputed;
    inp.title      = autoComputed ? 'Auto-calculated from all students\' marks. Open student list to recalculate.' : '';
    inp.style.background = autoComputed ? 'rgba(0,128,0,0.07)' : '';
  });

  // Show/hide auto badge
  let badge = $('sfRankAutoBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'sfRankAutoBadge';
    badge.style.cssText = 'font-size:0.72rem;color:#3a7a3a;margin-top:4px;font-style:italic;';
    const rankSection = $('sfHyRank')?.closest('.ct-section-block') || $('sfHyRank')?.parentElement;
    if (rankSection) rankSection.appendChild(badge);
  }
  badge.textContent = autoComputed ? '✓ Ranks auto-calculated from class marks' : '';
}

function renderResult(hyData, ftData, classNum) {
  const cfg = CONFIG[classNum];
  if (!cfg) return;
  const passmark  = cfg.passmark ?? 40;
  const countSubj = cfg.subjects.filter(s => s.countInTotal && !s.isAggregate);

  let hyFail = false, ftFail = false;
  countSubj.forEach(subj => {
    const ht = hyData.academics?.[subj.key]?.total;
    const ft = ftData.academics?.[subj.key]?.total;
    if (ht != null && ht < passmark) hyFail = true;
    if (ft != null && ft < passmark) ftFail = true;
  });

  let result = 'PASS', cls = 'ct-result-pass';
  if (hyFail && ftFail)       { result = 'FAIL';        cls = 'ct-result-fail'; }
  else if (hyFail || ftFail)  { result = 'COMPARTMENT'; cls = 'ct-result-comp'; }

  $('sfResultBadge').textContent = result;
  $('sfResultBadge').className   = `ct-result-badge ${cls}`;
}

// ─── CT SAVE & LOCK ───────────────────────────────────────────────────────────
$('btnSaveCT').addEventListener('click', async () => {
  await saveCTData();
  hideSaveIndicator('Saved ✓');
});

async function saveCTData() {
  const { studentId, classId, term, hyData, ftData } = ME.activeStudent;
  showSaveIndicator('Saving…');

  const coScholastic = {};
  document.querySelectorAll('.ct-cosch-select').forEach(sel => {
    const key  = sel.dataset.key;
    const term = sel.dataset.term;
    if (!coScholastic[key]) coScholastic[key] = {};
    coScholastic[key][term] = sel.value;
  });

  const attendance = {
    hyPresent: parseInt($('sfHyPresent').value) || 0,
    hyTotal:   parseInt($('sfHyTotal').value)   || 0,
    ftPresent: parseInt($('sfFtPresent').value)  || 0,
    ftTotal:   parseInt($('sfFtTotal').value)    || 0
  };

  const remarks = {
    halfYearly: $('sfHyRemark').value.trim(),
    finalTerm:  $('sfFtRemark').value.trim(),
    principal:  $('sfPrincipalRemark').value.trim()
  };

  const rank = {
    hyRank:        parseInt($('sfHyRank').value)        || null,
    ftRank:        parseInt($('sfFtRank').value)        || null,
    totalStudents: parseInt($('sfTotalStudents').value) || null
  };

  // Write same data to both HY and FT docs so it's always accessible
  const batch = db.batch();
  for (const t of ['HY','FT']) {
    const ref = db.collection('marks').doc(`${classId}_${t}`)
                  .collection('students').doc(studentId);
    batch.set(ref, {
      coScholastic, attendance, remarks, rank,
      lastUpdatedBy: ME.user.uid,
      lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
}

$('btnLockRecord').addEventListener('click', () => {
  $('lockModalMsg').textContent = 'Lock this student\'s record? Subject teachers will no longer be able to edit marks. This cannot be undone.';
  $('lockModal').dataset.mode   = 'single';
  $('lockModal').classList.remove('hidden');
});

$('btnCancelLock').addEventListener('click', () => $('lockModal').classList.add('hidden'));

$('btnConfirmLock').addEventListener('click', async () => {
  $('lockModal').classList.add('hidden');
  const mode = $('lockModal').dataset.mode;

  if (mode === 'single') {
    await saveCTData();
    await lockSingleRecord(ME.activeStudent.studentId);
    $('btnLockRecord').style.display = 'none';
    $('sfLockStatus').style.display  = '';
    $('btnSaveCT').disabled           = true;
    hideSaveIndicator('Locked ✓');
  } else {
    await lockAllRecords();
  }
});

async function lockSingleRecord(studentId) {
  const { classId } = ME.activeStudent;
  showSaveIndicator('Locking…');
  const batch = db.batch();
  for (const t of ['HY','FT']) {
    const ref = db.collection('marks').doc(`${classId}_${t}`)
                  .collection('students').doc(studentId);
    batch.set(ref, {
      status:        'locked',
      lastUpdatedBy: ME.user.uid,
      lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
}

async function lockAllRecords() {
  const classId = ME.ctClassId;
  showSaveIndicator('Locking all…');
  try {
    for (const t of ['HY','FT']) {
      const termKey = `${classId}_${t}`;
      const snap    = await db.collection('marks').doc(termKey).collection('students').get();
      const batch   = db.batch();
      snap.forEach(doc => {
        batch.update(doc.ref, {
          status:        'locked',
          lastUpdatedBy: ME.user.uid,
          lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    }
    hideSaveIndicator('All locked ✓');
    await openStudentList(ME.activeClass.term);
  } catch (err) {
    console.error(err);
    hideSaveIndicator('Lock failed ✗');
  }
}

$('btnBackToStudentList').addEventListener('click', async () => {
  ME.activeStudent = null;
  await openStudentList(ME.activeClass.term);
});
