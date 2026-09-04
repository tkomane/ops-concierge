# Ops Concierge - next assignment for Grok

You are the implementation lead for `https://github.com/tkomane/ops-concierge`. Codex has reviewed `main` at `b264922a1b67952b16902cb3752dacd2df92f99d` and supplied the accompanying REVIEW.md. Read it once, check the current HEAD and any uncommitted work, and adapt only where newer evidence changes a finding. Preserve unrelated work.

**Mission:** deliver a convincing Alexa+ household simulation that adapts when the household's plans change, asks for approval before acting, and shows an outcome supported by its tool results.

The current themes, two story entry points, static architecture and working MCP server are useful. Keep them. The next work is a coherent behavioural improvement, not another series of visual polish rounds. Remain on the Alexa+ simulation path. The official rules expressly allow this alternative without a particular SDK or MCP surface: https://amazonappdev2026.devpost.com/rules . Correct the contradictory requirement in spec 002. MCP is already working over HTTP and does not need expansion merely for eligibility.

**Credit discipline and delegation**

The user reported about 70% of the allowance consumed, with a reset in five days. Aim to return the first complete evidence pack after spending at most roughly two-thirds of what remains, retaining the rest for corrections. This is a planning cap, not a claim that token usage can be predicted. If usage telemetry is unavailable, use the bounded scope below and do not launch extra rounds to consume the allowance.

Use at most two narrowly tasked implementation workers plus yourself. Do not start recursive delegation or duplicate full-repository reviews. You own the spec delta, shared contracts, integration and final judgement. Agree the result/state contracts before parallel edits. Give each worker only the relevant files, acceptance cases and ownership. One worker can own state/planning modules and their behaviour tests; the other can own Python transport, bridge validation and HTTP tests. You own `js/app.js` integration and the final UX. Avoid simultaneous edits to the same files. Verification should challenge the implementation, not repeat its assumptions.

Within that work budget, favour roughly 60% on the adaptive flow, 20% on integration/reproducibility, and 20% on verification and demonstration evidence. Do not add a cloud platform, paid model, authentication system, hardware dependency, new scenario catalogue or frontend framework.

**First, make the change reviewable**

Write one compact feature spec, plan and task list under `specs/003-adaptive-household-flow/`. Amend conflicting constitution/spec statements with a reason, including any existing rules that preserve misleading "guest code" terminology or define success only as reaching a fixed ID. Retain simulation honesty, both story paths, accessibility, CSP and zero-spend operation. Use the following acceptance cases as the spec; do not expand them into a separate planning project. Then implement the slice.

**The demonstration to build**

Use the existing household, parcel and bedtime fixtures to tell one connected story:

1. A parcel arrives during bedtime. The helper inspects the available simulated event, expected order and household context automatically. It distinguishes observations from assumptions and proposes a practical handoff plan. The user should not need to instruct every read-only tool call.
2. The user says the neighbour is unavailable. The helper keeps the same household context, invalidates that proposal and produces a materially different feasible plan with a short explanation.
3. The user declines. Nothing is sent, created as an approved action, unlocked or marked complete. The actual refusal remains in the transcript.
4. The user explicitly approves the current proposal. The simulation performs the allowed action once, shows the result and creates an understandable handoff card. A draft, a queued notification and a confirmed handoff have distinct states. A tool error cannot produce a successful outcome.
5. Switch to Bedtime and back. The previous plan and its status remain available. A deliberately fresh run restores pristine fixtures. Support a small, versioned resume/reset path for synthetic demo state after reload, with an explicit clear option.

Both Doorstep and Bedtime must still work independently. The connected demonstration reuses those capabilities. Keep all device operations simulated and visibly labelled. `GUEST-10421` may remain a sample reference for continuity, but do not present it as a functioning gate or door credential. Do not claim a visitor is verified because an order is expected.

**Implementation decisions**

Keep the current stack. Extract a small explicit session/state transition layer and a planner from the rendering code. Maintain immutable seed fixtures and separate mutable session state. Avoid a wholesale rewrite.

Keep a canonical structured result contract shared by mock and bridge paths: success/error, execution source, observations or outcome, and stable operation identity. Consume those results in the planner and render chat, timeline and copied artifact from the same selected plan. Reject approval for a superseded plan and prevent duplicate execution of the same approved action.

