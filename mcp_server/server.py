"""MCPServer registration: Streamable HTTP tools + public demo bridge."""

from __future__ import annotations

import uuid
from typing import Any

from mcp.server import MCPServer
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from mcp_server import __version__
from mcp_server.models import ToolResult
from mcp_server.tools import (
    TOOL_NAMES,
    calendar_propose,
    dispatch,
    notify_household,
    order_lookup,
    ring_query,
    session_ack,
    task_open,
)

INSTRUCTIONS = (
    "Ops Concierge MCP — Amazon Developer Hackathon Alexa+ simulated path. "
    "Tools are offline simulations of Ring, Amazon Orders, household calendar, "
    "notify, and guest/task artefacts. No live device cloud, no secrets."
)

# Local static UI (serve.py defaults to :8765). Never use wildcard for untrusted Origin.
ALLOWED_ORIGINS: frozenset[str] = frozenset(
    {
        "http://127.0.0.1:8765",
        "http://localhost:8765",
    }
)

# Tool argument names that must be strings when present (handlers call .strip()).
_STRING_ARGS: frozenset[str] = frozenset(
    {
        "zone",
        "scenario",
        "order_id",
        "session_id",
        "artefact_hint",
        "message",
        "planId",
        "recipient",
        "recipientRole",
        "action",
        "timing",
        "operationId",
    }
)


def create_server() -> MCPServer:
    """Build the configured MCP server (tools + health/demo routes)."""
    mcp = MCPServer(
        name="ops-concierge",
        version=__version__,
        instructions=INSTRUCTIONS,
    )

    @mcp.tool(name="ring.query")
    def _ring_query(zone: str = "front-door", scenario: str = "doorstep") -> ToolResult:
        """Query Ring doorbell / presence zones (simulated, Amazon-native)."""
        return ring_query(zone=zone, scenario=scenario)

    @mcp.tool(name="order.lookup")
    def _order_lookup(order_id: str = "", scenario: str = "doorstep") -> ToolResult:
        """Look up Amazon delivery expectation or Fire TV/session annotation (simulated)."""
        return order_lookup(order_id=order_id, scenario=scenario)

    @mcp.tool(name="session.ack")
    def _session_ack(session_id: str, artefact_hint: str = "") -> ToolResult:
        """Acknowledge paired household signals and bind them to the session."""
        return session_ack(session_id=session_id, artefact_hint=artefact_hint)

    @mcp.tool(name="calendar.propose")
    def _calendar_propose(scenario: str = "doorstep") -> ToolResult:
        """Propose a SAST presence window against the household calendar (simulated)."""
        return calendar_propose(scenario=scenario)

    @mcp.tool(name="notify.household")
    def _notify_household(
        scenario: str = "doorstep",
        message: str = "",
        planId: str = "",
        recipient: str = "",
        recipientRole: str = "",
        action: str = "",
        timing: str = "",
        operationId: str = "",
    ) -> ToolResult:
        """Queue a household nudge (simulated — no push provider)."""
        return notify_household(
            scenario=scenario,
            message=message,
            planId=planId,
            recipient=recipient,
            recipientRole=recipientRole,
            action=action,
            timing=timing,
            operationId=operationId,
        )

    @mcp.tool(name="task.open")
    def _task_open(
        scenario: str = "doorstep",
        planId: str = "",
        recipient: str = "",
        recipientRole: str = "",
        action: str = "",
        timing: str = "",
        operationId: str = "",
    ) -> ToolResult:
        """Open a guest/task artefact draft locally (no network write)."""
        return task_open(
            scenario=scenario,
            planId=planId,
            recipient=recipient,
            recipientRole=recipientRole,
            action=action,
            timing=timing,
            operationId=operationId,
        )

    @mcp.custom_route("/healthz", methods=["GET", "OPTIONS"])
    async def healthz(request: Request) -> Response:
        if request.method == "OPTIONS":
            return _cors(Response(status_code=204), request)
        return _cors(
            JSONResponse(
                {
                    "status": "ok",
                    "service": "ops-concierge-mcp",
                    "version": __version__,
                    "transport": "streamable-http",
                    "tools": list(TOOL_NAMES),
                }
            ),
            request,
        )

    @mcp.custom_route("/demo/call", methods=["POST", "OPTIONS"])
    async def demo_call(request: Request) -> Response:
        """Browser-friendly JSON bridge invoking the same pure handlers as MCP tools."""
        if request.method == "OPTIONS":
            return _cors(Response(status_code=204), request)

        try:
            raw: Any = await request.json()
        except Exception:
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Request body must be JSON",
                    status=400,
                ),
                request,
            )

        if isinstance(raw, list):
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Request body must be a JSON object, not an array",
                    status=400,
                ),
                request,
            )
        if not isinstance(raw, dict):
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Request body must be a JSON object",
                    status=400,
                ),
                request,
            )

        payload: dict[str, Any] = raw

        if "tool" not in payload:
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Missing required field 'tool'",
                    status=400,
                ),
                request,
            )
        if not isinstance(payload.get("tool"), str):
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Field 'tool' must be a string",
                    status=400,
                ),
                request,
            )

        tool = payload["tool"].strip()
        if not tool:
            return _cors(
                _bridge_error(
                    code="invalid_request",
                    message="Field 'tool' must be a non-empty string",
                    status=400,
                ),
                request,
            )

        if "arguments" in payload and payload["arguments"] is not None:
            arguments = payload["arguments"]
            if not isinstance(arguments, dict):
                return _cors(
                    _bridge_error(
                        code="invalid_request",
                        message="Field 'arguments' must be an object",
                        status=400,
                        tool=tool,
                    ),
                    request,
                )
        else:
            arguments = {}

        type_err = _validate_argument_types(tool, arguments)
        if type_err is not None:
            return _cors(type_err, request)

        try:
            result = dispatch(tool, arguments)
        except Exception as exc:  # noqa: BLE001 — bridge must not 500 on handler faults
            return _cors(
                _bridge_error(
                    code="bridge_failure",
                    message=f"Bridge failed while invoking tool: {exc}",
                    status=500,
                    tool=tool,
                ),
                request,
            )

        requested_op = arguments.get("operationId") if isinstance(arguments.get("operationId"), str) else None
        return _cors(_bridge_wrap(result, requested_operation_id=requested_op), request)

    @mcp.custom_route("/demo/tools", methods=["GET", "OPTIONS"])
    async def demo_tools(request: Request) -> Response:
        if request.method == "OPTIONS":
            return _cors(Response(status_code=204), request)
        return _cors(JSONResponse({"tools": list(TOOL_NAMES), "source": "bridge"}), request)

    return mcp


