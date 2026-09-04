#!/usr/bin/env node
/**
 * Behavioural unit tests for OpsState / OpsPlanner / OpsIntent.
 * Run: node --test tests/adaptive_flow_node_test.js
 * (Also invoked from tests/test_adaptive_flow.py)
 */
"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadScripts() {
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    structuredClone: typeof structuredClone === "function" ? structuredClone : undefined,
    module: { exports: {} },
    exports: {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  const mem = Object.create(null);
  sandbox.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
    _mem: mem
  };

  const files = [
    "js/scenarios.js",
    "js/session-state.js",
    "js/planner.js",
    "js/intent.js"
  ];
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    vm.runInNewContext(code, sandbox, { filename: rel });
  }
  return sandbox;
}

describe("OpsIntent — refusal vs approve vs ask_info", () => {
  let OpsIntent;
  beforeEach(() => {
    ({ OpsIntent } = loadScripts());
  });

  it("Don't make the guest code → decline", () => {
    assert.equal(OpsIntent.classify("Don't make the guest code").intent, "decline");
    assert.equal(OpsIntent.classify("Don’t make the guest code").intent, "decline");
    assert.equal(OpsIntent.classify("do not make the guest code").intent, "decline");
  });

  it("not yet → decline", () => {
    assert.equal(OpsIntent.classify("not yet").intent, "decline");
    assert.equal(OpsIntent.classify("Not yet — keep planning").intent, "decline");
  });

  it("What is a guest code? → ask_info", () => {
    assert.equal(OpsIntent.classify("What is a guest code?").intent, "ask_info");
    assert.equal(OpsIntent.classify("what is a guest code").intent, "ask_info");
  });

  it("make the guest code → approve only when explicit positive", () => {
    assert.equal(OpsIntent.classify("make the guest code").intent, "approve");
    assert.equal(OpsIntent.classify("Make the guest code").intent, "approve");
    assert.equal(OpsIntent.classify("please make the guest code").intent, "approve");
    assert.equal(OpsIntent.classify("approve").intent, "approve");
    assert.equal(OpsIntent.classify("go ahead").intent, "approve");
  });

  it("mere guest-code mention is not approve", () => {
    assert.notEqual(OpsIntent.classify("guest code").intent, "approve");
    assert.notEqual(OpsIntent.classify("about the guest code").intent, "approve");
  });

  it("neighbour unavailable → replan_facts", () => {
    assert.equal(
      OpsIntent.classify("The neighbour is unavailable").intent,
      "replan_facts"
    );
    assert.equal(OpsIntent.classify("Thabo can't make it").intent, "replan_facts");
  });
});

describe("OpsPlanner — proposals and replan", () => {
  let OpsPlanner;
  beforeEach(() => {
    ({ OpsPlanner } = loadScripts());
    OpsPlanner._resetSeq(0);
  });

  const ringOk = {
    ok: true,
    source: "mock",
    operationId: "op_ring_1",
    tool: "ring.query",
    observations: {
      motion: true,
      zone: "stoop",
      summary: "ring motion at front door — person + cardboard parcel"
    },
    outcome: {},
    error: null,
    meta: "ring motion at front door"
  };
  const orderOk = {
    ok: true,
    source: "mock",
    operationId: "op_order_1",
    tool: "order.lookup",
    observations: {
      eta: "16:00–18:00",
      carrier: "AMZL",
      summary: "AMZL stop nearby"
    },
    outcome: {},
    error: null,
    meta: "AMZL stop nearby"
  };

  it("builds doorstep proposal with Thabo + optional sampleRef", () => {
    const p = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [ringOk, orderOk]
    });
    assert.equal(p.recipient.name, "Thabo");
    assert.equal(p.recipient.role, "neighbour");
    assert.equal(p.action, "notify_handoff");
    assert.equal(p.status, "draft");
    assert.equal(p.sampleRef, "GUEST-10421");
    assert.ok(p.planId.startsWith("plan_"));
    assert.ok(Array.isArray(p.observations) && p.observations.length);
    assert.ok(Array.isArray(p.assumptions) && p.assumptions.length);
    assert.ok(p.timing && p.timing.timezone === "Africa/Johannesburg");
  });

  it("never claims visitor identity from order ETA alone", () => {
    assert.equal(OpsPlanner.canClaimVisitorIdentity([orderOk]), false);
    const p = OpsPlanner.buildProposal({ storyId: "doorstep", results: [orderOk] });
    assert.equal(p.identityClaim, "no_confident_visitor_identity");
    assert.ok(
      p.assumptions.some((a) => /order ETA alone|not verified/i.test(a)) ||
        /not enough|ETA|identity/i.test(p.explanation)
    );
  });

  it("replan on neighbour unavailable changes recipient", () => {
    const first = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [ringOk, orderOk]
    });
    assert.equal(first.recipient.name, "Thabo");
    const { superseded, proposal } = OpsPlanner.replan({
      storyId: "doorstep",
      results: [ringOk, orderOk],
      priorProposal: first,
      facts: { neighbourAvailable: false }
    });
    assert.equal(superseded.status, "superseded");
    assert.equal(superseded.planId, first.planId);
    assert.notEqual(proposal.planId, first.planId);
    assert.equal(proposal.recipient.name, "Mira");
    assert.equal(proposal.recipient.role, "parent");
    assert.notEqual(proposal.action, first.action);
    assert.ok(/unavailable|Mira|shifts/i.test(proposal.explanation));
  });
});

