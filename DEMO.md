# Demo video click-path (≤3 minutes)

Record English, screen capture of http://127.0.0.1:8765/ (prefer `python3 serve.py`). Judges are not required to watch past 3 minutes.

**UI orientation:** Light home-helper shell (theme toggle → dark anytime) — compact nav (Ops Concierge · SAST clock · session · phase · Demo · not a live device · Helper link) + airy hero + how-strip (Doorstep path + **Bedtime path**, equal weight) + three panes: **Talk to the helper** | **What’s happening at home** | **Steps the helper took**.

Topbar story buttons (equal outline until active): **Bedtime story** (B) · **Doorstep story** (D).

| Time | Action | Say / show |
|------|--------|------------|
| 0:00–0:20 | Landing | Ops Concierge is an Alexa+ simulation for Amazon household workflows. No live device. Point at SIM badge, SAST clock, phase Ready, Helper link “Local mock”, equal **Doorstep story** / **Bedtime story** buttons, how-strip Guest / Task + Bedtime path. |
| 0:20–0:35 | **Doorstep story** (or press **D**) | Ring package at Mira’s stoop + Amazon same-day ETA for Lebo’s Echo Dot Kids. Tools: ring.query / order.lookup; phase Listening. Chip: **Got it — hold both**. |
| 0:35–1:05 | Chip **Got it — hold both** (or **1**) | Helper holds both signals; phase advances. |
| 1:05–1:35 | Chip **Connect the dots** | Calendar / last activity / similar TASK-991. Quiet-hours context. |
| 1:35–2:00 | Chip **Suggest a quiet-hours plan** | SAST presence window 18:20–18:45; backup neighbour Thabo. |
| 2:00–2:25 | Chip **Make the guest code** | **GUEST-10421** trophy on the board — **Copy guest code** / **Print guest card**. Toast on copy. |
| 2:25–2:55 | Optional **Bedtime story** (or **B**) | Mid-story switch is calm — helper pauses Doorstep and starts Bedtime fresh. Fire TV Bluey + Alexa routine → chips through to **Make the bedtime task** → **TASK-22018** trophy (**Copy bedtime task** / **Print task card**). |
| 2:55–3:00 | Recap | Stateful across turns — not a Q&A bot. Press **?** for shortcuts; theme toggle for dark. Stop. |

**Bedtime-only alternate (if Doorstep already shown elsewhere):** Press **Bedtime story** → **Got it — hold both** → **Connect the dots** → **Suggest a quiet-hours plan** → **Make the bedtime task** → show **TASK-22018**.

Helper voice stays calm; unknown asks point back to chips / D / B — never a dead end.
