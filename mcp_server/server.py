"""MCPServer registration: Streamable HTTP tools + public demo bridge."""

from __future__ import annotations

from typing import Any

from mcp.server import MCPServer
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from mcp_server import __version__
from mcp_server.models import ToolResult
from mcp_server.tools import (
    calendar_propose,
    notify_household,
    order_lookup,
    ring_query,
    session_ack,
    task_open,
    TOOL_NAMES,
    dispatch,
)

INSTRUCTIONS = (
    "Ops Concierge MCP — Amazon Developer Hackathon Alexa+ simulated path. "
    "Tools are offline simulations of Ring, Amazon Orders, household calendar, "
    "notify, and guest/task artefacts. No live device cloud, no secrets."
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
    def _notify_household(scenario: str = "doorstep", message: str = "") -> ToolResult:
        """Queue a household nudge (simulated — no push provider)."""
        return notify_household(scenario=scenario, message=message)

    @mcp.tool(name="task.open")
    def _task_open(scenario: str = "doorstep") -> ToolResult:
        """Open a guest/task artefact draft locally (no network write)."""
        return task_open(scenario=scenario)

    @mcp.custom_route("/healthz", methods=["GET"])
    async def healthz(_request: Request) -> Response:
        return JSONResponse(
            {
                "status": "ok",
                "service": "ops-concierge-mcp",
                "version": __version__,
                "transport": "streamable-http",
                "tools": list(TOOL_NAMES),
            }
        )

    @mcp.custom_route("/demo/call", methods=["POST", "OPTIONS"])
    async def demo_call(request: Request) -> Response:
        """Browser-friendly JSON bridge invoking the same pure handlers as MCP tools."""
        if request.method == "OPTIONS":
            return _cors(Response(status_code=204))

        try:
            payload: dict[str, Any] = await request.json()
        except Exception:
            return _cors(
                JSONResponse(
                    {"ok": False, "error": "Request body must be JSON"},
                    status_code=400,
                )
            )

        tool = str(payload.get("tool") or "")
        arguments = payload.get("arguments") or {}
        if not isinstance(arguments, dict):
            return _cors(
                JSONResponse(
                    {"ok": False, "error": "arguments must be an object"},
                    status_code=400,
                )
            )

        result = dispatch(tool, arguments)
        status = 200 if result.get("ok") else (404 if "Unknown tool" in str(result.get("error", "")) else 400)
        return _cors(JSONResponse(result, status_code=status))

    @mcp.custom_route("/demo/tools", methods=["GET", "OPTIONS"])
    async def demo_tools(request: Request) -> Response:
        if request.method == "OPTIONS":
            return _cors(Response(status_code=204))
        return _cors(JSONResponse({"tools": list(TOOL_NAMES)}))

    return mcp


def _cors(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Mcp-Session-Id"
    response.headers["Access-Control-Max-Age"] = "600"
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
