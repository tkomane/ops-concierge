# Demo video click-path (≤3 minutes)

Record English, screen capture of http://127.0.0.1:8765/. Judges are not required to watch past 3 minutes.

**UI orientation:** soft charcoal elevated shell — top bar (mark · SAST clock · session · phase pill · SIMULATION · NOT A LIVE ALEXA DEVICE badge) + three panes: Voice/Chat | Household Board | Tools.

| Time | Action | Say / show |
|------|--------|------------|
| 0:00–0:20 | Landing | Ops Concierge is an Alexa+ simulation for Amazon household workflows. No live device — agentic orchestration with session state. Point at simulation badge, household clock (SAST), phase pill IDLE, three panes. |
| 0:20–0:35 | Click Run demo (or press D) | Doorstep delivery: Ring package at front door plus Amazon same-day ETA for Echo Dot Kids. Show ring.query / order.lookup on the tools timeline; phase to INGESTED. |
| 0:35–1:10 | Chip Acknowledge both signals (or 1) | Show session.ack; severity-rail cards; phase to ACK. |
| 1:10–1:50 | Chip Gather context and correlate | Correlation card (calendar, last activity, similar). Timeline: more queries + notify.household. Phase to CORRELATED. |
| 1:50–2:20 | Chip Propose a presence window | SAST presence window card; calendar.propose. Phase to WINDOWED. |
| 2:20–2:50 | Chip Open the artefact | GUEST-10421 on the board; click Copy artefact then toast. task.open + notify.household on timeline. Phase to TICKETED. |
| 2:50–3:00 | Recap | Stateful across turns — not a Q&A bot. Tools are mocked so the workflow is visible. Press ? for keyboard shortcuts. Stop. |

Optional B-roll: Bedtime button (Fire TV + Alexa evening routine, TASK-22018) without resetting the story mid-sentence.
