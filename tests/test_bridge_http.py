"""HTTP bridge CORS/validation + Streamable HTTP MCP negotiate/list/call."""

from __future__ import annotations

import asyncio
import socket
import threading
import time
from typing import Iterator

from unittest.mock import patch

import pytest
import uvicorn
from mcp import Client
from starlette.testclient import TestClient

from mcp_server.server import ALLOWED_ORIGINS, create_http_app
from mcp_server.tools import TOOL_NAMES

UI_ORIGIN = "http://127.0.0.1:8765"
UI_ORIGIN_LOCALHOST = "http://localhost:8765"
EVIL_ORIGIN = "http://evil.example"


@pytest.fixture
def client() -> Iterator[TestClient]:
    app = create_http_app()
    with TestClient(app) as c:
        yield c


def test_allowed_origins_are_local_ui_only():
    assert ALLOWED_ORIGINS == frozenset(
        {"http://127.0.0.1:8765", "http://localhost:8765"}
    )
    assert "*" not in ALLOWED_ORIGINS


def test_healthz_cors_allowlisted_origin(client: TestClient):
    r = client.get("/healthz", headers={"Origin": UI_ORIGIN})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == UI_ORIGIN
    assert r.json()["status"] == "ok"
    assert "ring.query" in r.json()["tools"]


def test_healthz_cors_localhost_origin(client: TestClient):
    r = client.get("/healthz", headers={"Origin": UI_ORIGIN_LOCALHOST})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == UI_ORIGIN_LOCALHOST


def test_healthz_cors_rejects_untrusted_origin(client: TestClient):
    r = client.get("/healthz", headers={"Origin": EVIL_ORIGIN})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") is None


def test_demo_call_options_preflight_allowlisted(client: TestClient):
    r = client.options(
        "/demo/call",
        headers={
            "Origin": UI_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.status_code == 204
    assert r.headers.get("access-control-allow-origin") == UI_ORIGIN
    assert "POST" in r.headers.get("access-control-allow-methods", "")


def test_demo_call_options_preflight_evil_no_acao(client: TestClient):
    r = client.options(
        "/demo/call",
        headers={
            "Origin": EVIL_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.status_code == 204
    assert r.headers.get("access-control-allow-origin") is None


def test_demo_call_json_array_is_400(client: TestClient):
    r = client.post(
        "/demo/call",
        json=["not", "an", "object"],
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 400
    data = r.json()
    assert data["ok"] is False
    assert data["source"] == "bridge"
    assert data["error"]["code"] == "invalid_request"
    assert "array" in data["error"]["message"].lower()
    assert data["failureKind"] == "bridge_error"
    assert data["fallback"] == "none"
    assert r.headers.get("access-control-allow-origin") == UI_ORIGIN


def test_demo_call_missing_session_id_is_400(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": "session.ack", "arguments": {}},
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 400
    data = r.json()
    assert data["ok"] is False
    assert data["source"] == "bridge"
    assert data["error"]["code"] == "invalid_request"
    assert "session_id" in data["error"]["message"]
    assert data["tool"] == "session.ack"


def test_demo_call_numeric_zone_is_400(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": "ring.query", "arguments": {"zone": 123}},
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 400
    data = r.json()
    assert data["ok"] is False
    assert data["source"] == "bridge"
    assert data["error"]["code"] == "invalid_request"
    assert "zone" in data["error"]["message"]


def test_demo_call_wrong_tool_type_is_400(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": 99, "arguments": {}},
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 400
    data = r.json()
    assert data["ok"] is False
    assert data["error"]["code"] == "invalid_request"


def test_demo_call_arguments_array_is_400(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": "ring.query", "arguments": ["stoop"]},
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 400
    data = r.json()
    assert data["ok"] is False
    assert data["error"]["code"] == "invalid_request"
    assert "arguments" in data["error"]["message"]


def test_demo_call_success_labelled_bridge(client: TestClient):
    r = client.post(
        "/demo/call",
        json={
            "tool": "task.open",
            "arguments": {"scenario": "doorstep"},
        },
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["source"] == "bridge"
    assert data["operationId"].startswith("op_")
    assert data["tool"] == "task.open"
    assert data["detail"]["id"] == "GUEST-10421"
    assert data["error"] is None
    assert r.headers.get("access-control-allow-origin") == UI_ORIGIN


def test_demo_call_handler_exception_echoes_request_operation_id(client: TestClient):
    """HTTP 500 from a handler fault must keep the client's operation identity."""
    from mcp_server import server

    with patch.object(server, "dispatch", side_effect=RuntimeError("injected handler fault")):
        r = client.post(
            "/demo/call",
            json={
                "tool": "task.open",
                "arguments": {"scenario": "doorstep", "operationId": "op_task_open_2"},
            },
            headers={"Origin": UI_ORIGIN},
        )
    assert r.status_code == 500
    data = r.json()
    assert data["ok"] is False
    assert data["source"] == "bridge"
    assert data["error"]["code"] == "bridge_failure"
    assert data["operationId"] == "op_task_open_2"
    assert data["failureKind"] == "bridge_failure"
    assert data["fallback"] == "none"


def test_demo_call_unknown_tool_404_labelled(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": "azure.vm", "arguments": {}},
        headers={"Origin": UI_ORIGIN},
    )
    assert r.status_code == 404
    data = r.json()
    assert data["ok"] is False
    assert data["source"] == "bridge"
    assert data["error"]["code"] == "unknown_tool"
    assert data["failureKind"] == "bridge_error"
    assert data["fallback"] == "none"


def test_demo_call_no_wildcard_on_success_without_allowlist(client: TestClient):
    r = client.post(
        "/demo/call",
        json={"tool": "task.open", "arguments": {"scenario": "doorstep"}},
        headers={"Origin": EVIL_ORIGIN},
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") is None
    assert r.headers.get("access-control-allow-origin") != "*"


@pytest.fixture(scope="module")
def live_mcp_base() -> Iterator[str]:
    """Real TCP listener so MCP Streamable HTTP Client can negotiate."""
    app = create_http_app()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.listen(100)

    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    loop_server = uvicorn.Server(config)
    ready = threading.Event()

    def _run() -> None:
        async def _serve() -> None:
            ready.set()
            await loop_server.serve(sockets=[sock])

        asyncio.run(_serve())

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    assert ready.wait(timeout=5), "uvicorn serve did not start"
    time.sleep(0.25)
    base = f"http://127.0.0.1:{port}"
    try:
        yield base
    finally:
        loop_server.should_exit = True
        thread.join(timeout=5)
        try:
            sock.close()
        except OSError:
            pass


@pytest.mark.anyio
async def test_mcp_http_negotiate_list_and_call(live_mcp_base: str):
    """Prove Streamable HTTP: negotiate + list tools + call one tool."""
    async with Client(f"{live_mcp_base}/mcp") as mcp_client:
        version = mcp_client.protocol_version
        assert version, "expected negotiated protocol version"
        assert str(version) >= "2025-11-25"

        listed = await mcp_client.list_tools()
        names = sorted(t.name for t in listed.tools)
        assert names == sorted(TOOL_NAMES)

        result = await mcp_client.call_tool(
            "session.ack",
            {"session_id": "sess-http-test", "artefact_hint": "GUEST-10421"},
        )
        assert result.is_error is False
        data = result.structured_content or {}
        if isinstance(data, dict) and "result" in data and isinstance(data["result"], dict):
            data = data["result"]
        assert data.get("ok") is True
        assert "ACK GUEST-10421" in str(data.get("meta", ""))
