# Feature Specification: Adaptive Household Flow

**Feature Branch**: `003-adaptive-household-flow`

**Created**: 2026-09-04

**Status**: Active

**Input**: Codex REVIEW.md + GROK-BRIEF.md (main @ b264922). Mission: Alexa+ household simulation that adapts when plans change, asks approval before acting, and shows outcomes supported by tool results.

## Context

Official Alexa+ **simulation** path does **not** require a specific SDK or MCP surface ([rules §4](https://amazonappdev2026.devpost.com/rules)). Existing MCP remains optional supporting evidence. Themes, Doorstep/Bedtime entry points, static stack, and working MCP stay. This feature is behavioural coherence — not visual redesign.

## User Scenarios and Testing (mandatory)

### User Story 1 — Parcel during bedtime, propose handoff (Priority: P1)

A parcel arrives during bedtime. The helper inspects simulated event, expected order, and household context automatically (read-only tools without per-step user prompts). It distinguishes observations from assumptions and proposes a practical handoff plan.

**Why this priority**: Core demonstration of orchestration judges can care about.

**Independent Test**: Start Doorstep connected story; proposal appears with recipient/action/time/status derived from tool results; user did not manually fire each read tool.

**Acceptance Scenarios**:

1. **Given** idle, **When** Doorstep story starts, **Then** helper runs read-only inspection tools and proposes a handoff plan with explicit assumptions vs observations.
2. **Given** that proposal, **When** the board/chat render, **Then** recipient, action, timing, and status dominate over any sample reference ID.

---

### User Story 2 — Changed facts → different plan (Priority: P1)

User says the neighbour is unavailable. Helper keeps household context, invalidates the prior proposal, and produces a materially different feasible plan with a short explanation.

**Why this priority**: Adaptation is the strongest product move (REVIEW P1).

**Independent Test**: After a proposal naming neighbour Thabo (or current fixture recipient), say neighbour unavailable; new proposal changes recipient/action/timing consistently in proposal, explanation, and artifact.

**Acceptance Scenarios**:

1. **Given** an active proposal with neighbour recipient, **When** user states neighbour unavailable, **Then** that proposal is superseded and a different feasible plan is shown with explanation.
2. **Given** the replan, **When** chat, timeline, and artifact render, **Then** they all reflect the same selected plan (single source of truth).

---

### User Story 3 — Refusal and information requests (Priority: P1)

User declines or asks what a guest code is. Nothing consequential executes. Exact utterance stays in the transcript.

**Why this priority**: Current UI treats "Don't make the guest code" as approval (REVIEW P1).

**Independent Test**: Cases in table below for Refusal and Information request.

**Acceptance Scenarios**:

1. **Given** a proposal, **When** user enters `Don't make the guest code` or `not yet`, **Then** no action, notification, unlock, or completion; exact text remains visible.
2. **Given** idle or mid-flow, **When** user enters `What is a guest code?`, **Then** helper explains the sample artifact without creating it.

---

### User Story 4 — Explicit approval once (Priority: P1)

User explicitly approves the **current** proposal. Simulation performs the allowed action once, shows result, creates an understandable handoff card. Draft / queued notification / confirmed handoff are distinct. Tool error cannot yield success. Superseded-plan approval is rejected. Repeat approval is idempotent.

**Why this priority**: Consent and trustworthy outcomes.

**Independent Test**: Approval, repeat approval, approve-after-replan, injected tool failure.

**Acceptance Scenarios**:

1. **Given** current proposal, **When** user explicitly approves, **Then** action executes once and a handoff card shows confirmed state distinct from draft.
2. **Given** already-executed approval, **When** user approves again, **Then** no duplicate side effect.
3. **Given** a superseded proposal id, **When** user tries to approve it, **Then** approval is rejected with clear message.
4. **Given** injected tool failure, **When** approval attempts the action, **Then** no false success; source and recovery are visible.

---

### User Story 5 — Story switch and resume (Priority: P1)

Switch Doorstep ↔ Bedtime; prior plan/status remain available. Fresh run restores pristine fixtures. Versioned synthetic demo state may resume after reload with explicit clear.

**Why this priority**: Session promises currently contradict behaviour (REVIEW P1).

**Acceptance Scenarios**:

1. **Given** Doorstep mid-plan, **When** user switches to Bedtime and back, **Then** Doorstep plan/status resume correctly.
2. **Given** "Try the other story", **When** pressed from either story, **Then** it switches to the other (both directions).
3. **Given** a fresh reset, **When** a new Doorstep starts, **Then** it does not inherit a prior backup choice.
4. **Given** documented resume policy, **When** page reloads, **Then** synthetic state restores only if version matches; clear option wipes it.

---

### User Story 6 — Honest outcomes and UX (Priority: P2)

`GUEST-10421` may remain a sample reference, not a gate/door credential. No identity claim from expected parcel alone. Simulation label visible on mobile. Lead with household problem and next decision. Remove internal instructions ("same weight") from product copy.

**Acceptance Scenarios**:

1. **Given** rendered handoff card, **When** judge reads it, **Then** it is a simulated handoff plan with assumptions — not "Ring-verified access credential".
2. **Given** 390×844 and desktop, light/dark, reduced motion, **When** both stories run, **Then** honest outcomes work via keyboard and pointer; sim label visible.

---

### User Story 7 — Bridge and HTTP honesty (Priority: P2)

Browser bridge is plain JSON at `/demo/call`, distinct from MCP `/mcp`. Fix CORS on health/call for intended local origins only; validate bodies; structured 4xx. Unavailable bridge may offer labelled mock continuation; failures never become unlabelled mock success. Verify MCP HTTP negotiation + tool call. Lock dependency versions.

**Acceptance Scenarios**: See HTTP row in acceptance table.

### Edge Cases

- Ambiguous/unsupported request → clarification; no consequential action.
- Mismatched order / insufficient event evidence → no confident identity claim; ask clarification.
- Intent must separate: ask about action vs propose vs approve vs decline (not broad substring).

## Acceptance cases (demonstrate behaviour)

| Case | Required evidence |
|---|---|
| Refusal | Doorstep; `Don't make the guest code` and `not yet` → no action/notification; exact utterance visible |
| Information request | `What is a guest code?` explains without creating |
| Changed facts | Neighbour unavailable → recipient/action/timing change in proposal, explanation, artifact |
| Uncertain evidence | Mismatched order/insufficient evidence → clarification, no identity claim |
| Approval | Current approval once; repeat idempotent; superseded rejected |
| Failure | Tool failure → no false success; source + recovery visible |
| State | Doorstep→Bedtime→Doorstep resumes; Try other story both ways; fresh reset clean; resume/clear per policy |
| Real result propagation | Changed tool response → plan/artifact change (not only timeline meta) |
| HTTP | MCP negotiate/list/call over HTTP; local health/call OK; bad origin/body → controlled errors |
| User experience | Both stories; keyboard+pointer; desktop + 390×844; light/dark; reduced motion; sim label; readable copy/print |

## Requirements (mandatory)

- Static HTML/CSS/JS + existing Python MCP server; small state/planning modules extracted from rendering.
- Immutable seed fixtures; separate mutable session state.
- Canonical structured result contract (mock + bridge): success/error, execution source, observations/outcome, stable operation id.
- Selected plan is sole source for chat, timeline, card, copy/print.
- Deterministic intent handling OK; do not claim unrestricted LLM.
- Zero spend; no cloud platform, paid model, auth system, hardware, new scenario catalogue, or frontend framework.
- Amazon-native only; no Azure/GreenLake/HPE (including denials in marketing).
- Do not Devpost Submit or publish replacement video without explicit session OK.

## Success metrics

- All acceptance cases pass with behavioural evidence (not string-presence alone).
- Existing valid baseline tests retained; broken consent/state tests replaced.
- Evidence pack returned to Codex (branch SHA, specs, tests, screenshots/recording notes, HTTP evidence).
