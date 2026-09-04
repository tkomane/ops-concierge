# Ten HARD improvement rounds — Ops Concierge

**Date:** 2026-09-04 (SAST)  
**Author:** Tshiamo Komane  
**Constraints:** Static HTML/CSS/JS · demos doorstep→GUEST-10421 / bedtime→TASK-22018 · MCP · theme.js · CSP/serve.py · Amazon-native metaphors · no Azure/GreenLake/HPE · both themes · Emil motion · no GitHub push / Devpost / spend

---

## Round 1 | Accessibility hard pass

**Goal:** Contrast, focus-visible, ARIA, skip link, live regions, full keyboard path.

**Changes:**
- Contrast: light `--muted` `#4A4A4A`, `--dim` `#6B6B6B`; dark `--muted` `#B0B0B0`, `--dim` `#8C8C8C`; stronger `--focus` rings both themes.
- Skip-to-main link (`.skip-link`) → `#main` with `tabindex="-1"`.
- `#a11yLive` polite live region + `announce()` for story start / shortcuts / guest-code reveal.
- How-steps: `role="button"`, descriptive `aria-label`, `aria-current` synced to progress.
- Session strip `aria-live="polite"`; demo buttons `aria-keyshortcuts`; keyboard `B` for bedtime.
- Shortcuts overlay focus return to `#helpBtn` on close.

**Verify:** Skip link appears on Tab; chips/composer/demos keyboard-reachable; theme toggle announces; pytest a11y hooks green.

**Screenshot:** (covered in Round 10)

---

## Round 2 | Responsive / layout resilience

**Goal:** Excellent ≤900px and ≤640px layouts; no overflow/clipping.

**Changes:**
- `@media (max-width: 900px)`: stacked topbar, readable hero, horizontal-scroll how-strip with arrows, stacked mission grid, usable composer, footer stack; hide SIM badge clutter.
- `@media (max-width: 640px)`: tighter padding; how-steps 2×2 wrap; full-width composer + Send; bottom-sheet-style shortcuts overlay; hide mark-sub / meta dividers.

**Verify:** `preview-mobile.png` (390×844); topbar CTAs + how-strip readable; no horizontal page clip.

**Screenshot:** `preview-mobile.png`

---

## Round 3 | How-it-works ↔ live demo coupling

**Goal:** Animate/highlight matching strip steps in sync with tool progress; reset cleanly.

**Changes:**
- `HOW_TOOL_MAP` + `syncHowFromTools()`: `is-current` / `is-done` / `is-pending` on Door→Package→Quiet→Guest as tools run.
- Arrows `.is-lit` between progressed steps; bedtime alt strip `.is-bedtime-active`.
- `resetHowStrip()` on new ingest; phase-aware completion for doorstep vs bedtime paths.
- Tool push/update triggers sync while running.

**Verify:** Run Doorstep story — strip advances with tools; Bedtime lights Quiet→Guest; reset on new story.

**Screenshot:** (Round 10 demos show completed strip + progress)

---

## Round 4 | Helper voice consistency

**Goal:** Same plain-English helper voice across chat, empty states, session strip, shortcuts.

**Changes:**
- Rewrote agent greet / ingest / ack / correlate / ticket / follow-up strings (helper metaphors; tool ids stay captions).
- Empty states: “Home is quiet right now”; timeline copy explains Door→Package→Quiet→Guest.
- Session idle: “Ready — pick a doorstep or bedtime story”.
- Shortcuts overlay: friendlier dd copy + `B` bedtime tip.

**Verify:** Grep UI for shouty ops jargon as primary labels — none; helper vocabulary tests green.

**Screenshot:** home/demo chat copy in Round 10 shots

---

## Round 5 | Progress visualization

**Goal:** Clear “where am I in the story”; celebrate guest code / task reveal.

**Changes:**
- `#storyProgress` stepper: See → Hold → Connect → Plan → Code/Task with `is-done` / `is-current` / `is-celebrate`.
- Label: “Doorstep story · Guest code ready” (or bedtime/task).
- Ticket card: `.ticket-reveal` + “Guest code ready” / “Bedtime task ready” badge; announce to live region.

