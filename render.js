/**
 * render.js — SFDS Report Card System
 * Reads studentData from sessionStorage (standalone) or Firestore (URL params).
 */

/* ═══════════════════════════════════════════════════════════════════════════
   0. FIREBASE HELPERS (Phase 4 — URL-param driven loading)
   ═══════════════════════════════════════════════════════════════════════════ */
const _ROMAN_RC = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
function _classNumFromId(classId) {
  const raw = String(classId).split('-')[0].trim().toUpperCase();
  return _ROMAN_RC[raw] || parseInt(raw) || null;
}

function _showFbError(msg) {
  const card = document.getElementById('reportCard');
  if (card) card.style.opacity = '';
  document.body.innerHTML =
    '<div style="font-family:\'Segoe UI\',sans-serif;text-align:center;padding:60px 20px;' +
    'color:#555;background:#FAF8F3;min-height:100vh;box-sizing:border-box;">' +
    '<p style="font-size:2rem;margin-bottom:8px;">&#9888;</p>' +
    '<h2 style="color:#2C2C2C;margin-bottom:12px;">Could not load report card</h2>' +
    '<p style="font-size:0.9rem;color:#888;margin-bottom:24px;">' + msg + '</p>' +
    '<a href="markentry.html" style="display:inline-block;background:#C9A84C;color:#fff;' +
    'padding:8px 20px;border-radius:4px;font-weight:600;text-decoration:none;font-size:0.9rem;">' +
    '&#8592; Back to Mark Entry</a></div>';
}

