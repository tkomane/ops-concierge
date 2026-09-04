# UI redesign pass — Ops Concierge (x.ai-grade light)

**Date:** 2026-09-04 (SAST)  
**Author:** Tshiamo Komane  
**Scope:** `index.html`, `css/app.css`, light empty-state / chat-label copy in `js/app.js`  
**Screenshots:** `/workspace/ops-concierge/preview-home.png`, `/workspace/ops-concierge/preview-demo.png`

## Before | After | Why

| Before | After | Why |
|---|---|---|
| Dense panel chrome with hairline borders and almost no elevation | Soft floating white cards (`~18px` radius, multi-layer soft shadow) | Matches x.ai product cards that lift off a pure white canvas instead of reading as dashboard panels |
| Hero subcopy listed every signal in one long line | Shorter editorial subcopy: “Ring, orders, calendar, Fire TV — session-stateful concierge demos for judges.” | x.ai heroes keep secondary text brief; judges scan faster |
| Display title tracking already tight; hero padding moderate | Larger airy hero (`clamp` padding up), display tracking ≈ `-0.058em`, max-width ~15ch | Editorial first impression; more negative space above the three columns |
| Topbar meta (clock/session/phase) same visual weight as CTAs | Thinner topbar; meta row at ~72% opacity; SIM badge quieter | De-emphasize ops chrome; CTAs carry the actions |
| Bedtime used `btn-ghost` (looked like a text link) | Outline pill (`btn-outline`) beside solid black **Run demo** | Mirrors x.ai primary/secondary pill pair |
| Chat bubbles flat surface blocks with left rail on agent | Reasoning-card bubbles: soft shadow, asymmetric radii, no left rail | Closer to x.ai chat/reasoning card treatment |
| Composer compact inside a bordered foot | Larger pill input + Send; more padding in voice foot | Premium input affordance; less “form toolbar” |
| Empty states: shouty mono titles (`NO WORKFLOW LOADED`, dashed box) | Sentence-case Inter titles (`No workflow loaded`), solid/transparent empty — no dashed shout box | Elegant idle states; less mission-control tone |
| Starfield / grid overlay nodes still in markup (CSS-hidden) | Removed from `index.html` | Dead decorative DOM; keep canvas pure white |
| Panel tags / SIM badges slightly loud | Subtle SIM/phase pills (mono reserved for IDs & tool names) | Inter for UI; mono only where identifiers matter |
| Motion: msg fade/translate; orb pulse used box-shadow | Opacity/transform only; press `scale(0.98)` gated to fine pointers; `prefers-reduced-motion` intact; no `scale(0)` | Emil motion rules — calm under ~300ms, ease-out, skip keyboard-spam animation |

## Behavior preserved

- Doorstep (**Run demo** / `D`) → seeds workflow, tools timeline, `GUEST-10421` path  
- Bedtime demo button  
- Chips `1`–`4`, Enter send, `?` / Esc overlay  
- Phase pill + session strip  
- Optional MCP via `OPS_USE_MCP=1` / `mcp-client.js` untouched  
- CSP in `index.html` + `serve.py` unchanged  

## Vendor scrub

Public marketing surfaces grepped for Azure / GreenLake / HPE (including negations). **None found** in UI HTML/CSS/JS or product README/DEMO copy. Spec/constitution forbid-list mentions remain documentation-only.

## Regressions / follow-ups

- Tall hero + three columns: on short viewports (`≤1100px`) stack still applies; desktop judges should use ≥1100px height for full composer visibility.  
- Demo screenshot captured mid-flow (board shows `GUEST-10421`, tools firing) — not the final ticketed artefact; recording path in `DEMO.md` unchanged.  
- No GitHub push / Devpost submit performed.  


## Light + dark theme (2026-09-04 SAST)

**Scope:** `css/app.css` tokens, `js/theme.js` (early head script), topbar `#themeToggle` in `index.html`.

### Behavior
- `data-theme="light"|"dark"` on `<html>` via sync `js/theme.js` before stylesheet (CSP `script-src 'self'` — no inline).
- Persistence: `localStorage` key `ops-theme`; first visit uses `prefers-color-scheme`.
- Toggle: icon button in `.topbar-right` (moon in light / sun in dark), `aria-label` / `title` / `aria-pressed`, keyboard-focusable via existing `.btn:focus-visible`.
- Smooth ≤160ms transitions on surfaces; existing `prefers-reduced-motion` still zeros durations.
- `meta[name=theme-color]` updates to `#FFFFFF` / `#0A0A0A`.

### Tokens (dark)
- Canvas `--bg: #0A0A0A`; panels `--panel: #111` / `--card|--elev: #141414`
- Borders `--line` / `--line-strong` ≈ white 9–14% opacity
- Text near-white / muted gray; primary CTA inverted (near-white fill, black label)
- Soft dark shadows; theme-aware wells, phase pills, SIM tag, sev chips, overlay scrim, toast, scrollbar