describe("OpsState — phases, switch, resume, approval", () => {
  let OpsState, OpsPlanner, OPS_SCENARIOS;

  beforeEach(() => {
    ({ OpsState, OpsPlanner, OPS_SCENARIOS } = loadScripts());
    OpsPlanner._resetSeq(0);
  });

  function doorstepResults() {
    return [
      {
        ok: true,
        source: "mock",
        operationId: "op_1",
        tool: "ring.query",
        observations: { summary: "ring motion at front door", parcel: true },
        outcome: {},
        error: null,
        meta: "ring motion"
      },
      {
        ok: true,
        source: "mock",
        operationId: "op_2",
        tool: "order.lookup",
        observations: { summary: "AMZL stop nearby", eta: "18:00" },
        outcome: {},
        error: null,
        meta: "AMZL"
      }
    ];
  }

  it("clones fixtures without mutating seeds", () => {
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    const seedTitle = OPS_SCENARIOS.doorstep.window.proposed;
    store.startStory("doorstep");
    store.mutateFixture((f) => {
      f.window.proposed = "MUTATED WINDOW";
      f._backup = true;
    });
    store.setBackupChoice({ plan: "alt" });
    assert.equal(OPS_SCENARIOS.doorstep.window.proposed, seedTitle);
    assert.equal(store.getFixture().window.proposed, "MUTATED WINDOW");
    store.resetFresh("doorstep");
    assert.equal(store.getFixture().window.proposed, seedTitle);
    assert.equal(store.getBackupChoice(), null);
    assert.equal(OPS_SCENARIOS.doorstep.window.proposed, seedTitle);
  });

  it("switch doorstep↔bedtime preserves sessions without seed leak", () => {
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    store.startStory("doorstep");
    const p1 = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: doorstepResults()
    });
    store.setProposal(p1);
    store.setBackupChoice({ recipient: "Thabo-alt" });
    store.mutateFixture((f) => {
      f.window.alt = "SESSION-ONLY ALT";
    });

    store.switchStory("bedtime");
    store.startStory("bedtime");
    assert.equal(store.getActive(), "bedtime");
    assert.equal(store.getPhase(), "inspecting");
    assert.equal(store.getBackupChoice(), null);

    store.switchStory("doorstep");
    assert.equal(store.getActive(), "doorstep");
    assert.equal(store.getPhase(), "proposed");
    assert.equal(store.getProposal().planId, p1.planId);
    assert.deepEqual(store.getBackupChoice(), { recipient: "Thabo-alt" });
    assert.equal(store.getFixture().window.alt, "SESSION-ONLY ALT");
    assert.notEqual(OPS_SCENARIOS.doorstep.window.alt, "SESSION-ONLY ALT");
  });

  it("resume save/load/clear for ops-demo-v1", () => {
    const mem = {
      getItem() {
        return this._v || null;
      },
      setItem(k, v) {
        this._v = String(v);
      },
      removeItem() {
        this._v = null;
      }
    };
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    store.startStory("doorstep");
    const p = OpsPlanner.buildProposal({ storyId: "doorstep", results: doorstepResults() });
    store.setProposal(p);
    const saved = store.save();
    assert.equal(saved.ok, true);
    assert.equal(store.STORAGE_KEY, "ops-demo-v1");
    assert.ok(mem._v.indexOf('"v":1') !== -1);

    const store2 = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    const loaded = store2.load();
    assert.equal(loaded.ok, true);
    assert.equal(store2.getActive(), "doorstep");
    assert.equal(store2.getProposal().planId, p.planId);

    store2.clear();
    assert.equal(mem._v, null);
    assert.equal(store2.getActive(), null);
    assert.equal(store2.getPhase(), "idle");
  });

  it("rejects superseded approval; idempotent approve", () => {
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    store.startStory("doorstep");
    const first = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: doorstepResults()
    });
    store.setProposal(first);

    const { superseded, proposal: second } = OpsPlanner.replan({
      storyId: "doorstep",
      results: doorstepResults(),
      priorProposal: first,
      facts: { neighbourAvailable: false }
    });
    store.supersede(second);
    assert.equal(store.getPhase(), "proposed");
    assert.equal(store.getProposal().recipient.name, "Mira");

    const bad = store.approve(superseded.planId);
    assert.equal(bad.ok, false);
    assert.equal(bad.reason, "superseded");

    const ok1 = store.approve();
    assert.equal(ok1.ok, true);
    assert.equal(ok1.idempotent, false);
    assert.equal(store.getPhase(), "approved");
    store.markActed({ ok: true, source: "mock", operationId: "op_act", tool: "notify.household", outcome: { queued: true }, error: null });
    assert.equal(store.getPhase(), "acted");

    const ok2 = store.approve(second.planId);
    assert.equal(ok2.ok, true);
    assert.equal(ok2.idempotent, true);
  });

  it("refuse sets refused phase without acting", () => {
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    store.startStory("doorstep");
    store.setProposal(
      OpsPlanner.buildProposal({ storyId: "doorstep", results: doorstepResults() })
    );
    const r = store.refuse();
    assert.equal(r.ok, true);
    assert.equal(store.getPhase(), "refused");
    assert.equal(store.getProposal().status, "refused");
  });
});