**Verify:** Progress hidden at idle; fills through doorstep; GUEST-10421 on Done; celebrate on last dot.

**Screenshot:** `preview-demo.png`, `preview-demo-dark.png`

---

## Round 6 | Micro-interaction craft

**Goal:** Press feedback, staggered card entrance ≤80ms, timeline polish; Emil rules.

**Changes:**
- Press scale `0.96–0.97` on buttons/chips/icon buttons (fine pointer only).
- `.enter-stagger` cardIn delays 0/40/80ms; `.step` stepIn translateX/opacity.
- Ticket reveal opacity/translateY 220ms ease-out.
- `prefers-reduced-motion` zeroes all of the above; no `scale(0)`; no layout animation.

**Verify:** Reduced-motion media query intact; hover:active scales only under fine pointer.

**Screenshot:** motion not still-frameable; CSS/JS present

---

## Round 7 | Dark mode excellence

**Goal:** Intentional premium dark — not inverted light.

**Changes:**
- Dark tokens: richer panels/surfaces (`#121212`/`#171717`/`#1C1C1C`), stronger borders (11–20% white).
- Agent bubbles on `--elev`; user on `--surface`; composer/input/chips/scrollbar/overlay/ticket mono tuned.
- Outline buttons + panel borders clarified; session strip / voice foot intentional.

**Verify:** `preview-home-dark.png`, `preview-demo-dark.png` — no muddy greys / weak mono.

**Screenshot:** `preview-home-dark.png`, `preview-demo-dark.png`

---

## Round 8 | Performance & hygiene

**Goal:** Font loading, FOUC, contain, manifest/theme-color coherence.

**Changes:**
- Preload Google Fonts stylesheet + `display=swap` (CSP-safe; no inline onload).
- `theme.js` adds `theme-ready` class; early `data-theme` + `theme-color` still sync before CSS.
- `contain: content` on scroll panes; `contain: layout style` on panels.
- Manifest description in helper voice; `background_color` `#0A0A0A` for install splash coherence.

**Verify:** Hard refresh — no flash of wrong theme; fonts swap; robots.txt Allow unchanged.

**Screenshot:** n/a

---

## Round 9 | Automated safety net

**Goal:** Tests for theme persistence, helper vocabulary, ticket ids, MCP health — green.

**Changes:**
- Added `tests/test_frontend_safety.py`:
  - GUEST-10421 / TASK-22018 in scenarios + fixtures
  - Helper vocabulary + metaphor data-steps
  - Vendor scrub (Azure/GreenLake/HPE) on UI surfaces
  - Theme persistence (`ops-theme`, theme-color, OpsTheme)
  - A11y hooks, story progress, CSP/serve headers
  - MCP `dispatch` / `task_open` health

**Verify:** `pytest tests/ -q` → **22 passed**

**Screenshot:** n/a

---

## Round 10 | Final visual QA + screenshots

**Goal:** Serve app; capture light/dark home + demo (guest code) + mobile; document residuals.

**Changes:**
- Updated `refs/capture-previews.py` to drive doorstep → GUEST-10421 and mobile viewport.
- Captured:
  - `preview-home.png` / `preview-home-dark.png`
  - `preview-demo.png` / `preview-demo-dark.png` (Done · GUEST-10421 · Code ready)
  - `preview-mobile.png` (390×844 light)

**Verify:** Files present; demos show Done + GUEST-10421 + story progress complete; mobile how-strip 2×2.

**Screenshot:** all five files above

---

## Final summary

| Round | Outcome |
|------|---------|
| 1 A11y | Skip link, live region, contrast, focus, keyboard B + ARIA |
| 2 Responsive | ≤900 / ≤640 layouts hardened |
| 3 How↔demo | Tool-synced strip states + reset |
| 4 Voice | Helper voice across chat/empty/session/shortcuts |
| 5 Progress | Story stepper + guest/task reveal |
| 6 Micro | Press, stagger ≤80ms, step-in; reduced-motion safe |
| 7 Dark | Premium dark tokens + bubble/overlay/scrollbar |
| 8 Hygiene | Font preload, contain, FOUC, manifest |
| 9 Tests | 22 pytest green |
| 10 QA | 5 screenshots updated |

