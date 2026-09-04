# Feature 003 corrections — evidence pack

**Checkout tip (working tree):** corrections on top of `e2798c9`  
**Timezone:** Africa/Johannesburg (SAST)  
**Date:** 5 September 2026  

Pages correction, replacement video, and Devpost Submit remain **held**.

## Commands run

```bash
node refs/probe-003.cjs .
node --test tests/adaptive_flow_node_test.js
pytest -q -p no:cacheprovider
python3 refs/capture-evidence-003.py
```

## Probe before → after

| Check | Before (e2798c9) | After |
|---|---|---|
| `Confirm whether Mira is available` | approve | **ask_info** |
| `Approve only if the parcel is ours` | approve | **ask_info** |
| `Approve plan_1` | approve (no planId) | **approve + planId=plan_1** |
| Calendar neighbourAvailable flip | decisionUnchanged: true | **false** (Thabo→Mira, timing changes) |
| motion:false / parcelVisual:false | treated positive | **hasRingMotion/hasParcelVisual false** |
| Mismatched evidence approve | ok: true | **ok: false, needs_clarification** |
| All reads failed | approvable draft + invented obs | **ask_clarification, needsClarification** |
| Bridge HTTP 500 JSON | mockCalled true, ok true | **mockCalled false, ok false, source bridge** |

Probe artefact: `refs/probe-003-results.json`.

## Automated suite

- Node behavioural: **23 passed** (`tests/adaptive_flow_node_test.js`)
- Pytest: **65 passed** in ~2s (includes Node wrapper + HTTP MCP)

## Browser capture notes (Playwright)

Script: `refs/capture-evidence-003.py` — asserts **visible outcomes + action counts**, not only story IDs / chat phrases.

| Check | Result |
|---|---|
| Fresh `Start bedtime` | Inspected + proposed (`plan_1`, 4 tools) — **not** empty resume |
| Refuse `Don't make the guest code` | phase refused; notify/task ok counts unchanged |
| Neighbour unavailable | recipient Mira; prior planId superseded |
| `Approve <stale planId>` | **rejected**; notifyOk/taskOk unchanged |
| `Confirm whether Mira is available` | **no** notify/task calls |
| `Approve <current planId>` | notifyOk=1, taskOk=1, phase acted |
| Repeat `approve` | **zero** additional action calls |
| Reload | tools/messages/plan restored (phase acted, toolCount preserved) |
| Switch both directions | doorstep ↔ bedtime |
| Bedtime `Mira is unavailable` | recipient **Alexa routine** (not Mira) |
| Force-fail approve | phase failed; no false success copy |
| 390×844 sim-badge | present, `display:flex` (no longer hidden ≤900px) |

Screenshots under `refs/evidence-003/` including `00-fresh-bedtime-inspect.png`, `03b-bedtime-mira-unavail.png`, `04b-reload.png`, `06-mobile-390.png`.

## Acceptance table (original gates)

| Case | Result | Basis |
|---|---|---|
| Exact refusal cases | **PASS** | Browser + Node; verbatim refuse; zero writes |
| Information request | **PASS** | Guest-code ask_info; availability/confirm-whether ask_info with zero writes |
| Changed facts | **PASS** | Neighbour→Mira; Bedtime Mira→Alexa routine; calendar typed facts change timing/recipient |
| Uncertain evidence | **PASS** | Typed false obs; mismatch/failed → needsClarification; store.approve rejects |
| Approval | **PASS** | Stale planId rejected; current executes once; repeats add zero action calls; conditionals not consent |
| Failure | **PASS** | Probe: HTTP 500 JSON → no mock mutation; UI force-fail → failed phase. Full browser fetch injection still limited to probe boundary |
| State | **PASS** | Fresh start inspects; reload restores transcript+timeline+plan; story isolation via store-owned session |
| Real result propagation | **PASS** | notify/task args carry planId/recipient/action/timing/operationId; artefact status taken from tool outcome (draft announced when backend draft) |
| HTTP | **PASS** (backend) / **PASS** (client boundary via probe) | Suite + structured error preservation in mcp-client/runTool |
| User experience | **PARTIAL** | Mobile 390 + sim-badge fixed; light/dark/reduced-motion/copy-print not fully re-swept this round → remaining UX polish **INCOMPLETE** |

## Files changed

- `js/intent.js` — bounded approve; planId; questions/conditionals → ask_info
- `js/planner.js` — typed evidence; calendar facts; clarification proposals; seq safety
- `js/mcp-client.js` — preserve structured bridge errors (never null on HTTP 500 + JSON)
- `js/session-state.js` — lastResults/actionCounts; setUiState; reject needsClarification; hydrate
- `js/app.js` — consent target planId; bridge mutation stop; replan facts; resume gate; persistence ownership; args/status
- `css/app.css` — sim-badge visible ≤900px
- `tests/adaptive_flow_node_test.js` — correction regressions
- `refs/capture-evidence-003.py` — action-count / visible-outcome assertions
- `refs/probe-003-results.json` — after probe
- `refs/evidence-003-corrections.md` — this file
- `refs/evidence-003/*.png` — refreshed captures

## Residual risks

1. End-to-end **browser** HTTP fault-injection against a live bridge is still thinner than the production-function probe (capture uses force-fail for UI failure path).
2. Light/dark/reduced-motion/copy/print full matrix not re-run → UX marked PARTIAL/INCOMPLETE.
3. Pages / YouTube / Devpost remain held by assignment — not verified here.
4. When bridge is disabled, mutations still use labelled mock (by design); only **attempted** bridge failures are blocked from mock success.

## Usage

Unavailable in this executor environment.
