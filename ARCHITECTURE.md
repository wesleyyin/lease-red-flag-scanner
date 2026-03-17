# LeaseGuard Production Architecture

## Status

Proposed -- March 2026

## Context

LeaseGuard exists today as a client-side-only MVP: a static HTML/CSS/JS app that runs 45 regex rules against pasted lease text and produces a graded report. There is no backend, no file upload, no AI analysis, no payment system. The current codebase lives in `index.html`, `css/styles.css`, and six JS files (`rules.js`, `scanner.js`, `history.js`, `comparison.js`, `sample.js`, `app.js`).

This document describes the target architecture for a production SaaS product with two tiers:

- **Free tier**: Upload PDF/DOCX, regex analysis + DeepSeek-powered explanations
- **Paid tier ($1/scan)**: Full-document DeepSeek review + Claude Opus 4.6 expert legal reasoning

The system must be serverless, async, and cheap to operate for a solo founder.

---

## 1. System Overview

```
                                     INTERNET
                                        |
                              +-------------------+
                              |   Cloudflare CDN  |
                              |  (static assets)  |
                              +-------------------+
                                        |
                              +-------------------+
                              | Cloudflare Workers |
                              |    (API Router)    |
                              +-------------------+
                             /    |       |        \
                            /     |       |         \
              +----------+  +---------+ +--------+ +----------+
              | R2 Bucket|  | D1 / KV | | Stripe | | Queue    |
              | (uploads)|  | (state) | | (pay)  | | (jobs)   |
              +----------+  +---------+ +--------+ +----------+
                                                       |
                                              +------------------+
                                              | Worker: Pipeline |
                                              |  (analysis job)  |
                                              +------------------+
                                             /         |          \
                                  +---------+   +----------+   +---------+
                                  | Parse   |   | Regex    |   | LLM     |
                                  | (PDF/   |   | Engine   |   | Calls   |
                                  |  DOCX)  |   | (45+     |   | (Deep-  |
                                  |         |   |  rules)  |   |  Seek,  |
                                  +---------+   +----------+   |  Claude)|
                                                               +---------+
```

**Data flow summary**: The frontend uploads a file to R2 via a presigned URL, then POST to `/api/scan` creates a job record in D1. A Cloudflare Queue triggers the pipeline worker, which pulls the file from R2, parses it, runs regex, calls LLMs as needed, writes results back to D1, and optionally pushes a completion event via a polling endpoint. The frontend polls `/api/scan/:id` until results appear.

---

## 2. Component Breakdown

### 2.1 Frontend (Static Site)

**What it is**: The existing vanilla HTML/CSS/JS app, evolved to support file upload and async result fetching.

**Changes from current MVP**:
- Add a file upload input (PDF/DOCX) alongside the existing paste-text input
- Add a "processing" view that polls for results after upload
- Add a payment gate UI for the paid tier (Stripe Checkout redirect)
- Keep the paste-and-scan flow working client-side for instant gratification (no backend needed for text-only regex scans)

**Hosting**: Cloudflare Pages (free tier). Deploy by pushing to a git branch. Automatic SSL, global CDN, preview deployments on PRs.

**Why not a framework**: The existing vanilla JS works. Adding React or Svelte for this scope would slow iteration and add build complexity. If the product grows to need routing, auth, dashboards, revisit this decision then.

### 2.2 API Gateway / Routing

**What it is**: Cloudflare Workers acting as the HTTP API layer.

**Endpoints** (detailed in section 5):
- `POST /api/upload` -- returns a presigned R2 URL
- `POST /api/scan` -- creates a scan job
- `GET /api/scan/:id` -- returns job status and results
- `POST /api/payment/create` -- creates a Stripe Checkout session
- `POST /api/webhook/stripe` -- handles Stripe payment confirmation

**Why Cloudflare Workers over AWS Lambda**:
- Zero cold starts (V8 isolates, not containers)
- R2, D1, Queues, and KV are all native integrations -- no IAM policy hell
- Free tier includes 100K requests/day, which covers early traction
- `wrangler` CLI provides a smooth local dev experience
- Cheaper than Lambda + API Gateway at low scale

**Trade-off acknowledged**: Workers have a 128MB memory limit and 30-second CPU time limit on the standard plan. The pipeline worker (which does heavy parsing) will need the Workers Unbound pricing tier ($0.50/million requests + $12.50/million GB-s CPU). For a document parsing + LLM call pipeline, this is sufficient -- the LLM calls are network-bound, not CPU-bound, so they do not consume CPU time while awaiting responses.

### 2.3 File Upload + Storage

**What it is**: Cloudflare R2 for file storage, with presigned URLs for direct browser-to-R2 uploads.

**Flow**:
1. Frontend calls `POST /api/upload` with file metadata (name, size, type)
2. Worker validates (max 20MB, PDF or DOCX only), generates a presigned PUT URL for R2
3. Frontend uploads directly to R2 using the presigned URL (no file passes through the Worker)
4. Frontend calls `POST /api/scan` with the R2 object key to start processing

**Why R2 over S3**:
- Zero egress fees (S3 egress costs add up fast)
- S3-compatible API, so all existing libraries work
- Native to Cloudflare Workers -- no cross-provider networking

