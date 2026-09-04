"""Ops Concierge MCP server package (Streamable HTTP)."""

from __future__ import annotations

__version__ = "0.1.0"

__all__ = ["__version__", "create_server"]


def __getattr__(name: str):
    if name == "create_server":
        from mcp_server.server import create_server

        return create_server
    raise AttributeError(name)