async function loadFromFirebase(studentId, classId) {
  const card = document.getElementById('reportCard');
  if (card) card.style.opacity = '0.4';

  try {
    const [hySnap, ftSnap, studentSnap] = await Promise.all([
      db.collection('marks').doc(classId + '_HY').collection('students').doc(studentId).get(),
      db.collection('marks').doc(classId + '_FT').collection('students').doc(studentId).get(),
      db.collection('students').doc(studentId).get()
    ]);

    if (!hySnap.exists || !ftSnap.exists) {
      _showFbError('Student record not found. Verify studentId and classId in the URL.');
      return;
    }

    const hyRaw      = hySnap.data();
    const ftRaw      = ftSnap.data();
    const studentDoc = studentSnap.exists ? studentSnap.data() : {};

    const classNum = _classNumFromId(classId);
    const section  = (classId.includes('-') ? classId.split('-')[1] : null)
                     || studentDoc.section || 'A';
    const cfg = getClassConfig(classNum);
    if (!cfg) { _showFbError('Class config not found for: ' + classId); return; }

    const isSenior = cfg.markScheme === 'senior';
    const passmark = cfg.passmark != null ? cfg.passmark : 40;

    // Map Firebase academics { IA, UT, TE } -> render schema { ia, ut, exam }
    function mapAcademics(rawAcad) {
      const out = {};
      if (!rawAcad) return out;
      for (const subj of cfg.subjects) {
        if (subj.isAggregate) {
          const n = subj.components.length;
          let sum = 0;
          subj.components.forEach(function(cKey) { sum += (rawAcad[cKey] ? rawAcad[cKey].total || 0 : 0); });
          out[subj.key] = { total: (subj.aggregateMethod === 'average' && n > 0) ? Math.round(sum / n) : sum };
        } else {
          const a = rawAcad[subj.key] || {};
          if (subj.singleTotal) {
            out[subj.key] = { total: a.singleMark != null ? a.singleMark : (a.total || 0) };
          } else if (isSenior) {
            out[subj.key] = { ia: a.IA || 0, exam: a.TE || 0, total: a.total || 0 };
          } else {
            out[subj.key] = { ia: a.IA || 0, ut: a.UT || 0, exam: a.TE || 0, total: a.total || 0 };
          }
        }
      }
      return out;
    }

    const hySubjects = mapAcademics(hyRaw.academics);
    const ftSubjects = mapAcademics(ftRaw.academics);

    // Grand totals
    var hyGrand = 0, ftGrand = 0;
    for (var i = 0; i < cfg.subjects.length; i++) {
      var subj = cfg.subjects[i];
      if (!subj.countInTotal) continue;
      hyGrand += (hySubjects[subj.key] ? hySubjects[subj.key].total || 0 : 0);
      ftGrand += (ftSubjects[subj.key] ? ftSubjects[subj.key].total || 0 : 0);
    }

    function fmtPct(v) { return parseFloat((Math.round(v * 10) / 10).toFixed(1)); }
    var hyPct = cfg.grandTotalMax > 0 ? (hyGrand / cfg.grandTotalMax) * 100 : 0;
    var ftPct = cfg.grandTotalMax > 0 ? (ftGrand / cfg.grandTotalMax) * 100 : 0;
    var ovPct = (cfg.grandTotalMax * 2) > 0 ? ((hyGrand + ftGrand) / (cfg.grandTotalMax * 2)) * 100 : 0;

    // Attendance: handle legacy flat {hyPresent,hyTotal,ftPresent,ftTotal} and per-term {present,total}
    var hyAttRaw = hyRaw.attendance || {};
    var ftAttRaw = ftRaw.attendance || {};
    var hyAtt = {
      present: hyAttRaw.present != null ? hyAttRaw.present : (hyAttRaw.hyPresent || 0),
      total:   hyAttRaw.total   != null ? hyAttRaw.total   : (hyAttRaw.hyTotal   || 0)
    };
    var ftAtt = {
      present: ftAttRaw.present != null ? ftAttRaw.present
               : (ftAttRaw.ftPresent != null ? ftAttRaw.ftPresent : (hyAttRaw.ftPresent || 0)),
      total:   ftAttRaw.total   != null ? ftAttRaw.total
               : (ftAttRaw.ftTotal   != null ? ftAttRaw.ftTotal   : (hyAttRaw.ftTotal   || 0))
    };

    // CoScholastic: {T1,T2} -> {halfYearly,finalTerm}
    var coSchRaw = hyRaw.coScholastic || ftRaw.coScholastic || {};
    var coScholastic = {};
    Object.keys(coSchRaw).forEach(function(key) {
      var vals = coSchRaw[key] || {};
      coScholastic[key] = {
        halfYearly: vals.halfYearly != null ? vals.halfYearly : (vals.T1 || ''),
        finalTerm:  vals.finalTerm  != null ? vals.finalTerm  : (vals.T2 || '')
      };
    });

    // Rank
    var rankObj = hyRaw.rank || ftRaw.rank || {};

    // Remarks
    var remarks = hyRaw.remarks || ftRaw.remarks || {};

    // Consolidated subjects
    var consolSubjects = {};
    cfg.subjects.forEach(function(subj) {
      consolSubjects[subj.key] = {
        total: ((hySubjects[subj.key] ? hySubjects[subj.key].total || 0 : 0) +
                (ftSubjects[subj.key] ? ftSubjects[subj.key].total || 0 : 0))
      };
    });

    // Result
    var result = 'PASS';
    for (var j = 0; j < cfg.subjects.length; j++) {
      var s = cfg.subjects[j];
      if (!s.countInTotal || s.isAggregate) continue;
      var ht = hySubjects[s.key] ? hySubjects[s.key].total || 0 : 0;
      var ft = ftSubjects[s.key] ? ftSubjects[s.key].total || 0 : 0;
      if (ht < passmark || ft < passmark) { result = 'FAIL'; break; }
    }

    var sfdsData = {
      schoolName:  cfg.schoolName,
      session:     '2026-2027',
      class:       String(classNum),
      section:     section,
      student: {
        name:        studentDoc.name        || '',
        rollNo:      studentDoc.rollNo      || '',
        admissionNo: studentDoc.admissionNo || '',
        dob:         studentDoc.dob         || '',
        house:       studentDoc.house       || ''
      },
      halfYearly: {
        subjects:      hySubjects,
        grandTotal:    hyGrand,
        percentage:    fmtPct(hyPct),
        grade:         getGradeFromMarks(hyPct),
        rank:          rankObj.hyRank != null ? rankObj.hyRank : null,
        totalStudents: rankObj.totalStudents != null ? rankObj.totalStudents : null,
        attendance:    hyAtt
      },
      finalTerm: {
        subjects:      ftSubjects,
        grandTotal:    ftGrand,
        percentage:    fmtPct(ftPct),
        grade:         getGradeFromMarks(ftPct),
        rank:          rankObj.ftRank != null ? rankObj.ftRank : null,
        totalStudents: rankObj.totalStudents != null ? rankObj.totalStudents : null,
        attendance:    ftAtt
      },
      consolidated: {
        subjects:   consolSubjects,
        grandTotal: hyGrand + ftGrand,
        percentage: fmtPct(ovPct),
        grade:      getGradeFromMarks(ovPct),
        result:     result
      },
      coScholastic: coScholastic,
      remarks:      remarks,
      finalStatus:      hyRaw.finalStatus      || studentDoc.finalStatus      || null,
      promotedToClass:  hyRaw.promotedToClass  || studentDoc.promotedToClass  || null
    };

    sessionStorage.setItem('sfds_studentData', JSON.stringify(sfdsData));
    if (card) card.style.opacity = '';
    render();

  } catch (err) {
    _showFbError('Firestore error: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LOAD DATA
   ═══════════════════════════════════════════════════════════════════════════ */
function loadData() {
  const raw = sessionStorage.getItem('sfds_studentData');
  if (!raw) {
    console.error('No student data found in sessionStorage.');
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse student data:', e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. GRADE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function getGradeFromMarks(marks) {
  if (marks >= 90) return 'O';
  if (marks >= 80) return 'A+';
  if (marks >= 70) return 'A';
  if (marks >= 60) return 'B+';
  if (marks >= 50) return 'B';
  if (marks >= 40) return 'C';
  if (marks >= 33) return 'D';
  return 'F';
}

function formatPct(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. MAIN RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
function render() {
  const data = loadData();
  if (!data) {
    document.body.innerHTML = `
      <div style="font-family:'Segoe UI',sans-serif;text-align:center;padding:60px 20px;color:#555;background:#FAF8F3;min-height:100vh;box-sizing:border-box;">
        <p style="font-size:2rem;margin-bottom:8px;">&#128203;</p>
        <h2 style="color:#2C2C2C;margin-bottom:12px;">No student data found</h2>
        <p style="font-size:0.9rem;color:#888;margin-bottom:24px;">Please fill the mark entry form and click <strong>Preview Report Card</strong>.</p>
        <a href="index.html" style="display:inline-block;background:#C9A84C;color:#fff;padding:8px 20px;border-radius:4px;font-weight:600;text-decoration:none;font-size:0.9rem;">← Go to Mark Entry Form</a>
      </div>
    `;
    return;
  }

  const config = getClassConfig(parseInt(data.class, 10));
  if (!config) {
    console.error('Unknown class:', data.class);
    return;
  }

  renderHeader(data, config);
  renderLeftPanel(data, config);
  renderCenterPanel(data, config);
  renderRightPanel(data, config);
  renderTermSummaries(data, config);

  // Auto-print if requested via URL param
  if (window.location.search.includes('print=1')) {
    setTimeout(() => window.print(), 800);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
function renderHeader(data, config) {
  document.getElementById('rcSchoolName').textContent = data.schoolName || config.schoolName;
  document.getElementById('rcClassNum').textContent = data.class || '—';
  document.getElementById('rcSection').textContent = data.section || '—';

  const passmark = config.passmark || 40;
  const scaleEl = document.getElementById('rcGradeScale');
  if (scaleEl) {
    scaleEl.textContent =
      `O ≥90% | A+ 80–89% | A 70–79% | B+ 60–69% | B 50–59% | C 40–49% | D 33–39% | F <33% – Fail | Pass mark: ${passmark}/100`;
  }

  const logo = document.getElementById('rcLogo');
  if (logo) {
    logo.onerror = function () {
      this.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#2C2C2C;color:#C9A84C;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;';
      placeholder.textContent = 'SFS';
      this.parentNode.insertBefore(placeholder, this);
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LEFT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function renderLeftPanel(data, config) {
  const s = data.student;
  document.getElementById('rcStudentName').textContent = s.name || 'Student Name';
  document.getElementById('rcRollNo').textContent = s.rollNo || '—';
  document.getElementById('rcSection2').textContent = data.section || '—';
  document.getElementById('rcClass2').textContent = data.class || '—';
  document.getElementById('rcAdmissionNo').textContent = s.admissionNo || '—';
  document.getElementById('rcDob').textContent = s.dob || '—';
  document.getElementById('rcAcademicYear').textContent = data.session || '2026–2027';
  document.getElementById('rcClassSection').textContent = `Class ${data.class || '—'}${data.section ? ' (' + data.section + ')' : ''}`;
  document.getElementById('rcHouse').textContent = s.house || '—';

  // Attendance
  const hyAtt = data.halfYearly.attendance;
  const ftAtt = data.finalTerm.attendance;
  const hyPct = hyAtt.total > 0 ? ((hyAtt.present / hyAtt.total) * 100) : 0;
  const ftPct = ftAtt.total > 0 ? ((ftAtt.present / ftAtt.total) * 100) : 0;

  const attCls = (pct) => pct >= 75 ? 'att-good' : (pct >= 60 ? 'att-moderate' : 'att-poor');

  const hyPctEl = document.getElementById('rcHyAttPct');
  hyPctEl.textContent = formatPct(hyPct) + '%';
  hyPctEl.className = 'rc-att-pct ' + attCls(hyPct);
  const hyBarEl = document.getElementById('rcHyAttBar');
  hyBarEl.style.width = hyPct + '%';
  hyBarEl.className = 'rc-att-fill ' + attCls(hyPct);

  const ftPctEl = document.getElementById('rcFtAttPct');
  ftPctEl.textContent = formatPct(ftPct) + '%';
  ftPctEl.className = 'rc-att-pct ' + attCls(ftPct);
  const ftBarEl = document.getElementById('rcFtAttBar');
  ftBarEl.style.width = ftPct + '%';
  ftBarEl.className = 'rc-att-fill ' + attCls(ftPct);

  // Overall result
  const consol = data.consolidated;
  const resultBadge = document.getElementById('rcResultBadge');
  resultBadge.textContent = consol.result || '—';
  resultBadge.className = 'rc-result-badge ' + (consol.result === 'PASS' ? '' : 'fail');

  document.getElementById('rcOverallGrade').textContent = consol.grade || '—';
  document.getElementById('rcOverallPct').textContent = formatPct(consol.percentage) + '%';
  document.getElementById('rcOverallRank').textContent = data.finalTerm.rank && data.finalTerm.totalStudents
    ? `${data.finalTerm.rank} / ${data.finalTerm.totalStudents}`
    : '—';
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. CENTER PANEL — TERM 1
   ═══════════════════════════════════════════════════════════════════════════ */
function renderCenterPanel(data, config) {
  const isStandard = config.markScheme === 'standard';

  const hyHead = document.getElementById('rcHyTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Grade</th>';
  hyHead.innerHTML = h;

  document.getElementById('rcHyTableBody').innerHTML = buildTableRows('hy', data, config, isStandard, false);

  const hyCols = isStandard ? 6 : 5;
  const hyColspan = hyCols - 3;
  const hyRankStr = data.halfYearly.rank
    ? `Term 1 Rank: ${data.halfYearly.rank} / ${data.halfYearly.totalStudents || '—'}`
    : '';
  document.getElementById('rcHyTableFoot').innerHTML = `
    <tr class="rc-term-total">
      <td colspan="${hyColspan}" class="rc-tt-label">Term 1 Total</td>
      <td class="rc-tt-max">Max: ${config.grandTotalMax}</td>
      <td class="rc-tt-val">${data.halfYearly.grandTotal}</td>
      <td class="rc-tt-grade">${data.halfYearly.grade}</td>
    </tr>
    ${hyRankStr ? `<tr class="rc-rank-row"><td colspan="${hyCols}" class="rc-rank-cell">${hyRankStr}</td></tr>` : ''}
  `;

  document.getElementById('rcHyCoscholastic').innerHTML = buildCoScholastic(data.coScholastic, config);

  const hyRemark = (data.remarks && data.remarks.halfYearly) || generateRemark(data, config, 'hy');
  const ftRemark = (data.remarks && data.remarks.finalTerm)  || generateRemark(data, config, 'ft');
  document.getElementById('rcHyRemark').textContent = `"${hyRemark}"`;
  document.getElementById('rcFtRemark').textContent = `"${ftRemark}"`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. RIGHT PANEL — TERM 2
   ═══════════════════════════════════════════════════════════════════════════ */
function renderRightPanel(data, config) {
  const isStandard = config.markScheme === 'standard';

  const ftHead = document.getElementById('rcFtTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Csl. /200</th><th>Grade</th>';
  ftHead.innerHTML = h;

  document.getElementById('rcFtTableBody').innerHTML = buildTableRows('ft', data, config, isStandard, true);

  const ftCols = isStandard ? 7 : 6;
  const ftColspan = ftCols - 4;
  document.getElementById('rcFtTableFoot').innerHTML = `
    <tr class="rc-term-total">
      <td colspan="${ftColspan}" class="rc-tt-label">Term 2 Total</td>
      <td class="rc-tt-max">Max: ${config.grandTotalMax}</td>
      <td class="rc-tt-val">${data.finalTerm.grandTotal}</td>
      <td class="rc-tt-consol">${data.halfYearly.grandTotal + data.finalTerm.grandTotal}</td>
      <td class="rc-tt-grade">${data.finalTerm.grade}</td>
    </tr>
  `;

  const consol = data.consolidated;
  document.getElementById('rcSumTotal').textContent = consol.grandTotal;
  document.getElementById('rcSumMax').textContent = (config.grandTotalMax * 2);
  document.getElementById('rcSumPct').textContent = formatPct(consol.percentage) + '%';
  document.getElementById('rcSumGrade').textContent = consol.grade;
  document.getElementById('rcSumRank').textContent = data.finalTerm.rank || '—';
  document.getElementById('rcSumTotalStudents').textContent = data.finalTerm.totalStudents || '—';

  const resultEl   = document.getElementById('rcSumResult');
  const finalStatus = data.finalStatus;
  if (finalStatus === 'PROMOTED') {
    const toClass = (data.promotedToClass || '').toString().trim().toUpperCase();
    resultEl.textContent  = toClass ? 'PROMOTED TO CLASS ' + toClass : 'PROMOTED';
    resultEl.style.color      = '#1B6B2F';
    resultEl.style.fontSize   = toClass ? '0.72rem' : '0.92rem';
    resultEl.style.letterSpacing = '0.5px';
    resultEl.dataset.status   = 'promoted';
  } else if (finalStatus === 'DETAINED') {
    resultEl.textContent      = 'DETAINED';
    resultEl.style.color      = '#B71C1C';
    resultEl.style.fontSize   = '0.92rem';
    resultEl.style.letterSpacing = '1px';
    resultEl.dataset.status   = 'detained';
  } else {
    resultEl.textContent      = consol.result || '—';
    resultEl.style.color      = consol.result === 'PASS' ? '#2E7D32' : '#C62828';
    resultEl.style.fontSize   = '';
    resultEl.style.letterSpacing = '';
    resultEl.dataset.status   = (consol.result || '').toLowerCase();
  }

  const hyAtt = data.halfYearly.attendance;
  const ftAtt = data.finalTerm.attendance;
  const avgAtt = (hyAtt.total + ftAtt.total) > 0
    ? (((hyAtt.present + ftAtt.present) / (hyAtt.total + ftAtt.total)) * 100)
    : 0;
  document.getElementById('rcSumAtt').textContent = formatPct(avgAtt) + '%';

  const principalEl = document.getElementById('rcPrincipalRemark');
  if (principalEl) {
    const ftRemark = (data.remarks && data.remarks.finalTerm) || generateRemark(data, config, 'ft');
    principalEl.textContent = `"${ftRemark}"`;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   7b. TERM SUMMARY BOXES (rcHySumXxx / rcFtSumXxx)
   ═══════════════════════════════════════════════════════════════════════════ */
function renderTermSummaries(data, config) {
  const max    = config.grandTotalMax;
  const attPct = function(a) { return (a && a.total > 0) ? (a.present / a.total) * 100 : 0; };

  const hy    = data.halfYearly;
  const hyPct = max > 0 ? (hy.grandTotal / max) * 100 : 0;
  const hyEl  = document.getElementById('rcHySumTotal');
  if (hyEl) {
    hyEl.textContent = hy.grandTotal;
    document.getElementById('rcHySumMax').textContent      = max;
    document.getElementById('rcHySumPct').textContent      = formatPct(hyPct) + '%';
    document.getElementById('rcHySumGrade').textContent    = hy.grade || '—';
    document.getElementById('rcHySumRank').textContent     = hy.rank  || '—';
    document.getElementById('rcHySumStudents').textContent = hy.totalStudents || '—';
    document.getElementById('rcHySumAtt').textContent      = formatPct(attPct(hy.attendance)) + '%';
  }

  const ft    = data.finalTerm;
  const ftPct = max > 0 ? (ft.grandTotal / max) * 100 : 0;
  const ftEl  = document.getElementById('rcFtSumTotal');
  if (ftEl) {
    ftEl.textContent = ft.grandTotal;
    document.getElementById('rcFtSumMax').textContent      = max;
    document.getElementById('rcFtSumPct').textContent      = formatPct(ftPct) + '%';
    document.getElementById('rcFtSumGrade').textContent    = ft.grade || '—';
    document.getElementById('rcFtSumRank').textContent     = ft.rank  || '—';
    document.getElementById('rcFtSumStudents').textContent = ft.totalStudents || '—';
    document.getElementById('rcFtSumAtt').textContent      = formatPct(attPct(ft.attendance)) + '%';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. TABLE ROW BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildTableRows(term, data, config, isStandard, showConsol) {
  let html = '';
  const subjects = config.subjects;
  const termData = term === 'hy' ? data.halfYearly : data.finalTerm;
  const passmark = config.passmark || 40;
  const pmRatio  = passmark / 100;

  const iaThreshStd   = Math.round(10 * pmRatio);
  const utThresh      = Math.round(30 * pmRatio);
  const examThreshStd = Math.round(60 * pmRatio);
  const iaThreshSen   = Math.round(20 * pmRatio);
  const examThreshSen = Math.round(80 * pmRatio);

  const failCls = (val, threshold) =>
    (val !== undefined && val !== null && val !== '' && val < threshold) ? ' rc-cell-fail' : '';

  for (const subj of subjects) {
    const subjData = termData.subjects[subj.key] || {};
    const total = subjData.total || 0;
    const grade = getGradeFromMarks(total);
    const gradeFail = total < passmark ? ' fail' : '';

    let cls = 'rc-row-normal';
    if (subj.isAggregate) cls = 'rc-row-aggregate';
    else if (subj.singleTotal) cls = 'rc-row-single';
    else if (!subj.countInTotal) cls = 'rc-row-component';

    html += `<tr class="${cls}"><td>${subj.label}</td>`;

    const consolSubj = data.consolidated.subjects[subj.key];
    const consolTotal = consolSubj ? consolSubj.total || 0 : 0;

    if (subj.isAggregate) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td>—</td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj ? consolSubj.total : null, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }
    else if (subj.singleTotal) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td></td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj ? consolSubj.total : null, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }
    else {
      if (isStandard) {
        html += `<td class="${failCls(subjData.ia, iaThreshStd)}">${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td class="${failCls(subjData.ut, utThresh)}">${subjData.ut !== undefined ? subjData.ut : '—'}</td>`;
        html += `<td class="${failCls(subjData.exam, examThreshStd)}">${subjData.exam !== undefined ? subjData.exam : '—'}</td>`;
      } else {
        html += `<td class="${failCls(subjData.ia, iaThreshSen)}">${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td class="${failCls(subjData.exam, examThreshSen)}">${subjData.exam !== undefined ? subjData.exam : '—'}</td>`;
      }
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj ? consolSubj.total : null, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }

    html += '</tr>';
  }

  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. CO-SCHOLASTIC BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildCoScholastic(coData, config) {
  if (!coData) return '';
  let html = `
    <div class="rc-coschol-header">
      <span></span>
      <span class="rc-coschol-hdr-terms"><span>T1</span><span>T2</span></span>
    </div>
  `;
  for (const item of config.coScholastic) {
    const vals = coData[item.key];
    const hyGrade = vals ? vals.halfYearly || '—' : '—';
    const ftGrade = vals ? vals.finalTerm  || '—' : '—';
    html += `
      <div class="rc-coschol-item">
        <span class="rc-coschol-label">${item.label}</span>
        <span class="rc-coschol-terms">
          <span class="rc-coschol-grade">${hyGrade}</span>
          <span class="rc-coschol-grade">${ftGrade}</span>
        </span>
      </div>
    `;
  }
  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. FUTURE-READY API SURFACE
   ═══════════════════════════════════════════════════════════════════════════ */
window.SFDS = window.SFDS || {};
window.SFDS.version = '1.2';
window.SFDS.renderReportCard = render;
window.SFDS.getGradeFromMarks = getGradeFromMarks;
window.SFDS.formatPct = formatPct;
window.SFDS.generateRemark = generateRemark;
window.SFDS.loadFromFirebase = loadFromFirebase;

/* ═══════════════════════════════════════════════════════════════════════════
   11. REMARK ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */
function generateRemark(data, config, term) {
  const cls       = parseInt(data.class, 10);
  const termData  = term === 'hy' ? data.halfYearly : data.finalTerm;
  const isStd     = config.markScheme === 'standard';

  const termPct = config.grandTotalMax > 0
    ? (termData.grandTotal / config.grandTotalMax) * 100
    : 0;

  const band = termPct >= 90 ? 'excellent'
             : termPct >= 80 ? 'vgood'
             : termPct >= 70 ? 'good'
             : termPct >= 40 ? 'average'
             :                 'weak';

  const scorable = config.subjects.filter(s => s.countInTotal);
  let best = null, worst = null, bestVal = -1, worstVal = 101;

  for (const subj of scorable) {
    const sd = termData.subjects[subj.key];
    if (!sd || sd.total == null) continue;
    if (sd.total > bestVal)  { bestVal  = sd.total; best  = subj; }
    if (sd.total < worstVal) { worstVal = sd.total; worst = subj; }
  }
  if (best && worst && best.key === worst.key) worst = null;

  const bestLabel  = best  ? best.label  : 'core subjects';
  const worstLabel = worst ? worst.label : null;

  const att    = termData.attendance || { present: 0, total: 0 };
  const attPct = att.total > 0 ? (att.present / att.total) * 100 : 100;
  const lowAtt = attPct < 75;

  let utPattern = '';
  if (isStd) {
    const normal = scorable.filter(s => !s.isAggregate && !s.singleTotal);
    let sumUT = 0, sumTE = 0, n = 0;
    for (const subj of normal) {
      const sd = termData.subjects[subj.key];
      if (sd && sd.ut != null && sd.exam != null) {
        sumUT += (sd.ut   / 30) * 100;
        sumTE += (sd.exam / 60) * 100;
        n++;
      }
    }
    if (n >= 2) {
      const diff = (sumUT / n) - (sumTE / n);
      utPattern = diff > 12 ? 'exam' : diff < -12 ? 'improve' : 'consistent';
    }
  }

  const firstName = (data.student && data.student.name)
    ? data.student.name.trim().split(/\s+/)[0]
    : 'The student';

  const v = (firstName.length + cls + (term === 'hy' ? 0 : 1)) % 2;

  const s1Pool = {
    excellent: [
      `${firstName} has delivered an excellent performance this term, excelling particularly in ${bestLabel}.`,
      `An outstanding term — ${firstName} shows exceptional ability in ${bestLabel} and maintains a high academic standard.`
    ],
    vgood: [
      `${firstName} has performed very well this term, demonstrating notable strength in ${bestLabel}.`,
      `A commendable term for ${firstName}, who shows strong aptitude in ${bestLabel} across assessments.`
    ],
    good: [
      `${firstName} has shown a good performance this term with commendable results in ${bestLabel}.`,
      `A solid effort this term; ${firstName} performs well in ${bestLabel} and has scope for further growth.`
    ],
    average: [
      `${firstName} has shown moderate performance this term, with relative strength observed in ${bestLabel}.`,
      `This term, ${firstName} demonstrates an average standard; some strength is seen in ${bestLabel}.`
    ],
    weak: [
      `${firstName} requires greater academic effort this term; relative strength is noted in ${bestLabel}.`,
      `Academic performance this term calls for improvement; ${firstName} shows some engagement with ${bestLabel}.`
    ]
  };

  const s1 = s1Pool[band][v];

  const s2Parts = [];
  if (worstLabel) s2Parts.push(`Focused attention to ${worstLabel} is needed to strengthen overall results.`);
  if (utPattern === 'exam') s2Parts.push('Consistent preparation for examinations is advised.');
  else if (utPattern === 'improve') s2Parts.push('Improvement in the term examination is commendable.');
  if (lowAtt) s2Parts.push('Irregular attendance has affected academic progress.');
  const s2 = s2Parts.join(' ');

  const encPool = [
    'With consistent effort and regular revision, much more can be achieved.',
    'Continued dedication will lead to further progress and success.',
    'Steady effort and focused study will bring excellent results ahead.'
  ];
  const s3 = cls <= 5 ? encPool[cls % encPool.length] : '';

  const parts = [s1];
  if (cls >= 9) { if (s2) parts.push(s2); }
  else if (cls >= 6) { if (s2) parts.push(s2); }
  else { if (s2) parts.push(s2); if (s3) parts.push(s3); }

  let remark = parts.join(' ');
  if (remark.length > 300) {
    while (parts.length > 1 && remark.length > 300) { parts.pop(); remark = parts.join(' '); }
    if (remark.length > 300) remark = remark.slice(0, 297) + '...';
  }
  return remark;
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. INIT — check URL params first, fall back to sessionStorage
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function () {
  const params    = new URLSearchParams(window.location.search);
  const studentId = params.get('studentId');
  const classId   = params.get('classId');
  if (studentId && classId) {
    await loadFromFirebase(studentId, classId);
  } else {
    render();
  }
});
