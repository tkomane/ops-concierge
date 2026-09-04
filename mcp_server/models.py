"""Typed contracts for Ops Concierge MCP tools."""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict


ScenarioId = Literal["doorstep", "bedtime"]


class ToolOk(TypedDict):
    ok: Literal[True]
    tool: str
    meta: str
    detail: dict[str, object]
    observations: NotRequired[dict[str, object]]
    operationId: NotRequired[str]


class ToolErr(TypedDict):
    ok: Literal[False]
    tool: str
    meta: str
    error: str


ToolResult = ToolOk | ToolErr