**Retention policy**: Files are deleted 24 hours after upload via an R2 lifecycle rule. Parsed text is stored in D1 only for the duration needed to return results (7 days), then purged by a scheduled Worker (cron trigger).

### 2.4 Document Parsing Service

**What it is**: The component that converts a PDF or DOCX file into structured text sections.

**Implementation**: A Python-based Cloudflare Worker (using the Workers Python support) or, if Python Workers prove too constrained, a lightweight AWS Lambda function invoked via HTTP from the pipeline Worker.

**Recommended approach -- start with a Python Lambda behind a Function URL**:

The parsing libraries needed (`pdfplumber`, `PyMuPDF`, `python-docx`, `pytesseract`) are mature Python packages that need native binaries. Cloudflare Workers Python support is still early and may not support these. A single Lambda function with these dependencies bundled as a layer is the pragmatic choice.

**Library choices**:

| Format | Library | Why |
|--------|---------|-----|
| Digital PDF (text-based) | `pdfplumber` | Best text extraction fidelity, handles tables, preserves layout. Superior to PyPDF2 for complex layouts. |
| Scanned PDF (image-based) | `pdf2image` + `pytesseract` | Detect scanned pages by checking if `pdfplumber` returns empty text. Fall back to OCR. Tesseract is free and good enough. |
| DOCX | `python-docx` | Standard library for DOCX parsing. Extracts paragraphs, tables, headers. |

**Structured output format**:

```json
{
  "sections": [
    {
      "index": 0,
      "heading": "Section 1: Rent and Fees",
      "text": "The monthly rent shall be...",
      "page": 1
    }
  ],
  "full_text": "concatenated full document text",
  "metadata": {
    "page_count": 12,
    "word_count": 8500,
    "is_scanned": false
  }
}
```

**Section detection heuristic**: Split on numbered headings (e.g., "Section 1", "Article II"), bold/underlined text in DOCX, or ALL CAPS lines. Fall back to paragraph-level splitting if no headings are detected.

**Lambda sizing**: 512MB RAM, 60-second timeout. PDF parsing + OCR of a 20-page lease takes roughly 5-15 seconds. Cost: ~$0.0005 per invocation.

### 2.5 Analysis Pipeline

**What it is**: The core processing pipeline that runs regex, DeepSeek, and optionally Claude against the parsed document.

**Architecture**: A single pipeline Worker (Cloudflare Workers Unbound) orchestrates the three analysis passes sequentially.

#### Pass 1: Regex Engine

Port the existing 45+ rules from `rules.js` to Python. The rules are already well-structured with `id`, `category`, `severity`, `patterns`, `explanation`, `tip`, and `missingCheck`. A direct port to Python regex is straightforward.

The regex engine runs against the full document text and produces a list of findings identical in shape to the current JS output.

**Why port to Python instead of keeping JS**: The rest of the pipeline is Python (parsing, LLM SDK calls). Maintaining one language for the entire backend reduces context switching. The regex rules are data, not complex logic -- the port is mechanical.

#### Pass 2: DeepSeek Analysis

**Model**: `deepseek-chat` via the DeepSeek API (OpenAI-compatible endpoint)

**Free tier behavior**: Send only the regex-flagged sections plus surrounding context (one section before and after each flagged section). The prompt asks DeepSeek to:
1. Confirm or dismiss each regex flag (reduce false positives)
2. Provide a plain-English explanation of each confirmed finding
3. Identify any additional concerns in the provided context that regex missed
4. Rate each finding's severity on a 1-5 scale with justification

**Paid tier behavior**: Send the entire document to DeepSeek with instructions to:
1. Identify every section that warrants deeper legal analysis
2. Flag concerns that span multiple sections (e.g., contradictory clauses)
3. Provide section references for each concern
4. Output a structured list of sections to send to Claude for Pass 3

**Prompt structure** (free tier example):

```
You are a tenant rights analyst reviewing a residential lease agreement.

Below are sections flagged by an automated scan, along with surrounding context.
For each flagged item, provide:
1. CONFIRM or DISMISS (is this a genuine concern?)
2. A plain-English explanation (2-3 sentences, written for someone with no legal background)
3. Any additional concerns in the surrounding context that were not flagged
4. Severity: 1 (minor) to 5 (serious legal risk)

FLAGGED SECTIONS:
{sections_with_context}

Respond in JSON format:
{
  "findings": [
    {
      "original_flag_id": "fee-application",
      "status": "CONFIRMED",
      "explanation": "...",
      "severity": 4,
      "additional_concerns": ["..."]
    }
  ]
}
```

**Cost per call**: DeepSeek-chat pricing is approximately $0.14/million input tokens and $0.28/million output tokens. A typical lease sends ~4,000-8,000 input tokens and receives ~1,000-2,000 output tokens. Estimated cost: $0.001-0.003 per scan.

#### Pass 3: Claude Opus 4.6 (Paid Tier Only)

**Model**: `claude-opus-4-6-20250610` via the Anthropic API

**Input**: The sections flagged by DeepSeek in Pass 2, plus relevant context.

