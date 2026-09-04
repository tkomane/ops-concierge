# Plan: Adaptive Household Flow

**Feature**: `003-adaptive-household-flow`  
**Base**: `main` @ `b264922`

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| Spec-First | Pass | This plan + spec.md + tasks.md |
| Amazon-Native Honesty | Pass | Alexa+ simulation; handoff honesty (no fake credentials) |
| Design Excellence | Pass | Keep themes/typography; UX copy cleanup only — no redesign |
| Security by Default | Pass | CSP, escapeHtml, local-origin bridge CORS, no secrets |
| Simplicity / YAGNI | **Amend** | Constitution v1.0.0 measured quality only as "demo to GUEST-10421". Amend to honest handoff + consent (see constitution v1.1.0). Sample ID may remain reference only. |
| Observability | Pass | Timeline + plan state; progressive disclosure for tools |
| A11y / Performance | Pass | Keep keyboard, reduced-motion, both themes |

### Complexity Tracking

- Extract `js/session-state.js` + `js/planner.js` (+ optional `js/intent.js`) — justified to separate behaviour from `app.js` rendering (REVIEW).
- Spec 002 MCP "track requires server" claim corrected — simulation path does not require MCP (official rules §4).

## Architecture

```
Immutable fixtures (scenarios.js seeds)
        ↓
Session state machine (phases: idle → inspecting → proposed → superseded → approved → acted | refused)
        ↓
Planner (reads tool results → Proposal {recipient, action, timing, assumptions, observations, planId})
        ↓
Intent router (ask | decline | approve | replan-facts | ambiguous)
        ↓
Result contract {ok, source: mock|bridge|mcp, operationId, observations?, outcome?, error?}
        ↓
Renderers (chat, timeline, board card, copy/print) ← selected plan only
```

Bridge: `/healthz` + `/demo/call` with allowlisted localhost origins; validate JSON body; 4xx structured errors. `/mcp` remains real MCP.

Resume: `localStorage` key `ops-demo-v1` versioned; explicit Clear.

## Work split (≤2 workers + lead)

| Owner | Scope | Files |
|---|---|---|
| Lead (Grok) | Specs, contracts, `js/app.js` integration, UX copy, evidence pack | specs/003/*, constitution, app.js, index.html, css (minimal), DEMO.md |
| Worker A | State + planner + intent + unit/behaviour tests | `js/session-state.js`, `js/planner.js`, `js/intent.js`, `tests/test_adaptive_*.py` or node-free JS tests via pytest+subprocess/playwright-light — prefer pytest parsing + small pure-JS tests runnable under node if present, else Python ports of transition tables |
| Worker B | Python bridge CORS/validation + HTTP MCP/bridge tests + lockfile | `mcp_server/server.py`, `tests/test_bridge_http.py`, `pyproject.toml` / lock |

Agree contracts in `specs/003-adaptive-household-flow/contracts.md` before parallel edits.

## Out of scope

Visual redesign loops, new scenarios catalogue, paid LLM, framework migration, Devpost submit, YouTube publish (prepare only), Pages infra rewrite (prepare config note only).

## Verification

- Behavioural acceptance table from spec.md
- pytest suite green (baseline + new)
- Manual/scripted UI evidence for refusal, replan, approval
- HTTP MCP negotiate/list/call + bridge origin/body cases
