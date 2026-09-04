# Feature 003 P1 — uncertain-operation retry correction — evidence pack

**Base HEAD:** `e246503926db0ff98849b1f7c20cb742d5327e7c` (`e246503`)  
**Fix tip SHA:** `e0a35b1e8eea48898720684daf5fd1978d96ae08` (`e0a35b1`)  
**Timezone:** Africa/Johannesburg (SAST)  
**Date:** 5 September 2026  

Pages correction, replacement video, and Devpost Submit remain **held**.  
Usage / credit meter: **unavailable**.

## Bug (before)

1. Health ok; notification POST loses response → first approval correctly `unknown_after_dispatch`.
2. Bridge unavailable; approve again (immediate or after reload).
3. App completed notify+task via **mock**, reached `acted`, reused unresolved notify op ID.

Root cause: saved failure progress lacked execution source / unknown disposition; retry coordinator always passed `requireBridge:false`; `runTool` only blocked mock when requireBridge was set; health-down `callTool` returns null → mock fallthrough.

## Fix summary

- Persist per-op `source`, `failureKind`, `attempted`, `disposition` on notify/task progress (survives save/load).
- Bind retries with `requireBridge: operationBoundToBridge(prior)` for both notify and task.
- Preserve `disposition: unknown` until the operation resolves honestly (`status: done`).
- Final `runTool` safety net: mutations with `requireBridge` / `noMockOnBridgeDown` / `bridgeAttemptedFail` never reach mock success.
- Ordinary notify-success / task-fail resume unchanged (stable op IDs; counts notify=1/task=1).

## Commands run

```bash
node refs/probe-next.cjs .                 # before + after
node --test tests/adaptive_flow_node_test.js tests/unknown_retry_node_test.js
.venv/bin/python -m pytest tests/ -q -p no:cacheprovider
```

## Probe before → after (`e246503` → fix tip)

| Check | Before | After |
|---|---|---|
| `unknownRetry` phase | **acted** | **failed** (unresolved) |
| `unknownRetry` counts | notify=1, task=1 (mock) | **notify=0, task=0** |
| `unknownRetry` mock success ops | 2 (notify+task) | **0** |
| `unknownRetry` notify progress | done / op_notify_household_1 | **failed**, source=bridge, disposition=**unknown**, same op id |
| `unknownRetry` POST count | 1 then mock (no 2nd POST) | **1** POST total; retry blocked without mock |
| `unknownRetryAfterReload` | acted via mock | **failed**, disposition unknown, zero mock successes |
| `retry` / `retryAfterReload` | acted; calls notify,task,task; counts 1/1 | **preserved PASS** |
| `droppedResponse` | mockCalled false, unknown_after_dispatch | **preserved PASS** |

Probe artefact: `refs/probe-next-results.json`.

### Actual request/result counts (unknownRetry)

1. GET `/healthz` → ok  
2. POST `notify.household` `op_notify_household_1` → connection lost → `unknown_after_dispatch`  
3. Retry with bridge down → health unavailable / cached unhealthy → **no POST**, result `bridge_unavailable`, **no mock**  
4. Action counts remain `{ notify: 0, task: 0 }`; phase `failed`

### Actual request/result counts (ordinary partial retry — preserved)

1. `notify.household` → ok  
2. `task.open` → fail (injected 500)  
3. retry: `task.open` only → ok  
Store actionCounts: `{ notify: 1, task: 1 }`

## Automated suite

- Node behavioural: **32 passed** (`adaptive_flow_node_test.js` + `unknown_retry_node_test.js`)  
- Pytest: **69 passed** in ~4.6s (was 67; +2 for unknown-retry wiring / static bind check)

## Themes / reduced-motion / print

| Check | Result |
|---|---|
| Static hooks (`data-theme`, `prefers-reduced-motion`, `@media print`) via `test_frontend_safety.py` | **PASS** (suite) |
| Full browser light/dark / reduced-motion / print visual matrix | **INCOMPLETE** (authorized; not re-swept this focused correction) |

## Acceptance table

| Gate | Result | Basis |
|---|---|---|
| Exact refusal / information examples | **PASS** | Prior suite preserved |
| Changed facts | **PASS** | Prior suite preserved |
| Uncertain evidence | **PASS** | Prior four evidence gates + conditionals preserved |
| Approval / disposition | **PASS** | Prior allowlist + stale/idempotent preserved |
| Failure / retry | **PASS** | Dropped POST unknown; ordinary partial retry; **uncertain retry no longer mock-resolves** (probe + node regressions) |
| State | **PASS** | source/disposition/attempted persist across save/load; stable op IDs |
| Real result propagation | **PASS** | Prior bridge typed obs / plan fields preserved |
| HTTP transport | **PASS** | Suite + unknown-after-dispatch + unavailable bind |
| User experience | **PARTIAL** | Themes/reduced-motion/print visual matrix **INCOMPLETE** |

## Files changed

- `js/app.js` — `operationBoundToBridge` / `operationProgressFields` / disposition preserve; approve coordinator binds `requireBridge`; runTool mock safety net  
- `tests/adaptive_flow_node_test.js` — persist source/disposition regression  
- `tests/unknown_retry_node_test.js` — unknown retry immediate + reload + ordinary resume  
- `tests/test_adaptive_flow.py` — wire unknown-retry node suite + static bind assert  
- `refs/probe-next-results.json` / `refs/evidence-003-retry.md`

## Residual risks

- Browser-to-live-bridge network-cut still via production-function probe (injected fetch), not a signed-in UI↔bridge cut.  
- Themes / reduced-motion / print visual matrix not re-swept → UX **INCOMPLETE**.  
- Pages deploy / Devpost / replacement video remain held.  
- A fresh mock demo (never bridge-attempted) can still succeed when health is down; only ops previously bound to bridge stay unresolved.

## Usage

**unavailable**