describe("Intent+State integration — refuse vs approve path", () => {
  it("decline utterance does not approve", () => {
    const { OpsIntent, OpsState, OpsPlanner, OPS_SCENARIOS } = loadScripts();
    OpsPlanner._resetSeq(0);
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    store.startStory("doorstep");
    store.setProposal(
      OpsPlanner.buildProposal({
        storyId: "doorstep",
        results: [
          {
            ok: true,
            source: "mock",
            operationId: "op_x",
            tool: "ring.query",
            observations: { motion: true, parcelVisual: true, summary: "ring motion at front door — parcel" },
            outcome: {},
            error: null
          },
          {
            ok: true,
            source: "mock",
            operationId: "op_x2",
            tool: "order.lookup",
            observations: { eta: "16:00-18:00 SAST", carrier: "AMZL" },
            outcome: {},
            error: null
          }
        ]
      })
    );
    const intent = OpsIntent.classify("Don't make the guest code");
    assert.equal(intent.intent, "decline");
    if (intent.intent === "decline") store.refuse();
    assert.equal(store.getPhase(), "refused");
    assert.notEqual(store.getProposal().status, "confirmed");
  });

  it("approve utterance confirms current plan once", () => {
    const { OpsIntent, OpsState, OpsPlanner, OPS_SCENARIOS } = loadScripts();
    OpsPlanner._resetSeq(0);
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS });
    store.startStory("doorstep");
    store.setProposal(
      OpsPlanner.buildProposal({
        storyId: "doorstep",
        results: [
          {
            ok: true,
            source: "mock",
            operationId: "op_y",
            tool: "ring.query",
            observations: { motion: true, parcelVisual: true, summary: "ring motion + parcel" },
            outcome: {},
            error: null
          },
          {
            ok: true,
            source: "mock",
            operationId: "op_y2",
            tool: "order.lookup",
            observations: { eta: "16:00-18:00 SAST", carrier: "AMZL" },
            outcome: {},
            error: null
          }
        ]
      })
    );
    const intent = OpsIntent.classify("make the guest code");
    assert.equal(intent.intent, "approve");
    const a = store.approve();
    assert.equal(a.ok, true);
    assert.equal(store.getProposal().status, "confirmed");
  });
});


describe("OpsIntent — bounded consent (corrections 003)", () => {
  let OpsIntent;
  beforeEach(() => {
    ({ OpsIntent } = loadScripts());
  });

  it("Confirm whether… and Approve only if… are not approve", () => {
    assert.equal(OpsIntent.classify("Confirm whether Mira is available").intent, "ask_info");
    assert.equal(OpsIntent.classify("Approve only if the parcel is ours").intent, "ask_info");
  });

  it("Approve plan_1 carries explicit planId", () => {
    const c = OpsIntent.classify("Approve plan_1");
    assert.equal(c.intent, "approve");
    assert.equal(c.planId, "plan_1");
  });
});

