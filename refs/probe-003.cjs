#!/usr/bin/env node
// Read-only boundary probes against the reviewed checkout. No browser automation.
// Usage: node probe-003.cjs /path/to/ops-concierge
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || '/private/tmp/ops-concierge-review-003');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const memory = {};
const sandbox = {
  console, Date, Math, JSON, structuredClone,
  localStorage: {
    getItem: key => memory[key] || null,
    setItem: (key, value) => { memory[key] = String(value); },
    removeItem: key => { delete memory[key]; }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const rel of ['js/scenarios.js', 'js/session-state.js', 'js/planner.js', 'js/intent.js']) {
  vm.runInContext(read(rel), sandbox, {filename: rel});
}
const {OpsPlanner: planner, OpsState, OpsIntent} = sandbox;
const result = (tool, observations, ok = true) => ({
  ok, source: 'mock', operationId: 'probe_' + tool, tool, observations,
  outcome: {}, error: ok ? null : {code: 'unavailable', message: 'Probe failure'}, meta: ''
});
const event = result('ring.query', {motion: true, parcelVisual: true});
const order = result('order.lookup', {eta: '16:00-18:00 SAST'});
const build = results => planner.buildProposal({storyId: 'doorstep', results});
const decision = proposal => ({recipient: proposal.recipient.name, action: proposal.action, timing: proposal.timing.windowLabel});
const calendarA = build([event, order, result('calendar.propose', {proposed: '18:00-18:30 SAST', neighbourAvailable: true})]);
const calendarB = build([event, order, result('calendar.propose', {proposed: '20:00-20:30 SAST', neighbourAvailable: false})]);
const negative = build([result('ring.query', {motion: false, parcelVisual: false}), order]);
const mismatched = build([event, result('order.lookup', {matched: false, eta: '16:00-18:00 SAST'})]);
const failed = build([result('ring.query', null, false), result('order.lookup', null, false)]);
const store = OpsState.createStore();
store.startStory('doorstep');
store.setProposal(mismatched);
const mismatchedApproval = store.approve(mismatched.planId);

const app = read('js/app.js');
function productionSlice(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Production function boundaries changed');
  return app.slice(from, to);
}

async function bridgeFailureProbe() {
  const requests = [];
  const timeline = [];
  let mockCalled = false;
  const ctx = {
    console, Date, Math, JSON, AbortController, setTimeout, clearTimeout,
    OPS_MCP: {enabled: true},
    state: {
      scenarioId: 'doorstep', scenario: {ticket: {id: 'GUEST-10421'}},
      proposal: {planId: 'plan_changed', recipient: {name: 'Mira'}, action: 'defer_handoff_parent', timing: {windowLabel: '18:20-18:45 SAST'}},
      lastResults: [], forceToolFail: false
    },
    sleep: async () => {},
    nextOpId: () => 'op_client_probe',
    pushTool: () => 0,
    updateTool: (index, status, meta) => timeline.push({index, status, meta}),
    fetch: async (url, init) => {
      requests.push({url, method: init.method, body: init.body ? JSON.parse(init.body) : null});
      if (url.endsWith('/healthz')) return {ok: true, status: 200};
      return {
        ok: false, status: 500,
        json: async () => ({ok: false, source: 'bridge', operationId: 'op_bridge_failure', tool: 'notify.household', error: {code: 'bridge_failure', message: 'Injected transport-boundary failure'}, meta: 'bridge:bridge_failure', fallback: 'none', failureKind: 'bridge_failure'})
      };
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/mcp-client.js'), ctx, {filename: 'js/mcp-client.js'});
  vm.runInContext(productionSlice('  function mcpArgsFor(', '\n  async function runTool('), ctx);
  vm.runInContext(productionSlice('  async function runTool(', '\n  function renderChat('), ctx);
  const returned = await ctx.runTool('notify.household', 'Queue a household nudge', async () => {
    mockCalled = true;
    return {meta: 'notify queued', outcome: {queued: true}};
  }, {requireBridge: false});
  return {method: 'Actual client and production runTool with injected fetch response and UI/timer stubs; not an end-to-end browser HTTP test', requests, mockCalled, returned, timeline};
}

(async () => {
  const output = {
    checkout: root,
    intent: ["Don't make the guest code", 'What is a guest code?', 'Confirm whether Mira is available', 'Approve only if the parcel is ours', 'Approve plan_1'].map(utterance => ({utterance, ...OpsIntent.classify(utterance)})),
    calendarChange: {before: decision(calendarA), after: decision(calendarB), decisionUnchanged: JSON.stringify(decision(calendarA)) === JSON.stringify(decision(calendarB))},
    explicitFalseEvidence: {evidence: planner.evidenceAssessment([result('ring.query', {motion: false, parcelVisual: false}), order]), identityClaim: negative.identityClaim},
    mismatchedEvidence: {proposal: mismatched, approval: mismatchedApproval},
    allReadsFailed: failed,
    actionBridgeFailure: await bridgeFailureProbe()
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
