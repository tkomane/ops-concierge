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
