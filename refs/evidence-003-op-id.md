# Feature 003 P1 — stable operation ID correction — evidence pack

**Base HEAD:** `03bc162a3582af07c15d1ee35822b9f58113db4f` (`03bc162`)  
**Fix tip SHA:** `c6ac61f38c618b4c05a8984932e318d67e1ef240` (`c6ac61f`)
**Timezone:** Africa/Johannesburg (SAST)  
**Date:** 05 September 2026  

Pages correction, replacement video, and Devpost Submit remain **held**.  
Usage / credit meter: **unavailable**.

## Bug (before)

Failure handlers saved `notify.operationId || notifyOpId` / `opened.operationId || taskOpId`. A structured bridge HTTP 500 minted a fresh `operationId`, so retries replaced the client ID (e.g. `op_task_open_2` → `op_<random>` / `failed_task`). Unknown POST then 500 kept `disposition: unknown` while replacing the ID; later success under the replacement ID wrongly resolved the uncertain op in local state.

Count-only assertions still finished at notify=1/task=1 and missed the regression. Eight stable-ID cases failed at `03bc162`.

## Fix summary

1. **Client:** approve failure/success progress always persists the originally dispatched client `notifyOpId` / `taskOpId`. Diagnostic response IDs are stored separately as `responseOperationId`.
2. **`runTool` / `OpsMcpClient`:** keep request operation identity primary; stash mismatched response IDs as `responseOperationId`.
3. **Bridge:** `_bridge_error` accepts `operation_id` and the handler-exception HTTP 500 path echoes the request's `arguments.operationId`.

## Probe before → after (`03bc162` → this tip)

Command: `node refs/probe-operation-id.cjs .` (fixture from `refs/probe-bridge-error.py`)

| Metric | Before | After |
|---|---|---|
| Stable-ID failures | **8** | **0** |
| Bridge 500 notify body `operationId` | minted `op_*` ≠ request | **`op_notify_household_1`** (echo) |
| Bridge 500 task body `operationId` | minted `op_*` ≠ request | **`op_task_open_2`** (echo) |

### Eight cases — before

| `notify.household` | False | False | `['op_notify_household_1', 'op_c027680721f7']` | FAIL |
| `notify.household` | False | True | `['op_notify_household_1', 'op_c027680721f7']` | FAIL |
| `notify.household` | True | False | `['op_notify_household_1', 'op_notify_household_1', 'op_c027680721f7']` | FAIL |
| `notify.household` | True | True | `['op_notify_household_1', 'op_notify_household_1', 'op_c027680721f7']` | FAIL |
| `task.open` | False | False | `['op_task_open_2', 'op_fcfeedac0178']` | FAIL |
| `task.open` | False | True | `['op_task_open_2', 'op_fcfeedac0178']` | FAIL |
| `task.open` | True | False | `['op_task_open_2', 'op_task_open_2', 'op_fcfeedac0178']` | FAIL |
| `task.open` | True | True | `['op_task_open_2', 'op_task_open_2', 'op_fcfeedac0178']` | FAIL |

### Eight cases — after

| `notify.household` | False | False | `['op_notify_household_1', 'op_notify_household_1']` | PASS |
| `notify.household` | False | True | `['op_notify_household_1', 'op_notify_household_1']` | PASS |
| `notify.household` | True | False | `['op_notify_household_1', 'op_notify_household_1', 'op_notify_household_1']` | PASS |
| `notify.household` | True | True | `['op_notify_household_1', 'op_notify_household_1', 'op_notify_household_1']` | PASS |
| `task.open` | False | False | `['op_task_open_2', 'op_task_open_2']` | PASS |
| `task.open` | False | True | `['op_task_open_2', 'op_task_open_2']` | PASS |
| `task.open` | True | False | `['op_task_open_2', 'op_task_open_2', 'op_task_open_2']` | PASS |
| `task.open` | True | True | `['op_task_open_2', 'op_task_open_2', 'op_task_open_2']` | PASS |

### Captured bridge 500 bodies (after fix)

| Tool | Request ID | Response ID | Status |
|---|---|---|---|
| notify.household | `op_notify_household_1` | `op_notify_household_1` | 500 |
| task.open | `op_task_open_2` | `op_task_open_2` | 500 |

## Preserved no-mock unknownRetry (`node refs/probe-next.cjs .`)

| Check | Result |
|---|---|
| `unknownRetry` | phase **failed**; counts **notify=0/task=0**; disposition **unknown**; op `op_notify_household_1`; **0** mock successes |
| `unknownRetryAfterReload` | same unresolved bind |
| ordinary `retry` / `retryAfterReload` | phase **acted**; counts **1/1**; task request IDs **`op_task_open_2`,`op_task_open_2`** |

## Automated suite

- Node behavioural: **40 passed** (`adaptive_flow_node_test.js` + `unknown_retry_node_test.js`; was 32, +8 stable-ID sequences)
- Pytest: **70 passed** in ~4.7s (was 69; +1 handler-exception echo)

## Themes / reduced-motion / print

| Check | Result |
|---|---|
| Static hooks (`prefers-reduced-motion`, `@media print`) via suite | **PASS** |
| Reduced-motion browser (Playwright `reduced_motion=reduce`, doorstep→approve) | **PASS** — sampled transitions/animations `1e-05s`; screenshot `refs/evidence-003-op-id/reduced-motion-approved.png` |
| Print (emulate_media=`print` + `data-print-ticket=1`) | **PASS** — guest card focused screenshot `refs/evidence-003-op-id/print-ticket.png`; native print dialog not invoked (prior automation stall avoided) |
| Theme light/dark matrix | Not re-swept this tip (prior review PASS) |

## Acceptance table

| Gate | Result | Basis |
|---|---|---|
| Exact refusal / information examples | **PASS** | Prior suite preserved |
| Changed facts | **PASS** | Prior suite preserved |
| Uncertain evidence | **PASS** | Prior evidence gates preserved |
| Disposition / disposition unknown | **PASS** | Unknown preserved through 500; client ID immutable |
| Failure / retry | **PASS** | 8/8 stable-ID probe; unknown→500→success request IDs asserted; no-mock unknownRetry preserved |
| State | **PASS** | Client `operationId` + optional `responseOperationId` persist |
| Real result propagation | **PASS** | Bridge 500 echoes request op ID |
| HTTP transport | **PASS** | New bridge exception echo test + suite |
| User experience | **PASS** (focused) | Reduced-motion + print emulation checks this tip |

## Files changed

- `js/app.js` — immutable client op IDs on progress save; `responseOperationId`; runTool prefers client ID
- `js/mcp-client.js` — structured HTTP errors keep request `operationId`
- `mcp_server/server.py` — `_bridge_error(operation_id=…)` + exception handler echo
- `tests/unknown_retry_node_test.js` — 8 stable-ID sequences + ordinary resume ID asserts
- `tests/test_bridge_http.py` — handler-exception echoes request op ID
- `tests/test_adaptive_flow.py` — static guards against response-ID overwrite
- `refs/bridge-error-responses.json`, `refs/probe-operation-id-*.json`, `refs/evidence-003-op-id.md`, visual artefacts

## Residual risks

- Native OS print dialog still not driven (emulation used); product print CSS verified via screenshot.
- Browser-to-live-bridge network cut still via production-function probes with injected fetch, not a signed-in UI↔bridge cut.
- Pages deploy / Devpost / replacement video remain held.
- Fresh never-bridge-attempted mock demo can still succeed when health is down; only bridge-bound uncertain ops stay unresolved.

## Usage

**unavailable**
