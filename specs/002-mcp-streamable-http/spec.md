# Feature Specification: Self-hosted MCP Streamable HTTP Server

**Feature Branch**: `002-mcp-streamable-http`

**Created**: 2026-09-04

**Status**: Active

**Input**: User description: "Self-hosted MCP Streamable HTTP server for Ops Concierge tools"

## User Scenarios and Testing (mandatory)

### User Story 1 - Local MCP server exposes Amazon-native tools (Priority: P1)

A developer or hackathon judge starts the Ops Concierge MCP server on localhost and lists/calls tools over Streamable HTTP. Tools match the product surface: `ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open`. Responses are simulated household fixtures (Ring, Orders, calendar, guest/task artefacts) — never Azure/GreenLake.

**Why this priority**: Useful supporting evidence for Alexa+ agent tooling. Official hackathon rules expressly allow the Alexa+ **simulation** path without requiring a particular SDK or MCP surface ([rules §4](https://amazonappdev2026.devpost.com/rules)). Protocol support at least **2025-11-25** when the server is run. **Amendment (2026-09-04):** Corrected earlier claim that the track *requires* MCP — it does not for simulation entries; keep the working server optional.

**Independent Test**: Start server; SDK client or curl/session handshake lists six tools and successfully calls `session.ack`.

**Acceptance Scenarios**:

1. **Given** the server is started with default bind, **When** a client connects to Streamable HTTP `/mcp`, **Then** it negotiates a supported MCP protocol revision (at least 2025-11-25; SDK may speak newer) and lists the six named tools.
2. **Given** a live session, **When** the client calls `ring.query` with a zone, **Then** it receives a structured simulated Ring result with no secrets and no non-Amazon vendor strings.
3. **Given** invalid tool arguments, **When** the tool runs, **Then** the client receives a graceful error (tool error or structured `{ok:false}`) without crashing the process.

---

### User Story 2 - Unit-tested tool handlers (Priority: P1)

Pure tool handler logic is covered by pytest so CI can prove Amazon-native behaviour without a live uvicorn process.

**Why this priority**: FAANG-quality bar — typed tools, tests, graceful errors.

**Independent Test**: `pytest` passes offline after installing `mcp` + test deps.

**Acceptance Scenarios**:

1. **Given** installed MCP deps, **When** pytest runs, **Then** all tool-handler unit tests pass.
2. **Given** an in-process `Client(mcp)` connection, **When** each tool is called with valid fixtures, **Then** structured results include a human-readable `meta` string suitable for the UI timeline.

---

### User Story 3 - Static demo stays offline; optional live MCP bridge (Priority: P2)

The existing static UI keeps working with mock tools when MCP is down. With a feature flag and MCP up, the tool timeline may call a localhost HTTP bridge that invokes the same handlers.

**Why this priority**: Judges on GitHub Pages must not depend on a local MCP; local demos can show real HTTP when desired.

**Independent Test**: Load index without MCP — demos complete to GUEST-10421. With flag + server, timeline meta reflects live bridge responses.

**Acceptance Scenarios**:

1. **Given** `OPS_USE_MCP` is false or MCP is unreachable, **When** Run demo executes, **Then** mocks run and the static flow completes offline.
2. **Given** `OPS_USE_MCP` is true and MCP health is up, **When** a tool fires, **Then** the timeline uses the HTTP bridge response `meta` (or falls back to mock on failure).

---

### User Story 4 - Docs and CI (Priority: P2)

README / `docs/MCP.md` explain how to run (`uv run` / `python -m mcp_server`). CI runs pytest when deps install successfully.

**Why this priority**: Reproducibility for judges and reviewers.

**Independent Test**: Follow docs to start server; CI job includes optional/required pytest step.

**Acceptance Scenarios**:

1. **Given** a fresh clone with `uv`, **When** following `docs/MCP.md`, **Then** the server binds `127.0.0.1` and Origin/Host validation is enabled for localhost.
2. **Given** CI checkout, **When** MCP deps install, **Then** pytest runs and must pass.

### Edge Cases

- MCP down while flag on: UI falls back to mock without breaking the demo.
- Unknown tool name on demo bridge: HTTP 404 with JSON error.
- Non-localhost Origin when DNS-rebinding protection is on: request rejected.
- No secrets / API keys ever required or logged.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: Provide a self-hosted MCP server using the official `mcp` Python SDK with Streamable HTTP transport.
- **FR-002**: Support MCP protocol negotiation covering at least revision **2025-11-25** (SDK current stable may negotiate newer revisions such as 2026-07-28).
- **FR-003**: Expose tools: `ring.query`, `order.lookup`, `session.ack`, `calendar.propose`, `notify.household`, `task.open`.
- **FR-004**: Bind `127.0.0.1` by default; enable Host/Origin validation for localhost as required by the SDK.
- **FR-005**: Tool handlers MUST be typed, Amazon-native simulated data only (Ring, Orders, household calendar, Fire TV/Alexa bedtime context, guest/task artefacts).
- **FR-006**: Include pytest coverage for tool handlers (and in-process MCP client smoke).
- **FR-007**: Document run instructions in `docs/MCP.md` and a README section.
- **FR-008**: Keep static offline demo working; optional JS feature flag for live HTTP bridge.
- **FR-009**: Update CI to run pytest when MCP dependencies are installable.
- **FR-010**: No Azure/GreenLake/HPE product narrative; no secrets; no paid APIs; no AWS spend.

### Key Entities

- **MCP tool**: Named callable with typed inputs/outputs and `meta` for timeline display.
- **Household fixture**: Simulated Ring / Order / calendar / artefact data for doorstep and bedtime scenarios.
- **Transport**: Streamable HTTP at `/mcp` plus optional public `/healthz` and `/demo/call` JSON bridge for the browser.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Server starts on `127.0.0.1:<port>/mcp` and an SDK client lists exactly the six product tools.
- **SC-002**: At least one tool call succeeds end-to-end over Streamable HTTP.
- **SC-003**: `pytest` exits 0 for the MCP package tests.
- **SC-004**: Static frontend still loads (HTTP 200) and doorstep demo reaches GUEST-10421 without MCP.
- **SC-005**: Repo grep for Azure/GreenLake product narrative in new MCP code/docs remains clean (constitution forbid list).

## Assumptions

- Official `mcp` Python SDK current stable (2.x) is acceptable; it speaks Streamable HTTP and supports protocol revisions including 2025-11-25+.
- Simulation-only data is intentional for the Alexa+ simulated path.
- Full visual redesign is out of scope (separate Spec Kit feature).
- Default MCP port is **8766** so it does not collide with static `serve.py` on **8765**.
