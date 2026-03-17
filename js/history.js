// ============================================================
// LEASEGUARD - SCAN HISTORY (LocalStorage)
// ============================================================

const STORAGE_KEY = 'leaseguard_scans';

function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
}

function saveHistory(scans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

function saveScan(name, leaseText, findings, scoreData) {
  const scans = loadHistory();
  const scan = {
    id: generateId(),
    name: name || 'Untitled Scan',
    date: new Date().toISOString(),
    leaseTextPreview: leaseText.substring(0, 200) + (leaseText.length > 200 ? '...' : ''),
    leaseTextLength: leaseText.length,
    findings: findings,
    grade: scoreData.grade,
    gradeColor: scoreData.gradeColor,
    redCount: scoreData.redCount,
    yellowCount: scoreData.yellowCount,
    infoCount: scoreData.infoCount,
    total: scoreData.total,
    score: scoreData.score,
  };
  scans.unshift(scan);
  saveHistory(scans);
  return scan;
}

function deleteScan(scanId) {
  let scans = loadHistory();
  scans = scans.filter(s => s.id !== scanId);
  saveHistory(scans);
}

function renameScan(scanId, newName) {
  const scans = loadHistory();
  const scan = scans.find(s => s.id === scanId);
  if (scan) {
    scan.name = newName;
    saveHistory(scans);
  }
}

function getScan(scanId) {
  const scans = loadHistory();
  return scans.find(s => s.id === scanId) || null;
}

function clearAllHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function generateId() {
  return 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${hour12}:${mins} ${ampm}`;
}