### Residual risks
- Tall desktop hero + three panels: short laptop heights still need scroll inside columns.
- How-strip “current” highlight is subtler than story-progress dots (by design); judges should watch the stepper.
- Guest-code card may sit below the fold in the board column at 1100px height — board tag + stepper still show GUEST-10421 / Code ready.
- Fonts depend on Google CDN (CSP allowlisted); offline LAN demos fall back to system UI.
- MCP live path still optional (`OPS_USE_MCP`); UI mock path is the default demo.
- No automated visual regression / axe CI yet — safety net is static + unit.

### Ready for GitHub sync confirmation
**Superseded by Loop B (hold sync).** Previously ready after Round 10; sync still held per user.  
No push performed. No Devpost submit. No spend.


---

## Loop B (hold sync)

**Date:** 2026-09-04 (SAST, evening)  
**Constraints:** HOLD GitHub sync · no push · no Devpost · no spend · whole-app polish (not Doorstep-only)

### Round 1 | Short viewport / fold fix
**Goal:** Guest/task reveal visible without hunting at ~900–1100px and short laptop heights.

**Changes:**
- Compact rhythm `@media (max-height: 1100px)` + `data-compact` at ≤900px via `syncCompactMode()`.
- Active-story chrome (`data-story=doorstep|bedtime`): shrink hero, hide eyebrow/sub, focus the active how-path, free vertical space for mission grid.
- Trophy card ordered first in board; fold-safe denser trophy padding; fixed sticky+overflow collapse (trophy was 10px tall).

**Verify:** `preview-demo.png` / `preview-bedtime.png` at 1440×900 show large GUEST-10421 / TASK-22018 in board above fold.

### Round 2 | Bedtime story parity
**Goal:** Bedtime as obvious as Doorstep.

**Changes:**
- `#howBedtimePath` dual-mode strip: Fire TV → Quiet → Task (TASK-22018 hint).
- `syncBedtimePath()` + `BED_TOOL_MAP` synced to tools/phases; `data-mode` on `#howStrip`.
- Active story hides the inactive path; Bedtime topbar button equals Doorstep when active.
- Empty states / timeline CTAs name both stories; progress last dot → Task on bedtime.

**Verify:** Bedtime run lights bedtime path; `preview-bedtime.png` shows path + TASK-22018 trophy.

### Round 3 | First-run clarity
**Goal:** 30-second coach for cold judges.

**Changes:**
- `#coachBanner` with Start doorstep + Got it; `ops-coach-dismissed` in localStorage.
- Auto-dismiss on story start; empty-state CTA hierarchy Doorstep primary / Bedtime secondary across board + timeline.

**Verify:** Home light shot can show coach; dismissed on demo runs; pytest `test_first_run_coach_banner`.

### Round 4 | Guest code / task trophy moment
**Goal:** Unmistakable reveal for BOTH artefacts.

**Changes:**
- `#ticketTrophy` with `.ticket-id-hero`, copy affordance, `aria-describedby`, live-region announce on reveal + copy.
- Distinct copy labels: “Copy guest code” / “Copy bedtime task”; badges Guest code ready / Bedtime task ready.
- Confetti-free green ring emphasis; `scrollIntoView` after render.

**Verify:** Light/dark demo + bedtime shots; a11y announce strings in app.js.

### Round 5 | Offline fonts / resilience
**Goal:** Premium look if Google Fonts blocked.

**Changes:**
- Font stacks: Inter → system-ui / BlinkMacSystemFont / Segoe UI / Roboto / Helvetica Neue / Arial; IBM Plex Mono → ui-monospace / SF Mono / Menlo / Consolas / Liberation Mono.
- `display=swap` retained; documented in SECURITY.md (“Fonts / offline resilience”) + README.

**Verify:** CSS stacks + SECURITY section; pytest `test_offline_font_fallbacks_documented`.

### Round 6 | Judge skim layer
**Goal:** One-screen trust signals.

**Changes:**
- `#judgeStrip` collapsible: Alexa+ simulated path, MCP optional localhost, public MIT/CSP repo intent.
- Hidden under compact short-height while a story runs to protect fold.