**Prompt design**: Claude receives a structured prompt asking for:
1. Legal precedent awareness (common court rulings on similar clauses)
2. Jurisdiction-specific risk assessment (if the user provides their state)
3. Specific negotiation suggestions (alternative clause language to propose)
4. An overall risk assessment narrative

**Token budget**: Limit input to ~6,000 tokens (the flagged sections, not the entire document). Limit output to ~2,000 tokens. This keeps the Claude call focused and cost-effective.

**Cost per call**: Claude Opus 4.6 pricing is approximately $15/million input tokens and $75/million output tokens. A typical paid scan: ~6,000 input tokens ($0.09) + ~2,000 output tokens ($0.15) = ~$0.24 per scan. At $1.00 revenue per scan, this leaves ~$0.75 gross margin before other costs.

### 2.6 Job Queue / State Machine

**What it is**: The system that tracks scan jobs from creation to completion.

**Implementation**: Cloudflare Queues for async job dispatch + Cloudflare D1 (SQLite) for persistent job state.

**Job states**:

```
CREATED --> PARSING --> ANALYZING_REGEX --> ANALYZING_DEEPSEEK
  --> [if paid] ANALYZING_CLAUDE --> COMPLETED
  --> FAILED (from any state)
```

**D1 schema**:

```sql
CREATE TABLE scans (
  id TEXT PRIMARY KEY,           -- UUID
  created_at TEXT NOT NULL,      -- ISO 8601
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,          -- CREATED|PARSING|ANALYZING_REGEX|ANALYZING_DEEPSEEK|ANALYZING_CLAUDE|COMPLETED|FAILED
  tier TEXT NOT NULL,            -- free|paid
  file_key TEXT,                 -- R2 object key
  file_name TEXT,
  parsed_text TEXT,              -- full document text (cleared after 7 days)
  regex_results TEXT,            -- JSON blob
  deepseek_results TEXT,         -- JSON blob
  claude_results TEXT,           -- JSON blob (paid only)
  final_report TEXT,             -- JSON blob (assembled report)
  error_message TEXT,
  stripe_session_id TEXT,        -- for paid scans
  stripe_payment_status TEXT,    -- pending|paid|failed
  jurisdiction TEXT              -- optional, user-provided state
);

CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_stripe ON scans(stripe_session_id);
```

**Why D1 over DynamoDB**:
- Native to Cloudflare (no cross-provider calls)
- SQL is easier to query for debugging than DynamoDB's key-value model
- Free tier includes 5GB storage and 5 million reads/day
- For a single-table job tracker, D1 is more than sufficient

**Queue flow**:
1. `POST /api/scan` writes a row to D1 with status=CREATED and publishes a message to the Cloudflare Queue
2. The pipeline Worker receives the message, updates status as it progresses through each stage
3. If any stage fails, status is set to FAILED with an error message
4. The pipeline Worker has built-in retry logic: Cloudflare Queues retry failed messages up to 3 times with exponential backoff

### 2.7 Payment Integration

**What it is**: Stripe Checkout for the $1 paid scan tier.

**Flow**:
1. User uploads a file and selects "Deep Analysis ($1)"
2. Frontend calls `POST /api/payment/create` which creates a Stripe Checkout Session with:
   - `line_items`: one-time $1.00 charge
   - `metadata.scan_id`: the scan job ID
   - `success_url`: redirect back to the app with the scan ID
   - `cancel_url`: redirect back to the upload page
3. User is redirected to Stripe's hosted checkout page
4. After payment, Stripe sends a `checkout.session.completed` webhook to `POST /api/webhook/stripe`
5. The webhook handler verifies the signature, updates the scan's `stripe_payment_status` to "paid", and publishes the job to the queue

**Why Stripe Checkout over Payment Links**:
- Checkout Sessions allow passing metadata (scan_id) so the webhook can associate payment with the right job
- Checkout handles all PCI compliance, SCA, and mobile payment methods
- No need to build a custom payment form

**Stripe fees**: $0.30 + 2.9% per transaction = $0.329 on a $1 charge. This is 33% of revenue. At scale, consider Stripe's volume discounts or batching scans into credit packs (e.g., "5 scans for $4") to amortize the fixed $0.30 fee.

**Alternative to explore later**: Sell scan credits in packs. "5 deep scans for $4" means Stripe takes $0.416 (10.4%) instead of $1.645 (32.9%) on the same 5 scans. This dramatically improves unit economics.

### 2.8 Results Delivery

**What it is**: How the frontend gets scan results back from the async pipeline.

**Primary method -- Polling**:
- Frontend polls `GET /api/scan/:id` every 2 seconds
- Response includes `status` and, when complete, the full `report` object
- Polling stops when status is `COMPLETED` or `FAILED`
- Include an `estimated_seconds_remaining` field based on the current pipeline stage

**Why polling over WebSocket/SSE**:
- Simpler to implement and debug
- No persistent connection management
- Works behind any proxy/CDN without configuration
- For a 15-30 second pipeline, polling every 2 seconds means 8-15 requests -- trivial load
- Cloudflare Workers do not natively support WebSocket server-side state management well