describe("OpsPlanner — typed evidence (corrections 003)", () => {
  let OpsPlanner;
  beforeEach(() => {
    ({ OpsPlanner } = loadScripts());
    OpsPlanner._resetSeq(0);
  });

  it("motion:false / parcelVisual:false are negatives", () => {
    const ev = OpsPlanner.evidenceAssessment([
      {
        ok: true,
        tool: "ring.query",
        observations: { motion: false, parcelVisual: false },
        outcome: {},
        error: null
      },
      {
        ok: true,
        tool: "order.lookup",
        observations: { eta: "16:00-18:00 SAST" },
        outcome: {},
        error: null
      }
    ]);
    assert.equal(ev.hasRingMotion, false);
    assert.equal(ev.hasParcelVisual, false);
    assert.equal(ev.canClaimVisitorIdentity, false);
  });

  it("calendar neighbourAvailable:false changes recipient and timing", () => {
    const event = {
      ok: true,
      tool: "ring.query",
      observations: { motion: true, parcelVisual: true },
      outcome: {},
      error: null
    };
    const order = {
      ok: true,
      tool: "order.lookup",
      observations: { eta: "16:00-18:00 SAST" },
      outcome: {},
      error: null
    };
    const a = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [event, order, { ok: true, tool: "calendar.propose", observations: { proposed: "18:00-18:30 SAST", neighbourAvailable: true }, outcome: {}, error: null }]
    });
    const b = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [event, order, { ok: true, tool: "calendar.propose", observations: { proposed: "20:00-20:30 SAST", neighbourAvailable: false }, outcome: {}, error: null }]
    });
    assert.equal(a.recipient.name, "Thabo");
    assert.equal(b.recipient.name, "Mira");
    assert.notEqual(a.timing.windowLabel, b.timing.windowLabel);
  });

  it("mismatched / failed reads are not approvable", () => {
    const { OpsState } = loadScripts();
    OpsPlanner._resetSeq(0);
    const mismatched = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [
        { ok: true, tool: "ring.query", observations: { motion: true, parcelVisual: true }, outcome: {}, error: null },
        { ok: true, tool: "order.lookup", observations: { matched: false, eta: "16:00-18:00 SAST" }, outcome: {}, error: null }
      ]
    });
    assert.equal(mismatched.needsClarification, true);
    const store = OpsState.createStore();
    store.startStory("doorstep");
    store.setProposal(mismatched);
    const approval = store.approve(mismatched.planId);
    assert.equal(approval.ok, false);
    assert.equal(approval.reason, "needs_clarification");

    const failed = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [
        { ok: false, tool: "ring.query", observations: null, outcome: null, error: { code: "x", message: "fail" } },
        { ok: false, tool: "order.lookup", observations: null, outcome: null, error: { code: "x", message: "fail" } }
      ]
    });
    assert.equal(failed.needsClarification, true);
    assert.equal(failed.action, "ask_clarification");
  });

  it("bedtime Mira unavailable changes recipient away from Mira", () => {
    const bedOk = [
      { ok: true, tool: "ring.query", observations: { motion: true, summary: "presence" }, outcome: {}, error: null },
      { ok: true, tool: "order.lookup", observations: { summary: "Fire TV kids profile streaming" }, outcome: {}, error: null }
    ];
    const first = OpsPlanner.buildProposal({ storyId: "bedtime", results: bedOk });
    assert.equal(first.recipient.name, "Mira");
    const { proposal } = OpsPlanner.replan({
      storyId: "bedtime",
      results: bedOk,
      priorProposal: first,
      facts: { miraAvailable: false, caregiverAvailable: false }
    });
    assert.notEqual(proposal.recipient.name, "Mira");
    assert.equal(proposal.action, "auto_pause_firetv");
  });
});

describe("OpsState — full session persistence (corrections 003)", () => {
  it("setUiState survives save/load with messages tools lastResults", () => {
    const { OpsState, OpsPlanner, OPS_SCENARIOS } = loadScripts();
    OpsPlanner._resetSeq(0);
    const mem = {
      getItem() { return this._v || null; },
      setItem(k, v) { this._v = String(v); },
      removeItem() { this._v = null; }
    };
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    store.startStory("doorstep");
    const p = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [
        { ok: true, tool: "ring.query", observations: { motion: true, parcelVisual: true }, outcome: {}, error: null }
      ]
    });
    store.setProposal(p);
    store.setUiState({
      messages: [{ role: "user", text: "hi", at: "t" }],
      tools: [{ name: "ring.query", status: "ok", meta: "m", at: "t" }],
      lastResults: [{ ok: true, tool: "ring.query" }],
      phase: "proposed"
    });
    store.bumpAction("notify");
    store.save();
    const store2 = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    assert.equal(store2.load().ok, true);
    const snap = store2.getSession("doorstep");
    assert.equal(snap.messages.length, 1);
    assert.equal(snap.tools.length, 1);
    assert.equal(snap.lastResults.length, 1);
    assert.equal(snap.actionCounts.notify, 1);
    assert.equal(snap.selectedPlanId, p.planId);
  });
});


