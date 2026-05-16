/**
 * form.js — SFDS Report Card System
 * Mark entry form logic + dynamic table rendering + auto-calculations
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONSTANTS & STATE
   ═══════════════════════════════════════════════════════════════════════════ */
const GRADE_SCALE = [
  { min: 90, grade: 'O'   },
  { min: 80, grade: 'A+'  },
  { min: 70, grade: 'A'   },
  { min: 60, grade: 'B+'  },
  { min: 50, grade: 'B'   },
  { min: 40, grade: 'C'   },
  { min: 33, grade: 'D'   },
  { min: 0,  grade: 'F'   }
];

const CO_SCHOLASTIC_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];

let currentClass = null;
let currentConfig = null;

/* ═══════════════════════════════════════════════════════════════════════════
   2. DOM REFERENCES
   ═══════════════════════════════════════════════════════════════════════════ */
const els = {
  classSelect:      document.getElementById('classSelect'),
  sectionInput:     document.getElementById('sectionInput'),
  studentName:      document.getElementById('studentName'),
  rollNumber:       document.getElementById('rollNumber'),
  admissionNo:      document.getElementById('admissionNo'),
  dob:              document.getElementById('dob'),
  classTeacher:     document.getElementById('classTeacher'),
  house:            document.getElementById('house'),
  session:          document.getElementById('session'),

  halfYearlyNote:   document.getElementById('halfYearlyNote'),
  finalTermNote:    document.getElementById('finalTermNote'),

  hyHeaderRow:      document.getElementById('halfYearlyHeaderRow'),
  hyBody:           document.getElementById('halfYearlyBody'),
  hyTable:          document.getElementById('halfYearlyTable'),

  ftHeaderRow:      document.getElementById('finalTermHeaderRow'),
  ftBody:           document.getElementById('finalTermBody'),
  ftTable:          document.getElementById('finalTermTable'),

  hyPresent:        document.getElementById('hyPresent'),
  hyTotalDays:      document.getElementById('hyTotalDays'),
  ftPresent:        document.getElementById('ftPresent'),
  ftTotalDays:      document.getElementById('ftTotalDays'),

  coScholasticContainer: document.getElementById('coScholasticContainer'),

  hyRemark:         document.getElementById('hyRemark'),
  ftRemark:         document.getElementById('ftRemark'),

  hyRank:           document.getElementById('hyRank'),
  ftRank:           document.getElementById('ftRank'),
  totalStudents:    document.getElementById('totalStudents'),

  resultBadge:      document.getElementById('resultBadge'),

  headerTitle:      document.querySelector('.header-text h1'),

  btnPreview:       document.getElementById('btnPreview'),
  btnPrint:         document.getElementById('btnPrint'),
  btnSaveJson:      document.getElementById('btnSaveJson'),
  btnLoadJson:      document.getElementById('btnLoadJson'),
  btnClear:         document.getElementById('btnClear'),
  btnAddToClass:    document.getElementById('btnAddToClass'),
  btnViewMarksheet: document.getElementById('btnViewMarksheet')
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function getGradeFromMarks(marks) {
  for (const g of GRADE_SCALE) {
    if (marks >= g.min) return g.grade;
  }
  return 'F';
}

function getGradeFromPercentage(pct) {
  return getGradeFromMarks(pct);
}

function formatPct(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. TABLE RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */
function onClassChange() {
  const val = els.classSelect.value;
  if (!val) return;

  currentClass = parseInt(val, 10);
  currentConfig = getClassConfig(currentClass);
  if (!currentConfig) return;

  // Update header school name
  if (els.headerTitle) {
    els.headerTitle.textContent = currentConfig.schoolName;
  }

  // Show/hide note boxes
  const noteText = currentConfig.note || '';
  if (els.halfYearlyNote) {
    els.halfYearlyNote.textContent = noteText;
    els.halfYearlyNote.classList.toggle('visible', !!noteText);
  }
  if (els.finalTermNote) {
    els.finalTermNote.textContent = noteText;
    els.finalTermNote.classList.toggle('visible', !!noteText);
  }

  renderMarksTable('hy');
  renderMarksTable('ft');
  renderCoScholastic();
  resetCalculatedDisplays();
}

function renderMarksTable(prefix) {
  const isHY = prefix === 'hy';
  const scheme = currentConfig.markScheme;
  const isStandard = scheme === 'standard';
  const subjects = currentConfig.subjects;

  const headerRow = isHY ? els.hyHeaderRow : els.ftHeaderRow;
  const tbody = isHY ? els.hyBody : els.ftBody;
  const table = isHY ? els.hyTable : els.ftTable;
  const tfoot = table.querySelector('tfoot');

  // ── Build header ──
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th>';
  if (!isHY) h += '<th>Consol. /200</th>';
  h += '<th>Grade</th>';
  headerRow.innerHTML = h;

  // ── Build body ──
  let b = '';
  for (const subj of subjects) {
    b += buildSubjectRow(prefix, subj, isStandard, isHY);
  }
  tbody.innerHTML = b;

  // ── Build footer ──
  const labelSpan = isStandard ? 3 : 2;
  let f = '<tr class="grand-total-row">';
  f += `<td colspan="${labelSpan}" class="label-cell">Grand Total (Max: ${currentConfig.grandTotalMax})</td>`;
  f += `<td class="value-cell" id="${prefix}GrandTotal">0</td>`;
  if (!isHY) {
    f += `<td class="value-cell" id="${prefix}ConsolidatedGrand">0</td>`;
  }
  f += `<td class="value-cell" id="${prefix}Percentage">0%</td>`;
  f += `<td class="value-cell" id="${prefix}Grade">—</td>`;
  f += '</tr>';
  tfoot.innerHTML = f;

  // ── Attach listeners ──
  attachTableListeners(prefix, subjects);
}

function buildSubjectRow(prefix, subj, isStandard, isHY) {
  let cls = 'row-normal';
  if (subj.isAggregate)       cls = 'row-aggregate';
  else if (subj.singleTotal)  cls = 'row-single';
  else if (!subj.countInTotal) cls = 'row-component';

  let html = `<tr class="${cls}" data-key="${subj.key}"><td>${subj.label}</td>`;

  if (subj.isAggregate) {
    const blanks = isStandard ? 3 : 2;
    for (let i = 0; i < blanks; i++) html += '<td>—</td>';
    html += `<td class="cell-total" id="${prefix}_total_${subj.key}">0</td>`;
    if (!isHY) html += `<td class="cell-consol" id="${prefix}_consol_${subj.key}">0</td>`;
    html += `<td class="cell-grade" id="${prefix}_grade_${subj.key}"><span class="grade-pill">—</span></td>`;
  }
  else if (subj.singleTotal) {
    const span = isStandard ? 3 : 2;
    html += `<td colspan="${span}"><input type="number" id="${prefix}_total_${subj.key}" min="0" max="100" placeholder="Total"></td>`;
    html += `<td class="cell-total" id="${prefix}_totaldisp_${subj.key}">0</td>`;
    if (!isHY) html += `<td class="cell-consol" id="${prefix}_consol_${subj.key}">0</td>`;
    html += `<td class="cell-grade" id="${prefix}_grade_${subj.key}"><span class="grade-pill">—</span></td>`;
  }
  else {
    if (isStandard) {
      html += `<td><input type="number" id="${prefix}_ia_${subj.key}"   min="0" max="10" placeholder="IA"></td>`;
      html += `<td><input type="number" id="${prefix}_ut_${subj.key}"   min="0" max="30" placeholder="UT"></td>`;
      html += `<td><input type="number" id="${prefix}_exam_${subj.key}" min="0" max="60" placeholder="TE"></td>`;
    } else {
      html += `<td><input type="number" id="${prefix}_ia_${subj.key}"   min="0" max="20" placeholder="IA"></td>`;
      html += `<td><input type="number" id="${prefix}_exam_${subj.key}" min="0" max="80" placeholder="TE"></td>`;
    }
    html += `<td class="cell-total" id="${prefix}_total_${subj.key}">0</td>`;
    if (!isHY) html += `<td class="cell-consol" id="${prefix}_consol_${subj.key}">0</td>`;
    html += `<td class="cell-grade" id="${prefix}_grade_${subj.key}"><span class="grade-pill">—</span></td>`;
  }

  html += '</tr>';
  return html;
}

function attachTableListeners(prefix, subjects) {
  for (const subj of subjects) {
    if (subj.isAggregate) continue;

    if (subj.singleTotal) {
      const inp = document.getElementById(`${prefix}_total_${subj.key}`);
      if (inp) {
        inp.addEventListener('input', () => { recalculateAll(); });
        inp.addEventListener('blur', () => { enforceMax(inp, 100); recalculateAll(); });
      }
    } else {
      const ia   = document.getElementById(`${prefix}_ia_${subj.key}`);
      const exam = document.getElementById(`${prefix}_exam_${subj.key}`);
      const ut   = document.getElementById(`${prefix}_ut_${subj.key}`);

      const maxIA   = currentConfig.markScheme === 'standard' ? 10 : 20;
      const maxExam = currentConfig.markScheme === 'standard' ? 60 : 80;
      const maxUT   = 30;

      if (ia) {
        ia.addEventListener('input', () => recalculateAll());
        ia.addEventListener('blur', () => { enforceMax(ia, maxIA); recalculateAll(); });
      }
      if (exam) {
        exam.addEventListener('input', () => recalculateAll());
        exam.addEventListener('blur', () => { enforceMax(exam, maxExam); recalculateAll(); });
      }
      if (ut) {
        ut.addEventListener('input', () => recalculateAll());
        ut.addEventListener('blur', () => { enforceMax(ut, maxUT); recalculateAll(); });
      }
    }
  }
}

function enforceMax(input, max) {
  const val = parseFloat(input.value);
  if (isNaN(val)) return;
  if (val < 0) {
    input.value = 0;
    input.classList.add('error');
  } else if (val > max) {
    input.value = max;
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1500);
  } else {
    input.classList.remove('error');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. CO-SCHOLASTIC RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */
function renderCoScholastic() {
  const container = els.coScholasticContainer;
  if (!container) return;
  container.innerHTML = '';

  for (const item of currentConfig.coScholastic) {
    const div = document.createElement('div');
    div.className = 'coscholastic-item';
    div.innerHTML = `
      <label>${item.label}</label>
      <div class="coscholastic-grades">
        <select id="coscholastic_hy_${item.key}" title="Half Yearly Grade">
          <option value="" disabled selected>HY Grade</option>
          ${CO_SCHOLASTIC_GRADES.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <select id="coscholastic_ft_${item.key}" title="Final Term Grade">
          <option value="" disabled selected>FT Grade</option>
          ${CO_SCHOLASTIC_GRADES.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>
    `;
    container.appendChild(div);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. CALCULATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
function calculateSubjectTotal(prefix, subj) {
  if (subj.singleTotal) {
    const inp = document.getElementById(`${prefix}_total_${subj.key}`);
    return clamp(parseFloat(inp?.value) || 0, 0, 100);
  }
  if (subj.isAggregate) {
    let sum = 0;
    for (const compKey of subj.components) {
      const comp = currentConfig.subjects.find(s => s.key === compKey);
      if (comp) sum += calculateSubjectTotal(prefix, comp);
    }
    return sum;
  }
  // Normal subject
  const ia   = parseFloat(document.getElementById(`${prefix}_ia_${subj.key}`)?.value)   || 0;
  const exam = parseFloat(document.getElementById(`${prefix}_exam_${subj.key}`)?.value) || 0;
  let total = ia + exam;
  if (currentConfig.markScheme === 'standard') {
    const ut = parseFloat(document.getElementById(`${prefix}_ut_${subj.key}`)?.value) || 0;
    total += ut;
  }
  return clamp(total, 0, 100);
}

function recalculateAll() {
  if (!currentConfig) return;

  const hyTotals = {};
  const ftTotals = {};

  // Pass 1: compute all raw totals
  for (const subj of currentConfig.subjects) {
    hyTotals[subj.key] = calculateSubjectTotal('hy', subj);
    ftTotals[subj.key] = calculateSubjectTotal('ft', subj);
  }

  // Pass 2: update every row display
  for (const subj of currentConfig.subjects) {
    updateRowDisplay('hy', subj, hyTotals[subj.key]);
    updateRowDisplay('ft', subj, ftTotals[subj.key]);

    // Update consolidated in FT table
    const consol = hyTotals[subj.key] + ftTotals[subj.key];
    const consolCell = document.getElementById(`ft_consol_${subj.key}`);
    if (consolCell) consolCell.textContent = consol;
  }

  // Pass 3: grand totals
  updateGrandTotal('hy', hyTotals);
  updateGrandTotal('ft', ftTotals);

  // Pass 4: result
  updateResult(hyTotals, ftTotals);
}

function updateRowDisplay(prefix, subj, total) {
  const grade = getGradeFromMarks(total);

  if (subj.singleTotal) {
    const disp = document.getElementById(`${prefix}_totaldisp_${subj.key}`);
    if (disp) disp.textContent = total;
  } else {
    const totalCell = document.getElementById(`${prefix}_total_${subj.key}`);
    if (totalCell) totalCell.textContent = total;
  }

  const gradeCell = document.getElementById(`${prefix}_grade_${subj.key}`);
  if (gradeCell) gradeCell.innerHTML = `<span class="grade-pill">${grade}</span>`;
}

function updateGrandTotal(prefix, totals) {
  let grand = 0;
  for (const subj of currentConfig.subjects) {
    if (subj.countInTotal) {
      grand += totals[subj.key];
    }
  }

  const max = currentConfig.grandTotalMax;
  const pct = max > 0 ? ((grand / max) * 100) : 0;
  const grade = getGradeFromPercentage(pct);

  document.getElementById(`${prefix}GrandTotal`).textContent = grand;
  document.getElementById(`${prefix}Percentage`).textContent = formatPct(pct) + '%';
  document.getElementById(`${prefix}Grade`).textContent = grade;

  // For FT, also update overall consolidated grand total
  if (prefix === 'ft') {
    const hyGrand = parseInt(document.getElementById('hyGrandTotal').textContent, 10) || 0;
    const overallConsol = hyGrand + grand;
    const consolCell = document.getElementById('ftConsolidatedGrand');
    if (consolCell) consolCell.textContent = overallConsol;
  }
}

function updateResult(hyTotals, ftTotals) {
  const passmark = currentConfig.passmark || 40;
  let pass = true;

  for (const subj of currentConfig.subjects) {
    if (!subj.countInTotal) continue;
    const hy = hyTotals[subj.key];
    const ft = ftTotals[subj.key];
    if (hy < passmark || ft < passmark) {
      pass = false;
      break;
    }
  }

  if (els.resultBadge) {
    els.resultBadge.textContent = pass ? 'PASS' : 'FAIL';
    els.resultBadge.className = 'result-badge ' + (pass ? 'result-pass' : 'result-fail');
  }
}

function resetCalculatedDisplays() {
  if (els.resultBadge) {
    els.resultBadge.textContent = '—';
    els.resultBadge.className = 'result-badge';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. DATA COLLECTION
   ═══════════════════════════════════════════════════════════════════════════ */
function collectFormData() {
  if (!currentConfig) return null;

  const hyTotals = {};
  const ftTotals = {};
  const hySubjects = {};
  const ftSubjects = {};
  const consolSubjects = {};

  for (const subj of currentConfig.subjects) {
    const hyTotal = calculateSubjectTotal('hy', subj);
    const ftTotal = calculateSubjectTotal('ft', subj);
    hyTotals[subj.key] = hyTotal;
    ftTotals[subj.key] = ftTotal;

    if (subj.singleTotal) {
      hySubjects[subj.key] = {
        ia: 0, ut: 0, exam: 0, total: hyTotal
      };
      ftSubjects[subj.key] = {
        ia: 0, ut: 0, exam: 0, total: ftTotal
      };
    } else if (subj.isAggregate) {
      hySubjects[subj.key] = {
        ia: 0, ut: 0, exam: 0, total: hyTotal
      };
      ftSubjects[subj.key] = {
        ia: 0, ut: 0, exam: 0, total: ftTotal
      };
    } else {
      const hyIA   = parseFloat(document.getElementById(`hy_ia_${subj.key}`)?.value)   || 0;
      const hyExam = parseFloat(document.getElementById(`hy_exam_${subj.key}`)?.value) || 0;
      const hyUT   = currentConfig.markScheme === 'standard'
        ? (parseFloat(document.getElementById(`hy_ut_${subj.key}`)?.value) || 0)
        : 0;

      const ftIA   = parseFloat(document.getElementById(`ft_ia_${subj.key}`)?.value)   || 0;
      const ftExam = parseFloat(document.getElementById(`ft_exam_${subj.key}`)?.value) || 0;
      const ftUT   = currentConfig.markScheme === 'standard'
        ? (parseFloat(document.getElementById(`ft_ut_${subj.key}`)?.value) || 0)
        : 0;

      hySubjects[subj.key] = { ia: hyIA, ut: hyUT, exam: hyExam, total: hyTotal };
      ftSubjects[subj.key] = { ia: ftIA, ut: ftUT, exam: ftExam, total: ftTotal };
    }

    consolSubjects[subj.key] = {
      term1: hyTotal,
      term2: ftTotal,
      total: hyTotal + ftTotal
    };
  }

  const hyGrand = Object.entries(hyTotals).reduce((sum, [k, v]) => {
    const s = currentConfig.subjects.find(x => x.key === k);
    return sum + (s?.countInTotal ? v : 0);
  }, 0);
  const ftGrand = Object.entries(ftTotals).reduce((sum, [k, v]) => {
    const s = currentConfig.subjects.find(x => x.key === k);
    return sum + (s?.countInTotal ? v : 0);
  }, 0);

  const hyPct = currentConfig.grandTotalMax > 0 ? ((hyGrand / currentConfig.grandTotalMax) * 100) : 0;
  const ftPct = currentConfig.grandTotalMax > 0 ? ((ftGrand / currentConfig.grandTotalMax) * 100) : 0;
  const overallPct = (currentConfig.grandTotalMax * 2) > 0
    ? ((hyGrand + ftGrand) / (currentConfig.grandTotalMax * 2) * 100)
    : 0;

  const coScholastic = {};
  for (const item of currentConfig.coScholastic) {
    coScholastic[item.key] = {
      halfYearly: document.getElementById(`coscholastic_hy_${item.key}`)?.value || '',
      finalTerm:  document.getElementById(`coscholastic_ft_${item.key}`)?.value || ''
    };
  }

  const passmark = currentConfig.passmark || 40;
  let result = 'PASS';
  for (const subj of currentConfig.subjects) {
    if (!subj.countInTotal) continue;
    if (hyTotals[subj.key] < passmark || ftTotals[subj.key] < passmark) {
      result = 'FAIL';
      break;
    }
  }

  return {
    schoolName: currentConfig.schoolName,
    session: els.session.value,
    class: currentClass.toString(),
    section: els.sectionInput.value.trim(),
    classTeacher: els.classTeacher.value.trim(),
    student: {
      name: els.studentName.value.trim(),
      rollNo: parseInt(els.rollNumber.value, 10) || 0,
      admissionNo: els.admissionNo.value.trim(),
      dob: els.dob.value,
      house: els.house.value.trim()
    },
    halfYearly: {
      subjects: hySubjects,
      grandTotal: hyGrand,
      percentage: parseFloat(formatPct(hyPct)),
      grade: getGradeFromPercentage(hyPct),
      rank: parseInt(els.hyRank.value, 10) || 0,
      totalStudents: parseInt(els.totalStudents.value, 10) || 0,
      attendance: {
        present: parseInt(els.hyPresent.value, 10) || 0,
        total: parseInt(els.hyTotalDays.value, 10) || 0
      }
    },
    finalTerm: {
      subjects: ftSubjects,
      grandTotal: ftGrand,
      percentage: parseFloat(formatPct(ftPct)),
      grade: getGradeFromPercentage(ftPct),
      rank: parseInt(els.ftRank.value, 10) || 0,
      totalStudents: parseInt(els.totalStudents.value, 10) || 0,
      attendance: {
        present: parseInt(els.ftPresent.value, 10) || 0,
        total: parseInt(els.ftTotalDays.value, 10) || 0
      }
    },
    consolidated: {
      subjects: consolSubjects,
      grandTotal: hyGrand + ftGrand,
      percentage: parseFloat(formatPct(overallPct)),
      grade: getGradeFromPercentage(overallPct),
      result: result
    },
    coScholastic: coScholastic,
    remarks: {
      halfYearly: els.hyRemark.value.trim(),
      finalTerm: els.ftRemark.value.trim()
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. ACTION HANDLERS
   ═══════════════════════════════════════════════════════════════════════════ */
function handlePreview() {
  const data = collectFormData();
  if (!data) return;
  if (!data.student.name || !data.student.rollNo) {
    alert('Please enter Student Name and Roll Number.');
    return;
  }
  sessionStorage.setItem('sfds_studentData', JSON.stringify(data));
  window.open('reportcard.html', '_blank');
}

function handlePrint() {
  const data = collectFormData();
  if (!data) return;
  if (!data.student.name || !data.student.rollNo) {
    alert('Please enter Student Name and Roll Number.');
    return;
  }
  sessionStorage.setItem('sfds_studentData', JSON.stringify(data));
  const win = window.open('reportcard.html?print=1', '_blank');
  // Print trigger handled in reportcard.html via ?print=1 param
}

function handleSaveJson() {
  const data = collectFormData();
  if (!data) return;
  if (!data.student.name) {
    alert('Please enter Student Name before saving.');
    return;
  }
  const filename = `${data.student.name.replace(/\s+/g, '_')}_Class${data.class}_${data.session}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleLoadJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        populateFormFromData(data);
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function populateFormFromData(data) {
  if (!data) return;

  if (data.class) {
    els.classSelect.value = data.class;
    onClassChange();
  }

  els.sectionInput.value     = data.section || '';
  els.studentName.value      = data.student?.name || '';
  els.rollNumber.value       = data.student?.rollNo || '';
  els.admissionNo.value      = data.student?.admissionNo || '';
  els.dob.value              = data.student?.dob || '';
  els.classTeacher.value     = data.classTeacher || '';
  els.house.value            = data.student?.house || '';

  els.hyPresent.value        = data.halfYearly?.attendance?.present || '';
  els.hyTotalDays.value      = data.halfYearly?.attendance?.total || '';
  els.ftPresent.value        = data.finalTerm?.attendance?.present || '';
  els.ftTotalDays.value      = data.finalTerm?.attendance?.total || '';

  els.hyRemark.value         = data.remarks?.halfYearly || '';
  els.ftRemark.value         = data.remarks?.finalTerm || '';

  els.hyRank.value           = data.halfYearly?.rank || '';
  els.ftRank.value           = data.finalTerm?.rank || '';
  els.totalStudents.value    = data.halfYearly?.totalStudents || data.finalTerm?.totalStudents || '';

  // Restore marks
  const fillTerm = (prefix, subjectsData) => {
    if (!subjectsData) return;
    for (const [key, vals] of Object.entries(subjectsData)) {
      const subj = currentConfig?.subjects.find(s => s.key === key);
      if (!subj) continue;

      if (subj.singleTotal) {
        const inp = document.getElementById(`${prefix}_total_${key}`);
        if (inp) inp.value = vals.total || '';
      } else if (!subj.isAggregate) {
        const ia   = document.getElementById(`${prefix}_ia_${key}`);
        const exam = document.getElementById(`${prefix}_exam_${key}`);
        const ut   = document.getElementById(`${prefix}_ut_${key}`);
        if (ia)   ia.value   = vals.ia   !== undefined ? vals.ia   : '';
        if (exam) exam.value = vals.exam !== undefined ? vals.exam : '';
        if (ut)   ut.value   = vals.ut   !== undefined ? vals.ut   : '';
      }
    }
  };

  fillTerm('hy', data.halfYearly?.subjects);
  fillTerm('ft', data.finalTerm?.subjects);

  // Restore co-scholastic
  if (data.coScholastic) {
    for (const [key, vals] of Object.entries(data.coScholastic)) {
      const hySel = document.getElementById(`coscholastic_hy_${key}`);
      const ftSel = document.getElementById(`coscholastic_ft_${key}`);
      if (hySel && vals.halfYearly) hySel.value = vals.halfYearly;
      if (ftSel && vals.finalTerm)  ftSel.value = vals.finalTerm;
    }
  }

  recalculateAll();
}

function handleClear() {
  if (!confirm('Are you sure you want to clear the entire form?')) return;
  els.classSelect.value = '';
  currentClass = null;
  currentConfig = null;

  const inputs = document.querySelectorAll('input:not([type="button"]):not([type="submit"]), textarea, select');
  inputs.forEach(inp => {
    if (inp.id === 'session') return;
    if (inp.tagName === 'SELECT' && inp.id.startsWith('coscholastic')) {
      inp.selectedIndex = 0;
      return;
    }
    if (inp.tagName === 'SELECT' && inp.id === 'classSelect') {
      inp.selectedIndex = 0;
      return;
    }
    inp.value = '';
  });

  els.hyHeaderRow.innerHTML = '';
  els.hyBody.innerHTML = '';
  els.ftHeaderRow.innerHTML = '';
  els.ftBody.innerHTML = '';
  els.coScholasticContainer.innerHTML = '';

  if (els.halfYearlyNote) els.halfYearlyNote.classList.remove('visible');
  if (els.finalTermNote)  els.finalTermNote.classList.remove('visible');
  if (els.headerTitle)    els.headerTitle.textContent = 'St. Francis De Sales School';

  resetCalculatedDisplays();
}

function handleAddToClass() {
  const data = collectFormData();
  if (!data) return;
  if (!data.student.name) {
    alert('Please enter Student Name before adding to class list.');
    return;
  }

  let classList = JSON.parse(sessionStorage.getItem('sfds_classList') || '[]');
  classList.push(data);
  sessionStorage.setItem('sfds_classList', JSON.stringify(classList));
  alert(`Student "${data.student.name}" added. Total: ${classList.length} students.`);
}

function handleViewMarksheet() {
  window.open('marksheet.html', '_blank');
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. INITIALISATION
   ═══════════════════════════════════════════════════════════════════════════ */
function init() {
  els.classSelect.addEventListener('change', onClassChange);

  els.btnPreview.addEventListener('click', handlePreview);
  els.btnPrint.addEventListener('click', handlePrint);
  els.btnSaveJson.addEventListener('click', handleSaveJson);
  els.btnLoadJson.addEventListener('click', handleLoadJson);
  els.btnClear.addEventListener('click', handleClear);
  els.btnAddToClass.addEventListener('click', handleAddToClass);
  els.btnViewMarksheet.addEventListener('click', handleViewMarksheet);
}

document.addEventListener('DOMContentLoaded', init);