**Future upgrade path**: If the product grows to need real-time updates (e.g., streaming analysis results), add Server-Sent Events. Cloudflare Workers support SSE via the `ReadableStream` API. This would be an additive change to the existing polling endpoint.

---

## 3. Data Flow

### 3.1 Free Tier Scan

```
1. User uploads PDF/DOCX via presigned R2 URL
2. Frontend: POST /api/scan { file_key, tier: "free" }
3. Worker: Insert scan row (status=CREATED), publish to Queue
4. Queue triggers Pipeline Worker:
   a. Update status=PARSING
   b. Fetch file from R2
   c. Call Parse Lambda (PDF/DOCX --> structured text)
   d. Update status=ANALYZING_REGEX
   e. Run 45+ regex rules against full text
   f. Update status=ANALYZING_DEEPSEEK
   g. Collect flagged sections + surrounding context
   h. Call DeepSeek API with flagged sections only
   i. Merge regex findings with DeepSeek analysis
   j. Assemble final report JSON
   k. Update status=COMPLETED, write report to D1
5. Frontend polls GET /api/scan/:id, receives completed report
6. Frontend renders the report (reusing existing rendering logic)
```

**Expected total time**: 10-20 seconds (parsing 3-8s, regex <1s, DeepSeek 5-10s)

### 3.2 Paid Tier Scan

```
1. User uploads PDF/DOCX via presigned R2 URL
2. Frontend: POST /api/scan { file_key, tier: "paid" }
3. Worker: Insert scan row (status=CREATED, stripe_payment_status=pending)
4. Frontend: POST /api/payment/create { scan_id }
5. Worker: Create Stripe Checkout Session, return checkout URL
6. User completes payment on Stripe
7. Stripe webhook: POST /api/webhook/stripe
   a. Verify signature, extract scan_id from metadata
   b. Update stripe_payment_status=paid
   c. Publish scan job to Queue
8. Queue triggers Pipeline Worker:
   a. Update status=PARSING
   b. Fetch file from R2, call Parse Lambda
   c. Update status=ANALYZING_REGEX
   d. Run regex rules against full text
   e. Update status=ANALYZING_DEEPSEEK
   f. Send FULL document to DeepSeek for comprehensive review
   g. DeepSeek identifies sections needing deeper analysis
   h. Update status=ANALYZING_CLAUDE
   i. Send flagged sections to Claude Opus 4.6
   j. Claude provides legal reasoning, precedent, negotiation tips
   k. Merge all three passes into enhanced report
   l. Update status=COMPLETED
9. Frontend polls and renders the enhanced report
```

**Expected total time**: 20-40 seconds (parsing 3-8s, regex <1s, DeepSeek 8-15s, Claude 10-15s)

### 3.3 Text-Only Scan (Backwards Compatible)

The existing paste-and-scan flow continues to work entirely client-side with no backend call. This preserves the instant-feedback experience for users who do not want to upload a file. The client-side regex engine and report rendering remain unchanged.

---

## 4. Tech Stack Recommendations

### Infrastructure

| Component | Technology | Why |
|-----------|-----------|-----|
| Static hosting | Cloudflare Pages | Free, global CDN, git-based deploys, preview URLs |
| API layer | Cloudflare Workers | Zero cold starts, native R2/D1/Queue integration |
| File storage | Cloudflare R2 | Zero egress, S3-compatible, lifecycle rules |
| Database | Cloudflare D1 (SQLite) | Free tier generous, SQL for debugging, native to Workers |
| Job queue | Cloudflare Queues | Native Workers integration, automatic retries, dead letter queue |
| Document parsing | AWS Lambda (Python) | Needs native binaries (Tesseract, poppler), Lambda layers solve this |
| Payment | Stripe Checkout | PCI-compliant, hosted UI, webhook-driven |

### Python Libraries (Parse Lambda)

| Library | Version | Purpose |
|---------|---------|---------|
| `pdfplumber` | 0.11+ | Text extraction from digital PDFs |
| `pdf2image` | 1.17+ | Convert scanned PDF pages to images for OCR |
| `pytesseract` | 0.3+ | OCR engine wrapper (Tesseract binary in Lambda layer) |
| `python-docx` | 1.1+ | DOCX text extraction |
| `Pillow` | 10+ | Image handling for pdf2image output |

### Python Libraries (Regex + LLM Pipeline in Workers or Lambda)

| Library | Version | Purpose |
|---------|---------|---------|
| `re` (stdlib) | -- | Regex engine (port of rules.js patterns) |
| `openai` | 1.x | DeepSeek API calls (OpenAI-compatible SDK) |
| `anthropic` | 0.40+ | Claude API calls |
| `pydantic` | 2.x | Structured LLM output validation |

### Frontend Libraries (No additions -- keep it vanilla)

The existing vanilla JS stack is the right call. Add only:
- A small `fetch` wrapper for API calls with retry logic (~50 lines)
- A file upload handler with drag-and-drop (~80 lines)
- A polling state machine (~40 lines)

No npm, no bundler, no framework. Ship fast.

---

## 5. API Design

### `POST /api/upload`

Request a presigned URL for direct file upload to R2.

