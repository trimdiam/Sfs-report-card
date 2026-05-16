/**
 * render.js — SFDS Report Card System
 * Reads studentData from sessionStorage and populates reportcard.html
 */

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
        <p style="font-size:2rem;margin-bottom:8px;">📋</p>
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

  // Helper: attendance visual category
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

  // Overall result (based on consolidated data)
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

  // Table header
  const hyHead = document.getElementById('rcHyTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Grade</th>';
  hyHead.innerHTML = h;

  // Table body
  document.getElementById('rcHyTableBody').innerHTML = buildTableRows('hy', data, config, isStandard, false);

  // Footer
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

  // Co-scholastic (show Final Term grades as annual assessment)
  document.getElementById('rcHyCoscholastic').innerHTML = buildCoScholastic(data.coScholastic, config);

  // Remarks — use teacher-entered text if present, otherwise generate intelligently
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

  // Table header
  const ftHead = document.getElementById('rcFtTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Csl. /200</th><th>Grade</th>';
  ftHead.innerHTML = h;

  // Table body
  document.getElementById('rcFtTableBody').innerHTML = buildTableRows('ft', data, config, isStandard, true);

  // Footer
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

  // Summary
  const consol = data.consolidated;
  document.getElementById('rcSumTotal').textContent = consol.grandTotal;
  document.getElementById('rcSumMax').textContent = (config.grandTotalMax * 2);
  document.getElementById('rcSumPct').textContent = formatPct(consol.percentage) + '%';
  document.getElementById('rcSumGrade').textContent = consol.grade;
  document.getElementById('rcSumRank').textContent = data.finalTerm.rank || '—';
  document.getElementById('rcSumTotalStudents').textContent = data.finalTerm.totalStudents || '—';

  // ── ADMIN-CONTROLLED FINAL STATUS (all classes III–X) ──────────────────────
  // Fields: data.finalStatus = "PROMOTED" | "DETAINED"
  //         data.promotedToClass = e.g. "VII", "VIII", "IX"
  // Fallback: show PASS / FAIL from internal calculation when not set by admin
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
    // Fallback — PASS / FAIL from consolidated calculation
    resultEl.textContent      = consol.result || '—';
    resultEl.style.color      = consol.result === 'PASS' ? '#2E7D32' : '#C62828';
    resultEl.style.fontSize   = '';
    resultEl.style.letterSpacing = '';
    resultEl.dataset.status   = (consol.result || '').toLowerCase();
  }
  // ───────────────────────────────────────────────────────────────────────────

  const hyAtt = data.halfYearly.attendance;
  const ftAtt = data.finalTerm.attendance;
  const avgAtt = (hyAtt.total + ftAtt.total) > 0
    ? (((hyAtt.present + ftAtt.present) / (hyAtt.total + ftAtt.total)) * 100)
    : 0;
  document.getElementById('rcSumAtt').textContent = formatPct(avgAtt) + '%';

  const principalEl = document.getElementById('rcPrincipalRemark');
  if (principalEl) {
    principalEl.textContent = data.remarks.finalTerm ? `"${data.remarks.finalTerm}"` : '—';
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

  // Proportional sub-component fail thresholds
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
    const consolTotal = consolSubj?.total || 0;

    if (subj.isAggregate) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td>—</td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }
    else if (subj.singleTotal) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td></td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
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
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
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
    const hyGrade = vals?.halfYearly || '—';
    const ftGrade = vals?.finalTerm  || '—';
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
   11. REMARK ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * generateRemark(data, config, term)
 *
 * Produces a personalised, school-appropriate remark for the given term.
 * term: 'hy' (Half Yearly) | 'ft' (Final Term)
 *
 * Rules:
 *  - Observational only — no promotion / detention language
 *  - Max 300 characters
 *  - Class 3–5: 3–4 sentences  |  Class 6–8: 2–3  |  Class 9–10: max 2 (strict)
 */
function generateRemark(data, config, term) {
  const cls       = parseInt(data.class, 10);
  const termData  = term === 'hy' ? data.halfYearly : data.finalTerm;
  const isStd     = config.markScheme === 'standard';

  // ── 1. Performance band ──────────────────────────────────────────────────
  const termPct = config.grandTotalMax > 0
    ? (termData.grandTotal / config.grandTotalMax) * 100
    : 0;

  const band = termPct >= 90 ? 'excellent'
             : termPct >= 80 ? 'vgood'
             : termPct >= 70 ? 'good'
             : termPct >= 40 ? 'average'
             :                 'weak';

  // ── 2. Subject analysis — use subjects that count toward the total ────────
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

  // ── 3. Attendance ────────────────────────────────────────────────────────
  const att    = termData.attendance || { present: 0, total: 0 };
  const attPct = att.total > 0 ? (att.present / att.total) * 100 : 100;
  const lowAtt = attPct < 75;

  // ── 4. UT vs TE pattern (standard scheme only) ───────────────────────────
  // Requires ≥ 2 non-aggregate, non-singleTotal subjects to be meaningful.
  let utPattern = '';
  if (isStd) {
    const normal = scorable.filter(s => !s.isAggregate && !s.singleTotal);
    let sumUT = 0, sumTE = 0, n = 0;
    for (const subj of normal) {
      const sd = termData.subjects[subj.key];
      if (sd && sd.ut != null && sd.exam != null) {
        sumUT += (sd.ut  / 30) * 100;   // normalise to %
        sumTE += (sd.exam / 60) * 100;
        n++;
      }
    }
    if (n >= 2) {
      const diff = (sumUT / n) - (sumTE / n);
      utPattern = diff > 12 ? 'exam' : diff < -12 ? 'improve' : 'consistent';
    }
  }

  // ── 5. Personalisation ───────────────────────────────────────────────────
  const firstName  = (data.student && data.student.name)
    ? data.student.name.trim().split(/\s+/)[0]
    : 'The student';

  // Deterministic variant: avoids identical openers for same band across terms/classes
  const v = (firstName.length + cls + (term === 'hy' ? 0 : 1)) % 2;

  // ── 6. Opening sentence pools ────────────────────────────────────────────
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

  // ── 7. Second sentence: weakness + UT/TE + attendance ───────────────────
  const s2Parts = [];

  if (worstLabel) {
    s2Parts.push(`Focused attention to ${worstLabel} is needed to strengthen overall results.`);
  }
  if (utPattern === 'exam') {
    s2Parts.push('Consistent preparation for examinations is advised.');
  } else if (utPattern === 'improve') {
    s2Parts.push('Improvement in the term examination is commendable.');
  }
  if (lowAtt) {
    s2Parts.push('Irregular attendance has affected academic progress.');
  }
  const s2 = s2Parts.join(' ');

  // ── 8. Encouragement sentence (class 3–5 only) ──────────────────────────
  const encPool = [
    'With consistent effort and regular revision, much more can be achieved.',
    'Continued dedication will lead to further progress and success.',
    'Steady effort and focused study will bring excellent results ahead.'
  ];
  const s3 = cls <= 5 ? encPool[cls % encPool.length] : '';

  // ── 9. Assemble by class tier ────────────────────────────────────────────
  const parts = [s1];

  if (cls >= 9) {
    // Class 9–10: strict maximum 2 sentences
    if (s2) parts.push(s2);
  } else if (cls >= 6) {
    // Class 6–8: 2–3 sentences
    if (s2) parts.push(s2);
  } else {
    // Class 3–5: 3–4 sentences, more descriptive
    if (s2) parts.push(s2);
    if (s3) parts.push(s3);
  }

  let remark = parts.join(' ');

  // ── 10. Enforce 300-character limit ─────────────────────────────────────
  if (remark.length > 300) {
    while (parts.length > 1 && remark.length > 300) {
      parts.pop();
      remark = parts.join(' ');
    }
    if (remark.length > 300) {
      remark = remark.slice(0, 297) + '...';
    }
  }

  return remark;
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. FUTURE-READY API SURFACE
   ═══════════════════════════════════════════════════════════════════════════
   The window.SFDS namespace exposes the report-card renderer for external
   orchestration (e.g., bulk-print loops, Firebase hydration, JSON import).
   JSON schema expected in sessionStorage key "sfds_studentData":
   {
     "class": number,
     "section": string,
     "session": string,
     "student": { name, rollNo, admissionNo, dob, house },
     "halfYearly": { attendance:{present,total}, grandTotal, grade, subjects:{...} },
     "finalTerm":  { attendance:{present,total}, grandTotal, grade, rank, totalStudents, subjects:{...} },
     "consolidated": { grandTotal, percentage, grade, result, subjects:{...} },
     "coScholastic": { key: { halfYearly, finalTerm } },
     "remarks": { halfYearly, finalTerm }
   }
   ═══════════════════════════════════════════════════════════════════════════ */
window.SFDS = window.SFDS || {};
window.SFDS.version = '1.1';
window.SFDS.renderReportCard = render;
window.SFDS.getGradeFromMarks = getGradeFromMarks;
window.SFDS.formatPct = formatPct;
window.SFDS.generateRemark = generateRemark;

/* ═══════════════════════════════════════════════════════════════════════════
   12. INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', render);