**Verify:** Present on home; pytest `test_judge_skim_strip`.

### Round 7 | Test expansion
**Goal:** Whole public surface safety net stays green.

**Changes:** Extended `tests/test_frontend_safety.py` — bedtime ticket + path, how-strip modes, theme toggle markup, coach, trophy both stories, judge strip, compact, font fallbacks, panels/composer, vendor scrub HTML/JS/CSS.

**Verify:** `pytest tests/ -q` → **31 passed**

### Round 8 | Visual QA
**Goal:** Refresh screenshots including bedtime + short-height fold.

**Changes:** `refs/capture-previews.py` drives doorstep→GUEST-10421 and bedtime→TASK-22018 at 1440×900; captures:
- `preview-home.png` / `preview-home-dark.png`
- `preview-demo.png` / `preview-demo-dark.png` (GUEST-10421 trophy above fold)
- `preview-bedtime.png` (TASK-22018 trophy + bedtime path)
- `preview-mobile.png`

**Verify:** Files present; trophies readable in board column.

### Loop B+ whole-app extras (same hold)
- Chat/composer/chips polish; shortcuts copy for D/B both stories; “Show shortcuts” chip.
- Theme toggle pressed affordance; empty CTAs for both stories; session strip voice retained.
- Topbar demo buttons equal (outline idle → primary when `is-story-active`).

### Residual risks
- Very short heights (≤780px): how-strip hidden in compact — judges rely on story stepper + trophy.
- Trophy body text truncated (`max-height`) on short screens — id + copy remain primary.
- Google Fonts still preferred when online; offline uses system stack (intentional).
- MCP live path still optional; UI mock default.
- No axe/visual regression CI yet.
- HOLD sync: human must ask before GitHub push / Devpost.

### ready_for_sync_ask
**false** — user will ask when ready. No push. No Devpost. No spend.


---

## Loop C (hold sync)

**Date:** 2026-09-04 (SAST, late evening)  
**Constraints:** HOLD GitHub sync · no push · no Devpost · no spend · whole-app (not Doorstep-only) · preserve metaphors/themes/demos/CSP/Emil · no Azure/GreenLake/HPE

### Round 1 | MCP status UX
**Goal:** Clear Helper/MCP connection pill (Connected / Local mock / Offline) for non-engineers.

**Changes:**
- `#mcpPill` in topbar “Helper link” with `.mcp-dot` + human label; technical detail in `title` / `aria-label`.
- `refreshMcpPill()` probes `OpsMcpClient` when `OPS_USE_MCP`/enabled; default **Local mock**; Connected when `/healthz` ok; Offline when enabled but unreachable.
- Hidden ≤900px width to protect mobile chrome (SIM + stories stay primary).

**Verify:** Home/demo shots show Local mock; smoke confirms Connected/Offline labels in JS; pytest `test_mcp_status_pill_markup_and_logic`.

### Round 2 | Reduced-motion + high-contrast audit
**Goal:** Full prefers-reduced-motion pass + remaining contrast misses both themes.

**Changes:**
- Consolidated reduced-motion: zero trophy/toast/enter/step animations + press scales; keep existing global 0.01ms hammer.
- `@media (prefers-contrast: more)` strengthens `--muted`/`--dim`/`--line`/`--focus` both themes; thicker chip/outline borders.
- Chip label color → `--text` (was muted) for readability both themes.

**Verify:** CSS hooks; pytest `test_reduced_motion_and_high_contrast_hooks`.

### Round 3 | Print / share guest code
**Goal:** Strong copy UX + print-friendly guest/task card; obvious toast both themes.

**Changes:**
- Trophy actions: Copy + **Print guest card** / **Print task card**; `data-print-ticket` print CSS isolates `#ticketTrophy`.
- `showToast(msg, tone)` with `data-tone=ok|err`; success/fail copy paths; Copied ✓ affordance; fail toast if clipboard blocked.
- Toast styling light + dark (green / crit surfaces).

**Verify:** Smoke: GUEST-10421 copy toast ok; bedtime Print task card + TASK-22018; shots show dual buttons.

