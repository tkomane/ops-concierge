# Ops Concierge

![Household concierge UI](preview-demo.png)

> *Linear × Apple Vision × modern Alexa — not a harsh mission-control dashboard.*

Session-stateful, agentic **Amazon household concierge** for the **Amazon Developer Hackathon 2026** — **Alexa+ simulated path** (Official Rules §4).

**Author:** Tshiamo Komane (South Africa) — builds agentic household workflows with Alexa+, Ring, and Fire TV in mind.

This is **not** a live Alexa skill, not a single-turn Q&A bot, and **not** connected to live Ring, Amazon Orders, or Fire TV. Everything is mocked in the browser so judges can see **orchestration**: ingest a Ring package event + Amazon delivery expectation (or Fire TV bedtime stall), acknowledge, correlate with household calendar, propose a SAST presence window, and open a copyable guest/task artefact.

## Vision

Households need a **concierge** that holds the moment in session, orchestrates Ring / Orders / calendar / notify / task-shaped tools, and speaks like a trusted Alexa+ companion — not a forgetful chatbot.

## Run

```bash
cd ops-concierge
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).  
Or: `python3 serve.py` (same port).

## Product surface / what judges should see

1. Premium shell: SAST clock, session ID, phase pill, **SIMULATION · NOT A LIVE ALEXA DEVICE** badge.
2. Click **Run demo** or press D (doorstep delivery seed).
3. Follow chips: Acknowledge → Correlate → Propose presence window → Open artefact.
4. Tools timeline fires Amazon-native mocks: `ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open`.
5. Household board shows signals, correlation, window, and artefact **GUEST-10421** (copyable).
6. Optional: **Bedtime** button (Fire TV + Alexa evening routine) — session state does not re-ask from scratch.

Keyboard: Enter send, 1–4 chips, D demo, ? shortcuts. See [DEMO.md](DEMO.md) for a ≤3 minute click-path.

## Alexa+ simulated path mapping (Rules §4)

| Requirement | How this project meets it |
|-------------|---------------------------|
| Simulated Alexa+ web experience | Voice/chat pane + status tag; explicit simulation badge |
| Working demo | Fully client-side mock; one-command static server |
| Agentic / not obvious Q&A | Multi-tool orchestration with visible timeline and session phases |
| Public source + OSI license | MIT ([LICENSE](LICENSE)); publish to public GitHub when approved |

## Mocked (intentionally)

Ring doorbell / package zones, Amazon order ETA, household calendar + quiet hours, Fire TV kids profile, Alexa bedtime routine, similar household tasks, guest/task artefact, speech/TTS.

No API keys, no AWS credits required for this path.

## Architecture

Static, zero-build. `escapeHtml` on all dynamic text. CSP in index meta. No eval, no inline scripts, no trackers. Fonts: Inter + IBM Plex Mono (`display=swap`).

- `index.html`, `css/app.css`, `js/app.js`, `js/scenarios.js`, `favicon.svg`, `manifest.webmanifest`
- `DEMO.md`, `FRICTION_LOG.md`, `PRODUCT_FEEDBACK.md`, `CONTRIBUTING.md`, `SECURITY.md`
- `LICENSE` — MIT, Copyright (c) 2026 Tshiamo Komane
- Design: soft charcoal elevated surfaces, luminous cyan accent, refined radius + ambient shadows

## DevOps / Live demo

- **Live demo (GitHub Pages):** https://tkomane.github.io/ops-concierge/ — enable once under **Settings → Pages → Source: GitHub Actions**, then pushes to `main` deploy via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) checks required files, HTML asset references, and a local HTTP smoke.
- Details: [docs/DEVOPS.md](docs/DEVOPS.md) · architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · security: [SECURITY.md](SECURITY.md)