describe("OpsIntent — unconditional approval grammar (NEXT)", () => {
  let OpsIntent;
  beforeEach(() => {
    ({ OpsIntent } = loadScripts());
  });

  it("conditional suffixes are not approve", () => {
    const cases = [
      "Go ahead if the parcel is ours",
      "Do it after Mira confirms",
      "Yes, approve if Mira is available",
      "Approve plan_1 when Mira confirms",
      "Go ahead if Mira confirms"
    ];
    for (const utterance of cases) {
      const c = OpsIntent.classify(utterance);
      assert.notEqual(c.intent, "approve", utterance);
      assert.equal(c.intent, "ask_info", utterance);
    }
  });

  it("complete unconditional utterances remain approve", () => {
    assert.equal(OpsIntent.classify("go ahead").intent, "approve");
    assert.equal(OpsIntent.classify("do it").intent, "approve");
    assert.equal(OpsIntent.classify("yes, approve").intent, "approve");
    assert.equal(OpsIntent.classify("Approve plan_1").intent, "approve");
    assert.equal(OpsIntent.classify("please approve the plan").intent, "approve");
  });
});

describe("OpsPlanner — evidence gates both stories (NEXT)", () => {
  let OpsPlanner, OpsState;
  beforeEach(() => {
    ({ OpsPlanner, OpsState } = loadScripts());
    OpsPlanner._resetSeq(0);
  });

  function assertNotApprovable(name, storyId, results) {
    const p = OpsPlanner.buildProposal({ storyId, results });
    assert.equal(p.needsClarification, true, name + " needsClarification");
    assert.equal(p.action, "ask_clarification", name + " action");
    const store = OpsState.createStore();
    store.startStory(storyId);
    store.setProposal(p);
    const approval = store.approve(p.planId);
    assert.equal(approval.ok, false, name + " approve");
    assert.equal(approval.reason, "needs_clarification", name + " reason");
  }

  it("Doorstep no results / negative / failed order are not approvable", () => {
    assertNotApprovable("no_results", "doorstep", []);
    assertNotApprovable("false_event_no_order", "doorstep", [
      { ok: true, tool: "ring.query", observations: { motion: false, parcelVisual: false }, outcome: {}, error: null }
    ]);
    assertNotApprovable("order_failed", "doorstep", [
      { ok: true, tool: "ring.query", observations: { motion: true, parcelVisual: true }, outcome: {}, error: null },
      { ok: false, tool: "order.lookup", error: { code: "unavailable" }, observations: null, outcome: null }
    ]);
  });

  it("Bedtime all inspection reads failed is not approvable", () => {
    assertNotApprovable("all_bedtime_reads_failed", "bedtime", [
      { ok: false, tool: "ring.query", error: { code: "unavailable" }, observations: null, outcome: null },
      { ok: false, tool: "order.lookup", error: { code: "unavailable" }, observations: null, outcome: null }
    ]);
  });
});

describe("OpsState — operation progress (NEXT)", () => {
  it("persists per-plan notify/task progress across save/load", () => {
    const { OpsState, OpsPlanner, OPS_SCENARIOS } = loadScripts();
    OpsPlanner._resetSeq(0);
    const mem = {
      getItem() { return this._v || null; },
      setItem(k, v) { this._v = String(v); },
      removeItem() { this._v = null; }
    };
    const store = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    store.startStory("doorstep");
    const p = OpsPlanner.buildProposal({
      storyId: "doorstep",
      results: [
        { ok: true, tool: "ring.query", observations: { motion: true, parcelVisual: true }, outcome: {}, error: null },
        { ok: true, tool: "order.lookup", observations: { eta: "16:00-18:00 SAST", carrier: "AMZL" }, outcome: {}, error: null }
      ]
    });
    store.setProposal(p);
    store.setOperationProgress(p.planId, "notify", { status: "done", operationId: "op_notify_stable" });
    store.setOperationProgress(p.planId, "task", { status: "failed", operationId: "op_task_stable" });
    store.save();
    const store2 = OpsState.createStore({ scenarios: OPS_SCENARIOS, storage: mem });
    assert.equal(store2.load().ok, true);
    store2.switchStory("doorstep");
    const prog = store2.getOperationProgress(p.planId);
    assert.equal(prog.notify.status, "done");
    assert.equal(prog.notify.operationId, "op_notify_stable");
    assert.equal(prog.task.status, "failed");
    assert.equal(prog.task.operationId, "op_task_stable");
  });
});
