**Re-review of `e246503`: one blocking retry case remains in the tested acceptance set.** The previous conditional-consent cases, four missing-evidence cases, ordinary partial retry and artifact-status failures now pass. Full acceptance is still pending.

Reviewed on 5 September 2026, Africa/Johannesburg. Feature fix: `89fe12787c7f4c3f39bb7b74beff34572e6a1a60`. Reviewed tip: `e246503926db0ff98849b1f7c20cb742d5327e7c`. Detached checkout: `/private/tmp/ops-concierge-review-003-next`. No application source was changed.

**Verified corrections**

- **67 tests passed in 1.54s** with `/private/tmp/ops-concierge-audit-venv/bin/python -m pytest tests/ -q -p no:cacheprovider`. This reused the audit environment. [CI for this exact tip](https://github.com/tkomane/ops-concierge/actions/runs/33927213150) succeeded.
- The four conditional phrases from the last review classified as information requests. Independent browser entry of all four left the action timeline unchanged. Explicit `approve` then ran notification and task.
- All four prior uncertainty probes now reject approval: no Doorstep results, false door event without order evidence, failed order lookup, and all-failed Bedtime inspection.
- A first dropped response after POST returns `unknown_after_dispatch` with `attempted:true` and no successful mock fallback.
- Notification-success/task-failure retry now calls notification, task, task. Counts finish at notify=1/task=1. Recreating the client/store from saved state before retry produces the same correct result and reuses the pending task operation ID.
- Actual localhost HTTP calls through the production client/runner now return typed observations; the normal bridge Doorstep results produce an actionable handoff proposal. Notification/task results consume the requested plan fields and retain the requested operation IDs.
- The browser and production artifact renderer both show `Status: draft` and `Approval: confirmed` after a draft tool result. Browser reload preserved the transcript, timeline and card.

**P1: retrying an uncertain bridge operation silently completes it through mock results**

Reproduction using the actual client, runner, approval coordinator and session store:

1. Approve a valid current plan. Health succeeds; notification POST is dispatched; the connection loses its response.
2. The first attempt correctly reports `bridge_unknown_after_dispatch`, marks the phase failed, and records notification progress as `failed` with operation ID `op_notify_household_1`.
3. Leave the bridge unavailable and approve again.
4. The app performs notification and task through mock callbacks, marks both operations done, and reaches `acted`. The notification reuses the unresolved bridge operation's ID. There was no successful bridge response.

Both immediate retry and retry after recreating the client/store from persisted state fail this check. On immediate retry, cached unhealthy state prevents another network call. After reload, the new health probe fails. In both cases the final counts are notify=1/task=1, sourced from mock results.

The first-attempt fix is correct; it does not survive the next attempt. [mcp-client.js line 107](https://github.com/tkomane/ops-concierge/blob/e246503/js/mcp-client.js#L107) returns null when health is unavailable. [runTool line 882](https://github.com/tkomane/ops-concierge/blob/e246503/js/app.js#L882) blocks fallback only when a bridge requirement is set. [The retry coordinator](https://github.com/tkomane/ops-concierge/blob/e246503/js/app.js#L1944) still supplies `requireBridge:false`; [saved failure progress](https://github.com/tkomane/ops-concierge/blob/e246503/js/app.js#L1954) does not retain the execution source or unknown disposition needed to enforce the earlier attempted failure.

Required correction: keep an attempted or uncertain operation bound to its original execution source until resolved. Persist its source and uncertainty, then enforce that on every retry and after reload. An unavailable bridge must leave the operation unresolved and perform zero successful mock actions. Preserve stable IDs and the working resume of a known successful notification followed by a failed task. A new mock demonstration, if offered, must not resolve the earlier uncertain operation.

**Evidence and remaining checks**

Run [probe-next.cjs](probe-next.cjs) with the checkout path. [probe-results.json](probe-results.json) retains the exact inputs, results, operation progress and request counts. The relevant cases are `unknownRetry` and `unknownRetryAfterReload`; `retry` and `retryAfterReload` demonstrate the corrected ordinary failure path. These fault cases use injected fetch responses with unmodified production functions and UI/timer stubs. The contract checks use the actual localhost bridge. Browser checks used the normal mock demo; no browser-to-live-bridge network-cut test is claimed.

The evidence pack still marks the themes/reduced-motion/print matrix incomplete and calls it held in one row. Those verification checks remain authorized within the existing acceptance scope. Only Pages correction, the new demo video and Devpost Submit are held. [Pages at this tip](https://github.com/tkomane/ops-concierge/actions/runs/33927213182) still failed; no deployment or publication action was taken.

The next bounded assignment is [GROK-RETRY-CORRECTION.md](GROK-RETRY-CORRECTION.md). Preserve the fixes that passed and close the uncertain-operation retry path before claiming full acceptance.
