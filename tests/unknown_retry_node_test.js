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
    const failedProg = c.store.getOperationProgress(c.state.proposal.planId);
    assert.equal(failedProg.task.operationId, "op_task_open_2");
    assert.equal(failedProg.task.responseOperationId, "failed_task");
    await c.handleApprove("approve", { intent: "approve" });
    assert.equal(c.state.phase, "acted");
    assert.deepEqual(c.store.getActionCounts(), { notify: 1, task: 1 });
    assert.deepEqual(
      calls.map((r) => r.tool),
      ["notify.household", "task.open", "task.open"]
    );
    assert.deepEqual(
      calls.filter((r) => r.tool === "task.open").map((r) => r.arguments.operationId),
      ["op_task_open_2", "op_task_open_2"]
    );
  });
});

async function stableIdSequence(tool, uncertainFirst, reload) {
  const calls = [];
  let attempts = 0;
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/healthz")) return response({ ok: true });
    const request = JSON.parse(init.body);
    calls.push(request);
    if (request.tool === tool) {
      attempts += 1;
      if (uncertainFirst && attempts === 1) {
        throw new TypeError("Response lost after dispatch");
      }
      if (attempts === (uncertainFirst ? 2 : 1)) {
        return response(
          {
            ok: false,
            source: "bridge",
            tool: request.tool,
            operationId: tool === "task.open" ? "failed_task" : "failed_notify",
            error: { code: "bridge_failure", message: "Injected structured 500" },
            meta: "bridge:bridge_failure",
            failureKind: "bridge_failure",
            fallback: "none"
          },
          500
        );
      }
    }
    return response(
      success(
        request.tool,
        request.tool === "task.open" ? { id: "GUEST-10421", status: "draft" } : { queued: true }
      )
    );
  };
  let c = context(fetchImpl);
  const stages = [];
  const expected =
    tool === "task.open" ? "op_task_open_2" : "op_notify_household_1";
  for (let stage = 0; stage < (uncertainFirst ? 3 : 2); stage++) {
    if (stage > 0 && reload) {
      c = context(fetchImpl, { ...c.reviewMemory });
      assert.equal(c.store.load().ok, true);
      c.hydrateUiFromSession(c.store.getSession());
    }
    if (stage > 0) await c.OpsMcpClient.probeHealth(true);
    await c.handleApprove("approve", { intent: "approve" });
    const progress = c.store.getOperationProgress(c.state.proposal.planId);
    const entry = tool === "task.open" ? progress.task : progress.notify;
    stages.push({
      phase: c.state.phase,
      counts: c.store.getActionCounts(),
      operationId: entry && entry.operationId,
      responseOperationId: entry && entry.responseOperationId,
      disposition: entry && entry.disposition,
      status: entry && entry.status
    });
  }
  const operationIds = calls.filter((x) => x.tool === tool).map((x) => x.arguments.operationId);
  return { tool, uncertainFirst, reload, expected, operationIds, stages, calls, phase: c.state.phase, counts: c.store.getActionCounts() };
}

describe("stable client operation identity across structured 500s", () => {
  for (const tool of ["notify.household", "task.open"]) {
    for (const uncertainFirst of [false, true]) {
      for (const reload of [false, true]) {
        const label =
          tool +
          (uncertainFirst ? " unknown→500→success" : " 500→success") +
          (reload ? " after reload" : " immediate");
        it(label, async () => {
          const out = await stableIdSequence(tool, uncertainFirst, reload);
          assert.equal(out.phase, "acted");
          assert.deepEqual(out.counts, { notify: 1, task: 1 });
          assert.equal(new Set(out.operationIds).size, 1);
          assert.equal(out.operationIds[0], out.expected);
          for (const stage of out.stages) {
            assert.equal(stage.operationId, out.expected);
          }
          const failedStages = out.stages.filter((s) => s.status === "failed");
          assert.ok(failedStages.length >= 1);
          const structuredFail = failedStages[failedStages.length - 1];
          assert.equal(
            structuredFail.responseOperationId,
            tool === "task.open" ? "failed_task" : "failed_notify"
          );
          if (uncertainFirst) {
            assert.equal(structuredFail.disposition, "unknown");
            assert.equal(failedStages[0].disposition, "unknown");
            assert.equal(failedStages[0].operationId, out.expected);
          }
        });
      }
    }
  }
});

