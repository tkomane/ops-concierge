"""Pure tool handlers — unit-tested without transport."""

from __future__ import annotations

from mcp_server.fixtures import get_fixture
from mcp_server.models import ToolErr, ToolOk, ToolResult


def _ok(tool: str, meta: str, detail: dict[str, object]) -> ToolOk:
    return {"ok": True, "tool": tool, "meta": meta, "detail": detail}


def _err(tool: str, error: str) -> ToolErr:
    return {"ok": False, "tool": tool, "meta": f"ERR {tool}", "error": error}


def ring_query(*, zone: str = "front-door", scenario: str = "doorstep") -> ToolResult:
    """Query Ring doorbell / presence zones (simulated)."""
    zone = (zone or "").strip()
    if not zone:
        return _err("ring.query", "zone is required")
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("ring.query", str(exc))
    ring = fx["ring"]
    meta = f"HIT {ring['resource']}"
    return _ok(
        "ring.query",
        meta,
        {
            "zone": zone,
            "resource": ring["resource"],
            "title": ring["title"],
            "signal": ring["signal"],
            "simulated": True,
        },
    )


def order_lookup(*, order_id: str = "", scenario: str = "doorstep") -> ToolResult:
    """Look up Amazon delivery expectation or device/session annotation (simulated)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("order.lookup", str(exc))
    order = fx["order"]
    oid = (order_id or "").strip() or str(order["resource"]).split("/")[0].strip()
    meta = f"HIT {order['resource']}"
    return _ok(
        "order.lookup",
        meta,
        {
            "order_id": oid,
            "resource": order["resource"],
            "title": order["title"],
            "signal": order["signal"],
            "simulated": True,
        },
    )


def session_ack(*, session_id: str, artefact_hint: str = "") -> ToolResult:
    """Acknowledge paired household signals and bind them to the session."""
    sid = (session_id or "").strip()
    if not sid:
        return _err("session.ack", "session_id is required")
    hint = (artefact_hint or "").strip() or "local"
    meta = f"ACK {hint} ({sid})"
    return _ok(
        "session.ack",
        meta,
        {"session_id": sid, "artefact_hint": hint, "acked": True, "simulated": True},
    )


def calendar_propose(*, scenario: str = "doorstep") -> ToolResult:
    """Propose a SAST presence window against the household calendar (simulated)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("calendar.propose", str(exc))
    cal = fx["calendar"]
    meta = str(cal["proposed"])
    return _ok(
        "calendar.propose",
        meta,
        {
            "proposed": cal["proposed"],
            "alternate": cal["alt"],
            "timezone": cal["tz"],
            "simulated": True,
        },
    )


def notify_household(*, scenario: str = "doorstep", message: str = "") -> ToolResult:
    """Queue a household nudge / similar-task scan (simulated)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("notify.household", str(exc))
    note = fx["notify"]
    body = (message or "").strip() or str(note["message"])
    meta = f"notify queued · {note['channel']} · sim"
    return _ok(
        "notify.household",
        meta,
        {
            "channel": note["channel"],
            "message": body,
            "simulated": True,
        },
    )


def task_open(*, scenario: str = "doorstep") -> ToolResult:
    """Open a guest/task artefact draft locally (no network write)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("task.open", str(exc))
    task = fx["task"]
    meta = f"{task['id']} draft"
    return _ok(
        "task.open",
        meta,
        {
            "id": task["id"],
            "title": task["title"],
            "status": "draft",
            "simulated": True,
        },
    )


HANDLERS = {
    "ring.query": ring_query,
    "order.lookup": order_lookup,
    "session.ack": session_ack,
    "calendar.propose": calendar_propose,
    "notify.household": notify_household,
    "task.open": task_open,
}

TOOL_NAMES = tuple(HANDLERS.keys())


def dispatch(tool: str, arguments: dict[str, object] | None = None) -> ToolResult:
    """Dispatch a tool by name for the demo HTTP bridge and tests."""
    name = (tool or "").strip()
    if name not in HANDLERS:
        return _err(name or "unknown", f"Unknown tool '{tool}'. Expected one of: {', '.join(TOOL_NAMES)}")
    args = arguments or {}
    # Filter to known kwargs only — ignore extras from clients.
    import inspect

    sig = inspect.signature(HANDLERS[name])
    allowed = {k: v for k, v in args.items() if k in sig.parameters}
    return HANDLERS[name](**allowed)  # type: ignore[arg-type]
