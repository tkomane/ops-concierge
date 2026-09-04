**Feature 003 review: changes requested.** The original refusal bug and backend transport checks have improved, but the app still fails consent, result propagation, uncertainty and resume requirements. The evidence pack overstates acceptance.

Reviewed on 4 September 2026, Africa/Johannesburg. Feature: `4947de4109c7a00da36f08f415085b909192d19d`. Evidence tip and independently rechecked remote `main`: `e2798c988c93beea97749f97811d8be30dcbdf9f`.

Review used an isolated detached checkout at `/private/tmp/ops-concierge-review-003`. No application source was changed. Pages correction, replacement video and Devpost submission remain held.

**Verified progress**

- Local suite: **65 passed in 1.43s**, including the Node suite wrapper and HTTP MCP tests. Command: `/private/tmp/ops-concierge-audit-venv/bin/python -m pytest tests/ -q -p no:cacheprovider` from the review checkout. This reused the audit environment; it was not a fresh `uv sync --frozen` reproducibility test.
- [CI for the exact tip](https://github.com/tkomane/ops-concierge/actions/runs/33922088621) succeeded. [Pages for that tip](https://github.com/tkomane/ops-concierge/actions/runs/33922088595) failed. The held Pages action is separate from these implementation findings.
- The browser preserved `Don't make the guest code` verbatim and created no action for it. The specific neighbour-unavailable path changed the displayed recipient to Mira, action to `defer_handoff_parent`, and timing to 18:20-18:45 SAST.
- Top-bar Doorstep and Bedtime starts both ran inspection and produced proposals. The new state/planner boundaries, structured backend errors, CORS validation and clearer sample-reference wording are useful work to retain.

**1. Approval still accepts the wrong intent and wrong plan - blocking**

Browser reproduction at 23:48-23:49 SAST: start Doorstep; say `The neighbour is unavailable`; observe that `plan_1` is explicitly superseded; send `Approve plan_1`. The app performed both `notify.household` and `task.open` and confirmed the newer Mira plan. It did not reject the stale target.

Browser reproduction at 23:51 SAST: with a draft Bedtime proposal, send `Confirm whether Mira is available`. This also ran both actions and confirmed the card. A separate classifier probe classified `Approve only if the parcel is ours` as unconditional approval.

Causes: [intent.js line 127](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/intent.js#L127) accepts any leading `approve` or `confirm`; [app.js line 1646](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L1646) always passes the selected plan ID to the store and ignores an explicit target in the utterance. The store's direct stale-ID test therefore does not prove the UI requirement.

Required correction: preserve the requested plan target through classification and dispatch. Questions and unresolved conditions must not authorize an action. Reject unknown/superseded IDs, and verify current-plan execution and repeat approval by counting actual action calls.

**2. A failed bridge mutation still becomes successful mock execution - blocking**

A boundary probe loaded the actual `js/mcp-client.js` and unmodified production `runTool` function. Health returned success; the attempted notification returned HTTP 500 with `ok:false`, `source:bridge`, an operation ID, `bridge_failure`, and `fallback:none`. Actual result: the mock callback ran, the tool returned `ok:true`, `source:mock`, `error:null`, `outcome.queued:true`, and the timeline became successful.

This is a production-function probe with injected fetch responses and UI/timer stubs, not a full browser HTTP fault-injection test. The inputs and output are retained in [probe-003.cjs](probe-003.cjs) and [probe-003-results.json](probe-003-results.json).

Causes: [mcp-client.js line 76](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/mcp-client.js#L76) collapses HTTP/tool failures into `null`; [app.js line 812](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L812) falls through to mock; both approval actions use `requireBridge:false`. The mock source suffix does not communicate that an attempted bridge action failed or provide a recovery choice. The capture script's force-fail hook returns before the real client path and misses this failure.

Required correction: preserve errors, source and operation identity from transport through the action result. Distinguish an unavailable bridge before execution from a failed or uncertain attempted mutation. Do not retry the latter as a successful mock action. Verify notification-success/task-failure and retry without duplicating the successful step.

**3. Tool facts do not determine the decision or reported outcome - blocking**

Reproducible module probes show:

- Changing calendar observations from an 18:00-18:30 window with neighbour available to a 20:00-20:30 window with neighbour unavailable leaves the recipient, action and timing unchanged.
- Explicit `motion:false` and `parcelVisual:false` are interpreted as positive evidence because the field names occur in a JSON string search.
- Mismatched order evidence produces a normal actionable draft; `store.approve` accepts it. All failed inspection results also produce an actionable proposal, including the invented observation `simulated household inspection complete`.

The UI also mishandles supported changed facts: start Bedtime using the top button; send `Mira is unavailable`. The response says the neighbour is unavailable and retains Mira, `caregiver_nudge`, and 19:15-19:30. [app.js line 1588](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L1588) maps every replan request to the same neighbour facts. [planner.js line 81](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/planner.js#L81) searches strings rather than interpreting typed observations, and its decision branches use fixed recipients/windows.

Execution has the same disconnect. [app.js line 763](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L763) sends only the scenario for notification/task calls, omitting the chosen recipient, action, timing, plan and operation identity. The backend [task result remains `draft`](https://github.com/tkomane/ops-concierge/blob/e2798c9/mcp_server/tools.py#L131), while [the UI unconditionally reports confirmed](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L1738) after any successful task response. The latter mismatch is established by source inspection; a live browser bridge success path was not independently rerun.

Required correction: consume a small typed result contract, carry the selected plan into action arguments, and derive status from returned outcomes. Treat missing/failed/mismatched evidence as a real clarification or recovery state. Updating explanation text alone does not satisfy this gate. Reconcile all displayed summaries and backups with the selected plan; the unavailable Thabo still appeared as a backup in the observed Mira outcome.

**4. Fresh start and persistence are not integrated - blocking**

Browser reproduction at 23:46-23:47 SAST: from the initial screen, click `Start bedtime` in suggestions. The app claims to resume an earlier plan, shows `No steps yet`, and answers `Make the bedtime task` with `Nothing to approve yet`. [app.js line 1412](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L1412) returns early whenever `resume` is requested, including a newly created session with no plan. `Try the other story` uses the same unconditional resume route.

Browser reproduction at 23:50 SAST: after an approved Doorstep outcome and six timeline steps, reload through the home link. The confirmed card returns, but the transcript is replaced with a welcome-back message and the timeline says `No steps yet`.

Cause: [app.js line 157](https://github.com/tkomane/ops-concierge/blob/e2798c9/js/app.js#L157) writes UI messages/tools into a cloned snapshot in localStorage; callers immediately run `store.save()`, overwriting it from the unchanged in-memory store. Normal hydration also does not restore/reset `lastResults`, creating a source-level risk of cross-story evidence reuse.

Required correction: make the store own the complete resumable session, including evidence and action state. Resume only an existing resumable story; inspect a new one. Verify reload, both switching directions, fresh reset and failure recovery through the visible UI. Persist or safely regenerate identifiers so a reload cannot reuse a historical plan/operation ID.

**Evidence-pack acceptance correction**

| Case | Review result | Basis |
|---|---|---|
| Exact refusal cases | PASS, focused | Browser confirmed the original refusal; `not yet` is covered by the passing Node suite. This does not establish general consent correctness. |
| Information request | PASS, focused | Classifier tests and the side-effect-free `handleAskInfo` path cover the exact guest-code question. Broader availability questions fail finding 1. |
| Changed facts | PARTIAL | Exact neighbour case works; caregiver routing and tool-driven facts fail. |
| Uncertain evidence | FAIL | False observations are treated as positive; mismatch does not enforce clarification. |
| Approval | FAIL | Browser accepts a superseded target and an information request. Direct store tests are insufficient. |
| Failure | FAIL | The real client/runner boundary converts an attempted bridge failure to mock success. |
| State | FAIL | Initial suggestion and reload fail in the browser. |
| Real result propagation | FAIL | Decision/action/status gaps remain despite changed display text. |
| HTTP | PASS for backend; browser integration incomplete | Local suite exercised real MCP HTTP and bridge validation. Browser failure handling is separately defective. |
| User experience | INCOMPLETE | Full mobile, light/dark, reduced-motion and copy/print checks were not rerun. CSS still hides the top simulation badge below 900 px. Entry-path failures also remain. |

The [capture script](https://github.com/tkomane/ops-concierge/blob/e2798c9/refs/capture-evidence-003.py#L141) checks only story IDs when switching; it does not require a usable proposal or preserved transcript. Its repeat-approval check looks for a chat phrase rather than verifying action counts. Its injected failure bypasses the client. These checks explain how the reported run can pass while the actual acceptance conditions fail. `PASS (partial)` should be replaced with an explicit partial/incomplete result.

The next assignment is [GROK-CORRECTIONS-003.md](GROK-CORRECTIONS-003.md). Complete these existing feature gates before recording or publishing. Preserve the working stack and transport work; no new feature scope is needed.
