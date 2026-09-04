# Tasks: Self-hosted MCP Streamable HTTP Server

**Input**: Design documents from `/specs/002-mcp-streamable-http/`

**Prerequisites**: plan.md, spec.md

## Phase 1: Setup

- [x] T001 Create `mcp_server/` package and `tests/` directories
- [x] T002 Add `pyproject.toml` with `mcp` SDK + pytest optional deps
- [x] T003 [P] Write Spec Kit `spec.md` / `plan.md` / `tasks.md`

## Phase 2: Foundational

- [x] T004 [P] Add `mcp_server/models.py` TypedDict contracts
- [x] T005 [P] Add `mcp_server/fixtures.py` Amazon-native simulated data
- [x] T006 Implement pure handlers in `mcp_server/tools.py`
- [x] T007 Register MCP tools + `/healthz` + `/demo/call` in `mcp_server/server.py`
- [x] T008 Add `__main__.py` Streamable HTTP runner (127.0.0.1, Origin validation)

## Phase 3: User Story 1 — MCP tools (P1)

- [x] T009 [US1] Expose six tools with dotted names matching product
- [x] T010 [US1] Verify Streamable HTTP bind + SDK client list/call

## Phase 4: User Story 2 — Tests (P1)

- [x] T011 [P] [US2] Unit tests for handlers in `tests/test_tools.py`
- [x] T012 [P] [US2] In-process MCP Client tests in `tests/test_server_inprocess.py`

## Phase 5: User Story 3 — Optional UI bridge (P2)

- [x] T013 [US3] Add `js/mcp-client.js` feature flag + health/call helpers
- [x] T014 [US3] Wire `runTool` in `js/app.js` with mock fallback
- [x] T015 [US3] Reference script from `index.html`

## Phase 6: User Story 4 — Docs & CI (P2)

- [x] T016 [P] [US4] Write `docs/MCP.md` and README MCP section
- [x] T017 [US4] Update CI to install mcp deps and run pytest
- [x] T018 [US4] Update `docs/ARCHITECTURE.md` note on optional MCP

## Dependencies

Setup → Foundational → US1/US2 in parallel after handlers exist → US3/US4 polish.