### Round 4 | PWA / install polish
**Goal:** Manifest matches helper story; theme-color dark/light; maskable without spend.

**Changes:**
- `manifest.webmanifest`: name “Ops Concierge — Home Helper”, short “Ops Helper”, helper description, scope, categories.
- Icons: `favicon.svg` (any) + `icon-192.svg` + `icon-maskable.svg` (512 maskable).
- `theme.js` already sets meta theme-color `#FFFFFF` / `#0A0A0A`.

**Verify:** Files present; pytest `test_pwa_manifest_helper_story`.

### Round 5 | Composer + chip UX
**Goal:** Contextual placeholders; chips readable; Send disabled when empty with aria.

**Changes:**
- `PLACEHOLDERS` per phase + rotation; `syncSendEnabled()` keeps Send `disabled` + `aria-disabled` when empty/thinking.
- Chips: `.chip-key` + `.chip-label` + aria-label “Suggestion N: …”.
- `#composerKbHint` near composer (hidden on short height).

**Verify:** Smoke empty→disabled / typed→enabled; contextual placeholders on ticketed demos; pytest composer test.

### Round 6 | Shortcuts & power-user layer
**Goal:** Overlay polish; D/B/?/1–4 documented; subtle keyboard hint.

**Changes:**
- Overlay lead + foot; full shortcut list retained (Enter, 1–4, D, B, ?, Esc).
- Voice hint documents D/B/?; composer kb hint mirrors power-user layer.

**Verify:** HTML + keyboard handlers; pytest `test_shortcuts_power_user_layer_documented`.

### Round 7 | Tests
**Goal:** Expand frontend safety; all green; ≥35.

**Changes:** Added MCP pill, reduced-motion/contrast, print/share toast, PWA, composer/send, shortcuts, bedtime/coach regression, vendor ban on new icons.

**Verify:** `pytest tests/ -q` → **39 passed**

### Round 8 | Visual QA
**Goal:** Refresh all previews including bedtime + mobile + dark demo; log here.

**Changes:** `refs/capture-previews.py` (Loop C) + `refs/smoke-loop-c.py`. Captures:
- `preview-home.png` / `preview-home-dark.png` — Helper link Local mock
- `preview-demo.png` / `preview-demo-dark.png` — GUEST-10421 + Copy/Print
- `preview-bedtime.png` — TASK-22018 + Print task card + bedtime path
- `preview-mobile.png` — stacked chrome (MCP pill intentionally hidden ≤900px)

**Verify:** Files refreshed 2026-09-04 evening SAST; trophies + print actions readable.

### Residual risks
- MCP pill hidden on narrow viewports — status still in judge strip / titles.
- Print CSS depends on `afterprint` + short timeout cleanup; some browsers may keep print attribute briefly.
- `color-mix()` on err toast border — fine on modern Chromium; older engines fall back to border-color inheritance.
- Google Fonts still CDN-preferred; offline system stack unchanged.
- No axe/visual-regression CI yet.
- HOLD sync: human must ask before GitHub push / Devpost.

### ready_for_sync_ask
**false** — user will ask when ready. No push. No Devpost. No spend.

---

## Loop D (hold sync)

**Date:** 2026-09-04 (SAST, night)
**Constraints:** HOLD GitHub sync · no push · no Devpost · no spend · 6 HARD high-leverage rounds only · preserve metaphors/themes/demos/CSP/Emil · ticket ids GUEST-10421 / TASK-22018 · no Azure/GreenLake/HPE

### Round 1 | Scenario content richness
**Goal:** Doorstep and bedtime board copy feel vivid and specific (names, SAST times, Ring/Fire TV) without breaking ticket ids or tool contracts.

**Changes:**
- `js/scenarios.js`: Mira / Parent A, Lebo, neighbour Thabo; Ring Video Doorbell Pro live-view + dusk porch light; AMZL Johannesburg + Echo Dot Kids (blue); Fire TV Stick 4K Bluey S3E12 + HDMI-CEC; Echo Dot Kids routine step 2/5; SAST windows retained.
- Ticket ids unchanged: **GUEST-10421** / **TASK-22018**.

