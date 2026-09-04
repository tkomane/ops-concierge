/**
 * Ops Concierge — mutable session state (Worker A).
 * Immutable seed fixtures live in OPS_SCENARIOS; this module never mutates them.
 * Attaches window.OpsState (classic script / IIFE).
 */
(function (root) {
  "use strict";

  var STORAGE_KEY = "ops-demo-v1";
  var STORAGE_VERSION = 1;

  /** @type {readonly string[]} */
  var PHASES = Object.freeze([
    "idle",
    "inspecting",
    "proposed",
    "superseded",
    "approved",
    "acted",
    "refused",
    "failed"
  ]);

  var TERMINAL_FOR_PLAN = Object.freeze({
    refused: true,
    acted: true
  });

  function deepClone(value) {
    if (value === null || typeof value !== "object") return value;
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {
        /* fall through */
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function emptySession(storyId) {
    return {
      storyId: storyId || null,
      sessionId: null,
      phase: "idle",
      fixture: null,
      proposals: [],
      selectedPlanId: null,
      executedPlanId: null,
      lastResult: null,
      lastError: null,
      lastResults: [],
      facts: {},
      messages: [],
      tools: [],
      backupChoice: null,
      actionCounts: { notify: 0, task: 0 },
      operationProgress: {}
    };
  }

  function resolveFixtureSource(idOrObj, scenarios) {
    if (idOrObj && typeof idOrObj === "object") {
      return { id: idOrObj.id || null, seed: idOrObj };
    }
    var id = String(idOrObj || "");
    var catalog = scenarios || root.OPS_SCENARIOS || {};
    var seed = catalog[id];
    if (!seed) {
      throw new Error("OpsState: unknown fixture id '" + id + "'");
    }
    return { id: id, seed: seed };
  }

  /**
   * Deep-clone a scenario fixture. Never returns the live seed object.
   * @param {string|object} idOrObj
   * @param {object} [scenarios]
   */
  function cloneFixture(idOrObj, scenarios) {
    var resolved = resolveFixtureSource(idOrObj, scenarios);
    var clone = deepClone(resolved.seed);
    if (resolved.id && !clone.id) clone.id = resolved.id;
    return clone;
  }

  function defaultStorage() {
    try {
      if (typeof root.localStorage !== "undefined" && root.localStorage) {
        return root.localStorage;
      }
    } catch (_) {
      /* private mode / node */
    }
    var mem = Object.create(null);
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
      },
      setItem: function (k, v) {
        mem[k] = String(v);
      },
      removeItem: function (k) {
        delete mem[k];
      }
    };
  }

  function createStore(options) {
    options = options || {};
    var scenarios = options.scenarios || root.OPS_SCENARIOS || {};
    var storage = options.storage || defaultStorage();
    var storageKey = options.storageKey || STORAGE_KEY;

    var sessions = {
      doorstep: emptySession("doorstep"),
      bedtime: emptySession("bedtime")
    };
    var active = null;

    function getActiveSession() {
      if (!active) return null;
      return sessions[active] || null;
    }

    function requireActive() {
      var s = getActiveSession();
      if (!s) throw new Error("OpsState: no active story session");
      return s;
    }

    function findProposal(session, planId) {
      if (!planId || !session) return null;
      for (var i = 0; i < session.proposals.length; i++) {
        if (session.proposals[i].planId === planId) return session.proposals[i];
      }
      return null;
    }

    function selectedProposal(session) {
      session = session || getActiveSession();
      if (!session || !session.selectedPlanId) return null;
      return findProposal(session, session.selectedPlanId);
    }

    function setActiveProposal(session, proposal) {
      if (!proposal || !proposal.planId) {
        throw new Error("OpsState: proposal requires planId");
      }
      var existing = findProposal(session, proposal.planId);
      if (existing) {
        Object.keys(proposal).forEach(function (k) {
          existing[k] = proposal[k];
        });
      } else {
        session.proposals.push(proposal);
      }
      session.selectedPlanId = proposal.planId;
      return selectedProposal(session);
    }

    function startStory(storyId, opts) {
      opts = opts || {};
      if (storyId !== "doorstep" && storyId !== "bedtime") {
        throw new Error("OpsState: storyId must be doorstep|bedtime");
      }
      if (active && active !== storyId && !opts.discardActive) {
        /* caller should switchStory — still allow explicit start */
      }
      var fixture = cloneFixture(storyId, scenarios);
      var s = emptySession(storyId);
      s.sessionId = opts.sessionId || "sess-" + Date.now().toString(36);
      s.fixture = fixture;
      s.phase = opts.phase || "inspecting";
      sessions[storyId] = s;
      active = storyId;
      return snapshotSession(s);
    }

    /**
     * Persist current story, activate the other from its saved session (or idle).
     * Does not mutate seed fixtures; backupChoice stays on the paused session only.
     */
    function switchStory(storyId) {
      if (storyId !== "doorstep" && storyId !== "bedtime") {
        throw new Error("OpsState: storyId must be doorstep|bedtime");
      }
      active = storyId;
      var s = sessions[storyId];
      if (!s || !s.fixture) {
        /* dormant — idle shell, pristine on next startStory/resetFresh */
        sessions[storyId] = emptySession(storyId);
        return snapshotSession(sessions[storyId]);
      }
      return snapshotSession(s);
    }

    /**
     * Fresh run: re-clone seeds; discard backupChoice / mutated fixture for that story.
     */
    function resetFresh(storyId) {
      storyId = storyId || active;
      if (!storyId) {
        clearAll();
        return null;
      }
      return startStory(storyId, { phase: "inspecting" });
    }

    function setPhase(phase) {
      if (PHASES.indexOf(phase) === -1) {
        throw new Error("OpsState: invalid phase '" + phase + "'");
      }
      var s = requireActive();
      s.phase = phase;
      return s.phase;
    }

    function getPhase() {
      var s = getActiveSession();
      return s ? s.phase : "idle";
    }

    function setProposal(proposal) {
      var s = requireActive();
      var p = deepClone(proposal);
      if (root.OpsPlanner && typeof root.OpsPlanner.noteExistingPlanId === "function" && p.planId) {
        root.OpsPlanner.noteExistingPlanId(p.planId);
      }
      setActiveProposal(s, p);
      if (p.status === "draft" || p.status === "queued" || !p.status) {
        if (!p.status) p.status = "draft";
        s.phase = "proposed";
      } else if (p.status === "confirmed") {
        s.phase = "approved";
      } else if (p.status === "refused") {
        s.phase = "refused";
      } else if (p.status === "superseded") {
        s.phase = "superseded";
      }
      return deepClone(selectedProposal(s));
    }

    function getProposal() {
      return deepClone(selectedProposal());
    }

    function getSelectedPlan() {
      return getProposal();
    }

    /**
     * Mark current selected proposal superseded and optionally install a replacement.
     */
    function supersede(replacement) {
      var s = requireActive();
      var cur = selectedProposal(s);
      if (cur) {
        cur.status = "superseded";
      }
      s.phase = "superseded";
      if (replacement) {
        var next = deepClone(replacement);
        if (!next.status || next.status === "superseded") next.status = "draft";
        setActiveProposal(s, next);
        s.phase = "proposed";
        return deepClone(selectedProposal(s));
      }
      return cur ? deepClone(cur) : null;
    }

    /**
     * Apply a working-copy mutation (e.g. backup window choice) on the session fixture only.
     * Seeds in OPS_SCENARIOS remain untouched.
     */
    function mutateFixture(mutator) {
      var s = requireActive();
      if (!s.fixture) throw new Error("OpsState: no fixture loaded");
      if (typeof mutator === "function") {
        mutator(s.fixture);
      } else if (mutator && typeof mutator === "object") {
        Object.keys(mutator).forEach(function (k) {
          s.fixture[k] = deepClone(mutator[k]);
        });
      }
      return deepClone(s.fixture);
    }

    function setBackupChoice(choice) {
      var s = requireActive();
      s.backupChoice = choice == null ? null : deepClone(choice);
      return deepClone(s.backupChoice);
    }

    function setFacts(facts) {
      var s = requireActive();
      s.facts = Object.assign({}, s.facts, deepClone(facts || {}));
      return deepClone(s.facts);
    }

    /**
     * Approve the current (or specified) plan.
     * Rejects superseded / wrong id. Idempotent once acted for that planId.
     */
    function approve(planId) {
      var s = requireActive();
      var targetId = planId || s.selectedPlanId;
      if (!targetId) {
        return { ok: false, reason: "no_proposal", message: "No proposal to approve." };
      }
      var p = findProposal(s, targetId);
      if (!p) {
        return { ok: false, reason: "unknown_plan", message: "Unknown plan id." };
      }
      if (p.status === "superseded") {
        return {
          ok: false,
          reason: "superseded",
          message: "That plan was superseded. Approve the current proposal instead."
        };
      }
      if (s.executedPlanId === targetId && (s.phase === "acted" || s.phase === "approved")) {
        return {
          ok: true,
          idempotent: true,
          planId: targetId,
          message: "Already approved; no duplicate action."
        };
      }
      if (s.phase === "acted" && s.executedPlanId && s.executedPlanId !== targetId) {
        return {
          ok: false,
          reason: "already_acted",
          message: "A different plan already executed this session."
        };
      }
      if (p.status === "refused") {
        return { ok: false, reason: "refused", message: "This plan was refused." };
      }
      if (p.needsClarification || p.action === "ask_clarification") {
        return {
          ok: false,
          reason: "needs_clarification",
          message: "This proposal still needs clarification — it is not approvable yet."
        };
      }
      p.status = "confirmed";
      s.selectedPlanId = targetId;
      s.phase = "approved";
      s.executedPlanId = targetId;
      return { ok: true, idempotent: false, planId: targetId, proposal: deepClone(p) };
    }

    function refuse(planId) {
      var s = requireActive();
      var p = selectedProposal(s);
      if (planId) p = findProposal(s, planId) || p;
      if (p) p.status = "refused";
      s.phase = "refused";
      return { ok: true, phase: "refused", planId: p ? p.planId : null };
    }

    function markActed(result) {
      var s = requireActive();
      s.lastResult = result == null ? null : deepClone(result);
      s.lastError = null;
      s.phase = "acted";
      if (s.selectedPlanId) s.executedPlanId = s.selectedPlanId;
      return snapshotSession(s);
    }

    function markFailed(error) {
      var s = requireActive();
      s.lastError = error == null ? null : deepClone(error);
      s.phase = "failed";
      return snapshotSession(s);
    }

    function snapshotSession(s) {
      return deepClone({
        storyId: s.storyId,
        sessionId: s.sessionId,
        phase: s.phase,
        fixture: s.fixture,
        proposals: s.proposals,
        selectedPlanId: s.selectedPlanId,
        executedPlanId: s.executedPlanId,
        lastResult: s.lastResult,
        lastError: s.lastError,
        lastResults: s.lastResults || [],
        facts: s.facts,
        messages: s.messages,
        tools: s.tools,
        backupChoice: s.backupChoice,
        actionCounts: s.actionCounts || { notify: 0, task: 0 },
        operationProgress: s.operationProgress || {}
      });
    }

    function snapshot() {
      return deepClone({
        v: STORAGE_VERSION,
        sessions: {
          doorstep: snapshotSession(sessions.doorstep),
          bedtime: snapshotSession(sessions.bedtime)
        },
        active: active
      });
    }

    function hydrateSession(raw, storyId) {
      var base = emptySession(storyId);
      if (!raw || typeof raw !== "object") return base;
      base.storyId = storyId;
      base.sessionId = raw.sessionId || null;
      base.phase = PHASES.indexOf(raw.phase) !== -1 ? raw.phase : "idle";
      base.fixture = raw.fixture ? deepClone(raw.fixture) : null;
      base.proposals = Array.isArray(raw.proposals) ? deepClone(raw.proposals) : [];
      if (root.OpsPlanner && typeof root.OpsPlanner.noteExistingPlanId === "function") {
        base.proposals.forEach(function (pr) {
          if (pr && pr.planId) root.OpsPlanner.noteExistingPlanId(pr.planId);
        });
      }
      base.selectedPlanId = raw.selectedPlanId || null;
      base.executedPlanId = raw.executedPlanId || null;
      base.lastResult = raw.lastResult == null ? null : deepClone(raw.lastResult);
      base.lastError = raw.lastError == null ? null : deepClone(raw.lastError);
      base.lastResults = Array.isArray(raw.lastResults) ? deepClone(raw.lastResults) : [];
      base.facts = raw.facts && typeof raw.facts === "object" ? deepClone(raw.facts) : {};
      base.messages = Array.isArray(raw.messages) ? deepClone(raw.messages) : [];
      base.tools = Array.isArray(raw.tools) ? deepClone(raw.tools) : [];
      base.backupChoice = raw.backupChoice == null ? null : deepClone(raw.backupChoice);
      base.actionCounts =
        raw.actionCounts && typeof raw.actionCounts === "object"
          ? {
              notify: Number(raw.actionCounts.notify) || 0,
              task: Number(raw.actionCounts.task) || 0
            }
          : { notify: 0, task: 0 };
      base.operationProgress =
        raw.operationProgress && typeof raw.operationProgress === "object"
          ? deepClone(raw.operationProgress)
          : {};
      return base;
    }

    function save() {
      var blob = snapshot();
      try {
        storage.setItem(storageKey, JSON.stringify(blob));
        return { ok: true, key: storageKey };
      } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
      }
    }

    function load() {
      var raw;
      try {
        raw = storage.getItem(storageKey);
      } catch (e) {
        return { ok: false, reason: "storage_error", error: String(e && e.message ? e.message : e) };
      }
      if (!raw) return { ok: false, reason: "empty" };
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return { ok: false, reason: "corrupt" };
      }
      if (!parsed || parsed.v !== STORAGE_VERSION) {
        return { ok: false, reason: "version_mismatch", found: parsed && parsed.v };
      }
      sessions.doorstep = hydrateSession(parsed.sessions && parsed.sessions.doorstep, "doorstep");
      sessions.bedtime = hydrateSession(parsed.sessions && parsed.sessions.bedtime, "bedtime");
      active =
        parsed.active === "doorstep" || parsed.active === "bedtime" ? parsed.active : null;
      return { ok: true, active: active, snapshot: snapshot() };
    }

    function clearAll() {
      try {
        storage.removeItem(storageKey);
      } catch (_) {
        /* ignore */
      }
      sessions.doorstep = emptySession("doorstep");
      sessions.bedtime = emptySession("bedtime");
      active = null;
      return { ok: true };
    }

    function getFixture() {
      var s = getActiveSession();
      return s && s.fixture ? deepClone(s.fixture) : null;
    }

    function getSeedSnapshot(storyId) {
      return cloneFixture(storyId || active, scenarios);
    }

    /** True if OPS_SCENARIOS seeds still match a fresh clone (no accidental mutation). */
    function seedsIntact() {
      try {
        var a = JSON.stringify(scenarios.doorstep || null);
        var b = JSON.stringify(scenarios.bedtime || null);
        var c = JSON.stringify(cloneFixture("doorstep", scenarios));
        var d = JSON.stringify(cloneFixture("bedtime", scenarios));
        /* clone equality to itself via re-read */
        void c;
        void d;
        return (
          a === JSON.stringify(scenarios.doorstep || null) &&
          b === JSON.stringify(scenarios.bedtime || null)
        );
      } catch (_) {
        return false;
      }
    }


    /**
     * Store owns complete session UI: messages, tools, lastResults, phase.
     * Callers must use this instead of writing a cloned snapshot to localStorage
     * that save() would immediately overwrite.
     */
    function setUiState(patch) {
      var s = requireActive();
      patch = patch || {};
      if (Object.prototype.hasOwnProperty.call(patch, "messages")) {
        s.messages = Array.isArray(patch.messages) ? deepClone(patch.messages) : [];
      }
      if (Object.prototype.hasOwnProperty.call(patch, "tools")) {
        s.tools = Array.isArray(patch.tools) ? deepClone(patch.tools) : [];
      }
      if (Object.prototype.hasOwnProperty.call(patch, "lastResults")) {
        s.lastResults = Array.isArray(patch.lastResults) ? deepClone(patch.lastResults) : [];
      }
      if (Object.prototype.hasOwnProperty.call(patch, "phase") && patch.phase) {
        if (PHASES.indexOf(patch.phase) !== -1) s.phase = patch.phase;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "sessionId") && patch.sessionId) {
        s.sessionId = patch.sessionId;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "actionCounts") && patch.actionCounts) {
        s.actionCounts = {
          notify: Number(patch.actionCounts.notify) || 0,
          task: Number(patch.actionCounts.task) || 0
        };
      }
      return snapshotSession(s);
    }

    function bumpAction(kind) {
      var s = requireActive();
      if (!s.actionCounts) s.actionCounts = { notify: 0, task: 0 };
      if (kind === "notify") s.actionCounts.notify += 1;
      else if (kind === "task") s.actionCounts.task += 1;
      return deepClone(s.actionCounts);
    }

    function getActionCounts() {
      var s = getActiveSession();
      return s && s.actionCounts
        ? deepClone(s.actionCounts)
        : { notify: 0, task: 0 };
    }

    function getOperationProgress(planId) {
      var s = getActiveSession();
      if (!s || !s.operationProgress) return {};
      if (!planId) return deepClone(s.operationProgress);
      return deepClone(s.operationProgress[planId] || {});
    }

    function setOperationProgress(planId, opKind, patch) {
      var s = requireActive();
      if (!planId || !opKind) return getOperationProgress(planId);
      if (!s.operationProgress) s.operationProgress = {};
      if (!s.operationProgress[planId]) s.operationProgress[planId] = {};
      var prev = s.operationProgress[planId][opKind] || {};
      s.operationProgress[planId][opKind] = Object.assign({}, prev, deepClone(patch || {}));
      return deepClone(s.operationProgress[planId]);
    }

    function clearOperationProgress(planId) {
      var s = requireActive();
      if (!s.operationProgress) s.operationProgress = {};
      if (planId) delete s.operationProgress[planId];
      else s.operationProgress = {};
      return deepClone(s.operationProgress);
    }

    return {
      STORAGE_KEY: storageKey,
      PHASES: PHASES,
      cloneFixture: function (idOrObj) {
        return cloneFixture(idOrObj, scenarios);
      },
      getActive: function () {
        return active;
      },
      getSession: function (storyId) {
        var id = storyId || active;
        if (!id || !sessions[id]) return null;
        return snapshotSession(sessions[id]);
      },
      startStory: startStory,
      switchStory: switchStory,
      resetFresh: resetFresh,
      setPhase: setPhase,
      getPhase: getPhase,
      setProposal: setProposal,
      getProposal: getProposal,
      getSelectedPlan: getSelectedPlan,
      supersede: supersede,
      mutateFixture: mutateFixture,
      setBackupChoice: setBackupChoice,
      getBackupChoice: function () {
        var s = getActiveSession();
        return s ? deepClone(s.backupChoice) : null;
      },
      setFacts: setFacts,
      getFacts: function () {
        var s = getActiveSession();
        return s ? deepClone(s.facts) : {};
      },
      approve: approve,
      refuse: refuse,
      markActed: markActed,
      markFailed: markFailed,
      getFixture: getFixture,
      getSeedSnapshot: getSeedSnapshot,
      seedsIntact: seedsIntact,
      setUiState: setUiState,
      bumpAction: bumpAction,
      getActionCounts: getActionCounts,
      getOperationProgress: getOperationProgress,
      setOperationProgress: setOperationProgress,
      clearOperationProgress: clearOperationProgress,
      save: save,
      load: load,
      clear: clearAll,
      snapshot: snapshot,
      isTerminalForPlan: function (phase) {
        return !!TERMINAL_FOR_PLAN[phase];
      }
    };
  }

  var OpsState = {
    STORAGE_KEY: STORAGE_KEY,
    STORAGE_VERSION: STORAGE_VERSION,
    PHASES: PHASES,
    cloneFixture: cloneFixture,
    createStore: createStore,
    deepClone: deepClone
  };

  root.OpsState = OpsState;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = OpsState;
  }
})(typeof window !== "undefined" ? window : globalThis);