def _operation_id() -> str:
    return f"op_{uuid.uuid4().hex[:12]}"


def _bridge_error(
    *,
    code: str,
    message: str,
    status: int,
    tool: str | None = None,
) -> JSONResponse:
    """Structured bridge failure — distinct from client-side mock fallback."""
    body: dict[str, Any] = {
        "ok": False,
        "source": "bridge",
        "operationId": _operation_id(),
        "error": {"code": code, "message": message},
        "meta": f"bridge:{code}",
        # Explicit label so UI never treats this as unlabelled mock success.
        "fallback": "none",
        "failureKind": "bridge_failure" if code == "bridge_failure" else "bridge_error",
    }
    if tool is not None:
        body["tool"] = tool
    return JSONResponse(body, status_code=status)


def _bridge_wrap(
    result: ToolResult,
    *,
    requested_operation_id: str | None = None,
) -> JSONResponse:
    """Attach bridge source / operationId; normalise tool errors to structured shape."""
    detail = result.get("detail") if isinstance(result.get("detail"), dict) else None
    result_op = result.get("operationId") if isinstance(result.get("operationId"), str) else None
    detail_op = detail.get("operationId") if detail and isinstance(detail.get("operationId"), str) else None
    op = (requested_operation_id or result_op or detail_op or _operation_id()).strip() or _operation_id()
    if result.get("ok"):
        observations = result.get("observations")
        if observations is None and detail is not None:
            observations = detail.get("observations")
        body: dict[str, Any] = {
            "ok": True,
            "source": "bridge",
            "operationId": op,
            "tool": result.get("tool"),
            "meta": result.get("meta"),
            "detail": detail,
            "observations": observations,
            "outcome": detail,
            "error": None,
        }
        return JSONResponse(body, status_code=200)

    err_raw = result.get("error", "tool error")
    if isinstance(err_raw, dict):
        err_obj = err_raw
    else:
        msg = str(err_raw)
        code = "unknown_tool" if "Unknown tool" in msg else "tool_error"
        err_obj = {"code": code, "message": msg}

    status = 404 if err_obj.get("code") == "unknown_tool" else 400
    body = {
        "ok": False,
        "source": "bridge",
        "operationId": op,
        "tool": result.get("tool"),
        "meta": result.get("meta") or f"bridge:{err_obj.get('code')}",
        "error": err_obj,
        "fallback": "none",
        "failureKind": "bridge_error",
    }
    return JSONResponse(body, status_code=status)


def _validate_argument_types(tool: str, arguments: dict[str, Any]) -> JSONResponse | None:
    """Return a 4xx response when argument shapes would crash handlers (e.g. numeric zone)."""
    for key, value in arguments.items():
        if key in _STRING_ARGS and value is not None and not isinstance(value, str):
            return _bridge_error(
                code="invalid_request",
                message=f"Argument '{key}' must be a string, not {type(value).__name__}",
                status=400,
                tool=tool,
            )

    if tool == "session.ack" and "session_id" not in arguments:
        return _bridge_error(
            code="invalid_request",
            message="Missing required argument 'session_id' for tool 'session.ack'",
            status=400,
            tool=tool,
        )

    return None


def _cors(response: Response, request: Request) -> Response:
    """Allow only intended local UI origins — never wildcard for untrusted Origin."""
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Mcp-Session-Id"
        response.headers["Access-Control-Max-Age"] = "600"
    # Disallowed / missing Origin: omit ACAO so browsers cannot read cross-origin.
    return response


def create_http_app(
    *,
    host: str = "127.0.0.1",
    streamable_http_path: str = "/mcp",
    json_response: bool = True,
):
    """Return the Starlette ASGI app for Streamable HTTP (+ custom routes)."""
    server = create_server()
    # json_response=True keeps simple clients happier for request/response demos.
    return server.streamable_http_app(
        streamable_http_path=streamable_http_path,
        json_response=json_response,
        host=host,
    )


# Module-level server for `mcp run` / inspector convenience
mcp = create_server()
