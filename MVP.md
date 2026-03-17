# LeaseGuard - Red Flag Scanner MVP

## Core Value Prop

LeaseGuard instantly scans your lease agreement for hidden fees, penalty clauses, liability traps, and missing protections -- giving you a plain-English breakdown of what each clause actually means for you, so you can negotiate from a position of knowledge.

## MVP Scope

### IN (must-have features)

1. **Paste-and-scan** -- paste lease text, get instant analysis with 40+ rules across 6 categories
2. **Letter grade scoring** -- A+ through F grade based on weighted severity of findings
3. **Clause-by-clause breakdown** -- each finding shows the matched text, severity, and a "What this means for you" plain-English explanation
4. **Scan history** -- saves past scans to LocalStorage so users can revisit and compare previous leases
5. **Side-by-side comparison** -- pick any 2 saved scans, see red flag counts and grades compared visually
6. **Shareable/printable report** -- clean print-friendly layout of all findings, suitable for sharing with a roommate or attorney
7. **Sample lease loader** -- pre-loaded sample lease to demonstrate the scanner
8. **Mobile-responsive dark UI** -- dark aesthetic with gold accent, Instrument Serif/DM Sans/DM Mono fonts

### OUT (deferred to v2)

- PDF/DOCX file upload and text extraction
- AI/LLM-powered clause analysis (current approach is regex rule engine -- fast and free)
- User accounts and cloud sync
- Sharing via URL/link (current share is print/PDF only)
- Landlord/property lookup integration
- State-specific legal database
- Browser extension for scanning leases on apartment listing sites
- Email report delivery

## User Flow (Critical Path)

```
1. Land on homepage
2. Paste lease text (or load sample)
3. Click "Scan Lease"
4. See scanning animation (1.5s)
5. View results: grade, summary, category-by-category breakdown
6. Expand any finding to read "What this means for you"
7. (Optional) Click "Save Scan" to store in history
8. (Optional) Click "Print Report" for a clean printable view
9. (Optional) Go to History tab, select 2 scans, click "Compare"
10. See side-by-side comparison of grades, flag counts, and per-category differences
```

## Tech Stack

- **Frontend only** -- vanilla HTML, CSS, JavaScript (no framework, no build step)
- **Persistence** -- LocalStorage for scan history
- **Hosting** -- static files, can be served from anywhere (Flask static, GitHub Pages, Vercel, etc.)
- **Fonts** -- Google Fonts (Instrument Serif, DM Sans, DM Mono)
- **No backend needed** -- all scanning is client-side regex

---

## Implementation Plan

### File Structure

```
pocs/lease-red-flag-scanner/
  MVP.md            # This file
  index.html        # Main app shell, navigation, all views
  css/
    styles.css      # All styles (dark theme, responsive, print)
  js/
    rules.js        # 40+ rule definitions with patterns and explanations
    scanner.js      # Analysis engine (pattern matching, scoring, grading)
    history.js      # LocalStorage CRUD for scan history
    comparison.js   # Side-by-side comparison logic and rendering
    app.js          # Main app controller (view routing, event binding, rendering)
    sample.js       # Sample lease text
```

### Ordered Build Steps

1. **Rules engine** (`rules.js`) -- Define 40+ rules across 6 categories. Each rule has: category, severity, title, patterns (regex array), explanation, and optional missingCheck function. This is the core intellectual property of the app.

2. **Scanner engine** (`scanner.js`) -- Analyze function that runs all rules against text, extracts matching excerpts, deduplicates, computes grade. Scoring: red=3, yellow=1.5, info=0.5 weighted points.

3. **CSS foundation** (`styles.css`) -- Full dark theme with CSS custom properties. Mobile-responsive breakpoints. Print media query for clean report output. Transitions and animations.

4. **App shell** (`index.html`) -- Minimal HTML structure with view containers for: scanner view, results view, history view, comparison view, print report view. Navigation between views.

5. **Main app controller** (`app.js`) -- View routing (scan/history/compare), event binding, render functions for results (grade banner, category sections, flag items with expandable explanations).

6. **History system** (`history.js`) -- Save scan results + metadata (date, name, grade, flag counts) to LocalStorage. List/delete/rename saved scans. Export scan data.

7. **Comparison view** (`comparison.js`) -- Select 2 scans from history, render side-by-side grade comparison, per-category flag count bars, and detailed per-finding diff.

8. **Sample lease** (`sample.js`) -- Sample lease text constant for demo purposes.

9. **Polish pass** -- Empty states, loading animations, smooth transitions, edge cases (empty text, very long text, no matches), mobile testing.

### Key Technical Decisions

- **No build step** -- Files are plain JS loaded via script tags. Fast to iterate, zero tooling required.
- **ES modules not used** -- Simple script concatenation order to avoid CORS issues when opening from file system.
- **LocalStorage for persistence** -- Simple, synchronous, no backend. Stores JSON blobs of scan results. ~5MB limit is more than enough for dozens of scans.
- **Regex-only analysis** -- No API calls, no latency, no cost, works offline. Tradeoff: cannot understand semantic meaning, only pattern matching. Good enough for MVP validation.
- **Single-page app with view switching** -- No router library. Just show/hide div containers. Keeps things simple.
- **Print via CSS @media print** -- No PDF generation library. Browser's native print produces clean output with hidden UI chrome.
