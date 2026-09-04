"""Pure tool handlers — unit-tested without transport."""

from __future__ import annotations

from typing import Any

from mcp_server.fixtures import get_fixture
from mcp_server.models import ToolErr, ToolOk, ToolResult


def _ok(
    tool: str,
    meta: str,
    detail: dict[str, object],
    *,
    observations: dict[str, object] | None = None,
    operation_id: str | None = None,
) -> ToolOk:
    body: dict[str, object] = {"ok": True, "tool": tool, "meta": meta, "detail": detail}
    if observations is not None:
        body["observations"] = observations
        detail.setdefault("observations", observations)
    if operation_id:
        body["operationId"] = operation_id
        detail["operationId"] = operation_id
    return body  # type: ignore[return-value]


def _err(tool: str, error: str) -> ToolErr:
    return {"ok": False, "tool": tool, "meta": f"ERR {tool}", "error": error}


def _as_str(value: object, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


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
    if scenario == "doorstep":
        observations: dict[str, object] = {
            "motion": True,
            "parcelVisual": True,
            "zone": zone,
            "summary": f"{ring['title']} · parcel-shaped cardboard",
        }
    else:
        observations = {
            "motion": True,
            "parcelVisual": False,
            "zone": zone,
            "summary": str(ring["title"]),
        }
    return _ok(
        "ring.query",
        meta,
        {
            "zone": zone,
            "resource": ring["resource"],
            "title": ring["title"],
            "signal": ring["signal"],
            "simulated": True,
            "observations": observations,
        },
        observations=observations,
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
    if scenario == "doorstep":
        observations: dict[str, object] = {
            "eta": "16:00–18:00 SAST",
            "carrier": "AMZL",
            "matched": None,
            "summary": "AMZL stop nearby / expected delivery window",
        }
    else:
        observations = {
            "device": "fire-tv",
            "profile": "Kids",
            "summary": str(order["title"]),
        }
    return _ok(
        "order.lookup",
        meta,
        {
            "order_id": oid,
            "resource": order["resource"],
            "title": order["title"],
            "signal": order["signal"],
            "simulated": True,
            "observations": observations,
        },
        observations=observations,
    )


def session_ack(*, session_id: str, artefact_hint: str = "") -> ToolResult:
    """Acknowledge paired household signals and bind them to the session."""
    sid = (session_id or "").strip()
    if not sid:
        return _err("session.ack", "session_id is required")
    hint = (artefact_hint or "").strip() or "local"
    meta = f"ACK {hint} ({sid})"
    observations = {"summary": meta, "acked": True}
    return _ok(
        "session.ack",
        meta,
        {"session_id": sid, "artefact_hint": hint, "acked": True, "simulated": True},
        observations=observations,
    )


def calendar_propose(*, scenario: str = "doorstep") -> ToolResult:
    """Propose a SAST presence window against the household calendar (simulated)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("calendar.propose", str(exc))
    cal = fx["calendar"]
    meta = str(cal["proposed"])
    observations: dict[str, object] = {
        "proposed": cal["proposed"],
        "alternate": cal["alt"],
        "timezone": cal["tz"],
        "summary": meta,
    }
    if scenario == "doorstep":
        observations["neighbourAvailable"] = True
    return _ok(
        "calendar.propose",
        meta,
        {
            "proposed": cal["proposed"],
            "alternate": cal["alt"],
            "timezone": cal["tz"],
            "simulated": True,
            "observations": observations,
        },
        observations=observations,
    )


def notify_household(
    *,
    scenario: str = "doorstep",
    message: str = "",
    planId: str = "",
    recipient: str = "",
    recipientRole: str = "",
    action: str = "",
    timing: str = "",
    operationId: str = "",
) -> ToolResult:
    """Queue a household nudge / similar-task scan (simulated)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("notify.household", str(exc))
    note = fx["notify"]
    plan_id = _as_str(planId)
    recip = _as_str(recipient)
    role = _as_str(recipientRole)
    act = _as_str(action)
    when = _as_str(timing)
    op_id = _as_str(operationId)
    default_body = str(note["message"])
    if recip:
        body = (message or "").strip() or f"{default_body} → {recip}" + (f" ({role})" if role else "")
    else:
        body = (message or "").strip() or default_body
    if act:
        body = f"{body} · action={act}"
    if when:
        body = f"{body} · timing={when}"
    if plan_id:
        body = f"{body} · plan={plan_id}"
    who = f" · to {recip}" if recip else ""
    meta = f"notify queued · {note['channel']}{who} · sim"
    detail: dict[str, object] = {
        "channel": note["channel"],
        "message": body,
        "queued": True,
        "simulated": True,
        "planId": plan_id or None,
        "recipient": recip or None,
        "recipientRole": role or None,
        "action": act or None,
        "timing": when or None,
    }
    return _ok(
        "notify.household",
        meta,
        detail,
        observations={"summary": meta, "queued": True, "recipient": recip or None},
        operation_id=op_id or None,
    )


def task_open(
    *,
    scenario: str = "doorstep",
    planId: str = "",
    recipient: str = "",
    recipientRole: str = "",
    action: str = "",
    timing: str = "",
    operationId: str = "",
) -> ToolResult:
    """Open a guest/task artefact draft locally (no network write)."""
    try:
        fx = get_fixture(scenario)
    except KeyError as exc:
        return _err("task.open", str(exc))
    task = fx["task"]
    plan_id = _as_str(planId)
    recip = _as_str(recipient)
    role = _as_str(recipientRole)
    act = _as_str(action)
    when = _as_str(timing)
    op_id = _as_str(operationId)
    title = str(task["title"])
    if recip:
        title = f"{title} · for {recip}" + (f" ({role})" if role else "")
    meta = f"{task['id']} draft"
    detail: dict[str, object] = {
        "id": task["id"],
        "title": title,
        "status": "draft",
        "simulated": True,
        "planId": plan_id or None,
        "recipient": recip or None,
        "recipientRole": role or None,
        "action": act or None,
        "timing": when or None,
    }
    return _ok(
        "task.open",
        meta,
        detail,
        observations={
            "summary": meta,
            "id": task["id"],
            "status": "draft",
            "recipient": recip or None,
            "action": act or None,
        },
        operation_id=op_id or None,
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
