"""Review-only: capture the real HTTP route's response to a handler exception."""
import json
import sys
from unittest.mock import patch

sys.path.insert(0, sys.argv[1])
from starlette.testclient import TestClient
from mcp_server import server

results = []
for tool, operation_id in [
    ("notify.household", "op_notify_household_1"),
    ("task.open", "op_task_open_2"),
]:
    payload = {
        "tool": tool,
        "arguments": {"scenario": "doorstep", "operationId": operation_id},
    }
    with patch.object(server, "dispatch", side_effect=RuntimeError("Review-injected handler exception")):
        with TestClient(server.create_http_app()) as client:
            response = client.post("/demo/call", json=payload)
    results.append({"request": payload, "status": response.status_code, "body": response.json()})

print(json.dumps({
    "method": "Actual production HTTP route through Starlette TestClient; dispatcher raises an injected exception; no socket listener",
    "checkout": sys.argv[1],
    "results": results,
}, indent=2))
