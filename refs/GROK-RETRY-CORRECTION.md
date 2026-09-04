**Close the remaining uncertain-operation retry path from `e246503`.**

Codex reran the suite: 67 passed. Conditional consent, the four previous evidence gates, normal partial retry (also after reload), bridge plan fields/typed observations, and draft artifact status now pass the targeted review. Preserve these fixes.

The remaining P1 is reproduced in `probe-next.cjs` under `unknownRetry` and `unknownRetryAfterReload`:

1. Health succeeds; notification POST loses its response.
2. First approval correctly fails as `unknown_after_dispatch`.
3. With the bridge unavailable, approve again, immediately or after reload.
4. The app completes notification and task through mock results and reaches `acted`, reusing the unresolved notification operation ID.

Persist the operation's original source and unknown disposition. Bind retries to that source and prevent mock fallback when health is unavailable, even though a new POST was not sent on that retry. Keep the operation unresolved, with zero successful mock actions, until its outcome can be resolved. Preserve stable operation IDs and the already-working notification-success/task-failure resume. Cover both notification and task uncertainty through this same rule.

Keep this to a focused integration correction. Run the probe and regression suite, retain actual request/result counts, and finish the already-authorized themes/reduced-motion/print checks. Return the exact SHA and an honest acceptance table. Pages correction, the new demo video and Devpost Submit remain held. No new feature or redesign is needed.
