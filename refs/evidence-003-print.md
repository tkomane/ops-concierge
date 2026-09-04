# Feature 003 — print-output validation

**Tip HEAD:** `e279f10c82ed5ee30650be28406ac283e9bebd10` (`e279f10`)  
**Timezone:** Africa/Johannesburg (SAST)  
**Captured:** 2026-09-05 01:49 SAST  
**Overall:** **PASS**

Pages correction, demo video and Devpost Submit remain **held**.  
Usage / credit meter: **unavailable**.

## Defect found and fixed

The prior `refs/evidence-003-op-id/print-ticket.png` (1440×900 viewport crop) cut off mid-Observations. Re-running with print media + `data-print-ticket=1` reproduced a **real print CSS clip**:

1. `#cards` / `.panel-board` / `#main` / `body` use `overflow: hidden|auto`, clipping the tall ticket to ~534px even though `#ticketBody` had `max-height: none`.
2. Print rules used `position: absolute` on `#ticketTrophy`, which prevented Chromium from paginating overflow onto later PDF pages (page 2 was blank).

**Minimal fix** in `css/app.css` `@media print` (only when `html[data-print-ticket="1"]`):

- Force `overflow: visible; height: auto; max-height: none` on the ancestor chain and `.card-inner`.
- Hide chrome (topbar/hero/chat/telemetry/…) with `display: none` so layout collapses.
- Change `#ticketTrophy` from `position: absolute` → `position: static` so tall cards paginate.
- Keep `#ticketBody` at `max-height: none; overflow: visible`.

Retry / operation-ID behaviour was not touched. Frontend safety suite: **32 passed**.

## Setup

| Item | Value |
|---|---|
| Server | existing `python serve.py` at `http://127.0.0.1:8765/` |
| Tooling | Playwright Chromium, `page.emulate_media(media="print")`, `data-print-ticket=1`, `page.pdf(A4)`, `pdftoppm -png -r 150` |
| Native OS print dialog | **not** invoked |
| Script | `refs/capture-print-003.py` → `refs/evidence-003/print-validation.json` |
| Scenarios | Approve live Doorstep (`#demoBtn` → `Approve plan_…`) and Bedtime (`#demoBtn2`) until `phase=acted`, `Status: draft`, `Approval: confirmed` |

## Artefacts

| Path | Role |
|---|---|
| `refs/evidence-003/print-doorstep.pdf` | Paginated A4 PDF (3 pages; content on 1–2) |
| `refs/evidence-003/print-doorstep-page-1.png` | PDF page 1 — full body through Household |
| `refs/evidence-003/print-doorstep-page-2.png` | PDF page 2 — final `Note:` line |
| `refs/evidence-003/print-doorstep-page-3.png` | Trailing blank (cosmetic; no chrome) |
| `refs/evidence-003/print-doorstep-full.png` | Full-height `#ticketTrophy` element shot under print CSS |
| `refs/evidence-003/print-doorstep-viewport.png` | Full-page screenshot under print CSS |
| `refs/evidence-003/print-bedtime.pdf` | Paginated A4 PDF (3 pages; full card on page 1) |
| `refs/evidence-003/print-bedtime-page-1.png` | PDF page 1 — complete bedtime card |
| `refs/evidence-003/print-bedtime-page-2.png` / `…-page-3.png` | Trailing blanks (cosmetic) |
| `refs/evidence-003/print-bedtime-full.png` | Full-height trophy shot |
| `refs/evidence-003/print-bedtime-viewport.png` | Full-page print screenshot |
| `refs/evidence-003-op-id/print-ticket.png` | **Replaced** clipped sample with complete doorstep full capture |
| `refs/evidence-003-op-id/visual-check.json` | Updated — contradiction explained; `ticketVisible: true` |

## Page-by-page inspection

### Doorstep (GUEST-10421)

| Page | Result |
|---|---|
| 1 | **PASS** — Guest code ready, GUEST-10421, Status draft, Approval confirmed, complete Observations, Assumptions, Primary/Secondary, Opened-by / Household. Readable black on white/grey. No print/copy controls. |
| 2 | **PASS** — Final `Note: Sample reference only — not an unlock / door credential` (pagination remainder). No chrome. |
| 3 | Blank trailing page only — not clipped content. |

Programmatic: DOM + print-DOM markers all present; PDF text layer contains Observations/Assumptions/Status/Approval/Note; full PNG dark-pixel coverage `0..874` on 875px height (`bottom_gap=0`).

### Bedtime (TASK-22018)

| Page | Result |
|---|---|
| 1 | **PASS** — Bedtime task ready, TASK-22018, Status draft, Approval confirmed, full Observations, Assumptions, Primary/Secondary, Opened-by / Household / Note. Controls hidden. |
| 2–3 | Blank trailing pages only. |

Programmatic: same marker checks; full PNG coverage `0..737` on 739px (`bottom_gap=1`).

## `ticketVisible: false` vs print PASS (stale contradiction)

Prior `visual-check.json` recorded `print_sample.ticketVisible: false` beside `print: PASS`. Under `@media print`, `body * { visibility: hidden }` hides the tree; `#ticketTrophy` is forced visible only with `data-print-ticket=1`. A naive `offsetParent` / visibility sample reported false even when the ticket painted. That was a **sampling artefact**, not proof of clip. After the CSS fix, the correct sample is `ticketVisible: true` with controls `display: none` and `max-height: none`. The old clipped PNG is replaced.

## Verdict table

| Check | Result |
|---|---|
| Complete Doorstep paginated export | **PASS** |
| Complete Bedtime paginated export | **PASS** |
| Full body + Observations + Assumptions | **PASS** |
| Final Note / footer | **PASS** |
| Readable colours | **PASS** (white bg / `#0A0A0A` text) |
| No clipped content | **PASS** (after CSS fix; was FAIL before) |
| Unwanted controls hidden | **PASS** (`.ticket-actions` / `#printTicket` / `#copyTicket`) |
| Native print dialog | Not required / not used |
| Retry / op-ID behaviour preserved | **PASS** (untouched; safety tests 32 passed) |

## Usage

**unavailable**
