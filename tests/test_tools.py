"""Unit tests for pure MCP tool handlers."""

from __future__ import annotations


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


def test_tool_names_match_product():
    assert TOOL_NAMES == (
        "ring.query",
        "order.lookup",
        "session.ack",
        "calendar.propose",
        "notify.household",
        "task.open",
    )


def test_ring_query_doorstep():
    r = ring_query(zone="stoop", scenario="doorstep")
    assert r["ok"] is True
    assert r["tool"] == "ring.query"
    assert "ring-front-door" in r["meta"]
    assert r["detail"]["simulated"] is True
    assert "Azure" not in str(r)
    assert "GreenLake" not in str(r)


def test_ring_query_requires_zone():
    r = ring_query(zone="  ", scenario="doorstep")
    assert r["ok"] is False
    assert "zone" in r["error"]


def test_order_lookup_and_task_guest():
    o = order_lookup(scenario="doorstep")
    assert o["ok"] is True
    assert "702-8842101" in str(o["detail"]["resource"])
    t = task_open(scenario="doorstep")
    assert t["ok"] is True
    assert t["detail"]["id"] == "GUEST-10421"


def test_bedtime_fixture_task():
    t = task_open(scenario="bedtime")
    assert t["ok"] is True
    assert t["detail"]["id"] == "TASK-22018"
    c = calendar_propose(scenario="bedtime")
    assert "19:15" in c["meta"]


def test_session_ack_requires_id():
    bad = session_ack(session_id="")
    assert bad["ok"] is False
    good = session_ack(session_id="sess-abc", artefact_hint="GUEST-10421")
    assert good["ok"] is True
    assert "ACK GUEST-10421" in good["meta"]


def test_notify_household():
    n = notify_household(scenario="doorstep")
    assert n["ok"] is True
    assert "notify queued" in n["meta"]


def test_unknown_scenario():
    r = ring_query(zone="x", scenario="datacenter")
    assert r["ok"] is False
    assert "Unknown scenario" in r["error"]


def test_dispatch_unknown_tool():
    r = dispatch("azure.vm", {})
    assert r["ok"] is False
    assert "Unknown tool" in r["error"]


def test_dispatch_filters_extra_kwargs():
    r = dispatch("session.ack", {"session_id": "s1", "extra": "nope"})
    assert r["ok"] is True


def test_ring_and_order_expose_typed_observations():
    r = ring_query(zone="stoop", scenario="doorstep")
    assert r["ok"] is True
    assert r["observations"]["motion"] is True
    assert r["observations"]["parcelVisual"] is True
    o = order_lookup(scenario="doorstep")
    assert o["observations"]["eta"]
    assert o["observations"]["carrier"] == "AMZL"


def test_notify_and_task_consume_plan_fields():
    a = notify_household(
        scenario="doorstep",
        planId="plan_1",
        recipient="Thabo",
        recipientRole="neighbour",
        action="notify_handoff",
        timing="18:00-18:30 SAST",
        operationId="op_notify_1",
    )
    b = notify_household(
        scenario="doorstep",
        planId="plan_2",
        recipient="Mira",
        recipientRole="parent",
        action="defer_handoff_parent",
        timing="18:20-18:45 SAST",
        operationId="op_notify_2",
    )
    assert a["ok"] and b["ok"]
    assert a["operationId"] == "op_notify_1"
    assert b["operationId"] == "op_notify_2"
    assert a["detail"]["recipient"] == "Thabo"
    assert b["detail"]["recipient"] == "Mira"
    assert a["detail"]["action"] == "notify_handoff"
    assert b["detail"]["action"] == "defer_handoff_parent"
    assert a["meta"] != b["meta"]
    assert "Thabo" in a["detail"]["message"]
    assert "Mira" in b["detail"]["message"]

    t1 = task_open(
        scenario="doorstep",
        planId="plan_1",
        recipient="Thabo",
        action="notify_handoff",
        operationId="op_task_1",
    )
    t2 = task_open(
        scenario="doorstep",
        planId="plan_2",
        recipient="Mira",
        action="defer_handoff_parent",
        operationId="op_task_2",
    )
    assert t1["operationId"] == "op_task_1"
    assert t2["operationId"] == "op_task_2"
    assert t1["detail"]["status"] == "draft"
    assert t1["detail"]["recipient"] == "Thabo"
    assert t2["detail"]["recipient"] == "Mira"
    assert t1["detail"]["title"] != t2["detail"]["title"]
