"""In-process MCP Client tests (no network)."""

from __future__ import annotations

from typing import Any

import pytest
from mcp import Client

from mcp_server.server import create_server
from mcp_server.tools import TOOL_NAMES


@pytest.fixture
def server():
    return create_server()


def _payload(result) -> dict[str, Any]:
    """Unwrap SDK structured_content (union returns nest under 'result')."""
    data = result.structured_content or {}
    if isinstance(data, dict) and "result" in data and isinstance(data["result"], dict):
        return data["result"]
    return data


@pytest.mark.anyio
async def test_list_tools(server):
    async with Client(server) as client:
        listed = await client.list_tools()
        names = sorted(t.name for t in listed.tools)
        assert names == sorted(TOOL_NAMES)


@pytest.mark.anyio
async def test_call_session_ack(server):
    async with Client(server) as client:
        result = await client.call_tool(
            "session.ack",
            {"session_id": "sess-test", "artefact_hint": "GUEST-10421"},
        )
        assert result.is_error is False
        data = _payload(result)
        assert data["ok"] is True
        assert "ACK GUEST-10421" in data["meta"]


@pytest.mark.anyio
async def test_call_ring_query(server):
    async with Client(server) as client:
        result = await client.call_tool(
            "ring.query",
            {"zone": "stoop", "scenario": "doorstep"},
        )
        assert result.is_error is False
        data = _payload(result)
        assert data["ok"] is True
        assert "ring-front-door" in data["meta"]


@pytest.mark.anyio
async def test_call_task_open_doorstep(server):
    async with Client(server) as client:
        result = await client.call_tool("task.open", {"scenario": "doorstep"})
        assert result.is_error is False
        data = _payload(result)
        assert data["detail"]["id"] == "GUEST-10421"