```
Request:
{
  "file_name": "lease.pdf",
  "file_size": 2048576,
  "content_type": "application/pdf"
}

Response (200):
{
  "upload_url": "https://r2.leaseguard.com/...",
  "file_key": "uploads/abc123/lease.pdf",
  "expires_in": 300
}

Response (400):
{
  "error": "File too large. Maximum size is 20MB."
}
```

Validation: file size <= 20MB, content type must be `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### `POST /api/scan`

Create a scan job.

```
Request:
{
  "file_key": "uploads/abc123/lease.pdf",
  "tier": "free",
  "jurisdiction": "CA"
}

Response (201):
{
  "scan_id": "scan_7f3a2b...",
  "status": "CREATED",
  "tier": "free",
  "poll_url": "/api/scan/scan_7f3a2b..."
}
```

For paid tier, the response also includes `payment_required: true`. The frontend must complete payment before processing begins.

### `GET /api/scan/:id`

Poll for scan status and results.

```
Response (200) -- In progress:
{
  "scan_id": "scan_7f3a2b...",
  "status": "ANALYZING_DEEPSEEK",
  "tier": "free",
  "progress": {
    "current_step": "AI Analysis",
    "steps_completed": 2,
    "steps_total": 3,
    "estimated_seconds_remaining": 8
  }
}

Response (200) -- Completed:
{
  "scan_id": "scan_7f3a2b...",
  "status": "COMPLETED",
  "tier": "free",
  "report": {
    "grade": "C",
    "score": 12.5,
    "summary": "Significant concerns found...",
    "findings": [
      {
        "id": "fee-application",
        "category": "Hidden Fees",
        "severity": "red",
        "title": "Non-Refundable Application Fee",
        "excerpt": "...non-refundable application fee of $75...",
        "regex_match": true,
        "ai_confirmed": true,
        "ai_explanation": "This $75 fee is non-refundable...",
        "ai_severity": 4,
        "tip": "Ask if the fee can be credited..."
      }
    ],
    "ai_additional_concerns": [
      {
        "section": "Section 12: Utilities",
        "concern": "The lease assigns all utility costs...",
        "severity": 3
      }
    ],
    "metadata": {
      "page_count": 14,
      "word_count": 9200,
      "processing_time_ms": 18500,
      "models_used": ["regex-v1", "deepseek-chat"]
    }
  }
}
```

### `POST /api/payment/create`

Create a Stripe Checkout session for a paid scan.

```
Request:
{
  "scan_id": "scan_7f3a2b..."
}

