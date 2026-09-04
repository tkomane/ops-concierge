**The operation-ID correction at `e279f10` passes re-review. The previously reported retry P1s are closed in the tested scope. Complete print-output verification remains outstanding.**

Reviewed on 5 September 2026, Africa/Johannesburg. Fix: `c6ac61f38c618b4c05a8984932e318d67e1ef240`. Reviewed tip and independently checked live `main`: `e279f10c82ed5ee30650be28406ac283e9bebd10`. Detached checkout: `/private/tmp/ops-concierge-review-003-op-id`. Application source and the original checkout remain unchanged and clean.

The client, runner and approval coordinator now retain the dispatched client operation ID; mismatched response IDs are diagnostic fields. The bridge exception handler echoes a valid request ID in its HTTP 500 response. The diff addresses the reported failure without removing the bridge-source binding.

Independent verification:

- **70 repository tests passed in 4.14s**, using the existing audit Python environment, including Node behavioural regressions and HTTP tests. [CI at this exact tip succeeded](https://github.com/tkomane/ops-concierge/actions/runs/33929955087).
- **Eight stable-ID sequences passed against the old mismatched error bodies**, proving the frontend correction independently of the server fix. These cover notification/task, ordinary 500 or unknown-response then 500, and immediate/reloaded retries.
- **The same eight sequences passed with freshly captured HTTP 500 bodies** from the production route. Both notification and task error responses echoed their original request IDs.
- Across all 16 sequences, outgoing request IDs and persisted IDs stayed stable. Unknown disposition survived intermediate errors; diagnostic response IDs remained separate. Final counts were notify=1/task=1.
- **Eight no-mock/recovery cases passed** across both tools, immediate/reloaded retries, and an unavailable bridge or disabled client. Repeated unavailable retries preserved uncertainty and produced zero mock successes. Recovery used the original ID; repeating completed approval sent no further POST.

The fault probes use unmodified production client, runner, coordinator and store functions with injected fetch responses and UI/timer stubs. Bridge exception responses were captured using Starlette TestClient and an injected dispatcher exception. These results do not represent a browser-to-live-bridge network-cut test. No new browser sweep was performed in this review.

**Print evidence does not yet support a complete PASS.** I inspected the supplied `print-ticket.png`: it shows the guest card heading and upper content, but cuts off within Observations. It cannot establish that the remaining observations, assumptions and footer print completely or paginate correctly. `visual-check.json` also records `print_sample.ticketVisible: false` while declaring print PASS, without explaining the sampling sequence. This is an evidence gap, not a demonstrated printing defect.

The supplied reduced-motion evidence supports a focused Doorstep smoke check: approval reached `acted`, and five sampled buttons reported near-zero animation/transition durations. It was not independently rerun. The previous light/dark desktop/mobile review remains applicable to the unchanged CSS/theme files. Native print-dialog automation is not required to close the output-evidence gap; a complete paginated export can establish it. See [PRINT-VALIDATION.md](PRINT-VALIDATION.md).

Retained results: [legacy errors](operation-id-legacy-errors.json), [current errors](operation-id-current-errors.json), [no-mock/recovery](no-mock-results.json), and [production HTTP error captures](bridge-error-responses.json). Review scripts are alongside these files; the old error fixture is retained as `bridge-error-responses-legacy.json`.

Pages correction, new demo video and Devpost Submit remain held. [Pages deployment at this exact tip failed](https://github.com/tkomane/ops-concierge/actions/runs/33929955144). No deployment, publication or source fix was performed.
