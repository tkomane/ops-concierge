# Tasks: Adaptive Household Flow

## Phase 0 — Spec & amendments
- [ ] T0.1 Write spec.md / plan.md / tasks.md / contracts.md
- [ ] T0.2 Constitution v1.1.0: success = honest consent + adaptive handoff; GUEST-10421 sample reference only
- [ ] T0.3 Amend specs/002: MCP optional for simulation track (rules §4), keep server as evidence

## Phase 1 — Contracts (lead)
- [ ] T1.1 Publish result + proposal + intent enums in contracts.md
- [ ] T1.2 Define session phase transitions + resume schema v1

## Phase 2 — Worker A (state/planner)
- [ ] T2.1 `js/session-state.js` — immutable fixtures clone; mutable session; no global scenario mutation
- [ ] T2.2 `js/planner.js` — build/supersede proposals from tool results
- [ ] T2.3 `js/intent.js` — refuse/info/approve/replan/ambiguous without broad substring collision
- [ ] T2.4 Unit tests for transitions, refusal, replan, idempotent approval

## Phase 3 — Worker B (bridge)
- [ ] T3.1 CORS allowlist for UI origins on `/healthz` and `/demo/call`
- [ ] T3.2 Validate request shapes; structured 4xx (not 500) for bad bodies
- [ ] T3.3 Label mock fallback vs bridge failure distinctly
- [ ] T3.4 HTTP tests: MCP negotiate/list/call + bridge cases
- [ ] T3.5 Lock MCP dependency (pin / lock file)

## Phase 4 — Lead integration
- [x] T4.1 Wire app.js to state/planner/intent; preserve Doorstep & Bedtime independent paths
- [x] T4.2 Connected story: parcel-during-bedtime handoff demo path
- [x] T4.3 UX: problem+decision first; remove "same weight" copy; plan fields > ID; sim badge on mobile
- [x] T4.4 Try-other-story both directions; resume/clear; fresh reset
- [x] T4.5 Handoff card honesty (not gate credential / not identity from ETA)

## Phase 5 — Evidence
- [x] T5.1 Acceptance case pass/fail table with commands
- [x] T5.2 Screenshots: adapt / refuse / approve
- [x] T5.3 Pages/CI note (prepare only; no unauthorised publish)
- [x] T5.4 Evidence pack markdown for Codex; stop batch (no extra redesign)