Response (200):
{
  "checkout_url": "https://checkout.stripe.com/c/pay/...",
  "session_id": "cs_live_..."
}
```

### `POST /api/webhook/stripe`

Stripe webhook endpoint. Not called by the frontend.

Handles `checkout.session.completed` events. Verifies the webhook signature, extracts `scan_id` from session metadata, updates payment status, and enqueues the scan job.

---

## 6. Cost Estimation

### Per-Scan Costs

| Cost Component | Free Tier | Paid Tier |
|---------------|-----------|-----------|
| Cloudflare Workers (API + pipeline) | $0.0001 | $0.0001 |
| R2 storage (24h retention) | $0.0001 | $0.0001 |
| D1 reads/writes | $0.0001 | $0.0001 |
| Parse Lambda (512MB, 10s) | $0.0005 | $0.0005 |
| DeepSeek API (flagged sections) | $0.002 | $0.005 |
| Claude Opus 4.6 API | -- | $0.24 |
| Stripe fees | -- | $0.33 |
| **Total cost per scan** | **~$0.003** | **~$0.58** |
| **Revenue per scan** | **$0** | **$1.00** |
| **Gross margin** | -- | **~$0.42 (42%)** |

### Monthly Fixed Costs

| Service | Cost |
|---------|------|
| Cloudflare Workers Paid plan | $5/month (includes Workers Unbound, Queues, D1 higher limits) |
| Domain name | ~$1/month amortized |
| Stripe | No monthly fee |
| AWS Lambda | Free tier covers 1M invocations/month |
| **Total fixed** | **~$6/month** |

### Break-Even Analysis

Fixed costs of $6/month with $0.42 margin per paid scan means break-even at **15 paid scans/month**. The free tier cost of $0.003/scan means 1,000 free scans/month costs only $3.

### Unit Economics Improvement Path

The Stripe per-transaction fee ($0.33 on $1) is the largest cost component for paid scans. Selling credit packs changes the math significantly:

| Pack | Price | Stripe Fee | Per-Scan Stripe Cost | Gross Margin/Scan |
|------|-------|------------|---------------------|-------------------|
| 1 scan | $1.00 | $0.33 | $0.33 | $0.42 (42%) |
| 5 scans | $4.00 | $0.42 | $0.08 | $0.67 (67%) |
| 10 scans | $7.00 | $0.50 | $0.05 | $0.70 (70%) |

Introduce credit packs once there is signal that users want to scan multiple leases (apartment hunting season).

---

## 7. Scaling Considerations

### 100 scans/day (launch)

Everything runs within free tiers. No changes needed. Total daily cost: ~$0.30 for free scans, paid scans are profitable.

### 1,000 scans/day (traction)

- **Cloudflare**: Still well within the $5/month paid plan limits
- **Parse Lambda**: ~1,000 invocations/day is trivial (free tier covers it)
- **DeepSeek API**: ~$2-5/day in API costs, no rate limit concerns
- **Claude API**: At 10% paid conversion = 100 Claude calls/day = ~$24/day
- **D1**: May approach read limits. Switch hot-path reads (status polling) to KV for lower latency

**Action**: Move scan status to Cloudflare KV (fast reads) while keeping full results in D1.

### 10,000 scans/day (growth)

- **Parse Lambda**: 10K invocations/day. Add provisioned concurrency (10-20) to eliminate cold starts: ~$3/day
- **DeepSeek API**: $20-50/day. Check for rate limits, request limit increase if needed
- **Claude API**: At 10% conversion = 1,000 calls/day = ~$240/day. This is $7,200/month against $30,000/month revenue. Healthy margin.
- **D1**: Move to Turso (libSQL) or PlanetScale if D1 hits limits. D1 is SQLite-based and single-writer, which may bottleneck at this scale.
- **Queue**: Cloudflare Queues handles this volume easily (max 10K messages/second)

**Actions at this scale**:
1. Add rate limiting per IP (Cloudflare's built-in rate limiting rules)
2. Add a Redis-compatible cache (Upstash) for status polling to reduce D1 reads
3. Consider moving the Parse Lambda to a container-based solution (AWS Fargate) for more memory headroom with very large PDFs
4. Implement request coalescing for duplicate file uploads (hash-based dedup)

### Horizontal scaling bottlenecks

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| Parse Lambda | Cold starts at burst | Provisioned concurrency |
| D1 | Single-writer SQLite | Migrate to Turso or PlanetScale |
| DeepSeek API | Rate limits | Request limit increase, add request queue with backpressure |
| Claude API | Rate limits | Anthropic's rate limits are generous; request increase if needed |
| R2 | No practical limit | -- |

---

## 8. Security

### File Handling

- **Upload validation**: Check MIME type and file magic bytes (not just extension). Reject anything that is not a valid PDF or DOCX.
- **File size limit**: 20MB hard cap enforced at both the presigned URL level and the API level.
- **Presigned URL expiry**: 5 minutes. The URL is single-use (PUT only, specific key).
- **No direct R2 access**: All file access goes through Workers. R2 bucket is not publicly accessible.
- **File deletion**: R2 lifecycle rule deletes all objects in `uploads/` after 24 hours. The pipeline Worker also explicitly deletes the file after successful parsing.

### PII in Leases

Leases contain sensitive PII: names, addresses, SSNs (sometimes), financial information.

**Mitigations**:
- **Minimize retention**: Parsed text is stored in D1 for 7 days maximum, then purged by a scheduled Worker
- **No logging of document content**: Pipeline Workers log job IDs and status transitions, never document text
- **LLM provider data policies**: Both DeepSeek and Anthropic have API data policies that do not train on API inputs. Verify this is still current before launch.
- **Encryption at rest**: R2 and D1 both encrypt at rest by default
- **No user accounts (initially)**: No PII beyond the document itself is collected. No email, no name, no login. This minimizes the blast radius of a breach.

**PII concern with DeepSeek specifically**: DeepSeek is a Chinese company. Some users may have concerns about sending lease documents (which contain addresses, names, financial terms) to DeepSeek's API. Mitigations:
1. Strip obvious PII (names, SSNs, phone numbers) from the text before sending to any LLM using a regex-based PII scrubber
2. Document this clearly in the privacy policy
3. Consider offering a "privacy mode" that only uses Claude (US-based) for paid scans
4. Monitor DeepSeek's data handling policy for changes

### API Security

- **CORS**: Restrict to the production domain only
- **Rate limiting**: 10 uploads/hour per IP, 60 status polls/minute per IP
- **Stripe webhook verification**: Always verify the `Stripe-Signature` header using the webhook signing secret
- **Input sanitization**: All user-provided strings (file names, jurisdiction) are validated and sanitized before storage
- **No SQL injection surface**: D1 uses parameterized queries exclusively

### Abuse Prevention

- **Free tier abuse**: Rate limit by IP. If someone is scanning hundreds of documents, they are getting value and should be paying.
- **Large file DoS**: 20MB limit + presigned URL expiry prevents storage abuse
- **LLM cost abuse**: The free tier uses DeepSeek (cheap). Even at the rate limit of 10 scans/hour, the cost is $0.03/hour per abuser -- not worth complex prevention.

---

## 9. Future: Legal RAG

### Why RAG

The current architecture asks LLMs to reason about lease clauses using their training data. This works for general advice but fails for:
- Jurisdiction-specific tenant rights (state and city housing codes vary enormously)
- Recent legal changes (rent control laws, eviction moratoriums)
- Case law precedent (specific court rulings that support a tenant's position)

RAG grounds the AI analysis in real, citable legal references.

### Architecture for Legal RAG

```
                    +---------------------+
                    | Embedding Pipeline  |
                    | (batch, scheduled)  |
                    +---------------------+
                             |
                    +---------------------+
                    | Vector DB           |
                    | (Pinecone or        |
                    |  Cloudflare         |
                    |  Vectorize)         |
                    +---------------------+
                             |
              (query at analysis time)
                             |
                    +---------------------+
                    | Pipeline Worker     |
                    | (existing, enhanced)|
                    +---------------------+
