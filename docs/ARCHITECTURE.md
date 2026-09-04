# Architecture (one-pager)

**Ops Concierge** ships primarily as a **client-only** static web app: HTML + CSS + JS, no bundler, no secrets. An optional self-hosted MCP package (`mcp_server/`) provides Streamable HTTP tools for local/hackathon demos.

## Runtime shape

```
Browser
  ├── index.html          shell / layout
  ├── css/app.css         presentation
  ├── js/scenarios.js     seed household workflows (mock data)
  └── js/app.js           session state machine + tool simulation
```

Serve with any static file server (`python3 serve.py`, `python3 -m http.server`, or GitHub Pages). All “agent” behaviour runs in the page.

## Client-only state machine

- Session phases live in JavaScript memory (idle → ingested → ack → correlated → windowed → ticketed).
- Utterances and chip clicks advance the phase; the UI (chat, cards, timeline) reflects that state.
- Reloading the page resets the session. There is no server-side session store.

## Tool simulation

The tool timeline (`ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open`, …) is **simulated**:

- No outbound calls to Ring, Amazon Orders, Fire TV, or household ITSM.
- Results are deterministic mocks from `scenarios.js` / in-app fixtures.
- Artefacts (e.g. copyable `GUEST-…` / `TASK-…` ids) are generated locally for demo clarity.

## Trust & secrets

| Concern | Design |
|---------|--------|
| API keys / tokens | None required; none should be added for the demo path |
| Auth | None |
| Data residency | Browser only for the duration of the tab |
| CSP (local `serve.py`) | Restrictive headers; see SECURITY.md |

## Deploy surfaces

| Surface | Role |
|---------|------|
| Local `serve.py` | Demo with security headers |
| GitHub Pages | Public static demo (see docs/DEVOPS.md) |
| CI | File presence + HTML asset reference + curl smoke |

## Optional MCP server (local)

When developing locally you may also run `python -m mcp_server` (Streamable HTTP on `127.0.0.1:8766/mcp`). The browser demo remains **offline-first**; an optional feature flag can call the `/demo/call` JSON bridge. See [MCP.md](MCP.md). Production GitHub Pages does not require MCP.

## Non-goals

Live Alexa skill hosting, real Ring/Orders connectors, and production write paths are intentionally out of scope for this hackathon simulation.