Separate command intent from incidental words. `What is a guest code?`, `Don't make the guest code`, `not yet`, and `make the guest code` must not all invoke the same action. A broad substring plus more exceptions is not an adequate contract. Preserve user input verbatim; describe automatic steps as helper actions. Handle an unsupported or ambiguous request with a clear clarification and no consequential action. Deterministic intent handling is acceptable for this scoped simulation; do not label it an unrestricted language model.

The browser bridge is plain JSON HTTP at `/demo/call`, separate from the actual MCP protocol at `/mcp`. Keep that distinction honest. Fix the local cross-origin health probe, allow only the intended local origins, validate request shapes and return structured client errors. An unavailable bridge may offer a labelled mock continuation; an attempted action failure must never become an unlabelled successful mock result. Verify actual HTTP MCP negotiation as well as the browser path. Lock the verified dependency set and align the declared SDK support range with tested imports.

**Acceptance cases - demonstrate behaviour, not source-code strings**

| Case | Required evidence |
|---|---|
| Refusal | Start Doorstep; enter `Don't make the guest code` and `not yet`. No action or simulated notification. Exact utterance remains visible. |
| Information request | `What is a guest code?` explains the sample artifact without creating it. |
| Changed facts | Make the neighbour unavailable. Recipient/action/timing change consistently in proposal, explanation and artifact. |
| Uncertain evidence | A mismatched order or insufficient event evidence prevents a confident identity claim and triggers clarification. |
| Approval | Current explicit approval executes once. A repeated approval is idempotent. Approval for a superseded proposal is rejected. |
| Failure | Inject tool failure/unavailability. No false success; actual source and recovery choice are visible. |
| State | Doorstep -> Bedtime -> Doorstep resumes the correct state. `Try the other story` works both ways. Fresh reset does not inherit a prior backup choice; reload/resume follows the documented synthetic-state policy. |
| Real result propagation | Change a tool response. The plan and artifact change accordingly, rather than merely changing the timeline's meta text. |
| HTTP | MCP negotiates an accepted version, lists tools and calls one over HTTP. Valid local browser health/call works; disallowed origins and malformed bodies receive controlled responses. |
| User experience | Both stories reach honest outcomes using keyboard and pointer. Check desktop and 390 x 844, light/dark, reduced motion, visible simulation label, and readable copy/print output. |

Use focused unit tests for transitions/planning and real browser tests for routing, transcript, switching and outcomes. Keep the existing 46-test baseline where it protects valid behaviour; replace tests that freeze incorrect copy or only prove implementation fragments exist. Do not claim accessibility compliance from the presence of ARIA attributes alone.

**Presentation and delivery, after behaviour is proven**

Keep the current typography and themes. Lead with the household problem and next decision. Preserve both story entry points, but remove internal instructions such as "same weight" from product copy. Consolidate duplicate progress chrome, make tool details inspectable on demand, and make recipient/action/time/status more prominent than an internal ID. Keep the simulation marker visible on mobile.

Reconcile duplicate root assets/docs against the files actually loaded by `index.html`; remove stale copies only after reference checks. Correct the GitHub description and feedback drafts to match the current product when authorised. Product feedback must describe tools actually used; friction entries must be factual.

Prepare the Pages correction: the reviewed deployment failed in Configure Pages with a missing Pages site. Verify repository Pages configuration and the workflow's intended source; do not rewrite deployment infrastructure or weaken permissions to work around it. Prepare a clean app-only recording from the accepted build, targeting 2:30-2:45. Show the problem in the first 10 seconds, adaptation and refusal in the middle, and approval plus visible outcome by the end. Use a short Bedtime/resume segment to show shared context. The linked YouTube upload and checked-in MP4 are different stale recordings and both need reconciliation.

Carry forward existing user authorisations. Do not submit to Devpost, incur spend, change external access, publish a replacement video or make other external commitments without the specific authorisation required in the current session. Prepare and verify the concrete result first. Keep any such external step explicitly pending if it is not authorised.

**Return to Codex for review**

Return one concise evidence pack: branch and exact SHA (or uncommitted diff), spec paths, changed files, actual test commands/results, a pass/fail entry for every acceptance case, screenshots or recording of adaptation/refusal/approval, HTTP protocol and bridge evidence, dependency versions, actual Pages/CI state, and any remaining external publication step. Include measured credit use if available; otherwise state that it is unavailable.

Do not equate task checkmarks, screenshots, a fixed artifact ID or green CI with a complete working demo. Stop this batch at a reviewable implementation and evidence pack. Explain any failed or blocked criterion plainly. Do not start another redesign or feature branch without a new priority decision.