**Verify:** Board shows Ring/Bluey/SAST; pytest `test_loop_d_scenario_content_richness`; smoke richness ok.

### Round 2 | Error & edge paths
**Goal:** Empty send, unknown utterance, mid-story switch, copy failure — calm helper guidance; no dead ends.

**Changes:**
- Empty Enter → toast + agent nudge (Send stays `aria-disabled` when empty with title hint).
- Idle unknown free-text → points to Doorstep/Bedtime + GUEST-10421 / TASK-22018 paths.
- In-story unknown → “I’m not sure I caught that…” with chip/shortcut hints.
- Mid-story doorstep↔bedtime: announce + toast + “pausing … starting … fresh”.
- Copy failure: select `#ticketBody`, toast “Copy blocked — … Ctrl/Cmd+C”, agent guidance + Print alternative.

**Verify:** `refs/smoke-loop-d.py` LOOP D SMOKE PASS; pytest edge-path test.

### Round 3 | Security / CSP sanity
**Goal:** `serve.py` CSP vs new assets (SVGs, print); fix mismatches; no unsafe-inline scripts.

**Changes:**
- Synced meta CSP in `index.html` ↔ `serve.py`: added `manifest-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'` on meta; kept `img-src 'self' data:` for favicon/PWA SVGs; localhost:8766 connect for MCP.
- Removed inline `style=` on trophy title row → `.ticket-title-tight` CSS.
- SECURITY.md CSP list updated (no unsafe-inline scripts; print via `window.print()`).

**Verify:** `curl -sI` shows full CSP; smoke CSP meta ok; pytest `test_loop_d_csp_matches_serve_and_meta`.

### Round 4 | Spec Kit / docs sync
**Goal:** DEMO.md / README match helper vocabulary + theme + stories; short; no Azure denials.

**Changes:**
- DEMO.md: helper pane names, Doorstep/Bedtime, GUEST-10421 / TASK-22018, dark theme tip, calm mid-story switch note.
- README.md: home helper voice, theme toggle, guest code / bedtime task, CSP note (no unsafe-inline scripts).

**Verify:** pytest `test_loop_d_docs_helper_vocabulary`.

### Round 5 | Tests
**Goal:** Cover new edge strings / ticket ids / CSP-critical paths; keep all green (≥39).

**Changes:** Added four Loop D tests in `tests/test_frontend_safety.py` (richness, edges, CSP sync, docs vocab).

**Verify:** `pytest tests/ -q` → **43 passed**

### Round 6 | Visual QA
**Goal:** Refresh key previews; log Loop D here.

**Changes:** `refs/capture-previews.py` (Loop D) + `refs/smoke-loop-d.py`. Captures refreshed:
- `preview-home.png` / `preview-home-dark.png`
- `preview-demo.png` / `preview-demo-dark.png` — GUEST-10421
- `preview-bedtime.png` — TASK-22018 + Fire TV richness
- `preview-mobile.png`

**Verify:** Files refreshed 2026-09-04 night SAST; smoke PASS.

### Residual risks
- Empty **click** on Send is blocked by `disabled` (by design); empty **Enter** carries the calm guidance path.
- Clipboard failure path depends on Selection API; exotic embeds may still need Print.
- `frame-ancestors` in meta CSP is ignored by some browsers (header from `serve.py` is authoritative for local demos; Pages lacks custom headers).
- Google Fonts CDN still preferred; offline system stack unchanged.
- No axe/visual-regression CI yet.
- HOLD sync: human must ask before GitHub push / Devpost.

### ready_for_sync_ask
**false** — user will ask when ready. No push. No Devpost. No spend.

---

## Loop E (hold sync)

**Date:** 2026-09-04 (SAST, ~22:30)  
**Constraints:** HOLD GitHub sync · no push · no Devpost · no spend · **5 HARD** high-leverage rounds only · whole-app · preserve metaphors/themes/demos/CSP/Emil · tickets GUEST-10421 / TASK-22018 · no Azure/GreenLake/HPE

### Round 1 | Bedtime demo excellence
**Goal:** Bedtime UI/copy/strip/trophy as strong as doorstep; kill leftover doorstep-bias in empty states, coach, stepper, how-strip.

