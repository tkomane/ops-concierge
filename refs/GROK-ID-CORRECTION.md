Close the stable-operation-ID regression from `main` at `03bc162a3582af07c15d1ee35822b9f58113db4f`.

The uncertain-operation source binding passes the reviewed no-mock cases. Preserve it. The changed notify/task failure handlers now replace the original request ID with a response ID. The production bridge's exception handler returns a fresh ID with HTTP 500. Ordinary task retry therefore changes `op_task_open_2` to the response ID. An unknown POST followed by a 500 does the same while preserving `disposition: unknown`; later success under that different ID completes the plan.

Eight cases fail at this tip and pass at `e246503`: both tools, structured error with or without an earlier unknown POST, immediate retry or reload. Existing counts still reach 1/1 and do not detect the regression. The committed `refs/probe-next-results.json` already shows task requests changing from `op_task_open_2` to `failed_task`.

Keep the original client operation ID immutable through failure, persistence and retry. Store any diagnostic response identifier separately. Ensure valid bridge error responses preserve the request's operation identity. Test the outgoing request IDs and saved progress through the entire sequence, especially unknown response then HTTP 500 then success, for notification and task before and after reload. Preserve completed-notification skipping and zero mock resolution of bridge-bound operations.

Use [REVIEW-RETRY.md](REVIEW-RETRY.md), [probe-operation-id.cjs](probe-operation-id.cjs), and the captured bridge errors. Rerun focused probes and the suite, then record actual IDs and counts in the evidence pack.

Finish the authorized reduced-motion and print visual checks. Theme smoke checks passed in this review. Only Pages correction, new demo video and Devpost Submit remain held. No new feature or redesign is requested.
