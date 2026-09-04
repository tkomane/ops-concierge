# Ops Concierge - architect review

Reviewed on 4 September 2026, Africa/Johannesburg. Repository: [tkomane/ops-concierge](https://github.com/tkomane/ops-concierge), `main` at `b264922a1b67952b16902cb3752dacd2df92f99d`.

**Recommendation:** keep the household direction and existing visual foundation. Spend the next batch on a helper that adapts to a changed situation, respects consent, and produces a trustworthy outcome. More cosmetic improvement rounds would have a lower return now.

The working assumption is hackathon-first, with reusable behaviour that can support a later product. This review makes no claim about demand, prize probability, or production readiness. Application source and GitHub settings were not changed.

**What is already worth keeping**

- The project has a clear Alexa+ simulation identity, two household scenarios, an MIT license, a public repository, and a simple static entry point.
- The interface has useful foundations: light/dark themes, keyboard controls, readable conversation, escaped dynamic text, and a visible execution timeline. These deserve targeted refinement rather than another redesign.
- All **46 existing tests passed locally** with Python 3.12 and MCP SDK 2.1.1. The latest [hosted CI run](https://github.com/tkomane/ops-concierge/actions/runs/33917761992) also succeeded.
- The MCP implementation is real. A localhost HTTP test negotiated **2025-11-25**, listed all six tools, and successfully called `session.ack`. No live household integration was involved.
- Both browser scenarios reached their expected sample artifacts. The central weakness is what happens outside the scripted route.

**The contest changes the engineering priorities**

The official rules explicitly exempt the Alexa+ simulation alternative from the runtime technology hook: no specific SDK or MCP surface is required. Submission closes **23 October 2026 at 21:00 SAST**. Technical implementation, design, impact, and idea quality carry equal weight; credible friction logs can add up to 10%. [Official rules, sections 1, 4 and 6](https://amazonappdev2026.devpost.com/rules)

The MCP spec's claim that the track requires a server is therefore incorrect for the selected simulation route. Keep the working server as useful supporting evidence; expanding it is optional. A public MIT repository also makes the Open Source mini challenge worth assessing using existing work, without starting another feature programme. [Competition overview](https://amazonappdev2026.devpost.com/)

**Findings that should drive the next batch**

| Priority | Finding and evidence | Required outcome |
|---|---|---|
| P1 | **Refusal becomes approval.** In the live local UI, start Doorstep and enter `Don't make the guest code`. It runs through planning and creates `GUEST-10421`. The transcript replaces the refusal with synthetic user messages, including `Make the guest code.` The broad substring routing precedes any refusal handling. [Routing](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L1299), [creation](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L1184). | Preserve the actual utterance. Separate asking about an action, proposing it, approving it, and declining it. Refusal must leave the proposed action unexecuted, including simulated notifications. |
| P1 | **The demo does not yet demonstrate substantive adaptation.** Tool calls return results, but the caller generally discards those results and renders predefined scenario fields. `correlate()` asserts the parcel match; `calendar.propose` supplies a fixed window; `session.ack` echoes an ID without storing household state. [Tool runner](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L627), [correlation](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L1102), [handlers](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/mcp_server/tools.py). | Changed facts must change the proposed plan and artifact. Derive the visible explanation from actual tool results. A deterministic simulation can demonstrate this without a paid model. |
| P1 | **Session promises contradict behaviour.** Switching stories clears messages/tools and assigns a new session ID while claiming the previous artifact remains in memory. `Try the other story` always starts Bedtime, including from Bedtime. Selecting a backup mutates the global scenario object: after starting Doorstep fresh, I reproduced the old backup as the new default. [Reset](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L981), [mutation](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L1240), [switch routing](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L1362). | Isolate immutable fixtures from mutable sessions. Make resume and reset distinct, honest operations. Switch in both directions without leaking selected plans between fresh runs. |
| P1 | **The public evidence is behind the implementation.** The [demo URL](https://tkomane.github.io/ops-concierge/) returns HTTP 404. [Pages run 33917761828](https://github.com/tkomane/ops-concierge/actions/runs/33917761828) fails at Configure Pages with `Get Pages site failed` / `Not Found`; upload and deployment are skipped. The linked [YouTube video at 1:19](https://www.youtube.com/watch?v=0T5SdmE_Aek&t=79s) shows the former Hybrid estate / Incident board interface. The checked-in MP4 is a different recording: 173.67 seconds, with an unrelated Gmail screen at 00:15 and older household UI at 01:40. | Prepare the Pages configuration correction and a clean video of the reviewed build. Verify the actual published page and final video URL after any authorised publication. A green static CI job does not prove either is current. |
| P2 | **The optional browser bridge cannot pass its documented cross-origin health probe.** Actual HTTP `/healthz` returns 200 but no `Access-Control-Allow-Origin` for the UI at port 8765. Browser fetch therefore cannot expose that response to the client, which silently falls back. `/demo/call` itself accepts an untrusted Origin with wildcard CORS. Missing `session_id`, numeric `zone`, and a JSON array body each produced HTTP 500 in ASGI checks. [Health and bridge](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/mcp_server/server.py#L69), [client](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/mcp-client.js#L29). | Apply a deliberate local-origin policy to the bridge and health route, validate request shapes, and return structured 4xx errors. Show actual execution source and failures. These endpoints currently operate on mock data; this is not evidence of exposure of real household systems. |
| P2 | **The headline outcome overstates what exists.** `GUEST-10421` is a fixed sample document identifier, not an implemented access credential. The card says Ring-verified; correlation text treats an expected parcel as proof that a visitor is not a stranger. The proposed collection window is also disconnected from the courier's immediate arrival. [Scenario](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/scenarios.js), [rendered claim](https://github.com/tkomane/ops-concierge/blob/b264922a1b67952b16902cb3752dacd2df92f99d/js/app.js#L801). | Present a simulated handoff plan, its assumptions, recipient, timing, and confirmation state. Do not infer a visitor's identity from a box shape or delivery ETA. Distinguish a prepared plan from a completed handoff. |

P1 means essential before presenting this as a dependable demonstration. P2 means bounded work that supports the same demonstration. Neither category implies that this mock should be turned into a production security product.

**Design direction**

At the inspected desktop viewport, three competing panes, two progress treatments, internal IDs, and repeated story buttons dominate the experience. Product copy such as "same weight" and "Both fill this board equally" exposes implementation instructions. The mobile view stacks those panes and hides the prominent simulation and helper-link badges. The compact desktop rules also hide useful explanatory copy. These observations come from the running app, including a 390 x 844 viewport; this was not a full accessibility audit.

Keep both stories accessible and preserve the themes. Put the household's situation and the next decision first: "Your parcel arrived during bedtime. Thabo can collect it. Send him the handoff plan?" Keep an inspectable tool trail in progressive disclosure. Show recipient, selected action, time and status above the sample reference ID. Keep the simulation label visible at every breakpoint. Measure whether an unfamiliar viewer can explain the problem and next action within 10 seconds.

**The strongest product move**

Connect the existing stories around one recognisable interruption: a delivery arrives while a caregiver is handling bedtime. The helper checks the simulated evidence, proposes an appropriate plan, adapts when the neighbour is unavailable, and waits for approval before a simulated notification. It then records an honest result and resumes the prior household context.

That gives judges a reason to care about orchestration. The impressive moment should be a changed decision caused by changed evidence. Adding another scenario, another animation pass, or more tool names would contribute less.

**Engineering guardrails for Grok**

- Keep static HTML/CSS/JS and the existing Python server. Introduce only the small state/planning modules needed to separate behaviour from rendering. A framework migration is not justified by these findings.
- Use one canonical fixture/result contract across the browser mock and Python handlers. Separate observations, proposal, approval and action outcome. Attach execution source, status and a stable operation ID to results.
- Preserve synthetic household context across story switches and a versioned, resettable demo resume path. Do not persist real household data or pretend a local demo session is cloud memory.
- Make the selected plan the source for chat, timeline, card and copy/print output. Approving an old proposal after a replan must fail. Repeating the same approval must not duplicate actions.
- Replace fragile string-presence assertions with behaviour tests where they currently assert correctness of consent, state, routing, or tool outcomes. Keep useful static checks. Passing 46 existing tests is a baseline, not the acceptance gate for these changes.
- Make dependency resolution reproducible. The reviewed environment resolved MCP 2.1.1; the current manifest permits a broad version range and has no committed lock file.
- Reconcile stale root copies of `app.js`, `app.css`, `scenarios.js`, CI YAML, and architecture docs against the actual entry points before removing anything. `PRODUCT_FEEDBACK.md` still says there is no live MCP server. Update feedback from verified experience only; do not manufacture friction or user research.

**Verification scope**

Inspected current source, specs, recent history, both remote branches, Actions state/logs, public-page HTTP status, real local UI, existing tests, HTTP MCP negotiation/list/call, bridge error responses, three frames from the committed video, and the linked video's visible state at 1:19. Remote `main` and `002-mcp-streamable-http` both pointed to the reviewed commit; no PRs or issues were present at inspection.

Not claimed: a full video/audio review, an anonymous-access test of YouTube, personal contest eligibility or Devpost submission state, live Amazon integration, production security, or a complete accessibility audit.

Use [GROK-BRIEF.md](GROK-BRIEF.md) as the next assignment. The review is complete; the implementation work described there remains for Grok.