### Screenshots
- `preview-home.png` (light idle)
- `preview-home-dark.png` (dark idle)
- `preview-demo-dark.png` (dark mid doorstep demo)

Demos, MCP client, CSP, and existing IDs/hooks unchanged. No Azure/GreenLake/HPE mentions.

## Vocabulary / metaphor / iconography (2026-09-04 SAST)

**Scope:** `index.html`, `css/app.css`, `js/app.js`, `js/scenarios.js`  
**Screenshots:** `preview-home.png`, `preview-home-dark.png`, `preview-demo.png`, `preview-demo-dark.png`

### Story made obvious
- **Problem:** home signals (door, package, calendar, TV) don’t talk to each other.
- **What it is:** a friendly household helper (Alexa+ simulation).
- **How it works (shown):** Door → Package → Quiet hours → Guest code (parallel bedtime hint under the strip).

### Before → after (primary labels)

| Before | After | Why |
|---|---|---|
| Household orchestration you can see. | Your home’s helper, step by step. | Child-readable; no “orchestration” |
| Voice / Chat | Talk to the helper | Warm verb; brand stays in logo |
| Household Board | What’s happening at home | Concrete place metaphor |
| Tools / 0 EVENTS | Steps the helper took / 0 steps | Show sequence, not ops events |
| Run demo / Bedtime | Doorstep story / Bedtime story | Narrative CTA; still clear for judges |
| SIM · NOT LIVE | Demo · not a live device | Soften shouty SIM chrome |
| IDLE / STANDBY / THINKING | Ready / Listening / Working / Done / Thinking… | Human status words |
| You / Ops Concierge (chat) | You / Helper | Helper in chat; brand in mark |
| Run doorstep delivery | Someone’s at the door | Plain English chips |
| Copy artefact | Copy guest code / Copy task | Outcome words |
| Source / Fired / Resource / Signal / Impact | From / When / Where / What’s up / Why it matters | Board scan for any age |
| CORRELATED / presence window | How it fits together / Quiet-hours plan | No phase jargon in UI |

### Metaphor system (consistent)
Prefer: Home helper, What’s happening, Plan, Steps, Door, Package, Quiet time, Guest code, Bedtime, Task list.  
Avoid as primary labels: orchestration, mission, telemetry, utterance, phase (as shouty pill), standby, artefacts, tools timeline.

**Builders layer (kept on purpose):** tool ids (`ring.query`, `order.lookup`, …) as mono captions under friendly step names; session id mono; ticket ids `GUEST-10421` / `TASK-22018`; MCP `artefact_hint` arg unchanged.

### Icon set (inline SVG, no emoji, no react-icons)
Stroke style matched to mark (1.4–1.5 stroke, currentColor):
- Door / Ring — panel how-strip, timeline, board cards, Doorstep CTA
- Package / order — how-strip, timeline, board
- Calendar / quiet hours — how-strip, quiet-hours card
- Guest pass — how-strip, guest ticket
- Fire TV / bedtime — Bedtime CTA, bedtime path tool label
- Task — steps panel / timeline empty / bedtime ticket
- Chat / helper mic — Talk panel
- Home — board empty / correlation card
- Theme moon/sun — unchanged (`#themeToggle`)

### How-it-works visual
New `.how-strip` under hero: Door → Package → Quiet hours → Guest code with arrows; bedtime parallel hint. Click/keyboard toggles `.is-active` highlight; doorstep ingest also highlights the doorstep path.

### Theme
`js/theme.js` + `data-theme` preserved; light/dark both verified in new screenshots.

### Behavior preserved
`#demoBtn`, `#demoBtn2`, `#chat`, `#cards`, `#timeline`, `#themeToggle`, chips `1`–`4`, `D`, MCP client, demo IDs `GUEST-10421` / `TASK-22018`.

### Vendor scrub
No Azure / GreenLake / HPE (including negations) in UI HTML/CSS/JS.

### Left jargon-y on purpose (judges)
- Tool names under steps (`ring.query` …)
- Session ids (`sess-…`)
- Ticket / guest codes
- Footer “Alexa+ simulated path (rules §4)”
- Internal phase keys + MCP arg names unchanged

---

## Ten HARD rounds (2026-09-04 SAST)

Full log: `refs/ten-rounds.md`.

Substantive passes: a11y (skip/live/contrast/focus/keyboard), responsive ≤900/≤640, how-strip↔tool coupling, helper voice consistency, story progress stepper + guest/task reveal, Emil micro-interactions, dark-mode premium tokens, font/FOUC/contain hygiene, `tests/test_frontend_safety.py` (22 green), refreshed screenshots including `preview-mobile.png`.

**Ready for GitHub sync confirmation:** YES (no push / no Devpost / no spend).

