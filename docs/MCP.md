# Ops Concierge MCP (Streamable HTTP)

Self-hosted **Model Context Protocol** server for the Amazon Developer Hackathon **Alexa+ simulated** path.

- Transport: **Streamable HTTP** (official `mcp` Python SDK)
- Protocol: negotiates current SDK revisions; supports at least **2025-11-25** (hackathon minimum)
- Bind default: **`127.0.0.1:8766`** with Host/Origin DNS-rebinding protection
- Tools (Amazon-native simulations only):  
  `ring.query` · `order.lookup` · `session.ack` · `calendar.propose` · `notify.household` · `task.open`

No secrets, no paid APIs, no live Ring/Orders/Fire TV cloud.

## Install

From the repo root:

```bash
# with uv (recommended)
uv sync --extra dev

# or pip
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
# preferred
uv run python -m mcp_server

# or
python -m mcp_server --host 127.0.0.1 --port 8766
```

Endpoints:

| Path | Purpose |
|------|---------|
| `http://127.0.0.1:8766/mcp` | MCP Streamable HTTP |
| `http://127.0.0.1:8766/healthz` | Liveness + tool list |
| `http://127.0.0.1:8766/demo/call` | Browser JSON bridge (`POST {"tool","arguments"}`) |
| `http://127.0.0.1:8766/demo/tools` | Tool names for the UI |

**CORS (local UI only):** `/healthz`, `/demo/call`, and `/demo/tools` echo `Access-Control-Allow-Origin` solely for `http://127.0.0.1:8765` and `http://localhost:8765` (the static `serve.py` UI). Untrusted Origins get no ACAO (never `*`). Bridge JSON errors use `source: "bridge"` with `error: {code, message}` so failures are not confused with client-side mock fallback.

## SDK client smoke

```python
import asyncio
from mcp import Client

async def main():
    async with Client("http://127.0.0.1:8766/mcp") as client:
        tools = await client.list_tools()
        print([t.name for t in tools.tools])
        r = await client.call_tool("session.ack", {"session_id": "sess-demo"})
        print(r.structured_content)

asyncio.run(main())
```

## curl health / demo bridge

```bash
curl -fsS http://127.0.0.1:8766/healthz | python3 -m json.tool

curl -fsS http://127.0.0.1:8766/demo/call \
  -H 'content-type: application/json' \
  -d '{"tool":"task.open","arguments":{"scenario":"doorstep"}}' \
  | python3 -m json.tool
```

## Tests

```bash
uv run pytest -q
# or
pytest -q
```

## Optional UI wiring

Static demo stays offline by default. To prefer the live bridge when the server is up:

```html
<!-- before app.js -->
<script>
  window.OPS_MCP = {
    enabled: true,
    baseUrl: "http://127.0.0.1:8766"
  };
</script>
```

Or set `localStorage.OPS_USE_MCP = "1"` and reload. If health check fails, `js/app.js` falls back to mocks so GitHub Pages judges are unaffected.

## Spec Kit

Feature artifacts: [`specs/002-mcp-streamable-http/`](../specs/002-mcp-streamable-http/).
