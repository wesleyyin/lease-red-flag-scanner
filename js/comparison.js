// ============================================================
// LEASEGUARD - SIDE-BY-SIDE COMPARISON
// ============================================================

function renderComparison(scanA, scanB) {
  const container = document.getElementById('comparison-content');

  const gradeColorA = getGradeColor(scanA.grade);
  const gradeColorB = getGradeColor(scanB.grade);

  let html = `
    <div class="comparison-header">
      <div class="comparison-col">
        <div class="comparison-name">${escapeHtml(scanA.name)}</div>
        <div class="comparison-date">${formatDate(scanA.date)}</div>
      </div>
      <div class="comparison-vs">VS</div>
      <div class="comparison-col">
        <div class="comparison-name">${escapeHtml(scanB.name)}</div>
        <div class="comparison-date">${formatDate(scanB.date)}</div>
      </div>
    </div>

    <div class="comparison-grades">
      <div class="comparison-grade-card">
        <div class="comparison-grade" style="color:${gradeColorA}">${scanA.grade}</div>
        <div class="comparison-grade-label">Lease Score</div>
      </div>
      <div class="comparison-grade-card">
        <div class="comparison-grade" style="color:${gradeColorB}">${scanB.grade}</div>
        <div class="comparison-grade-label">Lease Score</div>
      </div>
    </div>

    <div class="comparison-stats">
      <div class="comparison-stat-row">
        <div class="comparison-stat-value ${scanA.redCount > scanB.redCount ? 'worse' : scanA.redCount < scanB.redCount ? 'better' : ''}">${scanA.redCount}</div>
        <div class="comparison-stat-label">Red Flags</div>
        <div class="comparison-stat-value ${scanB.redCount > scanA.redCount ? 'worse' : scanB.redCount < scanA.redCount ? 'better' : ''}">${scanB.redCount}</div>
      </div>
      <div class="comparison-stat-row">
        <div class="comparison-stat-value ${scanA.yellowCount > scanB.yellowCount ? 'worse' : scanA.yellowCount < scanB.yellowCount ? 'better' : ''}">${scanA.yellowCount}</div>
        <div class="comparison-stat-label">Warnings</div>
        <div class="comparison-stat-value ${scanB.yellowCount > scanA.yellowCount ? 'worse' : scanB.yellowCount < scanA.yellowCount ? 'better' : ''}">${scanB.yellowCount}</div>
      </div>
      <div class="comparison-stat-row">
        <div class="comparison-stat-value">${scanA.infoCount}</div>
        <div class="comparison-stat-label">Info</div>
        <div class="comparison-stat-value">${scanB.infoCount}</div>
      </div>
      <div class="comparison-stat-row comparison-stat-total">
        <div class="comparison-stat-value">${scanA.total}</div>
        <div class="comparison-stat-label">Total Issues</div>
        <div class="comparison-stat-value">${scanB.total}</div>
      </div>
    </div>
  `;

  // Per-category comparison
  html += '<div class="comparison-categories">';
  html += '<h3 class="comparison-section-title">Category Breakdown</h3>';

  for (const cat of CATEGORY_ORDER) {
    const meta = CATEGORY_META[cat];
    const aItems = (scanA.findings || []).filter(f => f.category === cat);
    const bItems = (scanB.findings || []).filter(f => f.category === cat);

    if (aItems.length === 0 && bItems.length === 0) continue;

    const maxCount = Math.max(aItems.length, bItems.length, 1);

    html += `
      <div class="comparison-category">
        <div class="comparison-category-header">
          <span class="comparison-category-icon" style="color:${meta.color}">${meta.icon}</span>
          <span class="comparison-category-name">${cat}</span>
        </div>
        <div class="comparison-bar-row">
          <div class="comparison-bar-container left">
            <div class="comparison-bar" style="width:${(aItems.length / maxCount) * 100}%;background:${meta.color}"></div>
            <span class="comparison-bar-count">${aItems.length}</span>
          </div>
          <div class="comparison-bar-container right">
            <div class="comparison-bar" style="width:${(bItems.length / maxCount) * 100}%;background:${meta.color}"></div>
            <span class="comparison-bar-count">${bItems.length}</span>
          </div>
        </div>
        <div class="comparison-findings-row">
          <div class="comparison-findings-col">
            ${aItems.map(f => `<div class="comparison-finding severity-dot-${f.severity}">${escapeHtml(f.title)}</div>`).join('')}
            ${aItems.length === 0 ? '<div class="comparison-finding none">No issues</div>' : ''}
          </div>
          <div class="comparison-findings-col">
            ${bItems.map(f => `<div class="comparison-finding severity-dot-${f.severity}">${escapeHtml(f.title)}</div>`).join('')}
            ${bItems.length === 0 ? '<div class="comparison-finding none">No issues</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  html += '</div>';

  // Verdict
  const better = scanA.score < scanB.score ? scanA : scanB;
  const worse = scanA.score < scanB.score ? scanB : scanA;
  const tie = scanA.score === scanB.score;

  html += `
    <div class="comparison-verdict">
      <h3 class="comparison-verdict-title">${tie ? 'Both leases scored equally' : `"${escapeHtml(better.name)}" is the better lease`}</h3>
      <p class="comparison-verdict-text">
        ${tie
          ? 'Both leases have the same risk score. Review the individual findings to understand the specific differences.'
          : `It has a risk score of ${better.score.toFixed(1)} compared to ${worse.score.toFixed(1)} for "${escapeHtml(worse.name)}". However, always read every clause carefully regardless of the overall score.`
        }
      </p>
    </div>
  `;

  container.innerHTML = html;
}

function getGradeColor(grade) {
  if (grade === 'A+' || grade === 'A') return 'var(--green)';
  if (grade === 'B' || grade === 'C') return 'var(--yellow)';
  return 'var(--red)';
}
