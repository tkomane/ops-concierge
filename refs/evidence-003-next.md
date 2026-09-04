# Feature 003 NEXT corrections — evidence pack

**Base HEAD (required):** `677a432b50c6dedcafc67e24ace78b2b9572abf9` (`677a432`)  
**Fix tip SHA:** `89fe12787c7f4c3f39bb7b74beff34572e6a1a60` (`89fe127`)  
**Timezone:** Africa/Johannesburg (SAST)  
**Date:** 5 September 2026  

Pages correction, replacement video, and Devpost Submit remain **held**.  
Usage / credit meter: **unavailable**.

## Commands run

```bash
node refs/probe-corrections.cjs .   # before + after
node --test tests/adaptive_flow_node_test.js
.venv/bin/python -m pytest tests/ -q -p no:cacheprovider
python3 refs/capture-evidence-003.py
```

## Probe before → after (from `677a432`)

| Check | Before | After |
|---|---|---|
| `Go ahead if the parcel is ours` | approve | **ask_info** |
| `Do it after Mira confirms` | approve | **ask_info** |
| `Yes, approve if Mira is available` | approve | **ask_info** |
| `Approve plan_1 when Mira confirms` | approve | **ask_info** |
| Doorstep no results | approve.ok true | **ask_clarification / approve false** |
| Doorstep motion:false + parcelVisual:false + no order | approve.ok true | **ask_clarification / approve false** |
| Doorstep positive door + failed order | approve.ok true | **ask_clarification / approve false** |
| Bedtime all inspection reads failed | approve.ok true | **ask_clarification / approve false** |
| Fetch rejection after POST | mockCalled true, ok true, source mock | **mockCalled false, ok false, attempted true, failureKind unknown_after_dispatch** |
| Partial retry counts | notify 1→**2**, task 0→1; calls notify,task,notify,task | **notify 1→1, task 0→1; calls notify, task, task** (stable op `op_task_open_2` reused) |
| Artifact copy Status | Status: confirmed | **Status: draft** + **Approval: confirmed** |
| Live bridge Doorstep proposal | ask_clarification (no typed obs) | **notify_handoff / Thabo** with typed ring+order observations |
| Bridge notify/task plan fields | silently dropped; new op ids | **recipient/action/timing/planId echoed; client operationId reused** |

Probe artefact: `refs/probe-corrections-results.json`.

### Actual call counts (partial retry probe)

1. `notify.household` `op_notify_household_1` → ok  
2. `task.open` `op_task_open_2` → fail (injected 500)  
3. retry: `task.open` `op_task_open_2` only → ok  

Store actionCounts after retry: `{ notify: 1, task: 1 }`.

### Browser partial retry (Playwright)

- After fail-once on `task.open`: notifyOk=1, taskOk=0, taskErr=1, phase=failed  
- After resume `approve`: notifyOk=1, taskOk=1, notifyAll=1, taskAll=2, phase=acted  

## Automated suite

- Node behavioural: **28 passed** (`tests/adaptive_flow_node_test.js`)  
- Pytest: **67 passed** in ~1.9s (includes Node wrapper + HTTP MCP + new tool contract tests)

## Browser capture notes (Playwright)

Script: `refs/capture-evidence-003.py` — asserts **visible outcomes + action counts**, plus NEXT gates.

| Check | Result |
|---|---|
| Fresh `Start bedtime` | Inspected + proposed — **PASS** |
| Refuse | phase refused; notify/task unchanged — **PASS** |
| Neighbour unavailable | recipient Mira; prior planId superseded — **PASS** |
| Stale `Approve plan_N` | rejected; zero actions — **PASS** |
| `Confirm whether…` | zero actions — **PASS** |
| Conditional consent allowlist (`Go ahead if…`, `Do it after…`, `Yes, approve if…`, `Approve plan_X when…`) | **zero** notify/task attempts — **PASS** |
| Current plan approve | notifyOk=1, taskOk=1; artefactStatus=draft; ticket Status draft / Approval confirmed — **PASS** |
| Repeat approve | zero additional actions — **PASS** |
| Reload | tools/messages/plan restored — **PASS** |
| Story switch both ways | doorstep ↔ bedtime — **PASS** |
| Bedtime Mira unavailable | recipient Alexa routine — **PASS** |
| Partial retry | notify not duplicated; task resumed — **PASS** |
| Force-fail approve | phase failed; no false success — **PASS** |
| Evidence gates (in-page planner) | all four non-approvable — **PASS** |
| 390×844 sim-badge | present, display flex — **PASS** |
| Full themes / reduced-motion / print matrix | **INCOMPLETE** (held) |

Screenshots under `refs/evidence-003/` including `03c-conditional-consent.png`, `05b-partial-retry.png`.

## Acceptance table (original gates)

| Gate | Result | Basis |
|---|---|---|
| Exact refusal / information examples | **PASS** | Prior suite + browser; availability question zero writes |
| Changed facts | **PASS** | Neighbour→Mira; Bedtime Mira→Alexa; calendar typed facts; backend recipient/action now affect returned meta/detail |
| Uncertain evidence | **PASS** | Empty / negative / failed order Doorstep + all-failed Bedtime → needsClarification; store.approve rejects |
| Approval / disposition | **PASS** | Stale target + repeat completion preserved; unconditional allowlist; conditionals clarify with zero actions |
| Failure / retry | **PASS** | Dropped fetch after POST → attempted/unknown, mock blocked; partial retry notify=1/task=1 with stable op ids (probe + browser) |
| State | **PASS** | Fresh start, reload, story switch preserved; operationProgress persists across save/load |
| Real result propagation | **PASS** | Backend consumes plan fields + typed observations; bridge Doorstep proposes handoff; artefact Status from tool outcome |
| HTTP transport | **PASS** | Suite + structured unknown-after-dispatch |
| User experience | **PARTIAL** | Conditional consent, artifact status, mobile marker verified; light/dark/reduced-motion/print matrix **INCOMPLETE** |

## Files changed

- `js/intent.js` — complete unconditional approval allowlist/grammar; condition suffixes → ask_info  
- `js/mcp-client.js` — after-dispatch fetch rejection → attempted/unknown (no null→mock)  
- `js/session-state.js` — per-plan `operationProgress` + persist/hydrate APIs  
- `js/app.js` — resume unfinished ops with stable op ids; render artefactStatus vs approval; fail-once evidence hook  
- `js/planner.js` — minimum evidence gates for Doorstep + Bedtime  
- `mcp_server/tools.py` / `server.py` / `models.py` — typed observations; consume planId/recipient/action/timing/operationId; bridge outcome alignment  
- `tests/adaptive_flow_node_test.js` / `tests/test_tools.py` — NEXT regressions  
- `refs/capture-evidence-003.py` / `refs/probe-corrections-results.json` / evidence screenshots  

## Residual risks

- Browser-to-live-bridge fault injection still exercised via production-function probe (injected fetch), not a full signed-in UI↔bridge network cut.  
- Themes / reduced-motion / print visual matrix not re-swept → UX **INCOMPLETE**.  
- Pages deploy / Devpost / replacement video remain held.  
- `__OPS_SET_FAIL_ONCE` is a demo/evidence hook (alongside existing force-fail).  

## Usage

**unavailable**
