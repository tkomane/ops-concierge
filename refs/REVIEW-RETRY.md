**Re-review of `03bc162`: the unavailable-bridge mock fallback is fixed, but one P1 retry regression remains.** Full Feature 003 acceptance is pending.

Reviewed on 5 September 2026, Africa/Johannesburg. Fix: `c7a8551a0c88a56f9ae17d2738774a9483cd9063`. Reviewed tip and live `main`: `03bc162a3582af07c15d1ee35822b9f58113db4f`. Detached checkout: `/private/tmp/ops-concierge-review-003-retry`. Application source and the original checkout were left unchanged.

**P1: preserve the original operation ID when a bridge error returns another ID**

The changed failure handlers now save `notify.operationId || notifyOpId` and `opened.operationId || taskOpId`. This replaces the client's original operation ID with the response ID. The bridge's handler-exception path returns HTTP 500 with a newly generated ID, so this occurs with the production error contract.

The retained ordinary retry probe already reproduces the regression, both immediately and after reload:

1. Notification succeeds. Task request uses `op_task_open_2`.
2. A structured HTTP 500 response contains `operationId: failed_task`.
3. Retry sends task request ID `failed_task`, instead of `op_task_open_2`.

The stronger reproduction first loses a POST response, then receives a structured 500 on retry. The stored disposition remains `unknown`, but its original ID is replaced. The next attempt sends the replacement ID and reaches `acted` on success. Thus a success for a different operation identity resolves the earlier uncertain operation in local state.

This fails for **both notification and task**, with **immediate retries and reloaded state**. Eight stable-ID cases fail at `03bc162`; the same eight pass at baseline `e246503`. Action counts still finish at notify=1/task=1, which is why the count-only assertions miss the regression. The committed `refs/probe-next-results.json` also shows the changed task IDs despite the evidence pack claiming stable IDs were preserved.

Relevant code: [notification failure save, line 2020](https://github.com/tkomane/ops-concierge/blob/03bc162/js/app.js#L2020), [task failure save, line 2099](https://github.com/tkomane/ops-concierge/blob/03bc162/js/app.js#L2099), and [bridge handler-exception response](https://github.com/tkomane/ops-concierge/blob/03bc162/mcp_server/server.py#L237). Keep the originally dispatched client ID stable through all attempts; retain any separate diagnostic response ID separately. Add assertions on actual outgoing request IDs and persisted progress, including unknown-response then HTTP-500 sequences.

**Verified corrections and limits**

| Check | Independently observed result |
|---|---|
| Repository suite | 69 passed in 4.10s using the existing audit environment; no skipped tests |
| Hosted CI at reviewed tip | [Succeeded](https://github.com/tkomane/ops-concierge/actions/runs/33928521701) |
| Unknown retry with bridge unavailable or client disabled | Eight cases passed across both tools and immediate/reloaded state; two unavailable retries per case; zero mock successes |
| Recovery from those unavailable retries | Same original ID, bridge-sourced completion, counts 1/1, no new POST on repeated completed approval |
| Prior consent/evidence gates | Four conditional phrases remain information requests; four prior missing-evidence cases remain non-approvable |
| Actual localhost bridge | Health and six tool requests succeeded; typed observations and requested action fields propagated |
| Browser smoke checks | Doorstep approval, restored Bedtime approval, draft artifact with confirmed approval, and state restoration worked |
| Themes | Both stories inspected in light/dark at desktop and 390 x 844 mobile; theme survived reload; mobile Doorstep document width stayed 390 px |
| Reduced motion and print | Visual checks remain incomplete. Print invocation stalled browser automation; native capture failed. No usable print preview was obtained, so no print pass or product defect is asserted |

Fault probes execute unmodified production client, runner, coordinator and store functions with UI/timer stubs and injected fetch responses. [probe-bridge-error.py](probe-bridge-error.py) captures production route HTTP-500 bodies through Starlette TestClient with an injected dispatcher exception. Actual localhost HTTP success checks are separate. Browser checks used the local mock; a browser-to-live-bridge network cut was not tested.

Reproduction: run `probe-bridge-error.py` with the audit Python and checkout path to produce [bridge-error-responses.json](bridge-error-responses.json), then `node probe-operation-id.cjs CHECKOUT`. [Results](probe-operation-id-results.json) record the eight failures; [baseline results](probe-operation-id-baseline.json) record zero failures. [probe-retry-results.json](probe-retry-results.json) retains the eight passing no-mock cases, and [probe-next-results.json](probe-next-results.json) retains the earlier review probes.

The bounded next assignment is [GROK-ID-CORRECTION.md](GROK-ID-CORRECTION.md). Pages correction, new demo video and Devpost Submit remain held. [Pages deployment at this tip failed](https://github.com/tkomane/ops-concierge/actions/runs/33928521671). No release action was taken; review servers and tabs were closed and the viewport override was reset.