**Changes:**
- Coach: equal dual CTAs (**Start doorstep** + **Start bedtime**), balanced 30s copy (both paths → trophy).
- How-strip finale: **Guest / Task** · Either story; bedtime path lead “same weight as Doorstep · one tap (B)”; `syncGuestStepLabel()` swaps to Guest code / Bedtime task mid-story.
- Empty board + timeline: equal **outline** CTAs (“Doorstep story” / “Bedtime story”); copy cites GUEST-10421 + TASK-22018 equally.
- Story stepper idle label **Code / Task**; scenario chips via `artefactChip()` → **Make the guest code** / **Make the bedtime task**.
- **Bugfix:** utterance order — artefact/make/skip chips resolve **before** bedtime re-ingest (so “Make the bedtime task” no longer restarts the story).

**Verify:** `refs/smoke-loop-e.py` LOOP E SMOKE PASS; pytest bedtime parity.

### Round 2 | Pages / header note
**Goal:** Document CSP via `serve.py` vs GitHub Pages; optional static `_headers` if zero-risk.

**Changes:**
- SECURITY.md: authoritative `serve.py` headers + matching meta CSP; Pages lacks custom headers; optional `_headers` called out.
- Added Cloudflare/Netlify-style `_headers` mirroring serve CSP (local-safe; Pages ignores; `serve.py` does not read it).
- README Architecture line points at serve / Pages / `_headers`.

**Verify:** pytest `test_loop_e_csp_pages_headers_documented`; `curl -sI` CSP present from serve.

### Round 3 | Lightweight a11y automated checks
**Goal:** Pytest parses HTML for skip-link, main id, theme toggle aria, live region, img alt if any; green.

**Changes:** `test_loop_e_a11y_automated_checks` (+ bedtime parity + CSP docs tests).

**Verify:** `pytest tests/ -q` → **46 passed**

### Round 4 | DEMO.md walkthrough sync
**Goal:** Step-by-step matches current Doorstep/Bedtime button labels + helper voice for judges recording.

**Changes:** DEMO.md dual path with **Doorstep story** / **Bedtime story**, chips **Make the guest code** / **Make the bedtime task**, Copy/Print labels, calm mid-story switch, bedtime-only alternate.

**Verify:** pytest docs/parity; DEMO strings match UI.

### Round 5 | Visual QA + stop
**Goal:** Refresh previews especially bedtime + dark demo; log Loop E; residual risks honest.

**Changes:** `refs/capture-previews.py` (Loop E) + `refs/smoke-loop-e.py`. Captures refreshed:
- `preview-home.png` / `preview-home-dark.png` — Guest / Task + equal empty CTAs
- `preview-demo.png` / `preview-demo-dark.png` — GUEST-10421 + Make the guest code
- `preview-bedtime.png` — TASK-22018 + Make the bedtime task + Bedtime path active
- `preview-mobile.png`

**Verify:** Files refreshed 2026-09-04 ~22:30 SAST; smoke PASS; 46 tests green.

### Residual risks
- Coach dual CTAs intentionally **hidden** under `data-compact` (max-height ≤900) — judges on short laptops rely on topbar story buttons + empty CTAs; tall viewports still show coach.
- How-strip still shows Doorstep icons as the primary row; Bedtime path is a strong secondary strip (parity of *weight*, not identical iconography).
- “Try the other story” chip always routes to bedtime ingest (pre-existing); from a finished bedtime run, prefer pressing **Doorstep story** / D.
- Google Fonts CDN still preferred; offline system stack unchanged.
- No axe/visual-regression CI yet (lightweight static a11y checks only).
- `frame-ancestors` in meta CSP ignored by some browsers; serve.py header remains authoritative locally; Pages lacks custom headers (documented).
- **Reasonable local ceiling approaching** — further polish has diminishing returns without human sync / judge dry-run feedback.
- HOLD sync: human must ask before GitHub push / Devpost.

### ready_for_sync_ask
**false** — reasonable local ceiling approaching — await user stop/sync/more. No push. No Devpost. No spend.
