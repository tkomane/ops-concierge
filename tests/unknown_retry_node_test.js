#!/usr/bin/env node
/**
 * Regression: uncertain bridge ops must not resolve via mock on retry.
 * Run: node --test tests/unknown_retry_node_test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const app = read("js/app.js");

function slice(start, end) {
  const a = app.indexOf(start);
  const b = app.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error("Production boundaries changed: " + start);
  return app.slice(a, b);
}

const okRead = (tool, observations) => ({
  ok: true,
  source: "mock",
  tool,
  observations,
  outcome: {},
  error: null
});

function context(fetchImpl, memory = {}) {
  const c = {
    console,
    Date,
    Math,
    JSON,
    structuredClone,
    AbortController,
    setTimeout,
    clearTimeout,
    OPS_MCP: { enabled: true, baseUrl: "http://127.0.0.1:8766" },
    fetch: fetchImpl,
    localStorage: {
      getItem: (key) => memory[key] || null,
      setItem: (key, v) => {
        memory[key] = String(v);
      },
      removeItem: (key) => {
        delete memory[key];
      }
    },
    sleep: async () => {},
    setChips: () => {},
    proposalChips: () => [],
    renderCards: () => {},
    syncChrome: () => {},
    messages: [],
    timeline: [],
    opSeq: 0,
    reviewMemory: memory
  };
  c.window = c;
  vm.createContext(c);
  for (const rel of [
    "js/scenarios.js",
    "js/session-state.js",
    "js/planner.js",
    "js/intent.js",
    "js/mcp-client.js"
  ]) {
    vm.runInContext(read(rel), c, { filename: rel });
  }
  c.store = c.OpsState.createStore();
  c.store.startStory("doorstep");
  const proposal = c.OpsPlanner.buildProposal({
    storyId: "doorstep",
    results: [
      okRead("ring.query", { motion: true, parcelVisual: true }),
      okRead("order.lookup", { eta: "16:00-18:00 SAST" })
    ],
    facts: { neighbourAvailable: false }
  });
  c.store.setProposal(proposal);
  c.state = {
    scenarioId: "doorstep",
    scenario: c.store.getFixture(),
    sessionId: "review-session",
    phase: "proposed",
    proposal,
    lastResults: [],
    tools: [],
    messages: [],
    forceToolFail: false
  };
  c.pushMsg = (role, text) => {
    c.state.messages.push({ role, text });
  };
  c.pushTool = (name, status, meta) => {
    c.state.tools.push({ name, status, meta });
    return c.state.tools.length - 1;
  };
  c.updateTool = (i, status, meta) => {
    Object.assign(c.state.tools[i], { status, meta });
  };
  c.setThinking = (value) => {
    c.state.thinking = value;
  };
  for (const [a, b] of [
    ["  function nextOpId(", "\n  function persistDemo("],
    ["  function persistDemo(", "\n  function hydrateUiFromSession("],
    ["  function hydrateUiFromSession(", "\n  function syncSessionMessagesTools("],
    ["  function syncSessionMessagesTools(", "\n  function canResumeSession("],
    ["  function mcpArgsFor(", "\n  function renderChat("],
    ["  async function handleApprove(", "\n  async function switchToOtherStory("],
    ["  function ticketText(", "\n  function proposalCardHtml("]
  ]) {
    vm.runInContext(slice(a, b), c);
  }
  return c;
}

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});
const success = (tool, extra = {}) => ({
  ok: true,
  source: "bridge",
  operationId: "server_" + tool,
  tool,
  meta: tool + " ok",
  detail: extra
});

async function unknownRetry(reload) {
  const calls = [];
  let bridgeUp = true;
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/healthz")) {
      calls.push({ method: "GET", healthOk: bridgeUp });
      return response({ ok: bridgeUp }, bridgeUp ? 200 : 503);
    }
    calls.push({ method: "POST", request: JSON.parse(init.body) });
    throw new TypeError("Connection lost after POST dispatch");
  };
  const firstContext = context(fetchImpl);
  await firstContext.handleApprove("approve", { intent: "approve" });
  bridgeUp = false;
  let target = firstContext;
  if (reload) {
    target = context(fetchImpl, { ...firstContext.reviewMemory });
    assert.equal(target.store.load().ok, true);
    target.hydrateUiFromSession(target.store.getSession());
  }
  await target.handleApprove("approve", { intent: "approve" });
  return {
    firstPhase: firstContext.state.phase,
    phase: target.state.phase,
    counts: target.store.getActionCounts(),
    progress: target.store.getOperationProgress(target.state.proposal.planId),
    results: target.state.lastResults.slice(),
    calls
  };
}

describe("uncertain bridge retry must not mock-resolve", () => {
  it("immediate retry stays unresolved with zero mock successes", async () => {
    const out = await unknownRetry(false);
    assert.equal(out.firstPhase, "failed");
    assert.equal(out.phase, "failed");
    assert.deepEqual(out.counts, { notify: 0, task: 0 });
    assert.equal(out.progress.notify.status, "failed");
    assert.equal(out.progress.notify.source, "bridge");
    assert.equal(out.progress.notify.disposition, "unknown");
    assert.equal(out.progress.notify.operationId, "op_notify_household_1");
    assert.equal(out.progress.task == null || out.progress.task.status !== "done", true);
    const mockOk = out.results.filter(
      (r) => r.ok && r.source === "mock" && (r.tool === "notify.household" || r.tool === "task.open")
    );
    assert.equal(mockOk.length, 0);
    assert.equal(out.calls.filter((c) => c.method === "POST").length, 1);
  });

  it("retry after reload stays unresolved with zero mock successes", async () => {
    const out = await unknownRetry(true);
    assert.equal(out.phase, "failed");
    assert.deepEqual(out.counts, { notify: 0, task: 0 });
    assert.equal(out.progress.notify.disposition, "unknown");
    assert.equal(out.progress.notify.source, "bridge");
    const mockOk = out.results.filter(
      (r) => r.ok && r.source === "mock" && (r.tool === "notify.household" || r.tool === "task.open")
    );
    assert.equal(mockOk.length, 0);
  });

  it("ordinary notify-ok / task-fail resume still completes without re-notify", async () => {
    const calls = [];
    let taskAttempts = 0;
    const fetchImpl = async (url, init) => {
      if (url.endsWith("/healthz")) return response({ ok: true });
      const request = JSON.parse(init.body);
      calls.push(request);
      if (request.tool === "task.open" && ++taskAttempts === 1) {
        return response(
          {
            ok: false,
            source: "bridge",
            tool: request.tool,
            operationId: "failed_task",
            error: { code: "tool_error", message: "First task attempt failed" },
            meta: "task failed"
          },
          500
        );
      }
      return response(
        success(
          request.tool,
          request.tool === "task.open" ? { id: "GUEST-10421", status: "draft" } : { queued: true }
        )
      );
    };
    const c = context(fetchImpl);
    await c.handleApprove("approve", { intent: "approve" });
    assert.equal(c.state.phase, "failed");
    await c.handleApprove("approve", { intent: "approve" });
    assert.equal(c.state.phase, "acted");
    assert.deepEqual(c.store.getActionCounts(), { notify: 1, task: 1 });
    assert.deepEqual(
      calls.map((r) => r.tool),
      ["notify.household", "task.open", "task.open"]
    );
  });
});
