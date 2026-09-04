"""Adaptive household flow — Worker A behaviour tests.

Runs the Node test suite for js/session-state.js, js/planner.js, js/intent.js.
Also includes a few static contract checks that do not require Node execution.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
NODE_TEST = ROOT / "tests" / "adaptive_flow_node_test.js"
JS_FILES = (
    ROOT / "js" / "session-state.js",
    ROOT / "js" / "planner.js",
    ROOT / "js" / "intent.js",
)


def test_worker_a_modules_exist():
    for path in JS_FILES:
        assert path.is_file(), f"missing {path.relative_to(ROOT)}"
    assert NODE_TEST.is_file()


def test_modules_export_expected_globals():
    """Static shape check — globals lead will wire from index.html classic scripts."""
    state = (ROOT / "js" / "session-state.js").read_text(encoding="utf-8")
    planner = (ROOT / "js" / "planner.js").read_text(encoding="utf-8")
    intent = (ROOT / "js" / "intent.js").read_text(encoding="utf-8")

    assert "window.OpsState" in state or "root.OpsState" in state
    assert "createStore" in state
    assert "ops-demo-v1" in state
    assert "cloneFixture" in state
    assert "switchStory" in state

    assert "window.OpsPlanner" in planner or "root.OpsPlanner" in planner
    assert "buildProposal" in planner
    assert "replan" in planner
    assert "canClaimVisitorIdentity" in planner
    assert "GUEST-10421" in planner

    assert "window.OpsIntent" in intent or "root.OpsIntent" in intent
    assert "classify" in intent
    assert "ask_info" in intent
    assert "decline" in intent
    assert "approve" in intent
    assert "replan_facts" in intent
    assert "ambiguous" in intent


def test_intent_source_avoids_broad_guest_code_approve():
    """Guard: classifier must mention the canonical refusal utterances."""
    intent = (ROOT / "js" / "intent.js").read_text(encoding="utf-8")
    assert "not yet" in intent
    assert "isDecline" in intent
    assert "isAskInfo" in intent
    assert "isApprove" in intent
    # approve path should require explicit make/create — not bare includes("guest code")
    assert "make the guest code" in intent


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_adaptive_flow_node_suite():
    proc = subprocess.run(
        ["node", "--test", str(NODE_TEST)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise AssertionError(
            "node --test failed\n"
            f"stdout:\n{proc.stdout}\n"
            f"stderr:\n{proc.stderr}"
        )
    # node --test prints "# pass N" on success
    assert "fail 0" in proc.stdout or "# fail 0" in proc.stdout or proc.returncode == 0


UNKNOWN_RETRY_NODE_TEST = ROOT / "tests" / "unknown_retry_node_test.js"


def test_app_binds_uncertain_retries_to_bridge_source():
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
    assert "function operationBoundToBridge(" in app
    assert "function operationProgressFields(" in app
    assert "notifyRequireBridge" in app
    assert "taskRequireBridge" in app
    assert 'disposition: "unknown"' in app or "disposition === \"unknown\"" in app


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_unknown_retry_node_suite():
    assert UNKNOWN_RETRY_NODE_TEST.is_file()
    proc = subprocess.run(
        ["node", "--test", str(UNKNOWN_RETRY_NODE_TEST)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise AssertionError(
            "unknown retry node --test failed\n"
            f"stdout:\n{proc.stdout}\n"
            f"stderr:\n{proc.stderr}"
        )
