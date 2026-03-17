// ============================================================
// LEASEGUARD - MAIN APP CONTROLLER
// ============================================================

// State
let currentView = 'scanner';
let lastFindings = null;
let lastScoreData = null;
let lastLeaseText = '';
let selectedScansForCompare = [];

// ============================================================
// VIEW ROUTING
// ============================================================

function showView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Refresh history view when switching to it
  if (viewName === 'history') {
    renderHistoryView();
  }

  // Reset comparison when leaving
  if (viewName !== 'compare') {
    selectedScansForCompare = [];
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// SCANNER
// ============================================================

function scanLease() {
  const textarea = document.getElementById('lease-input');
  const text = textarea.value.trim();
  if (!text) {
    textarea.classList.add('shake');
    setTimeout(() => textarea.classList.remove('shake'), 500);
    return;
  }

  const scanBtn = document.getElementById('scan-btn');
  const inputSection = document.getElementById('input-section');
  const scanning = document.getElementById('scanning');
  const results = document.getElementById('results');

  scanBtn.disabled = true;
  results.classList.remove('active');
  inputSection.classList.add('hidden');
  scanning.classList.add('active');

  setTimeout(() => {
    lastLeaseText = text;
    lastFindings = analyzeLease(text);
    lastScoreData = computeScore(lastFindings);

    scanning.classList.remove('active');
    scanBtn.disabled = false;
    renderResults(lastFindings, lastScoreData);
    results.classList.add('active');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1500);
}

function renderResults(findings, scoreData) {
  const results = document.getElementById('results');
  const grouped = groupFindings(findings);

  let html = `
    <div class="results-actions-top">
      <button class="btn btn-ghost btn-sm" onclick="backToInput()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Edit Lease Text
      </button>
      <div class="results-actions-right">
        <button class="btn btn-ghost btn-sm" onclick="printReport()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Report
        </button>
        <button class="btn btn-primary btn-sm" onclick="promptSaveScan()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Scan
        </button>
      </div>
    </div>

    <div class="score-banner">
      <div class="score-grade" style="color:${scoreData.gradeColor}">${scoreData.grade}</div>
      <div class="score-label">Lease Score</div>
      <div class="score-summary">${scoreData.gradeSummary}</div>
      <div class="score-chips">
        ${scoreData.redCount > 0 ? `<span class="chip chip-red"><span class="chip-dot"></span>${scoreData.redCount} Red Flag${scoreData.redCount !== 1 ? 's' : ''}</span>` : ''}
        ${scoreData.yellowCount > 0 ? `<span class="chip chip-yellow"><span class="chip-dot"></span>${scoreData.yellowCount} Warning${scoreData.yellowCount !== 1 ? 's' : ''}</span>` : ''}
        ${scoreData.infoCount > 0 ? `<span class="chip chip-blue"><span class="chip-dot"></span>${scoreData.infoCount} Info</span>` : ''}
        ${scoreData.total === 0 ? `<span class="chip chip-green"><span class="chip-dot"></span>Clean</span>` : ''}
      </div>
    </div>
  `;

  if (scoreData.total === 0) {
    html += `
      <div class="no-flags">
        <div class="no-flags-icon">&#9989;</div>
        <h3>Looking Good</h3>
        <p>No red flags, warnings, or issues detected. This lease appears straightforward. Still, always have a qualified attorney review before signing.</p>
      </div>
    `;
  }

  for (const cat of CATEGORY_ORDER) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    const meta = CATEGORY_META[cat];

    html += `
      <div class="category open" data-category="${cat}">
        <div class="category-header" onclick="toggleCategory(this)">
          <div class="category-header-left">
            <div class="category-icon" style="background:${meta.bg};color:${meta.color}">${meta.icon}</div>
            <div>
              <div class="category-title">${cat}</div>
              <div class="category-count">${items.length} item${items.length !== 1 ? 's' : ''} found</div>
            </div>
          </div>
          <span class="category-chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
        <div class="category-items">
    `;

    for (const item of items) {
      const sevClass = item.severity === 'red' ? 'severity-red' : item.severity === 'yellow' ? 'severity-yellow' : 'severity-blue';
      const sevLabel = item.severity === 'red' ? 'Red Flag' : item.severity === 'yellow' ? 'Warning' : 'Info';

      html += `
        <div class="flag-item">
          <div class="flag-top">
            <span class="severity-badge ${sevClass}">${sevLabel}</span>
            <span class="flag-title">${escapeHtml(item.title)}</span>
          </div>
          ${item.excerpt
            ? `<div class="flag-excerpt">"${escapeHtml(item.excerpt)}"</div>`
            : `<div class="flag-excerpt flag-excerpt-missing">Not found in lease text -- this protection should be explicitly stated.</div>`
          }
          <div class="flag-explanation">
            <div class="flag-explanation-section">
              <strong>What this means for you:</strong> ${escapeHtml(item.explanation)}
            </div>
            ${item.tip ? `
              <div class="flag-tip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span><strong>Tip:</strong> ${escapeHtml(item.tip)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    html += '</div></div>';
  }

  html += `
    <div class="results-footer">
      <p>LeaseGuard is an educational tool. It does not constitute legal advice. Always consult a qualified attorney before signing a lease.</p>
    </div>
  `;

  results.innerHTML = html;
}

function backToInput() {
  document.getElementById('input-section').classList.remove('hidden');
  document.getElementById('results').classList.remove('active');
  document.getElementById('results').innerHTML = '';
  document.getElementById('lease-input').scrollIntoView({ behavior: 'smooth' });
}

function toggleCategory(header) {
  header.closest('.category').classList.toggle('open');
}

function loadSample() {
  const textarea = document.getElementById('lease-input');
  textarea.value = SAMPLE_LEASE;
  textarea.scrollIntoView({ behavior: 'smooth' });
  textarea.focus();
  updateCharCount();
}

function clearAll() {
  const textarea = document.getElementById('lease-input');
  textarea.value = '';
  document.getElementById('input-section').classList.remove('hidden');
  document.getElementById('results').classList.remove('active');
  document.getElementById('results').innerHTML = '';
  lastFindings = null;
  lastScoreData = null;
  lastLeaseText = '';
  updateCharCount();
}

function updateCharCount() {
  const textarea = document.getElementById('lease-input');
  const counter = document.getElementById('char-count');
  const len = textarea.value.length;
  if (len === 0) {
    counter.textContent = '';
  } else {
    const words = textarea.value.trim().split(/\s+/).length;
    counter.textContent = `${words.toLocaleString()} words`;
  }
}

// ============================================================
// SAVE SCAN
// ============================================================

function promptSaveScan() {
  if (!lastFindings || !lastScoreData) return;

  const modal = document.getElementById('save-modal');
  const input = document.getElementById('save-name-input');
  input.value = '';
  input.placeholder = 'e.g., "123 Main St Apartment"';
  modal.classList.add('active');
  setTimeout(() => input.focus(), 100);
}

function confirmSaveScan() {
  const input = document.getElementById('save-name-input');
  const name = input.value.trim() || 'Untitled Scan';
  saveScan(name, lastLeaseText, lastFindings, lastScoreData);
  closeModal('save-modal');
  showToast('Scan saved to history');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ============================================================
// HISTORY VIEW
// ============================================================

function renderHistoryView() {
  const container = document.getElementById('history-content');
  const scans = loadHistory();

  if (scans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h3>No saved scans yet</h3>
        <p>Scan a lease and save the results to build your comparison history.</p>
        <button class="btn btn-primary" onclick="showView('scanner')">Scan a Lease</button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="history-toolbar">
      <div class="history-count">${scans.length} saved scan${scans.length !== 1 ? 's' : ''}</div>
      <div class="history-actions">
        ${scans.length >= 2 ? `<button class="btn btn-primary btn-sm" id="compare-btn" onclick="startComparison()" disabled>Select 2 scans to compare</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="confirmClearHistory()">Clear All</button>
      </div>
    </div>
    <div class="history-list">
  `;

  for (const scan of scans) {
    const gradeColor = getGradeColor(scan.grade);
    html += `
      <div class="history-card ${selectedScansForCompare.includes(scan.id) ? 'selected' : ''}" data-scan-id="${scan.id}" onclick="toggleScanSelection('${scan.id}')">
        <div class="history-card-left">
          <div class="history-grade" style="color:${gradeColor}">${scan.grade}</div>
        </div>
        <div class="history-card-center">
          <div class="history-name">${escapeHtml(scan.name)}</div>
          <div class="history-meta">${formatDate(scan.date)} &middot; ${scan.leaseTextLength.toLocaleString()} characters</div>
          <div class="history-chips">
            ${scan.redCount > 0 ? `<span class="chip-mini chip-red">${scan.redCount} red</span>` : ''}
            ${scan.yellowCount > 0 ? `<span class="chip-mini chip-yellow">${scan.yellowCount} warn</span>` : ''}
            ${scan.infoCount > 0 ? `<span class="chip-mini chip-blue">${scan.infoCount} info</span>` : ''}
            ${scan.total === 0 ? `<span class="chip-mini chip-green">clean</span>` : ''}
          </div>
        </div>
        <div class="history-card-right">
          <button class="icon-btn" onclick="event.stopPropagation();promptRenameScan('${scan.id}')" title="Rename">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn icon-btn-danger" onclick="event.stopPropagation();confirmDeleteScan('${scan.id}')" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function toggleScanSelection(scanId) {
  const idx = selectedScansForCompare.indexOf(scanId);
  if (idx >= 0) {
    selectedScansForCompare.splice(idx, 1);
  } else {
    if (selectedScansForCompare.length >= 2) {
      selectedScansForCompare.shift();
    }
    selectedScansForCompare.push(scanId);
  }
  renderHistoryView();
  updateCompareButton();
}

function updateCompareButton() {
  const btn = document.getElementById('compare-btn');
  if (!btn) return;
  if (selectedScansForCompare.length === 2) {
    btn.disabled = false;
    btn.textContent = 'Compare Selected';
  } else if (selectedScansForCompare.length === 1) {
    btn.disabled = true;
    btn.textContent = 'Select 1 more scan';
  } else {
    btn.disabled = true;
    btn.textContent = 'Select 2 scans to compare';
  }
}

function startComparison() {
  if (selectedScansForCompare.length !== 2) return;
  const scanA = getScan(selectedScansForCompare[0]);
  const scanB = getScan(selectedScansForCompare[1]);
  if (!scanA || !scanB) return;

  showView('compare');
  renderComparison(scanA, scanB);
}

function confirmDeleteScan(scanId) {
  if (confirm('Delete this saved scan?')) {
    deleteScan(scanId);
    selectedScansForCompare = selectedScansForCompare.filter(id => id !== scanId);
    renderHistoryView();
    showToast('Scan deleted');
  }
}

function promptRenameScan(scanId) {
  const scan = getScan(scanId);
  if (!scan) return;
  const newName = prompt('Rename scan:', scan.name);
  if (newName !== null && newName.trim()) {
    renameScan(scanId, newName.trim());
    renderHistoryView();
    showToast('Scan renamed');
  }
}

function confirmClearHistory() {
  if (confirm('Delete all saved scans? This cannot be undone.')) {
    clearAllHistory();
    selectedScansForCompare = [];
    renderHistoryView();
    showToast('History cleared');
  }
}

// ============================================================
// PRINT REPORT
// ============================================================

function printReport() {
  if (!lastFindings || !lastScoreData) return;
  document.body.classList.add('printing');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing');
  }, 100);
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 2500);
}

// ============================================================
// UTILITY
// ============================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Textarea char counter
  const textarea = document.getElementById('lease-input');
  if (textarea) {
    textarea.addEventListener('input', updateCharCount);
  }

  // Keyboard shortcut: Enter to scan when textarea focused
  if (textarea) {
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        scanLease();
      }
    });
  }

  // Save modal enter key
  const saveInput = document.getElementById('save-name-input');
  if (saveInput) {
    saveInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmSaveScan();
      }
      if (e.key === 'Escape') {
        closeModal('save-modal');
      }
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Update history count badge
  updateHistoryBadge();
});

function updateHistoryBadge() {
  const badge = document.getElementById('history-badge');
  if (!badge) return;
  const count = loadHistory().length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}
