/**
 * marksheet.js — SFDS Report Card System
 * Reads classListArray from sessionStorage, renders consolidated table
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. LOAD DATA
   ═══════════════════════════════════════════════════════════════════════════ */
function loadClassList() {
  const raw = sessionStorage.getItem('sfds_classList');
  if (!raw) {
    console.error('No class list found in sessionStorage.');
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse class list:', e);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function formatPct(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. MAIN RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
function renderMarksheet() {
  const list = loadClassList();
  if (!list.length) {
    document.getElementById('msTableBody').innerHTML = '<tr><td colspan="100">No students added to class list yet.</td></tr>';
    return;
  }

  // Use first student to determine class config
  const first = list[0];
  const config = getClassConfig(parseInt(first.class, 10));
  if (!config) {
    console.error('Unknown class:', first.class);
    return;
  }

  const isStandard = config.markScheme === 'standard';

  // Determine term to display: show Final Term by default
  const termKey = 'finalTerm';
  const termLabel = 'Final Term';

  // Header info
  document.getElementById('msSchoolName').textContent = first.schoolName || config.schoolName;
  document.getElementById('msClass').textContent = first.class || '—';
  document.getElementById('msTerm').textContent = termLabel;
  document.getElementById('msSession').textContent = first.session || '2026–2027';
  document.getElementById('msDate').textContent = new Date().toLocaleDateString('en-IN');

  // Sort by roll number
  list.sort((a, b) => (a.student.rollNo || 0) - (b.student.rollNo || 0));

  // Build header
  document.getElementById('msTableHead').innerHTML = buildHeader(config, isStandard);

  // Build rows
  document.getElementById('msTableBody').innerHTML = buildRows(list, config, isStandard, termKey);

  // Build class average
  document.getElementById('msTableFoot').innerHTML = buildAverageRow(list, config, isStandard, termKey);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. HEADER BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildHeader(config, isStandard) {
  const subjects = config.subjects.filter(s => s.countInTotal);

  let html = '<tr>';
  html += '<th rowspan="2">Sl. No.</th>';
  html += '<th rowspan="2">Roll No.</th>';
  html += '<th rowspan="2" class="ms-student-name">Student Name</th>';

  for (const subj of subjects) {
    if (isStandard) {
      html += `<th colspan="3" class="ms-subj-group"><span class="ms-subj-name">${subj.label}</span></th>`;
    } else {
      html += `<th colspan="2" class="ms-subj-group"><span class="ms-subj-name">${subj.label}</span></th>`;
    }
  }

  html += '<th rowspan="2">Grand Total</th>';
  html += '<th rowspan="2">%</th>';
  html += '<th rowspan="2">Rank</th>';
  html += '<th rowspan="2">Result</th>';
  html += '</tr>';

  // Sub-header
  html += '<tr class="ms-subheader">';
  for (let i = 0; i < subjects.length; i++) {
    if (isStandard) {
      html += '<th>IA</th><th>UT</th><th>Total</th>';
    } else {
      html += '<th>IA</th><th>Total</th>';
    }
  }
  html += '</tr>';

  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ROW BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildRows(list, config, isStandard, termKey) {
  const subjects = config.subjects.filter(s => s.countInTotal);
  let html = '';

  list.forEach((data, idx) => {
    const termData = data[termKey];
    const consol = data.consolidated;

    html += '<tr>';
    html += `<td>${idx + 1}</td>`;
    html += `<td>${data.student.rollNo}</td>`;
    html += `<td class="ms-student-name">${data.student.name}</td>`;

    for (const subj of subjects) {
      const subjData = termData.subjects[subj.key] || {};
      const total = subjData.total || 0;
      const fail = total < 40;

      if (isStandard) {
        html += `<td>${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td>${subjData.ut !== undefined ? subjData.ut : '—'}</td>`;
        html += `<td class="${fail ? 'ms-fail' : ''}">${total}</td>`;
      } else {
        html += `<td>${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td class="${fail ? 'ms-fail' : ''}">${total}</td>`;
      }
    }

    html += `<td class="ms-grand-total">${termData.grandTotal}</td>`;
    html += `<td>${formatPct(termData.percentage)}%</td>`;

    const pass = consol.result === 'PASS';
    html += `<td class="ms-rank">${pass && termData.rank ? termData.rank : '—'}</td>`;
    html += `<td class="${pass ? 'ms-pass' : 'ms-fail-result'}">${consol.result}</td>`;

    html += '</tr>';
  });

  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. CLASS AVERAGE ROW
   ═══════════════════════════════════════════════════════════════════════════ */
function buildAverageRow(list, config, isStandard, termKey) {
  const subjects = config.subjects.filter(s => s.countInTotal);
  const n = list.length;
  if (!n) return '';

  // Accumulators
  const sums = {};
  for (const subj of subjects) {
    sums[subj.key] = { ia: 0, ut: 0, total: 0 };
  }
  let grandTotalSum = 0;
  let pctSum = 0;

  for (const data of list) {
    const termData = data[termKey];
    grandTotalSum += termData.grandTotal || 0;
    pctSum += termData.percentage || 0;

    for (const subj of subjects) {
      const subjData = termData.subjects[subj.key] || {};
      sums[subj.key].ia += subjData.ia || 0;
      sums[subj.key].ut += subjData.ut || 0;
      sums[subj.key].total += subjData.total || 0;
    }
  }

  let html = '<tr>';
  html += '<td colspan="3" style="text-align:right;padding-right:6px;">Class Average</td>';

  for (const subj of subjects) {
    const s = sums[subj.key];
    if (isStandard) {
      html += `<td>${formatAvg(s.ia / n)}</td>`;
      html += `<td>${formatAvg(s.ut / n)}</td>`;
      html += `<td>${formatAvg(s.total / n)}</td>`;
    } else {
      html += `<td>${formatAvg(s.ia / n)}</td>`;
      html += `<td>${formatAvg(s.total / n)}</td>`;
    }
  }

  html += `<td>${formatAvg(grandTotalSum / n)}</td>`;
  html += `<td>${formatPct(pctSum / n)}%</td>`;
  html += '<td>—</td>';
  html += '<td>—</td>';
  html += '</tr>';

  return html;
}

function formatAvg(val) {
  return Number.isFinite(val) ? (Math.round(val * 10) / 10).toFixed(1) : '—';
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', renderMarksheet);
