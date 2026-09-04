"""Run Ops Concierge MCP over Streamable HTTP.

Default: 127.0.0.1:8766/mcp with Host/Origin DNS-rebinding protection.
"""

from __future__ import annotations

import argparse
import os

from mcp_server.server import create_server


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m mcp_server",
        description="Ops Concierge self-hosted MCP (Streamable HTTP)",
    )
    p.add_argument("--host", default=os.environ.get("OPS_MCP_HOST", "127.0.0.1"))
    p.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("OPS_MCP_PORT", "8766")),
    )
    p.add_argument(
        "--path",
        default=os.environ.get("OPS_MCP_PATH", "/mcp"),
        help="Streamable HTTP mount path (default /mcp)",
    )
    p.add_argument(
        "--json-response",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Prefer JSON responses for Streamable HTTP (default: true)",
    )
    return p


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    server = create_server()
    # SDK auto-enables TransportSecuritySettings for localhost hosts.
    server.run(
        transport="streamable-http",
        host=args.host,
        port=args.port,
        streamable_http_path=args.path,
        json_response=args.json_response,
    )


if __name__ == "__main__":
    main()
