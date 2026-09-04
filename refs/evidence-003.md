# Evidence pack — 003 Adaptive Household Flow

**Date**: 2026-09-04 (Africa/Johannesburg)  
**Base SHA (committed)**: `b264922a1b67952b16902cb3752dacd2df92f99d`  
**Commit SHA (this batch)**: `4947de4109c7a00da36f08f415085b909192d19d` on `main`.
**Credit use**: unavailable in this environment.

## Spec paths
- `specs/003-adaptive-household-flow/spec.md`
- `specs/003-adaptive-household-flow/plan.md`
- `specs/003-adaptive-household-flow/tasks.md`
- `specs/003-adaptive-household-flow/contracts.md`

## Changed files (this integration)
| File | Role |
|---|---|
| `index.html` | Script order: session-state / planner / intent before app.js; remove “same weight” copy; honest hero sub |
| `js/app.js` | OpsState / OpsPlanner / OpsIntent integration; intent-first routing; auto-propose; approve/refuse/replan; resume |
| `js/session-state.js` | Worker A — mutable session store (new) |
| `js/planner.js` | Worker A — proposal builder / replan (new) |
| `js/intent.js` | Worker A — deterministic classifier (new) |
| `js/scenarios.js` | Honesty: no Ring-verified credential claim; ETA ≠ identity |
| `mcp_server/fixtures.py` | Matching handoff title honesty |
| `mcp_server/server.py` | Worker B — CORS / bridge validation (pre-existing in tree) |
| `css/app.css` | Minimal `.proposal-card` prominence |
| `tests/adaptive_flow_node_test.js` | Worker A node behaviour tests |
| `tests/test_adaptive_flow.py` | Pytest wrapper for node suite |
| `tests/test_bridge_http.py` | Worker B HTTP tests |
| `refs/evidence-003/*` | Screenshots + capture script |
| `preview-demo.png` | Updated from doorstep-proposed shot |
| `refs/evidence-003.md` | This pack |

## Test commands / results

```bash
cd /workspace/ops-concierge
.venv/bin/python -m pytest tests/ -q
# → 65 passed

node --test tests/adaptive_flow_node_test.js
# → 16 pass / 0 fail

python3 serve.py --port 8765   # terminal 1
python3 refs/capture-evidence-003.py
# → ALL UI CHECKS PASSED (refuse, replan, approve, switch both ways, failure inject)
```

Dependency lock: `uv.lock` present (Worker B). MCP SDK pinned via lockfile.

## Acceptance case table

| Case | Result | Evidence |
|---|---|---|
| Refusal | **PASS** | UI: `Don't make the guest code` → phase `refused`; no `task.open` / notify; exact utterance in `#chat`. Shot: `refs/evidence-003/02-refuse.png`. Node: OpsIntent decline cases. |
| Information request | **PASS** | `What is a guest code?` → ask_info; explains sample artifact; no create. Classifier + `handleAskInfo`. |
| Changed facts | **PASS** | Neighbour unavailable → recipient **Mira**, action **defer_handoff_parent**, new timing; prior superseded. Shot: `03-replan.png`. |
| Uncertain evidence | **PASS** (planner unit) | `OpsPlanner.canClaimVisitorIdentity` / mismatch & ETA-only paths; proposal assumptions warn; correlate copy no longer claims stranger-vs-verified. Full mismatched-order UI inject not separately screenshotted. |
| Approval | **PASS** | Current plan once → `acted` / `confirmed`; repeat → “Already approved / no duplicate”; superseded rejected via `store.approve`. Shot: `04-approve.png`. |
| Failure | **PASS** | `__OPS_SET_FORCE_FAIL(true)` on approve → phase `failed`; no false success; source + recovery in chat. Shot: `05-failure.png`. |
| State | **PASS** | Doorstep→Bedtime→Doorstep via “Try the other story” both ways (Playwright). Fresh reset via `store.resetFresh` / clear; `ops-demo-v1` load on init + Reset demo chip. Seeds: mutateFixture does not touch `OPS_SCENARIOS` (node check). |
| Real result propagation | **PASS** | Replan changes proposal card + explanation + artifact fields from planner output (not timeline meta only). |
| HTTP | **PASS** (Worker B suite) | `tests/test_bridge_http.py` included in 65-pass pytest (CORS allowlist, structured 4xx, MCP negotiate/list/call coverage as implemented). |
| User experience | **PASS** (partial) | Both stories runnable; keyboard D/B/? retained; themes retained; proposal card prominence CSS; sim badges unchanged. Full 390×844 / reduced-motion visual audit not re-run this batch beyond prior chrome. |

## Screenshots
- `refs/evidence-003/01-doorstep-proposed.png` — auto inspection → proposal
- `refs/evidence-003/02-refuse.png`
- `refs/evidence-003/03-replan.png`
- `refs/evidence-003/04-approve.png`
- `refs/evidence-003/05-failure.png`

## Remaining external steps (**PENDING auth**)
- GitHub Pages site configuration / publish verification — **PENDING** (prior Configure Pages failure; do not rewrite infra without auth)
- Replacement demo video upload (YouTube) — **PENDING**
- Devpost submit — **PENDING** (explicitly out of scope / not authorised)
- Commit + push of this working tree — **DONE** ()

## Behaviour notes for Codex
- Intent is classified **before** any create/approve path; negation beats `guest code` substring.
- Doorstep/Bedtime start auto-runs read-only tools then `OpsPlanner.buildProposal`; chat/timeline/card read **selected plan** only.
- Distinct statuses: draft → queued (notify) → confirmed (acted); failures stay labelled (`mock` / `bridge`) and never become unlabelled success.
- Sample ref `GUEST-10421` remains documentation continuity only — not a gate credential.
