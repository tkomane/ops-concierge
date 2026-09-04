# Implementation Plan: Self-hosted MCP Streamable HTTP Server

**Branch**: `002-mcp-streamable-http` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-mcp-streamable-http/spec.md`

## Summary

Add a FAANG-quality, self-hosted MCP server for Ops Concierge using the official `mcp` Python SDK over **Streamable HTTP**, exposing the six Amazon-native product tools. Keep the static browser demo offline-first with an optional feature-flagged HTTP bridge. Spec Kit artifacts gate the work; no Azure/GreenLake narrative; no secrets.

## Technical Context

**Language/Version**: Python 3.11+ (box verified 3.13)

**Primary Dependencies**: official `mcp` SDK (current stable 2.x — `MCPServer`, Streamable HTTP), `uvicorn`, `starlette` (via mcp), `pytest`/`anyio` for tests

**Storage**: N/A (in-memory simulated fixtures)

**Testing**: pytest + in-process `mcp.Client(server)` ; optional live HTTP smoke in docs

**Target Platform**: Local developer / judge machine (Linux/macOS), bind `127.0.0.1`

**Project Type**: Python package alongside existing static web app

**Performance Goals**: Local demo latency; tool handlers <50ms; no production SLOs

**Constraints**: Localhost default; Origin/Host validation; offline static demo; no paid APIs; no git push from this task

**Scale/Scope**: 6 tools, 2 scenario fixtures (doorstep / bedtime), docs + CI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-First | PASS | This plan + spec.md + tasks.md |
| II. Amazon-Native Product Honesty | PASS | Ring/Orders/calendar/Fire TV/Alexa only |
| III. Design Excellence | PASS | No visual redesign in this feature |
| IV. Security by Default | PASS | No secrets; localhost + DNS-rebinding protection; graceful errors |
| V. Simplicity / YAGNI | PASS | Thin package + optional JS bridge; static path unchanged |
| VI. Observability of Agent Behavior | PASS | Tools return `meta` for timeline |
| VII. Accessibility / Performance | PASS | UI behaviour unchanged when MCP down |

## Project Structure

### Documentation (this feature)

```text
specs/002-mcp-streamable-http/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
mcp_server/
├── __init__.py
├── __main__.py          # python -m mcp_server
├── models.py            # TypedDict I/O
├── fixtures.py          # Amazon-native simulated data
├── tools.py             # Pure handlers (unit-tested)
└── server.py            # MCPServer registration + custom routes

tests/
├── test_tools.py
└── test_server_inprocess.py

pyproject.toml
docs/MCP.md
js/mcp-client.js         # optional feature-flagged bridge
js/app.js                # wire runTool → bridge with fallback
.github/workflows/ci.yml # pytest when deps install
README.md                # MCP section
```

**Structure Decision**: Single-repo Python package `mcp_server/` beside the static site — minimal surface, matches hackathon deliverable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Optional `/demo/call` JSON bridge | Browsers cannot easily speak full MCP Streamable HTTP sessions without a client SDK | Forcing browser to implement MCP handshake is out of scope / fragile for judges |