```

### Data Sources

| Source | Type | Update Frequency |
|--------|------|-----------------|
| State tenant rights statutes | Legislative text | Quarterly |
| City/county housing codes | Municipal code | Quarterly |
| HUD regulations | Federal regulation | Annually |
| Tenant rights org guides (Nolo, state legal aid sites) | Plain-language guides | As published |
| Case law summaries | Court opinions | As available |

### Chunking Strategy

Legal text has natural structure (sections, subsections, clauses). Use **semantic chunking** based on section boundaries rather than fixed-size windows:

1. Split each statute/code into its natural sections (e.g., "California Civil Code Section 1950.5 -- Security Deposits")
2. Each chunk is one legal section, typically 200-800 tokens
3. Metadata per chunk: jurisdiction (state + city), topic tags (deposits, eviction, repairs, discrimination), source URL, effective date
4. Overlap: include the parent section heading in every child chunk for context

### Embedding Model

Use `text-embedding-3-small` from OpenAI ($0.02/million tokens). The entire corpus of 50-state tenant rights statutes is roughly 2-5 million tokens, costing ~$0.10 to embed. Re-embedding quarterly is negligible cost.

### Vector Database

**Recommendation: Cloudflare Vectorize** (when it exits beta) or **Pinecone Serverless** (available now).

Pinecone Serverless free tier includes 2GB of storage and 100K monthly read units -- more than enough for this corpus. Query at analysis time adds ~100ms latency.

### Integration with Analysis Pipeline

When the pipeline calls DeepSeek or Claude, it first queries the vector DB:

```python
# Before calling Claude for Pass 3
query = f"tenant rights {jurisdiction} {finding.category} {finding.title}"
legal_context = vector_db.query(query, top_k=3, filter={"jurisdiction": jurisdiction})

