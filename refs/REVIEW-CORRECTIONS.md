**Feature 003 re-review: changes still required.** Several earlier failures are fixed, but the feature does not yet meet its consent, error recovery, result propagation and uncertainty gates.

Reviewed on 5 September 2026, Africa/Johannesburg. Fix: `72749e01a1200e99a420bfffb83bc54bc63fb0c2`. Reviewed tip: `677a432b50c6dedcafc67e24ace78b2b9572abf9`. Source checkout: `/private/tmp/ops-concierge-review-003-corrections`, detached and unchanged.

**Verified improvements**

- Local suite: **65 passed in 1.53s** using `/private/tmp/ops-concierge-audit-venv/bin/python -m pytest tests/ -q -p no:cacheprovider`. This reused the audit environment; it was not a fresh lockfile installation. [CI at the reviewed tip](https://github.com/tkomane/ops-concierge/actions/runs/33925087863) succeeded.
- The supplied `refs/probe-003.cjs` was rerun successfully. The exact old availability question and conditional phrase no longer approve; the explicit plan target survives classification; typed false observations and the tested mismatch/all-failed Doorstep cases behave as reported; structured HTTP 500 errors no longer become mock success.
- Independent browser checks passed for fresh Bedtime via the initial suggestion, Mira-unavailable adaptation to the automation alternative, superseded-plan rejection, the exact availability question without actions, reload preserving transcript/timeline/card, repeated completed approval without additional timeline actions, and Bedtime -> new Doorstep -> Bedtime preserving the original history.
- The simulation marker is visibly present at **390 x 844**, verified by rendered visibility and screenshot. The full themes/reduced-motion/print matrix remains incomplete, as the pack acknowledges.

**1. Conditional commands still authorize immediate action - P1**

Browser reproduction at 00:31 SAST: fresh Bedtime -> `Mira is unavailable` -> `Go ahead if Mira confirms`. The app immediately ran `notify.household` and `task.open`. No confirmation from Mira had been provided. The prior `Approve plan_1` was correctly rejected, and `Confirm whether Mira is available` correctly caused no action.

Additional classifier probes classify `Go ahead if the parcel is ours`, `Do it after Mira confirms`, `Yes, approve if Mira is available`, and `Approve plan_1 when Mira confirms` as approval. [intent.js lines 143-154](https://github.com/tkomane/ops-concierge/blob/677a432/js/intent.js#L143) retain open-ended prefix matches, while the conditional guard catches only selected approval spellings.

Correction gate: allow only complete, supported unconditional approval utterances and valid current-plan targets. Unrecognised suffixes/conditions should clarify without actions. This can remain deterministic; a broader language engine is unnecessary.

**2. Dropped responses still become mock success, and partial retries duplicate notification - P1**

The new structured-JSON failure path works. A fetch rejection after the POST is dispatched still reaches [mcp-client.js line 168](https://github.com/tkomane/ops-concierge/blob/677a432/js/mcp-client.js#L168), returns null, and falls through to mock execution because approval actions use `requireBridge:false`. The probe recorded the attempted POST, then observed `mockCalled:true`, `ok:true`, `source:mock` and `queued:true`.

A second probe ran the actual client, runner, approval coordinator and store with a successful notification followed by a failed task. First result: notify count 1, task count 0. After retrying approval: notify count **2**, task count 1. Call order was notification, task, notification, task. The UI promises that retry will not resend, but [handleApprove](https://github.com/tkomane/ops-concierge/blob/677a432/js/app.js#L1894) calls notification again without checking completed operations.

Correction gate: distinguish not-started from attempted-but-unknown execution. Preserve an attempted failure even when there is no usable response body. Track completed operations per plan and reuse stable operation identities so retries resume the unfinished step, including after reload. Counts alone do not enforce idempotency.

**3. The tool contract still stops at the client; the artifact still reports false confirmation - P1**

Actual localhost HTTP checks used the production client and runner against this tip's running MCP demo bridge. The requests included plan ID, recipient, role, action, timing and operation ID. [Backend dispatch](https://github.com/tkomane/ops-concierge/blob/677a432/mcp_server/tools.py#L155) silently filters those fields out because the notification/task handlers do not accept them. The results remain generic fixture outputs and use newly generated operation IDs.

The same real HTTP inspection calls all succeeded, but their results do not supply the typed event observations consumed by the planner. The runner substitutes summaries such as `HIT ring-front-door / zone: stoop`; passing these actual results to the production planner yields `ask_clarification` for the normal Doorstep fixture. The mock and bridge contracts are still different.

Independently, the browser showed `TASK-22018 draft` in the tool timeline and described the backend status as draft, while the rendered/copyable artifact said `Status: confirmed`. [app.js line 1955](https://github.com/tkomane/ops-concierge/blob/677a432/js/app.js#L1955) forces the proposal status to confirmed and stores the returned status in `artefactStatus`, but [ticketText](https://github.com/tkomane/ops-concierge/blob/677a432/js/app.js#L1054) and the card still read `plan.status`. The saved production-function probe reproduces the same inconsistency.

Correction gate: implement the agreed contract at both producer and consumer. Verify changed plan inputs affect the returned action outcome, usable inspection fields reach planning, and artifact identity/status come from that result. If approval state and execution state are separate concepts, label and render them separately; a draft card must remain a draft card in the board, copied text and print output.

**4. Missing evidence still produces approvable plans - P1**

Production planner/store probes returned `approve.ok:true` for all of:

- Doorstep with no results.
- Doorstep with `motion:false`, `parcelVisual:false`, and no order evidence.
- Doorstep with a positive door event but failed order lookup.
- Bedtime with every inspection read failed.

The corrected [Doorstep guard](https://github.com/tkomane/ops-concierge/blob/677a432/js/planner.js#L237) handles selected combinations, but empty results bypass it and positive partial evidence can bypass failed required reads. [Bedtime planning](https://github.com/tkomane/ops-concierge/blob/677a432/js/planner.js#L329) still ignores evidence failure and supplies its usual action.

Correction gate: define the minimum usable evidence for each existing story. Missing/unknown/failed required inputs must yield a non-approvable clarification or recovery state. Keep tests for both stories and empty, negative, partial-failure and all-failure results.

**Evidence scope and acceptance**

The retained [probe](probe-corrections.cjs) and [results](probe-results.json) distinguish injected responses from actual localhost HTTP. Fault/retry probes execute unmodified production functions with UI/timer stubs. Browser interaction used the normal mock demo. A browser-to-live-bridge fault-injection run was not performed, and no claim of one is made.

| Gate | Re-review result |
|---|---|
| Exact refusal/information examples | Passing regression tests; exact availability question also verified in browser |
| Changed facts | Named caregiver/neighbor cases improved; full result contract still fails |
| Uncertain evidence | FAIL: missing/failed evidence gaps remain |
| Approval | PARTIAL: stale target and repeat completion fixed; conditional consent still fails |
| Failure/retry | FAIL: dropped response fallback and duplicate partial retry |
| State | PASS for independently tested fresh start, reload and both story directions; partial-operation persistence still needs work under failure/retry |
| Real result propagation | FAIL: backend discards plan fields and artifact status remains wrong |
| HTTP transport | PASS for the existing suite; application contract fails despite HTTP success |
| User experience | PARTIAL: mobile marker verified; full remaining matrix incomplete |

The next work is [GROK-NEXT-CORRECTIONS.md](GROK-NEXT-CORRECTIONS.md). These are remaining requirements from the existing feature, not new feature scope. Keep the fixes that passed.

[Pages at this tip](https://github.com/tkomane/ops-concierge/actions/runs/33925087985) still failed. Pages correction, new demo video and Devpost Submit remain held. No application source, repository publication or external submission was changed by this review.
