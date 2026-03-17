// ============================================================
// LEASEGUARD - SCANNER ENGINE
// ============================================================

function analyzeLease(text) {
  const findings = [];

  for (const rule of RULES) {
    // Handle missing protection checks
    if (rule.missingCheck) {
      if (rule.missingCheck(text)) {
        findings.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          explanation: rule.explanation,
          tip: rule.tip || null,
          excerpt: null,
          isMissing: true,
        });
      }
      continue;
    }

    // Pattern matching
    const matchedExcerpts = new Set();
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(text.length, match.index + match[0].length + 50);
        let excerpt = text.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (start > 0) excerpt = '...' + excerpt;
        if (end < text.length) excerpt = excerpt + '...';
        const key = match[0].toLowerCase().trim();
        if (!matchedExcerpts.has(key)) {
          matchedExcerpts.add(key);
          findings.push({
            id: rule.id,
            category: rule.category,
            severity: rule.severity,
            title: rule.title,
            explanation: rule.explanation,
            tip: rule.tip || null,
            excerpt: excerpt,
            matchedText: match[0],
            isMissing: false,
          });
        }
        break; // Only keep first match per pattern
      }
    }
  }

  // De-duplicate by title (keep first match)
  const seen = new Set();
  return findings.filter(f => {
    const key = f.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeScore(findings) {
  const redCount = findings.filter(f => f.severity === 'red').length;
  const yellowCount = findings.filter(f => f.severity === 'yellow').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;
  const total = findings.length;
  const score = redCount * 3 + yellowCount * 1.5 + infoCount * 0.5;

  let grade, gradeColor, gradeSummary;

  if (total === 0) {
    grade = 'A+'; gradeColor = 'var(--green)';
    gradeSummary = 'No red flags detected. This lease appears straightforward, but always have an attorney review before signing.';
  } else if (score <= 3) {
    grade = 'A'; gradeColor = 'var(--green)';
    gradeSummary = 'Minor items detected. This lease is relatively clean with only a few points to clarify with your landlord.';
  } else if (score <= 6) {
    grade = 'B'; gradeColor = 'var(--yellow)';
    gradeSummary = 'Several items need attention. Review each flagged clause carefully and negotiate changes before signing.';
  } else if (score <= 10) {
    grade = 'C'; gradeColor = 'var(--yellow)';
    gradeSummary = 'Significant concerns found. This lease contains multiple clauses that could cost you money or limit your rights. Proceed with caution.';
  } else if (score <= 16) {
    grade = 'D'; gradeColor = 'var(--red)';
    gradeSummary = 'Numerous red flags detected. This lease heavily favors the landlord. Strongly consider negotiating or walking away.';
  } else {
    grade = 'F'; gradeColor = 'var(--red)';
    gradeSummary = 'Critical issues throughout. This lease contains an unusually high number of problematic clauses. Legal review is strongly recommended.';
  }

  return {
    grade,
    gradeColor,
    gradeSummary,
    score,
    redCount,
    yellowCount,
    infoCount,
    total,
  };
}

function groupFindings(findings) {
  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }
  return grouped;
}