prompt = f"""
You are a tenant rights attorney analyzing a lease clause.

RELEVANT LEGAL REFERENCES:
{format_legal_context(legal_context)}

CLAUSE TO ANALYZE:
{finding.excerpt}

Provide your analysis grounded in the legal references above. Cite specific
statutes or codes when applicable.
"""
```

### Migration Path for RAG

1. **Month 1**: Manually curate tenant rights summaries for the top 10 states by user volume. Store as JSON files.
2. **Month 2**: Build the embedding pipeline. Embed the curated content. Wire into Claude prompts as static context.
3. **Month 3**: Add vector search. Replace static context with dynamic retrieval.
4. **Month 4+**: Expand to all 50 states. Add case law. Add city-level codes for major metros.

---

## 10. Migration Path

### Phase 0: Current State (today)

- Static HTML/CSS/JS app
- Client-side regex scanning only
- Paste-text interface
- LocalStorage for scan history
- No backend, no file upload, no AI, no payment

### Phase 1: Backend Foundation (week 1-2)

**Goal**: Get the basic backend running without changing the frontend experience.

1. Set up Cloudflare Workers project with `wrangler`
2. Create R2 bucket with lifecycle rules
3. Create D1 database with the scans table
4. Deploy the Parse Lambda with `pdfplumber` and `python-docx`
5. Implement `POST /api/upload` and `POST /api/scan` endpoints
6. Implement the Pipeline Worker with regex-only analysis (no LLM yet)
7. Implement `GET /api/scan/:id` polling endpoint
8. Test end-to-end: upload PDF, get regex results back

**Frontend changes**: None. The existing app continues to work as-is.

### Phase 2: File Upload UI (week 2-3)

**Goal**: Users can upload PDFs and get regex results.

1. Add file upload input to the frontend (drag-and-drop zone)
2. Add the upload flow: presigned URL, upload to R2, create scan job
3. Add the polling/results UI: progress indicator, result rendering
4. Port the existing `renderResults()` function to handle the new response format
5. Keep the paste-text flow working alongside file upload

**Milestone**: Users can upload a PDF and see the same quality of regex analysis they got from paste-text, but now from an actual document.

### Phase 3: DeepSeek Integration (week 3-4)

**Goal**: Free tier now includes AI-powered analysis.

1. Port the 45 regex rules from `rules.js` to Python (mechanical translation)
2. Add DeepSeek API integration to the Pipeline Worker
3. Build the prompt templates for free-tier analysis
4. Merge regex findings with DeepSeek analysis in the report
5. Update the frontend to render AI explanations alongside regex matches
6. Add a visual indicator distinguishing regex findings from AI findings

**Milestone**: Free tier delivers a noticeably better report than regex alone.

### Phase 4: Payment + Claude (week 4-6)

**Goal**: Paid tier is live and generating revenue.

1. Set up Stripe account, create the $1 product
2. Implement `POST /api/payment/create` and the Stripe webhook
3. Add Claude Opus 4.6 integration to the Pipeline Worker
4. Build the paid-tier prompt templates (full document DeepSeek + Claude deep analysis)
5. Add the payment gate UI to the frontend
6. Design the enhanced report view showing Claude's legal reasoning
7. Test the full paid flow end-to-end

**Milestone**: Revenue. Users can pay $1 for a materially better analysis.

### Phase 5: Polish + Hardening (week 6-8)

**Goal**: Production-ready for real users.

1. Add error handling for every failure mode (upload fails, parse fails, LLM times out, payment fails)
2. Add rate limiting
3. Add basic analytics (Plausible or Cloudflare Web Analytics -- both privacy-focused, no cookies)
4. Add a privacy policy and terms of service
5. Add the PII scrubber for LLM inputs
6. Set up alerting for failed jobs (Cloudflare Workers logs + a simple alert to email/Slack)
7. Load test with 50+ concurrent scans to verify queue handling

**Milestone**: Confidence to share the product publicly.

### Phase 6: Growth Features (ongoing)

- Credit packs (5 for $4) to improve unit economics
- Email delivery of reports (optional, requires collecting email)
- Jurisdiction selector with tailored analysis
- Legal RAG integration (see section 9)
- Comparative analysis ("this clause is worse than 80% of leases we have seen")
- Browser extension for scanning leases on apartment listing sites

---

## Architectural Decision Records

### ADR-001: Cloudflare over AWS for primary infrastructure

**Status**: Accepted

**Context**: The system needs serverless compute, object storage, a database, and a job queue. AWS and Cloudflare both offer these. The developer is a solo founder optimizing for speed of iteration and low cost.

**Decision**: Use Cloudflare (Workers, R2, D1, Queues, Pages) as the primary platform. Use AWS Lambda only for the document parsing function, which needs native Python binaries that Cloudflare Workers cannot yet support.

**Consequences**:
- Faster: Zero cold starts, single platform for most components, simpler deployment
- Cheaper: Cloudflare's free tier is more generous than AWS for this use case
- Risk: D1 is relatively new and may have stability issues. Mitigation: the data is ephemeral (7-day retention), so a D1 outage loses in-flight scans but no persistent user data
- Risk: Cloudflare Workers Python support may improve enough to eliminate the Lambda dependency, which would simplify the architecture further

### ADR-002: Polling over WebSocket/SSE for result delivery

**Status**: Accepted

**Context**: The analysis pipeline takes 10-40 seconds. The frontend needs to show progress and results.

**Decision**: Use HTTP polling (every 2 seconds) rather than WebSocket or SSE.

**Consequences**:
- Simpler to implement, test, and debug
- No persistent connection management
- Works behind all proxies and CDNs without configuration
- 8-20 extra HTTP requests per scan is negligible cost and load
- Gives up: real-time streaming of partial results (e.g., showing regex findings while waiting for LLM)
- Reversible: SSE can be added later as an alternative to the same endpoint

### ADR-003: Keep the frontend as vanilla HTML/CSS/JS

**Status**: Accepted

**Context**: The existing MVP is vanilla JS with no build step. The backend addition requires new UI (file upload, polling, payment). A framework would provide better state management.

**Decision**: Continue with vanilla JS. Add the minimum necessary code for the new features.

**Consequences**:
- No build step, no npm, no node_modules, no bundler config
- Faster iteration for a solo developer who knows the codebase
- Risk: as features grow, the lack of component structure may slow development. Revisit if the frontend exceeds ~2,000 lines of JS.
- The existing rendering logic (`renderResults`, `renderHistoryView`) can be reused with minimal changes

### ADR-004: Two-LLM pipeline (DeepSeek + Claude) over single-LLM

**Status**: Accepted

**Context**: The product needs AI analysis at two quality/price tiers. Options: (A) use one model at different prompt depths, (B) use two models with different capabilities.

**Decision**: Use DeepSeek for the fast/cheap tier and Claude Opus 4.6 for the premium tier. DeepSeek also acts as a filter/router for Claude, reducing Claude's token consumption.

**Consequences**:
- Cost-efficient: DeepSeek at ~$0.002/scan makes free tier viable
- Quality differentiation: Claude's reasoning is demonstrably better for legal analysis, justifying the $1 price
- Complexity: two API integrations, two prompt templates, two failure modes
- Risk: DeepSeek API reliability or policy changes. Mitigation: the pipeline can fall back to regex-only if DeepSeek is unavailable
- Risk: Claude API costs increase. Mitigation: the pipeline limits Claude's input tokens via DeepSeek pre-filtering

### ADR-005: Stripe Checkout over custom payment form

**Status**: Accepted

**Context**: Need to collect $1 per paid scan. Options: Stripe Checkout (hosted), Stripe Elements (embedded), Stripe Payment Links (no-code).

**Decision**: Stripe Checkout (hosted redirect).

**Consequences**:
- Zero PCI scope -- all card handling happens on Stripe's domain
- Supports Apple Pay, Google Pay, Link, and all card types automatically
- Trade-off: user leaves the site briefly during payment, which adds friction
- Trade-off: high per-transaction fee percentage on $1 charges (33%)
- Reversible: can switch to Stripe Elements later for a more embedded experience, or to credit packs to amortize fees
