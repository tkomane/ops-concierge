# Devpost draft copy (scrubbed) — paste into https://devpost.com/software/ops-concierge

Do NOT Submit. Draft save only.

## Tagline
Alexa+ household concierge: Ring, deliveries, and Fire TV routines in one session-stateful demo.

## Description
Ops Concierge is an Alexa+ simulation for the Amazon Developer Hackathon 2026 (Build, Ship, Shape). It shows how a household agent can stitch Ring doorstep events, Amazon order ETAs, calendar quiet hours, and Fire TV bedtime into a single session — with visible tool calls judges can follow.

**Doorstep demo** — Ring + order + calendar quiet hours → guest artefact `GUEST-10421`.

**Bedtime demo** — Fire TV evening routine → task artefact `TASK-22018`.

Tools in the mock: `ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open`.

Includes a self-hosted MCP Streamable HTTP server for the same tools, Spec Kit–governed build process, and a light product UI designed for demo clarity.

Simulation only — no live Alexa hardware required (Alexa+ simulated path).

Repo: https://github.com/tkomane/ops-concierge  
Demo (unlisted): https://youtu.be/0T5SdmE_Aek

Built by Tshiamo Komane (Africa/Johannesburg).

## Notes for editor
- Remove ANY mention of Azure, GreenLake, HPE, on-prem, or phrases like "no Azure" / "without GreenLake".
- Sell the Amazon-native story only.
