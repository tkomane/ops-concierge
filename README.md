# Ops Concierge

Session-stateful, agentic ops concierge for the **Amazon Developer Hackathon 2026** — **Alexa+ simulated path** (Official Rules §4).

**Author:** Tshiamo Komane (South Africa) — senior cloud infrastructure architect (Azure, HPE GreenLake, on-prem).

This is **not** a live Alexa skill, not a single-turn Q&A bot, and **not** connected to AWS, Azure, HPE, or ITSM. Everything is mocked in the browser so judges can see **orchestration**: ingest paired Azure Monitor / Service Health-style and on-prem / HPE GreenLake / SNMP-style alerts, acknowledge, correlate, propose a SAST change window, and open a copyable ITSM artefact.

## Run (one command)

```bash
cd ops-concierge
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).  
Or: `python3 serve.py` (same port).

## What judges should see

1. Dark TV / voice-adjacent layout with an **Alexa+ simulation** badge (not a live device).
2. Click **Run demo incident** (Johannesburg retail portal seed).
3. Follow chips: Acknowledge → Correlate → Propose SAST window → Open ticket.
4. Tool timeline fires MCP-like tools: `azure.query`, `onprem.query`, `session.ack`, `itsm.similar`, `calendar.propose`, `ticket.open`.
5. Incident board shows alerts, correlation, window, and ITSM artefact **CHG-88421** (copyable).
6. Optional: **Run backup incident** (Segunda / Primera seed) — session state does not re-ask from scratch.

See [DEMO.md](DEMO.md) for a ≤3 minute video click-path.

## Alexa+ simulated path mapping (Rules §4)

| Requirement | How this project meets it |
|-------------|---------------------------|
| Simulated Alexa+ web experience | Labelled chat + orb UI; no Amazon hardware |
| Working demo | Fully client-side mock; one-command static server |
| Agentic / not obvious Q&A | Multi-tool orchestration with visible timeline and session phases |
| Public source + OSI license | MIT ([LICENSE](LICENSE)); publish to public GitHub when approved |

## Mocked (intentionally)

Azure Monitor / Service Health, HPE GreenLake / SNMP-style uplink, CAB calendar, last deploy, similar incidents, ITSM create, speech/TTS.

No API keys, no AWS credits required for this path.

## Files

- `index.html`, `css/app.css`, `js/app.js`, `js/scenarios.js` — app
- `DEMO.md` — video script
- `FRICTION_LOG.md` — judging bonus friction log draft
- `PRODUCT_FEEDBACK.md` — Devpost product-feedback draft
- `LICENSE` — MIT, Copyright (c) 2026 Tshiamo Komane
