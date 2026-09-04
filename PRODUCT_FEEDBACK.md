# Product feedback draft (Devpost form)

## Which developer tools, APIs and SDKs did you use and for what?

- **Alexa+ simulated path (Rules §4):** custom web simulation (HTML/CSS/JS) — no Echo hardware.
- **MCP-inspired tool surface (conceptual):** `ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open` as visible timeline steps (not a live MCP server).
- **Static hosting:** `python3 -m http.server` / `serve.py` for local demo.
- **No AWS runtime services** in this draft (no Bedrock/Lambda). AWS Builder mini-challenge intentionally deferred unless free-tier/credits are approved.

## What worked well?

- Simulated path lets a solo builder demo Amazon household orchestration (Ring + delivery + Fire TV) without hardware.
- Session phases (ingested → ack → correlated → windowed → ticketed) make “agentic” visible vs chat.
- Two seed scenarios keep a ≤3 min video reliable.

## What needs work?

- Official simulated-Alexa+ UI scaffold and sample tool cards would cut setup friction.
- No public sample feeds for Ring package events + Amazon order ETA for hackathons.
- Browser TTS skipped for determinism; voice feel depends on video narration.

## How was your onboarding experience (zero to hello world)?

Rules were clear that simulation is allowed. Resources lean toward device/MCP server paths; the “any agentic tool” simulation path is easy to under-build into a Q&A bot without strong examples.

## Would you build with these devices and services again?

**Yes** — for household concierge ideas that need session memory and multi-system tools (Ring, Orders, Fire TV, calendar). Prefer simulation or MCP server path over buying Bee/Ring hardware for a first hackathon entry.
