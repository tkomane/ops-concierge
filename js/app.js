(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /* Human status labels — dual-map new adaptive phases + legacy chrome keys */
  const PHASE_SHORT = {
    idle: "Ready",
    inspecting: "Working",
    proposed: "Working",
    superseded: "Working",
    approved: "Working",
    acted: "Done",
    refused: "Ready",
    failed: "Working",
    /* legacy keys kept for story-dot mapping */
    ingested: "Working",
    ack: "Working",
    correlated: "Working",
    windowed: "Working",
    ticketed: "Done"
  };

  const PHASE_LABEL = {
    idle: "Ready — pick a doorstep or bedtime story",
    inspecting: "Working — checking doorbell, package, and household context",
    proposed: "Working — handoff plan ready for your approval",
    superseded: "Working — prior plan superseded; review the new proposal",
    approved: "Working — approval recorded; running allowed action",
    acted: "Done — simulated handoff confirmed (sample reference only)",
    refused: "Ready — plan refused; nothing was sent",
    failed: "Working — action failed; no false success",
    ingested: "Working — two home signals are on the board",
    ack: "Working — holding this moment in session",
    correlated: "Working — connecting door, package, and calendar",
    windowed: "Working — quiet-hours plan is ready",
    ticketed: "Done — handoff card ready to copy (sample ref)"
  };

  /** Map adaptive phases onto legacy story-dot phases for chrome. */
  function uiPhase(phase) {
    const map = {
      idle: "idle",
      inspecting: "ingested",
      proposed: "windowed",
      superseded: "windowed",
      approved: "windowed",
      acted: "ticketed",
      refused: "windowed",
      failed: "windowed",
      ingested: "ingested",
      ack: "ack",
      correlated: "correlated",
      windowed: "windowed",
      ticketed: "ticketed"
    };
    return map[phase] || phase || "idle";
  }

  /* Friendly step names; tool ids stay as secondary captions for judges */
  const TOOL_FRIENDLY = {
    "ring.query": { label: "Check the doorbell", icon: "door" },
    "order.lookup": { label: "Check the package", icon: "package" },
    "session.ack": { label: "Hold this moment", icon: "chat" },
    "calendar.propose": { label: "Check quiet hours", icon: "calendar" },
    "notify.household": { label: "Nudge the household", icon: "chat" },
    "task.open": { label: "Create the plan card", icon: "task" }
  };

  const ICONS = {
    door:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5h8A1.5 1.5 0 0 1 15 6.5V20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12.2" cy="12.5" r="0.9" fill="currentColor"/></svg>',
    package:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12v10M4 8.5l8 3.5 8-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 3.5v3M16 3.5v3M4 10h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/></svg>',
    guest:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="3.5" y="6" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 12h4M7 15h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="16.5" cy="12" r="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    tv:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="3.5" y="5.5" width="17" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 19.5h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    task:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 6h12M6 12h8M6 18h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/></svg>',
    chat:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 12a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 15.5V19M9.5 19h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  };

  const store = window.OpsState
    ? window.OpsState.createStore({ scenarios: window.OPS_SCENARIOS })
    : null;

  const state = {
    scenarioId: null,
    scenario: null,
    phase: "idle",
    ack: false,
    tools: [],
    messages: [],
    thinking: false,
    sessionId: "sess-" + Date.now().toString(36),
    chipItems: [],
    lastResults: [],
    forceToolFail: false,
    proposal: null,
    queuedNotify: false
  };

  let toastTimer = null;
  let opSeq = 0;

  function nextOpId(tool) {
    opSeq += 1;
    return "op_" + (tool || "x").replace(/\./g, "_") + "_" + opSeq;
  }

  function operationDisposition(result) {
    if (!result || typeof result !== "object") return null;
    var kind = result.failureKind || (result.error && result.error.code) || null;
    if (kind === "unknown_after_dispatch" || kind === "bridge_unknown_after_dispatch") {
      return "unknown";
    }
    if (result.ok === false) return "failed";
    if (result.ok === true) return "resolved";
    return null;
  }

  /** Bind retries to the original execution source for uncertain/attempted bridge ops. */
  function operationBoundToBridge(entry) {
    if (!entry || typeof entry !== "object") return false;
    if (entry.source === "bridge") return true;
    if (entry.disposition === "unknown") return true;
    var kind = entry.failureKind || null;
    if (kind === "unknown_after_dispatch" || kind === "bridge_unknown_after_dispatch") {
      return true;
    }
    if (entry.attempted && entry.source !== "mock") return true;
    return false;
  }

  function operationProgressFields(status, operationId, result, prior) {
    var patch = { status: status, operationId: operationId };
    prior = prior || null;
    if (!result || typeof result !== "object") {
      if (prior && prior.disposition === "unknown" && status !== "done") {
        patch.disposition = "unknown";
        if (prior.source) patch.source = prior.source;
        if (prior.failureKind) patch.failureKind = prior.failureKind;
        if (prior.attempted) patch.attempted = true;
      }
      return patch;
    }
    if (result.source) patch.source = result.source;
    var kind = result.failureKind || (result.error && result.error.code) || null;
    if (kind) patch.failureKind = kind;
    if (result.attempted) patch.attempted = true;
    var disp = operationDisposition(result);
    /* Keep unknown disposition until the operation resolves honestly (status done). */
    if (prior && prior.disposition === "unknown" && status !== "done") {
      patch.disposition = "unknown";
      if (prior.source) patch.source = prior.source;
      if (prior.failureKind) patch.failureKind = prior.failureKind;
      patch.attempted = true;
    } else if (disp) {
      patch.disposition = disp;
    }
    return patch;
  }

  function persistDemo() {
    if (!store) return;
    try {
      store.save();
    } catch (_e) {}
  }

  function hydrateUiFromSession(snap) {
    if (!snap) {
      state.scenarioId = null;
      state.scenario = null;
      state.phase = "idle";
      state.ack = false;
      state.tools = [];
      state.messages = [];
      state.sessionId = "sess-" + Date.now().toString(36);
      state.lastResults = [];
      state.proposal = null;
      state.queuedNotify = false;
      return;
    }
    state.scenarioId = snap.storyId || null;
    state.scenario = snap.fixture ? window.OpsState.deepClone(snap.fixture) : null;
    state.phase = snap.phase || "idle";
    state.ack = ["proposed", "superseded", "approved", "acted", "refused", "failed", "ack", "correlated", "windowed", "ticketed"].indexOf(state.phase) !== -1;
    state.tools = Array.isArray(snap.tools) ? snap.tools.slice() : [];
    state.messages = Array.isArray(snap.messages) ? snap.messages.slice() : [];
    state.lastResults = Array.isArray(snap.lastResults) ? snap.lastResults.slice() : [];
    state.sessionId = snap.sessionId || state.sessionId;
    state.proposal = null;
    if (Array.isArray(snap.proposals) && window.OpsPlanner && window.OpsPlanner.noteExistingPlanId) {
      snap.proposals.forEach(function (pr) {
        if (pr && pr.planId) window.OpsPlanner.noteExistingPlanId(pr.planId);
      });
    }
    if (Array.isArray(snap.lastResults)) {
      snap.lastResults.forEach(function (r) {
        if (r && r.operationId && /^op_/.test(r.operationId)) {
          const m = String(r.operationId).match(/_(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > opSeq) opSeq = n;
          }
        }
      });
    }
    if (snap.selectedPlanId && Array.isArray(snap.proposals)) {
      for (let i = 0; i < snap.proposals.length; i++) {
        if (snap.proposals[i].planId === snap.selectedPlanId) {
          state.proposal = window.OpsState.deepClone(snap.proposals[i]);
          break;
        }
      }
    }
    state.queuedNotify = !!(state.proposal && state.proposal.status === "queued");
  }

  function syncSessionMessagesTools() {
    if (!store || !store.getActive()) return;
    /* Store owns complete session — never write a cloned snapshot that save() overwrites. */
    try {
      store.setUiState({
        messages: state.messages,
        tools: state.tools,
        lastResults: state.lastResults,
        phase: ["idle","inspecting","proposed","superseded","approved","acted","refused","failed"].indexOf(state.phase) !== -1
          ? state.phase
          : undefined,
        sessionId: state.sessionId
      });
    } catch (_e) {}
  }

  function canResumeSession(snap) {
    if (!snap || !snap.fixture) return false;
    if (snap.selectedPlanId && snap.phase && snap.phase !== "idle") {
      if (snap.phase === "inspecting") {
        return Array.isArray(snap.tools) && snap.tools.length > 0;
      }
      return true;
    }
    if (Array.isArray(snap.proposals) && snap.proposals.length && snap.phase && snap.phase !== "idle") {
      return true;
    }
    return false;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nowClock() {
    return (
      new Date().toLocaleTimeString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }) + " SAST"
    );
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function showToast(msg, tone) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.dataset.tone = tone === "err" ? "err" : tone === "ok" ? "ok" : "ok";
    el.hidden = false;
    el.removeAttribute("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
      el.setAttribute("hidden", "");
    }, 2600);
  }

  /* ——— Loop C: MCP status pill (human-readable) ——— */
  function mcpStateLabel(state) {
    if (state === "connected") return "Connected";
    if (state === "offline") return "Offline";
    return "Local mock";
  }

  function mcpStateTitle(state) {
    if (state === "connected") {
      return "Helper tools connected to the local MCP server";
    }
    if (state === "offline") {
      return "Helper link enabled, but the local server is unreachable — using offline mock";
    }
    return "Demo mode — local mock (no live helper server). Set OPS_USE_MCP=1 to try live tools.";
  }

  async function refreshMcpPill(force) {
    const pill = $("#mcpPill");
    const label = $("#mcpPillLabel");
    if (!pill || !label) return;
    let state = "mock";
    const client = window.OpsMcpClient;
    if (client && typeof client.isEnabled === "function" && client.isEnabled()) {
      let up = false;
      try {
        up = await client.probeHealth(!!force);
      } catch (_e) {
        up = false;
      }
      state = up ? "connected" : "offline";
    } else {
      state = "mock";
    }
    pill.dataset.state = state;
    label.textContent = mcpStateLabel(state);
    pill.title = mcpStateTitle(state);
    pill.setAttribute("aria-label", "Helper link: " + mcpStateLabel(state));
  }

  /* ——— Loop C: contextual composer placeholders ——— */
  const PLACEHOLDERS = {
    idle: [
      "Ask the helper… e.g. someone’s at the door",
      "Try “Start bedtime” or press B",
      "Type a question, or tap a suggestion below"
    ],
    inspecting: [
      "Helper is checking home signals…",
      "Sit tight — read-only inspection in progress"
    ],
    proposed: [
      "Say “approve” or “make the guest code” to confirm",
      "Or “neighbour unavailable” / “not yet” / “What is a guest code?”"
    ],
    superseded: [
      "Review the new plan, then approve or decline",
      "Ask what changed…"
    ],
    approved: [
      "Running the approved action…",
      "Hang on — confirming the simulated handoff"
    ],
    acted: [
      "Copy the handoff card from the board, or ask another question",
      "Try the other story — Doorstep or Bedtime"
    ],
    refused: [
      "Plan refused — say “approve” only if you change your mind after a replan",
      "Try the other story, or reset"
    ],
    failed: [
      "Action failed — try again, or decline",
      "Ask what’s still risky…"
    ],
    /* legacy keys */
    ingested: [
      "Say “got it” to hold this moment",
      "Ask what’s on the board…"
    ],
    ack: [
      "Say “connect the dots” to continue",
      "Ask the helper to connect door + package…"
    ],
    correlated: [
      "Say “quiet hours” for a plan",
      "Ask for a quiet-hours window…"
    ],
    windowed: [
      "Say “make the guest code” or “make the task”",
      "Ask for the guest code or bedtime task…"
    ],
    ticketed: [
      "Copy the code from the board, or ask another question",
      "Try the other story — Doorstep or Bedtime"
    ]
  };

  let placeholderTimer = null;
  let placeholderIdx = 0;

  function syncComposerPlaceholder() {
    const input = $("#utter");
    if (!input) return;
    const phase = state.phase || "idle";
    const list = PLACEHOLDERS[phase] || PLACEHOLDERS.idle;
    placeholderIdx = placeholderIdx % list.length;
    input.setAttribute("placeholder", list[placeholderIdx]);
  }

  function startPlaceholderRotation() {
    clearInterval(placeholderTimer);
    syncComposerPlaceholder();
    placeholderTimer = setInterval(() => {
      const input = $("#utter");
      if (!input) return;
      if (document.activeElement === input && input.value) return;
      const phase = state.phase || "idle";
      const list = PLACEHOLDERS[phase] || PLACEHOLDERS.idle;
      placeholderIdx = (placeholderIdx + 1) % list.length;
      if (!input.value) input.setAttribute("placeholder", list[placeholderIdx]);
    }, 5200);
  }

  function syncSendEnabled() {
    const input = $("#utter");
    const btn = $("#sendBtn");
    if (!input || !btn) return;
    const empty = !String(input.value || "").trim();
    const blocked = state.thinking || empty;
    btn.disabled = blocked;
    btn.setAttribute("aria-disabled", blocked ? "true" : "false");
    btn.title = state.thinking
      ? "Helper is working…"
      : empty
        ? "Type a message to send"
        : "Send to the helper";
  }



  function tickClock() {
    const el = $("#missionClock");
    if (!el) return;
    const d = new Date();
    const formatted = d.toLocaleTimeString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    el.textContent = formatted + " SAST";
    el.setAttribute("datetime", d.toISOString());
  }

  function toolMetaFor(name) {
    const base = TOOL_FRIENDLY[name] || { label: name, icon: "task" };
    /* Bedtime path: order.lookup is Fire TV session, not a parcel */
    if (name === "order.lookup" && state.scenarioId === "bedtime") {
      return { label: "Check Fire TV", icon: "tv" };
    }
    if (name === "task.open" && state.scenarioId === "doorstep") {
      return { label: "Create guest code", icon: "guest" };
    }
    if (name === "task.open" && state.scenarioId === "bedtime") {
      return { label: "Create bedtime task", icon: "task" };
    }
    if (name === "ring.query" && state.scenarioId === "bedtime") {
      return { label: "Check who’s home", icon: "door" };
    }
    return base;
  }


  function announce(msg) {
    const live = $("#a11yLive");
    if (!live) return;
    live.textContent = "";
    // Force SR re-announce
    requestAnimationFrame(() => {
      live.textContent = msg;
    });
  }

  /* Round 3 — how-strip ↔ tool progress coupling */
  const HOW_TOOL_MAP = {
    doorstep: {
      "ring.query": "door",
      "order.lookup": "package",
      "session.ack": "package",
      "calendar.propose": "quiet",
      "notify.household": "quiet",
      "task.open": "guest"
    },
    bedtime: {
      "ring.query": "quiet",
      "order.lookup": "quiet",
      "session.ack": "quiet",
      "calendar.propose": "quiet",
      "notify.household": "guest",
      "task.open": "guest"
    }
  };

  const HOW_ORDER = ["door", "package", "quiet", "guest"];

  function syncGuestStepLabel() {
    const el = document.querySelector('.how-step[data-step="guest"]');
    if (!el) return;
    const name = el.querySelector(".how-name");
    const hint = el.querySelector(".how-hint");
    if (state.scenarioId === "bedtime") {
      if (name) name.textContent = "Bedtime task";
      if (hint) hint.textContent = "TASK-22018";
      el.setAttribute("aria-label", "Bedtime task");
    } else if (state.scenarioId === "doorstep") {
      if (name) name.textContent = "Guest code";
      if (hint) hint.textContent = "GUEST-10421";
      el.setAttribute("aria-label", "Guest code");
    } else {
      if (name) name.textContent = "Guest / Task";
      if (hint) hint.textContent = "Either story";
      el.setAttribute("aria-label", "Guest code or bedtime task");
    }
  }

  function resetHowStrip() {
    document.querySelectorAll(".how-step").forEach((s) => {
      s.classList.remove("is-active", "is-done", "is-current", "is-pending");
      s.setAttribute("aria-current", "false");
    });
    document.querySelectorAll(".how-arrow").forEach((a) => a.classList.remove("is-lit"));
    document.querySelectorAll(".how-bed-step").forEach((s) => {
      s.classList.remove("is-done", "is-current", "is-pending");
      s.setAttribute("aria-current", "false");
    });
    document.querySelectorAll(".how-bed-arrow").forEach((a) => a.classList.remove("is-lit"));
    const bedPath = $("#howBedtimePath");
    if (bedPath) bedPath.classList.remove("is-bedtime-active");
    const strip = $("#howStrip");
    if (strip) strip.setAttribute("data-mode", "idle");
    syncGuestStepLabel();
  }

  const BED_ORDER = ["firetv", "quiet", "task"];
  const BED_TOOL_MAP = {
    "ring.query": "firetv",
    "order.lookup": "firetv",
    "session.ack": "quiet",
    "calendar.propose": "quiet",
    "notify.household": "task",
    "task.open": "task"
  };

  function syncBedtimePath(runningTool) {
    const bedPath = $("#howBedtimePath");
    const active = state.scenarioId === "bedtime";
    if (bedPath) bedPath.classList.toggle("is-bedtime-active", active);
    if (!active) {
      document.querySelectorAll(".how-bed-step").forEach((s) => {
        s.classList.remove("is-done", "is-current", "is-pending");
        s.setAttribute("aria-current", "false");
      });
      document.querySelectorAll(".how-bed-arrow").forEach((a) => a.classList.remove("is-lit"));
      return;
    }

    const completed = new Set();
    state.tools.forEach((t) => {
      if (t.status === "ok" && BED_TOOL_MAP[t.name]) completed.add(BED_TOOL_MAP[t.name]);
    });
    let current = runningTool && BED_TOOL_MAP[runningTool] ? BED_TOOL_MAP[runningTool] : null;
    const bedUi = uiPhase(state.phase);
    if (!current && bedUi === "ticketed") current = "task";
    else if (!current && ["windowed", "correlated"].includes(bedUi)) current = "quiet";
    else if (!current && ["ingested", "ack"].includes(bedUi)) current = "firetv";

    const phaseBoost = {
      idle: -1,
      ingested: 0,
      ack: 1,
      correlated: 1,
      windowed: 1,
      ticketed: 2
    };
    const pIdx = phaseBoost[bedUi] ?? -1;
    if (pIdx >= 0) completed.add("firetv");
    if (pIdx >= 1) completed.add("quiet");
    if (pIdx >= 2) completed.add("task");

    BED_ORDER.forEach((key) => {
      const el = document.querySelector('.how-bed-step[data-bed="' + key + '"]');
      if (!el) return;
      el.classList.remove("is-done", "is-current", "is-pending");
      if (current === key) {
        el.classList.add("is-current");
        el.setAttribute("aria-current", "step");
      } else if (completed.has(key) && current !== key) {
        el.classList.add("is-done");
        el.setAttribute("aria-current", "false");
      } else {
        el.classList.add("is-pending");
        el.setAttribute("aria-current", "false");
      }
    });

    const steps = Array.from(document.querySelectorAll(".how-bed-step"));
    const arrows = Array.from(document.querySelectorAll(".how-bed-arrow"));
    arrows.forEach((arrow, i) => {
      const left = steps[i];
      const right = steps[i + 1];
      const lit =
        left &&
        right &&
        (left.classList.contains("is-done") || left.classList.contains("is-current")) &&
        (right.classList.contains("is-done") ||
          right.classList.contains("is-current") ||
          left.classList.contains("is-done"));
      arrow.classList.toggle("is-lit", !!lit);
    });
  }

  function syncHowFromTools(runningTool) {
    const id = state.scenarioId;
    if (!id) {
      resetHowStrip();
      return;
    }
    const map = HOW_TOOL_MAP[id] || HOW_TOOL_MAP.doorstep;
    const strip = $("#howStrip");
    if (strip) strip.setAttribute("data-mode", id);

    const completed = new Set();
    state.tools.forEach((t) => {
      if (t.status === "ok" && map[t.name]) completed.add(map[t.name]);
    });
    let current = runningTool && map[runningTool] ? map[runningTool] : null;
    if (!current && uiPhase(state.phase) === "ticketed") current = "guest";

    const phaseOrder = {
      idle: -1,
      ingested: 1,
      ack: 1,
      correlated: 2,
      windowed: 2,
      ticketed: 3
    };
    const pIdx = phaseOrder[uiPhase(state.phase)] ?? -1;
    if (id === "doorstep") {
      if (pIdx >= 0) completed.add("door");
      if (pIdx >= 0 && state.tools.some((t) => t.name === "order.lookup" && t.status === "ok"))
        completed.add("package");
      if (pIdx >= 2) completed.add("quiet");
      if (pIdx >= 3) completed.add("guest");
    } else if (id === "bedtime") {
      if (pIdx >= 0) completed.add("quiet");
      if (pIdx >= 3) completed.add("guest");
    }

    HOW_ORDER.forEach((key) => {
      const el = document.querySelector('.how-step[data-step="' + key + '"]');
      if (!el) return;
      el.classList.remove("is-active", "is-done", "is-current", "is-pending");
      const relevant = id === "bedtime" ? key === "quiet" || key === "guest" : true;
      if (!relevant) {
        el.classList.add("is-pending");
        el.setAttribute("aria-current", "false");
        return;
      }
      if (current === key) {
        el.classList.add("is-current", "is-active");
        el.setAttribute("aria-current", "step");
      } else if (completed.has(key) && current !== key) {
        el.classList.add("is-done", "is-active");
        el.setAttribute("aria-current", "false");
      } else {
        el.classList.add("is-pending");
        el.setAttribute("aria-current", "false");
      }
    });

    const steps = Array.from(document.querySelectorAll(".how-step"));
    const arrows = Array.from(document.querySelectorAll(".how-arrow"));
    arrows.forEach((arrow, i) => {
      const left = steps[i];
      const right = steps[i + 1];
      const lit =
        left &&
        right &&
        (left.classList.contains("is-done") || left.classList.contains("is-current")) &&
        (right.classList.contains("is-done") ||
          right.classList.contains("is-current") ||
          left.classList.contains("is-done"));
      arrow.classList.toggle("is-lit", !!lit);
    });

    syncBedtimePath(runningTool);
    syncGuestStepLabel();
  }

  function highlightHow(scenarioId) {
    if (!scenarioId) {
      resetHowStrip();
      return;
    }
    syncHowFromTools(null);
  }

  /* Round 5 — story progress dots */
  const STORY_PHASES = ["ingested", "ack", "correlated", "windowed", "ticketed"];

  function syncStoryProgress() {
    const wrap = $("#storyProgress");
    const label = $("#storyProgressLabel");
    if (!wrap) return;
    if (!state.scenario) {
      wrap.hidden = true;
      wrap.setAttribute("aria-hidden", "true");
      return;
    }
    wrap.hidden = false;
    wrap.setAttribute("aria-hidden", "false");
    const names = {
      doorstep: "Doorstep story",
      bedtime: "Bedtime story"
    };
    const outcome =
      state.scenarioId === "doorstep" ? "Guest code" : "Bedtime task";
    if (label) {
      const done = uiPhase(state.phase) === "ticketed";
      label.textContent =
        (names[state.scenarioId] || "Story") +
        (done ? " · " + outcome + " ready" : " · in progress");
    }
    // Rename last dot for scenario
    const last = document.querySelector('.story-dot[data-phase="ticketed"] .dot-name');
    if (last) {
      if (state.scenarioId === "bedtime") last.textContent = "Task";
      else if (state.scenarioId === "doorstep") last.textContent = "Code";
      else last.textContent = "Code / Task";
    }

    const idx = STORY_PHASES.indexOf(uiPhase(state.phase));
    document.querySelectorAll(".story-dot").forEach((dot) => {
      const p = dot.getAttribute("data-phase");
      const di = STORY_PHASES.indexOf(p);
      dot.classList.remove("is-done", "is-current", "is-celebrate");
      if (idx < 0) return;
      if (di < idx) dot.classList.add("is-done");
      else if (di === idx) {
        dot.classList.add("is-current");
        if (p === "ticketed") dot.classList.add("is-celebrate");
      }
    });
  }


  function setThinking(on) {
    state.thinking = on;
    const orb = $("#orb");
    if (orb) {
      orb.dataset.state = on ? "thinking" : "idle";
      orb.textContent = on ? "Thinking…" : "Helper ready";
    }
    const d1 = $("#demoBtn");
    const d2 = $("#demoBtn2");
    if (d1) d1.disabled = on;
    if (d2) d2.disabled = on;
    syncSendEnabled();
  }

  function syncChrome() {
    $("#sessionId").textContent = state.sessionId;
    const pill = $("#phasePill");
    pill.textContent = PHASE_SHORT[state.phase] || state.phase;
    pill.dataset.phase = state.phase;

    const boardTag = $("#boardTag");
    if (!state.scenario) {
      boardTag.textContent = "Ready";
    } else if (state.proposal && state.proposal.recipient) {
      boardTag.textContent =
        (state.proposal.recipient.name || "Plan") +
        " · " +
        (state.proposal.status || "draft");
    } else {
      boardTag.textContent = state.scenario.ticket.id;
    }

    const n = state.tools.length;
    $("#toolCount").textContent =
      n === 0 ? "0 steps" : n + (n === 1 ? " step" : " steps");

    const phaseHuman = PHASE_LABEL[state.phase] || "Ready";
    $("#sessionBox").innerHTML =
      `<span class="mono">${escapeHtml(state.sessionId)}</span>` +
      `<span class="muted">${escapeHtml(phaseHuman)}</span>`;
    syncStoryProgress();
    syncHowFromTools(null);
    syncStoryAttr();
    placeholderIdx = 0;
    syncComposerPlaceholder();
    syncSendEnabled();
  }

  function pushMsg(role, text) {
    state.messages.push({ role, text, at: nowClock() });
    renderChat();
  }

  function pushTool(name, status, meta) {
    state.tools.push({ name, status, meta, at: nowClock() });
    renderTimeline();
    syncChrome();
    if (status === "running") syncHowFromTools(name);
    return state.tools.length - 1;
  }

  function updateTool(idx, status, meta) {
    Object.assign(state.tools[idx], {
      status,
      meta: meta || state.tools[idx].meta,
      at: nowClock()
    });
    renderTimeline();
    syncChrome();
    const t = state.tools[idx];
    syncHowFromTools(status === "running" ? t.name : null);
  }

  function mcpArgsFor(name, opId) {
    const scenario = state.scenarioId || "doorstep";
    const plan = state.proposal;
    const planFields = plan
      ? {
          planId: plan.planId,
          recipient: plan.recipient && plan.recipient.name,
          recipientRole: plan.recipient && plan.recipient.role,
          action: plan.action,
          timing: plan.timing && plan.timing.windowLabel,
          operationId: opId || undefined
        }
      : { operationId: opId || undefined };
    switch (name) {
      case "ring.query":
        return {
          zone: scenario === "bedtime" ? "kids-room" : "stoop",
          scenario
        };
      case "order.lookup":
        return { scenario };
      case "session.ack":
        return {
          session_id: state.sessionId,
          artefact_hint: state.scenario ? state.scenario.ticket.id : ""
        };
      case "calendar.propose":
        return { scenario };
      case "notify.household":
        return Object.assign({ scenario }, planFields);
      case "task.open":
        return Object.assign({ scenario }, planFields);
      default:
        return { scenario };
    }
  }

  function isMutationTool(name) {
    return name === "notify.household" || name === "task.open";
  }

  async function runTool(name, meta, work, opts) {
    opts = opts || {};
    const i = pushTool(name, "running", meta);
    await sleep(420 + Math.random() * 280);
    const opId = opts.operationId || nextOpId(name);

    const failOnceMap =
      typeof window !== "undefined" && window.__OPS_FAIL_ONCE && typeof window.__OPS_FAIL_ONCE === "object"
        ? window.__OPS_FAIL_ONCE
        : null;
    const failOnce = !!(failOnceMap && failOnceMap[name]);
    if (failOnce) {
      delete failOnceMap[name];
    }
    if (state.forceToolFail || (typeof window !== "undefined" && window.__OPS_FORCE_TOOL_FAIL) || failOnce) {
      const fail = {
        ok: false,
        source: "mock",
        operationId: opId,
        tool: name,
        observations: null,
        outcome: null,
        error: { code: "injected_failure", message: "Simulated tool failure (demo inject)" },
        meta: "FAIL · injected · " + name
      };
      updateTool(i, "err", fail.meta);
      state.lastResults.push(fail);
      return fail;
    }

    if (window.OpsMcpClient && window.OpsMcpClient.isEnabled()) {
      try {
        const live = await window.OpsMcpClient.callTool(name, mcpArgsFor(name, opId));
        /* Attempted bridge call returned structured failure — never mock mutations. */
        if (live && live.ok === false && live.attempted) {
          const fail = {
            ok: false,
            source: live.source || "bridge",
            operationId: live.operationId || opId,
            tool: name,
            observations: null,
            outcome: null,
            error: live.error || { code: live.failureKind || "bridge_failure", message: "Bridge mutation failed" },
            meta: (live.meta || "bridge failure") + " · no mock fallback",
            failureKind: live.failureKind || (live.error && live.error.code) || "bridge_failure",
            attempted: true
          };
          updateTool(i, "err", fail.meta);
          state.lastResults.push(fail);
          return fail;
        }
        if (live && live.ok !== false && (live.meta || live.detail || live.outcome)) {
          const result = {
            ok: true,
            source: live.source || "bridge",
            operationId: live.operationId || opId,
            tool: name,
            observations: live.observations || (live.detail && live.detail.observations) || { summary: live.meta },
            outcome: live.outcome || live.detail || {},
            error: null,
            meta: (live.meta || name) + " · bridge"
          };
          updateTool(i, "ok", result.meta);
          state.lastResults.push(result);
          return result;
        }
        /* null → bridge unavailable before attempt */
        if (live == null) {
          if (isMutationTool(name) && (opts.requireBridge || opts.noMockOnBridgeDown)) {
            const fail = {
              ok: false,
              source: "bridge",
              operationId: opId,
              tool: name,
              observations: null,
              outcome: null,
              error: { code: "bridge_unavailable", message: "Bridge unavailable before attempt" },
              meta: "FAIL · bridge unavailable · labelled (no silent success)"
            };
            updateTool(i, "err", fail.meta);
            state.lastResults.push(fail);
            return fail;
          }
          /* labelled mock OK for reads only when bridge was never attempted */
        }
        if (!opts.allowMockFallback && opts.requireBridge) {
          const fail = {
            ok: false,
            source: "bridge",
            operationId: opId,
            tool: name,
            observations: null,
            outcome: null,
            error: { code: "bridge_unavailable", message: "Bridge call failed; not treating as success" },
            meta: "FAIL · bridge unavailable · labelled (no silent success)"
          };
          updateTool(i, "err", fail.meta);
          state.lastResults.push(fail);
          return fail;
        }
      } catch (_err) {
        if (isMutationTool(name) && opts.requireBridge) {
          const fail = {
            ok: false,
            source: "bridge",
            operationId: opId,
            tool: name,
            observations: null,
            outcome: null,
            error: { code: "bridge_exception", message: String(_err && _err.message ? _err.message : _err) },
            meta: "FAIL · bridge exception · no mock fallback"
          };
          updateTool(i, "err", fail.meta);
          state.lastResults.push(fail);
          return fail;
        }
        /* labelled fallthrough to mock for reads */
      }
    }
    /* Mutations bound to bridge (attempted/uncertain/requireBridge) must not reach mock success. */
    if (
      isMutationTool(name) &&
      (opts.bridgeAttemptedFail || opts.requireBridge || opts.noMockOnBridgeDown)
    ) {
      const fail = {
        ok: false,
        source: "bridge",
        operationId: opId,
        tool: name,
        observations: null,
        outcome: null,
        error: {
          code: opts.bridgeAttemptedFail ? "bridge_failure" : "bridge_unavailable",
          message: opts.bridgeAttemptedFail
            ? "Bridge mutation failed; mock blocked"
            : "Bridge required for this operation; mock blocked"
        },
        meta: "FAIL · bridge mutation · mock blocked"
      };
      updateTool(i, "err", fail.meta);
      state.lastResults.push(fail);
      return fail;
    }
    const raw = await work();
    const result = {
      ok: raw && raw.ok === false ? false : true,
      source: "mock",
      operationId: opId,
      tool: name,
      observations: (raw && raw.observations) || { summary: (raw && raw.meta) || meta },
      outcome: (raw && raw.outcome) || (raw && raw.detail) || {},
      error: (raw && raw.error) || null,
      meta: ((raw && raw.meta) || meta) + " · mock"
    };
    if (!result.ok) {
      updateTool(i, "err", result.meta);
    } else {
      updateTool(i, "ok", result.meta);
    }
    state.lastResults.push(result);
    return result;
  }

  function renderChat() {
    const el = $("#chat");
    el.innerHTML = state.messages
      .map((m) => {
        const who = m.role === "user" ? "You" : "Helper";
        return (
          `<div class="msg ${m.role}">` +
          `<div class="who">${who} · ${escapeHtml(m.at)}</div>` +
          `${escapeHtml(m.text)}` +
          `</div>`
        );
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function renderTimeline() {
    const el = $("#timeline");
    if (!state.tools.length) {
      el.innerHTML =
        `<div class="empty-state timeline-empty">` +
        `<span class="empty-ic" aria-hidden="true">${ICONS.task}</span>` +
        `<span class="empty-title">No steps yet</span>` +
        `<p class="empty-copy">Doorstep: Door → Package → Quiet → Handoff plan. Bedtime: Fire TV → Quiet → Task. Pick either story.</p>` +
        `<div class="empty-ctas">` +
        `<button type="button" class="btn btn-outline" data-empty-cta="doorstep">Doorstep story</button>` +
        `<button type="button" class="btn btn-outline" data-empty-cta="bedtime">Bedtime story</button>` +
        `</div>` +
        `</div>`;
      bindEmptyCtas(el);
      return;
    }
    el.innerHTML = state.tools
      .map((t) => {
        const friendly = toolMetaFor(t.name);
        const st =
          t.status === "running"
            ? "Working"
            : t.status === "ok"
              ? "Done"
              : t.status;
        const ic = ICONS[friendly.icon] || ICONS.task;
        return (
          `<div class="step ${escapeHtml(t.status)}">` +
          `<span class="dot" aria-hidden="true"></span>` +
          `<div class="step-label"><span class="step-ic">${ic}</span>${escapeHtml(friendly.label)}` +
          `<span class="status-tag">${st}</span></div>` +
          `<span class="step-tool-id">${escapeHtml(t.name)}</span>` +
          `<div class="meta">${escapeHtml(t.meta)} · ${escapeHtml(t.at)}</div>` +
          `</div>`
        );
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function bindEmptyCtas(root) {
    root.querySelectorAll("[data-empty-cta]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-empty-cta");
        if (id === "doorstep") ingest("doorstep");
        else if (id === "bedtime") ingest("bedtime");
      });
    });
  }

  function alertCard(a, iconKey) {
    const rail =
      a.sev === "crit" ? "sev-crit" : a.sev === "warn" ? "sev-warn" : "sev-info";
    const sevWord =
      a.sev === "crit" ? "Urgent" : a.sev === "warn" ? "Needs care" : "FYI";
    const ic = ICONS[iconKey] || ICONS.home;
    return (
      `<div class="card ${rail} enter-stagger">` +
      `<div class="card-inner">` +
      `<span class="sev ${escapeHtml(a.sev)}">${escapeHtml(sevWord)}</span>` +
      `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ic}</span>` +
      `<h3>${escapeHtml(a.title)}</h3></div>` +
      `<dl class="kv">` +
      `<dt>From</dt><dd>${escapeHtml(a.source)}</dd>` +
      `<dt>When</dt><dd>${escapeHtml(a.fired)}</dd>` +
      `<dt>Where</dt><dd>${escapeHtml(a.resource)}</dd>` +
      `<dt>What’s up</dt><dd>${escapeHtml(a.signal)}</dd>` +
      `<dt>Why it matters</dt><dd>${escapeHtml(a.blast)}</dd>` +
      `</dl></div></div>`
    );
  }

  function ticketText(s) {
    const plan = state.proposal;
    const isGuest = s.ticket.id.startsWith("GUEST");
    const kind = isGuest
      ? "SIMULATED HANDOFF PLAN (sample reference — not a gate credential)"
      : "HOUSEHOLD TASK (simulated)";
    const approvalStatus = plan ? plan.status : (uiPhase(state.phase) === "ticketed" ? "confirmed" : "draft");
    /* Artefact/execution status from tool outcome — never force confirmed from approval alone. */
    const artefactStatus =
      plan && plan.artefactStatus
        ? plan.artefactStatus
        : plan && plan.status && plan.status !== "confirmed"
          ? plan.status
          : "draft";
    const status = artefactStatus;
    const recipient = plan && plan.recipient
      ? plan.recipient.name + " (" + (plan.recipient.role || "") + ")"
      : "(see plan)";
    const action = plan && plan.action ? plan.action : "(pending approval)";
    const timing = plan && plan.timing && plan.timing.windowLabel
      ? plan.timing.windowLabel
      : s.window.proposed;
    const assumptions = plan && plan.assumptions && plan.assumptions.length
      ? plan.assumptions.map(function (a) { return "  - " + a; }).join("\n")
      : "  - (none listed)";
    const observations = plan && plan.observations && plan.observations.length
      ? plan.observations.map(function (a) { return "  - " + a; }).join("\n")
      : "  - " + s.primary.title;
    const lines = [
      kind,
      `Sample ref:  ${s.ticket.id}`,
      `Title:       ${s.ticket.title}`,
      `Status:      ${status}`,
      `Approval:    ${approvalStatus}`,
      `Recipient:   ${recipient}`,
      `Action:      ${action}`,
      `Timing:      ${timing}`,
      `Timezone:    ${s.window.tz}`,
      ``,
      `Observations:`,
      observations,
      `Assumptions:`,
      assumptions,
      ``,
      `Primary:     ${s.primary.title} @ ${s.primary.fired}`,
      `Secondary:   ${s.secondary.title} @ ${s.secondary.fired}`,
      ``,
      `Opened by Ops Concierge (Alexa+ simulation) session ${state.sessionId}`,
      `Household: Tshiamo Komane — Africa/Johannesburg`,
      `Note:       Sample reference only — not an unlock / door credential`
    ];
    return lines.join("\n");
  }

  function proposalCardHtml(plan) {
    if (!plan) return "";
    const approvalStatus = plan.status || "draft";
    const artefactStatus = plan.artefactStatus || null;
    const statusLabel = artefactStatus
      ? approvalStatus + " · artefact " + artefactStatus
      : approvalStatus;
    const recip = plan.recipient
      ? escapeHtml(plan.recipient.name) + " · " + escapeHtml(plan.recipient.role || "")
      : "—";
    const timing = plan.timing && plan.timing.windowLabel
      ? escapeHtml(plan.timing.windowLabel)
      : "—";
    const obs = (plan.observations || []).map(function (o) {
      return "<li>" + escapeHtml(o) + "</li>";
    }).join("");
    const ass = (plan.assumptions || []).map(function (o) {
      return "<li>" + escapeHtml(o) + "</li>";
    }).join("");
    const sample = plan.sampleRef
      ? `<dt>Sample ref</dt><dd class="sample-ref muted">${escapeHtml(plan.sampleRef)} · not a gate credential</dd>`
      : "";
    const artefactRow = artefactStatus
      ? `<dt>Artefact</dt><dd><strong>${escapeHtml(artefactStatus)}</strong></dd>`
      : "";
    return (
      `<div class="card sev-warn proposal-card enter-stagger" id="proposalCard">` +
      `<div class="card-inner">` +
      `<p class="proposal-badge">Handoff proposal · ${escapeHtml(statusLabel)}</p>` +
      `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.home}</span>` +
      `<h3>Next decision</h3></div>` +
      `<p class="card-note">${escapeHtml(plan.explanation || "Proposed plan from tool results.")}</p>` +
      `<dl class="kv proposal-kv">` +
      `<dt>Recipient</dt><dd><strong>${recip}</strong></dd>` +
      `<dt>Action</dt><dd><strong>${escapeHtml(plan.action || "")}</strong></dd>` +
      `<dt>Timing</dt><dd><strong>${timing}</strong></dd>` +
      `<dt>Approval</dt><dd><strong>${escapeHtml(approvalStatus)}</strong></dd>` +
      artefactRow +
      sample +
      `</dl>` +
      (obs ? `<details class="proposal-details"><summary>Observations</summary><ul>${obs}</ul></details>` : "") +
      (ass ? `<details class="proposal-details"><summary>Assumptions</summary><ul>${ass}</ul></details>` : "") +
      `</div></div>`
    );
  }

  function renderCards() {
    const el = $("#cards");
    if (!state.scenario) {
      el.innerHTML =
        `<div class="card empty">` +
        `<div class="empty-state">` +
        `<span class="empty-ic" aria-hidden="true">${ICONS.home}</span>` +
        `<span class="empty-title">Home is quiet right now</span>` +
        `<p class="empty-copy"><strong>Doorstep</strong> → simulated handoff (sample <strong>GUEST-10421</strong>). <strong>Bedtime</strong> → Fire TV task <strong>TASK-22018</strong>. Approve before anything is sent.</p>` +
        `<div class="empty-ctas">` +
        `<button type="button" class="btn btn-outline" data-empty-cta="doorstep">Doorstep story</button>` +
        `<button type="button" class="btn btn-outline" data-empty-cta="bedtime">Bedtime story</button>` +
        `</div>` +
        `</div></div>`;
      bindEmptyCtas(el);
      syncChrome();
      return;
    }

    const s = state.scenario;
    const parts = [];
    const primaryIcon = s.id === "bedtime" ? "tv" : "door";
    const secondaryIcon = s.id === "bedtime" ? "door" : "package";

    parts.push(
      `<div class="alert-pair">${alertCard(s.primary, primaryIcon)}${alertCard(s.secondary, secondaryIcon)}</div>`
    );

    if (state.proposal) {
      parts.unshift(proposalCardHtml(state.proposal));
    }

    if (state.ack) {
      parts.push(
        `<div class="card sev-info enter-stagger"><div class="card-inner">` +
          `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.chat}</span>` +
          `<h3>Held in this chat</h3></div>` +
          `<p class="card-note">` +
          `The helper is keeping <strong>${escapeHtml(s.title)}</strong> in mind — you won’t need to re-explain what’s happening at home.` +
          `</p></div></div>`
      );
    }

    if (["correlated", "windowed", "ticketed", "proposed", "superseded", "approved", "acted", "refused", "failed"].includes(state.phase) || ["correlated", "windowed", "ticketed"].includes(uiPhase(state.phase))) {
      parts.push(
        `<div class="card sev-info enter-stagger"><div class="card-inner">` +
          `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.home}</span>` +
          `<h3>How it fits together</h3></div>` +
          `<dl class="kv">` +
          `<dt>Story</dt><dd>${escapeHtml(
            s.id === "doorstep"
              ? "Doorbell motion and an expected AMZL stop are consistent — still not identity proof. Proposal stays cautious until you approve."
              : "Kids Fire TV is still on past quiet hours, so bedtime can’t finish — a caregiver nudge will help."
          )}</dd>` +
          `<dt>Calendar</dt><dd>${escapeHtml(s.context.householdCalendar)}</dd>` +
          `<dt>Last at home</dt><dd>${escapeHtml(s.context.lastActivity)}</dd>` +
          `<dt>Similar before</dt><dd>${escapeHtml(s.context.similar)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (["windowed", "ticketed", "proposed", "superseded", "approved", "acted", "refused"].includes(state.phase) || ["windowed", "ticketed"].includes(uiPhase(state.phase))) {
      parts.push(
        `<div class="card sev-warn enter-stagger"><div class="card-inner">` +
          `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.calendar}</span>` +
          `<h3>Quiet-hours plan (SAST)</h3></div>` +
          `<dl class="kv">` +
          `<dt>Best time</dt><dd>${escapeHtml((state.proposal && state.proposal.timing && state.proposal.timing.windowLabel) || s.window.proposed)}</dd>` +
          `<dt>Backup</dt><dd>${escapeHtml(
            (store && store.getBackupChoice() && store.getBackupChoice().label) ||
            (state.proposal && state.proposal.recipient && state.proposal.recipient.name === "Mira"
              ? "Superseded neighbour leave-with (Thabo unavailable)"
              : s.window.alt)
          )}</dd>` +
          `<dt>Why</dt><dd>${escapeHtml((state.proposal && state.proposal.explanation) || s.window.rationale)}</dd>` +
          `<dt>Timezone</dt><dd>${escapeHtml(s.window.tz)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (uiPhase(state.phase) === "ticketed" || state.phase === "acted") {
      const body = ticketText(s);
      const isGuest = s.ticket.id.startsWith("GUEST");
      const cardIcon = isGuest ? "guest" : "task";
      const copyLabel = isGuest ? "Copy guest code" : "Copy bedtime task";
      const revealWord = isGuest ? "Guest code ready" : "Bedtime task ready";
      const trophyKind = isGuest ? "guest-code" : "bedtime-task";
      parts.unshift(
        `<div class="card sev-ok ticket-reveal ticket-trophy" data-trophy="${trophyKind}" id="ticketTrophy">` +
          `<div class="card-inner">` +
          `<p class="ticket-reveal-badge"><span class="ticket-check" aria-hidden="true"></span> ${revealWord}</p>` +
          `<div class="ticket-head-trophy">` +
          `<div>` +
          `<span class="ticket-id-hero" id="ticketHeroId" aria-label="${escapeHtml(revealWord)} ${escapeHtml(s.ticket.id)}">${escapeHtml(s.ticket.id)}</span>` +
          `<div class="card-title-row ticket-title-tight"><span class="card-ic" aria-hidden="true">${ICONS[cardIcon]}</span>` +
          `<h3>${escapeHtml(s.ticket.title)}</h3></div>` +
          `</div>` +
          `<div class="ticket-actions">` +
          `<button class="btn btn-primary" type="button" id="copyTicket" aria-describedby="ticketHeroId">${copyLabel}</button>` +
          `<button class="btn btn-outline" type="button" id="printTicket" aria-describedby="ticketHeroId">${isGuest ? "Print guest card" : "Print task card"}</button>` +
          `</div>` +
          `</div>` +
          `<pre id="ticketBody">${escapeHtml(body)}</pre>` +
          `</div></div>`
      );
      announce(revealWord + ": " + s.ticket.id + ". Copy button available.");
    }

    el.innerHTML = parts.join("");

    const copy = $("#copyTicket");
    if (copy) {
      copy.addEventListener("click", async () => {
        const text = ticketText(s);
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            ok = document.execCommand("copy");
            ta.remove();
          } catch (_e2) {
            ok = false;
          }
        }
        if (ok) {
          showToast("Copied · " + s.ticket.id, "ok");
          copy.textContent = "Copied ✓";
          copy.classList.add("is-copied");
          announce("Copied " + s.ticket.id);
          setTimeout(() => {
            if (copy) {
              copy.textContent = copyLabel;
              copy.classList.remove("is-copied");
            }
          }, 1800);
        } else {
          const bodyEl = $("#ticketBody");
          if (bodyEl) {
            try {
              const range = document.createRange();
              range.selectNodeContents(bodyEl);
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
              bodyEl.focus && bodyEl.focus();
            } catch (_selErr) {}
          }
          showToast("Copy blocked — card text is selected; press Ctrl/Cmd+C", "err");
          announce("Copy failed. Guest card text is selected so you can copy manually.");
          pushMsg(
            "agent",
            "I couldn’t reach the clipboard from here. The guest/task card text on the board is selected — press Ctrl+C or Cmd+C, or use Print guest/task card instead."
          );
        }
      });
    }

    const printBtn = $("#printTicket");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        document.documentElement.setAttribute("data-print-ticket", "1");
        const cleanup = () => {
          document.documentElement.removeAttribute("data-print-ticket");
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        try {
          window.print();
          showToast("Print dialog opened · " + s.ticket.id, "ok");
          announce("Print dialog opened for " + s.ticket.id);
        } catch (_e) {
          cleanup();
          showToast("Print unavailable in this browser", "err");
        }
        setTimeout(cleanup, 1500);
      });
    }

    if (uiPhase(state.phase) === "ticketed" || state.phase === "acted") {
      const trophy = $("#ticketTrophy");
      if (trophy) {
        requestAnimationFrame(() => {
          try {
            trophy.scrollIntoView({ block: "nearest", behavior: "smooth" });
          } catch (_) {
            trophy.scrollIntoView(false);
          }
        });
      }
    }

    syncChrome();
  }

  function artefactChip(kind) {
    /* Scenario-aware trophy wording — bedtime equals doorstep */
    const bed = state.scenarioId === "bedtime";
    if (kind === "make") return bed ? "Make the bedtime task" : "Make the guest code";
    if (kind === "skip") return bed ? "Skip to bedtime task" : "Skip to guest code";
    if (kind === "noun") return bed ? "bedtime task" : "guest code";
    return bed ? "Make the bedtime task" : "Make the guest code";
  }

  function setChips(items) {
    state.chipItems = items.slice(0, 4);
    const el = $("#chips");
    el.innerHTML = state.chipItems
      .map(
        (t, i) =>
          `<button type="button" class="chip" data-key="${i + 1}" data-say="${escapeHtml(t)}" aria-label="Suggestion ${i + 1}: ${escapeHtml(t)}"><span class="chip-key" aria-hidden="true">${i + 1}</span><span class="chip-label">${escapeHtml(t)}</span></button>`
      )
      .join("");
    el.querySelectorAll(".chip").forEach((b) => {
      b.addEventListener("click", () => handleUtterance(b.dataset.say));
    });
  }

  function mockObservationsFor(id, tool) {
    const s = state.scenario;
    if (!s) return { summary: tool };
    if (id === "doorstep") {
      if (tool === "ring.query") {
        return {
          motion: true,
          parcelVisual: true,
          summary: "ring motion at front door · parcel-shaped cardboard"
        };
      }
      if (tool === "order.lookup") {
        return {
          eta: "16:00–18:00 SAST",
          carrier: "AMZL",
          matched: null,
          summary: "AMZL stop nearby / expected delivery window"
        };
      }
      if (tool === "calendar.propose") {
        return { summary: s.window.proposed };
      }
      if (tool === "session.ack") {
        return { summary: "ACK session " + state.sessionId };
      }
    } else {
      if (tool === "ring.query") {
        return { summary: "presence · kids room / living motion" };
      }
      if (tool === "order.lookup") {
        return { summary: "Fire TV kids profile still streaming past quiet hours" };
      }
      if (tool === "calendar.propose") {
        return { summary: s.window.proposed };
      }
    }
    return { summary: tool };
  }

  async function autoInspectAndPropose(id) {
    state.lastResults = [];
    state.phase = "inspecting";
    if (store) store.setPhase("inspecting");
    syncChrome();

    let results = [];
    if (id === "doorstep") {
      results.push(
        await runTool("ring.query", "Front door · package zone", async () => ({
          meta: "HIT " + state.scenario.primary.resource,
          observations: mockObservationsFor(id, "ring.query")
        }))
      );
      results.push(
        await runTool("order.lookup", "Amazon delivery expectation", async () => ({
          meta: "HIT " + state.scenario.secondary.resource,
          observations: mockObservationsFor(id, "order.lookup")
        }))
      );
      results.push(
        await runTool("session.ack", "Keep household context", async () => ({
          meta: "ACK " + state.scenario.ticket.id + " (local)",
          observations: mockObservationsFor(id, "session.ack")
        }))
      );
      results.push(
        await runTool("calendar.propose", "Household calendar · quiet hours (SAST)", async () => ({
          meta: state.scenario.window.proposed,
          observations: mockObservationsFor(id, "calendar.propose")
        }))
      );
    } else {
      results.push(
        await runTool("ring.query", "Kids room · living motion", async () => ({
          meta: "HIT ring-kids-room / living",
          observations: mockObservationsFor(id, "ring.query")
        }))
      );
      results.push(
        await runTool("order.lookup", "Fire TV session · routine", async () => ({
          meta: "HIT " + state.scenario.primary.resource,
          observations: mockObservationsFor(id, "order.lookup")
        }))
      );
      results.push(
        await runTool("session.ack", "Keep bedtime context", async () => ({
          meta: "ACK " + state.scenario.ticket.id + " (local)",
          observations: mockObservationsFor(id, "session.ack")
        }))
      );
      results.push(
        await runTool("calendar.propose", "Quiet hours / bedtime window (SAST)", async () => ({
          meta: state.scenario.window.proposed,
          observations: mockObservationsFor(id, "calendar.propose")
        }))
      );
    }

    state.ack = true;
    const facts = store ? store.getFacts() : {};
    const proposal = window.OpsPlanner
      ? window.OpsPlanner.buildProposal({
          storyId: id,
          results: results,
          facts: facts,
          fixture: state.scenario,
          sampleRef: state.scenario.ticket.id
        })
      : {
          planId: "plan_fallback",
          status: "draft",
          recipient: { name: id === "doorstep" ? "Thabo" : "Mira", role: id === "doorstep" ? "neighbour" : "parent" },
          action: id === "doorstep" ? "notify_handoff" : "caregiver_nudge",
          timing: { windowLabel: state.scenario.window.proposed, timezone: "Africa/Johannesburg" },
          observations: ["inspection complete"],
          assumptions: ["demo fallback planner"],
          explanation: "Fallback proposal",
          sampleRef: state.scenario.ticket.id
        };

    state.proposal = proposal;
    if (store) store.setProposal(proposal);
    state.phase = "proposed";
    return proposal;
  }

  async function ingest(id, opts) {
    opts = opts || {};
    if (!window.OPS_SCENARIOS[id]) return;

    const prevId = state.scenarioId;
    const switching =
      prevId && prevId !== id && state.phase && state.phase !== "idle";

    /* Immutable seeds: always clone via OpsState — never mutate OPS_SCENARIOS */
    let snap;
    let resuming = false;
    if (store) {
      if (opts.resume) {
        store.switchStory(id);
        const existing = store.getSession(id);
        if (canResumeSession(existing) && !opts.forceRestart && !opts.fresh) {
          snap = existing;
          resuming = true;
        } else {
          /* Fresh suggestion / empty session — inspect, do not claim resume */
          snap = store.startStory(id, { phase: "inspecting" });
          resuming = false;
        }
      } else if (switching && !opts.fresh) {
        /* pause prior; start or resume target */
        syncSessionMessagesTools();
        persistDemo();
        store.switchStory(id);
        const existing = store.getSession(id);
        if (canResumeSession(existing) && !opts.forceRestart) {
          snap = existing;
          resuming = true;
        } else {
          snap = store.startStory(id, { phase: "inspecting" });
        }
      } else {
        snap = store.resetFresh(id);
      }
      hydrateUiFromSession(snap);
    } else {
      state.scenarioId = id;
      state.scenario = JSON.parse(JSON.stringify(window.OPS_SCENARIOS[id]));
      state.phase = "inspecting";
      state.ack = false;
      state.tools = [];
      state.messages = [];
      state.sessionId = "sess-" + Date.now().toString(36);
      state.proposal = null;
      state.lastResults = [];
    }

    /* Resume only when an existing usable session/plan exists */
    if (resuming) {
      setThinking(false);
      resetHowStrip();
      highlightHow(id);
      syncChrome();
      announce(id === "doorstep" ? "Resumed doorstep story" : "Resumed bedtime story");
      pushMsg(
        "agent",
        "Back to the " +
          id +
          " story — your previous plan and status are still here. Selected plan stays the source of truth."
      );
      setChips(proposalChips());
      renderCards();
      renderTimeline();
      renderChat();
      persistDemo();
      return;
    }

    setThinking(true);
    resetHowStrip();
    highlightHow(id);
    syncChrome();
    announce(
      switching
        ? (id === "doorstep" ? "Switching to doorstep story" : "Switching to bedtime story")
        : id === "doorstep"
          ? "Starting doorstep story"
          : "Starting bedtime story"
    );
    const coach = $("#coachBanner");
    if (coach && !coach.hidden) {
      coach.hidden = true;
      try { localStorage.setItem(COACH_KEY, "1"); } catch (_) {}
    }

    pushMsg("user", state.scenario.spokenStart);
    if (switching) {
      const fromLabel = prevId === "doorstep" ? "doorstep" : "bedtime";
      const toLabel = id === "doorstep" ? "doorstep" : "bedtime";
      pushMsg(
        "agent",
        "No problem — pausing the " +
          fromLabel +
          " story and starting " +
          toLabel +
          " fresh. Your previous guest code or task stays in memory only for this demo; the board now follows the new story."
      );
      showToast("Switched to " + toLabel + " story", "ok");
    }

    pushMsg(
      "agent",
      id === "doorstep"
        ? "Your parcel arrived during bedtime prep. I’m checking the doorbell, expected order, and household context automatically — then I’ll propose a handoff plan for your approval."
        : "Okay — I’m checking Fire TV and bedtime context automatically, then I’ll propose a quiet-hours plan for your approval."
    );

    const proposal = await autoInspectAndPropose(id);
    setThinking(false);

    const problem =
      id === "doorstep"
        ? "Parcel at the stoop while Mira is still at pickup."
        : "Fire TV still on past quiet hours.";
    const decision =
      "Send " +
      (proposal.recipient && proposal.recipient.name ? proposal.recipient.name : "the recipient") +
      " the handoff plan?";

    pushMsg(
      "agent",
      problem +
        " " +
        (proposal.explanation || "") +
        " Recipient: " +
        (proposal.recipient && proposal.recipient.name) +
        "; action: " +
        proposal.action +
        "; timing: " +
        (proposal.timing && proposal.timing.windowLabel) +
        "; status: " +
        proposal.status +
        ". " +
        decision +
        " (Sample ref " +
        (proposal.sampleRef || state.scenario.ticket.id) +
        " is documentation only — not a gate credential.)"
    );

    setChips(proposalChips());
    renderCards();
    renderTimeline();
    syncChrome();
    syncSessionMessagesTools();
    persistDemo();
  }

  function proposalChips() {
    const bed = state.scenarioId === "bedtime";
    const phase = state.phase;
    if (phase === "acted") {
      return ["What’s still risky?", "Try the other story", "Reset demo", "Summarise for the family"];
    }
    if (phase === "refused") {
      return [
        bed ? "Make the bedtime task" : "Approve the plan",
        "Neighbour unavailable",
        "What is a guest code?",
        "Try the other story"
      ];
    }
    if (phase === "failed") {
      return [
        bed ? "Make the bedtime task" : "Approve the plan",
        "Not yet",
        "What’s still risky?",
        "Try the other story"
      ];
    }
    return [
      bed ? "Make the bedtime task" : "Make the guest code",
      "Neighbour unavailable",
      "What is a guest code?",
      "Not yet"
    ];
  }

  async function handleDecline(utterance) {
    pushMsg("user", utterance);
    if (store && store.getActive()) {
      store.refuse();
    }
    if (state.proposal) {
      state.proposal = Object.assign({}, state.proposal, { status: "refused" });
    }
    state.phase = "refused";
    pushMsg(
      "agent",
      "Understood — I won’t create or send anything. No notification, unlock, or completion. Your exact words stay in this chat."
    );
    setChips(proposalChips());
    renderCards();
    syncChrome();
    syncSessionMessagesTools();
    persistDemo();
  }

  async function handleAskInfo(utterance) {
    pushMsg("user", utterance);
    const q = String(utterance || "").toLowerCase();
    if (/available|whether|only if|confirm if|confirm whether|\bif\b|\bafter\b|\bwhen\b|go ahead if|do it after/.test(q)) {
      pushMsg(
        "agent",
        "That’s an information check, not approval — I won’t notify anyone or open a card. " +
          (state.proposal
            ? ("Current draft is " +
                (state.proposal.recipient && state.proposal.recipient.name) +
                " / " +
                state.proposal.action +
                " (" +
                state.proposal.planId +
                "). Say an unconditional “approve” or “approve " +
                state.proposal.planId +
                "” when you want to proceed.")
            : "Start a story first if you want a plan on the board.")
      );
    } else {
      pushMsg(
        "agent",
        "A guest code here is a sample handoff artifact (e.g. GUEST-10421) — a simulated instruction card for the household demo. It is not a working gate or door credential, and asking about it does not create one. Approve an explicit plan if you want the simulation to open the card."
      );
    }
    setChips(proposalChips());
    renderCards();
    syncChrome();
    syncSessionMessagesTools();
    persistDemo();
  }

  function factsFromReplanUtterance(utterance, storyId) {
    const q = String(utterance || "").toLowerCase();
    const facts = {};
    const namesCaregiver = /\b(mira|parent|caregiver)\b/.test(q);
    const namesNeighbour = /\b(neighbour|neighbor|thabo)\b/.test(q);
    const unavailable = /\b(unavailable|can't|cannot|can not|not available|busy|away|out)\b/.test(q) ||
      /\b(is|are)\s+not\b/.test(q);
    if (namesCaregiver && unavailable) {
      facts.caregiverAvailable = false;
      facts.miraAvailable = false;
    } else if (namesNeighbour && unavailable) {
      facts.neighbourAvailable = false;
      facts.neighbourUnavailable = true;
    } else if (unavailable && storyId === "bedtime") {
      facts.caregiverAvailable = false;
      facts.miraAvailable = false;
    } else if (unavailable) {
      facts.neighbourAvailable = false;
      facts.neighbourUnavailable = true;
    }
    if (/\bbackup\b/.test(q)) {
      facts.preferBackup = true;
    }
    return facts;
  }

  async function handleReplan(utterance) {
    pushMsg("user", utterance);
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try a doorstep or bedtime story first.");
      return;
    }
    setThinking(true);
    const facts = factsFromReplanUtterance(utterance, state.scenarioId);
    if (store) store.setFacts(facts);
    const prior = state.proposal;
    const replanned = window.OpsPlanner
      ? window.OpsPlanner.replan({
          storyId: state.scenarioId,
          results: state.lastResults,
          facts: facts,
          priorProposal: prior,
          fixture: state.scenario,
          sampleRef: state.scenario.ticket.id
        })
      : null;
    if (!replanned) {
      setThinking(false);
      pushMsg("agent", "I couldn’t rebuild the plan — planner unavailable.");
      return;
    }
    if (store) store.supersede(replanned.proposal);
    state.proposal = replanned.proposal;
    state.phase = "proposed";
    /* keep fixture clone honest — backup choice only on session; align summaries with selected plan */
    if (store) {
      const backupLabel =
        facts.neighbourUnavailable || facts.neighbourAvailable === false
          ? "Superseded neighbour leave-with (Thabo unavailable)"
          : facts.miraAvailable === false || facts.caregiverAvailable === false
            ? "Caregiver nudge superseded — automation backup"
            : (state.scenario.window && state.scenario.window.alt) || "Alternate window";
      store.setBackupChoice({ window: backupLabel, label: backupLabel });
      store.mutateFixture(function (f) {
        if (f && f.window) {
          f.window.proposed = replanned.proposal.timing.windowLabel;
          f.window.alt = backupLabel;
        }
      });
      state.scenario = store.getFixture();
    }
    setThinking(false);
    const changedRecipient =
      prior && prior.recipient && replanned.proposal.recipient &&
      prior.recipient.name !== replanned.proposal.recipient.name;
    if (
      (facts.miraAvailable === false || facts.caregiverAvailable === false) &&
      replanned.proposal.recipient &&
      replanned.proposal.recipient.name === "Mira"
    ) {
      pushMsg(
        "agent",
        "Mira/caregiver is marked unavailable, but I still need a feasible alternate. " +
          "Please confirm who should take the bedtime check-in, or say “use the backup plan” for automation."
      );
    } else {
      pushMsg(
        "agent",
        "Got it — updated facts applied. Prior plan " +
          (prior && prior.planId ? prior.planId : "") +
          " is superseded. New plan: recipient " +
          replanned.proposal.recipient.name +
          ", action " +
          replanned.proposal.action +
          ", timing " +
          replanned.proposal.timing.windowLabel +
          (changedRecipient ? " (recipient changed)." : ".") +
          " " +
          replanned.proposal.explanation
      );
    }
    setChips(proposalChips());
    renderCards();
    syncChrome();
    syncSessionMessagesTools();
    persistDemo();
  }

  async function handleApprove(utterance, classified) {
    pushMsg("user", utterance);
    if (!state.scenario || !state.proposal) {
      pushMsg("agent", "Nothing to approve yet. Start Doorstep or Bedtime first.");
      return;
    }
    if (state.proposal.needsClarification || state.proposal.action === "ask_clarification") {
      pushMsg(
        "agent",
        "This proposal still needs clarification — I won’t notify or open a card until evidence is resolved."
      );
      setChips(proposalChips());
      renderCards();
      syncChrome();
      return;
    }
    classified = classified || {};
    const explicitPlanId = classified.planId || null;
    const planId = explicitPlanId || state.proposal.planId;
    let decision = { ok: true, idempotent: false, planId: planId };
    if (store) {
      decision = store.approve(planId);
    } else if (explicitPlanId && state.proposal.planId !== explicitPlanId) {
      decision = {
        ok: false,
        reason: "unknown_or_stale",
        message: "That plan id is not the current proposal. Approve the current plan or name its id."
      };
    }
    if (!decision.ok) {
      pushMsg(
        "agent",
        decision.message || "Approval rejected."
      );
      setChips(proposalChips());
      renderCards();
      syncChrome();
      syncSessionMessagesTools();
      persistDemo();
      return;
    }
    if (decision.idempotent) {
      pushMsg(
        "agent",
        "Already approved — no duplicate notification or card. Status stays " +
          ((state.proposal && state.proposal.status) || "confirmed") +
          " for plan " +
          planId +
          ". Action counts unchanged."
      );
      setChips(proposalChips());
      renderCards();
      syncChrome();
      syncSessionMessagesTools();
      persistDemo();
      return;
    }

    state.phase = "approved";
    setThinking(true);

    let progress = store && store.getOperationProgress ? store.getOperationProgress(planId) : {};
    const notifyDone = !!(progress.notify && progress.notify.status === "done");
    const taskDone = !!(progress.task && progress.task.status === "done");

    let notify = null;
    if (!notifyDone) {
      pushMsg(
        "agent",
        "Approval recorded. Queuing a simulated household nudge, then opening the handoff card…"
      );
      if (state.proposal) {
        state.proposal = Object.assign({}, state.proposal, { status: "queued" });
        state.queuedNotify = true;
        renderCards();
      }
      const notifyOpId =
        (progress.notify && progress.notify.operationId) || nextOpId("notify.household");
      const notifyRequireBridge = operationBoundToBridge(progress.notify);
      if (store && store.setOperationProgress) {
        store.setOperationProgress(planId, "notify", {
          status: "pending",
          operationId: notifyOpId
        });
      }
      notify = await runTool(
        "notify.household",
        "Queue a household nudge",
        async () => ({
          meta: "notify queued · sim",
          observations: { summary: "notify queued" },
          outcome: { queued: true }
        }),
        { requireBridge: notifyRequireBridge, operationId: notifyOpId }
      );

      if (!notify.ok) {
        setThinking(false);
        state.phase = "failed";
        if (store) {
          store.markFailed(notify.error);
          if (store.setOperationProgress) {
            store.setOperationProgress(
              planId,
              "notify",
              operationProgressFields(
                "failed",
                notify.operationId || notifyOpId,
                notify,
                progress.notify
              )
            );
          }
        }
        if (state.proposal) state.proposal = Object.assign({}, state.proposal, { status: "draft" });
        pushMsg(
          "agent",
          "Action failed — no false success. Source: " +
            (notify.source || "unknown") +
            ". " +
            ((notify.error && notify.error.message) || "Tool error") +
            " Recovery: fix the helper link, retry approval, or decline. Notification was not mocked as success."
        );
        setChips(proposalChips());
        renderCards();
        syncChrome();
        syncSessionMessagesTools();
        persistDemo();
        return;
      }
      if (store) {
        store.bumpAction("notify");
        if (store.setOperationProgress) {
          store.setOperationProgress(
            planId,
            "notify",
            operationProgressFields("done", notify.operationId || notifyOpId, notify, progress.notify)
          );
        }
      }
      progress = store && store.getOperationProgress ? store.getOperationProgress(planId) : progress;
    } else {
      notify = {
        ok: true,
        source: "resumed",
        operationId: progress.notify && progress.notify.operationId,
        meta: "notify already queued · resumed"
      };
      pushMsg(
        "agent",
        "Notification already queued for this plan — resuming unfinished card open (no re-send)."
      );
    }

    let opened = null;
    if (!taskDone) {
      const taskOpId = (progress.task && progress.task.operationId) || nextOpId("task.open");
      const taskRequireBridge = operationBoundToBridge(progress.task);
      if (store && store.setOperationProgress) {
        store.setOperationProgress(planId, "task", {
          status: "pending",
          operationId: taskOpId
        });
      }
      opened = await runTool(
        "task.open",
        "Draft handoff card (local)",
        async () => ({
          meta: state.scenario.ticket.id + " draft",
          observations: { summary: "handoff card opened", status: "draft" },
          outcome: { id: state.scenario.ticket.id, status: "draft" }
        }),
        { requireBridge: taskRequireBridge, operationId: taskOpId }
      );

      if (!opened.ok) {
        setThinking(false);
        state.phase = "failed";
        if (store) {
          store.markFailed(opened.error);
          if (store.setOperationProgress) {
            store.setOperationProgress(
              planId,
              "task",
              operationProgressFields(
                "failed",
                opened.operationId || taskOpId,
                opened,
                progress.task
              )
            );
          }
        }
        pushMsg(
          "agent",
          "Handoff card could not be opened — no false success. Source: " +
            (opened.source || "unknown") +
            ". " +
            ((opened.error && opened.error.message) || "Tool error") +
            " Notification already queued once; retry will not re-send unless you reset."
        );
        setChips(proposalChips());
        renderCards();
        syncChrome();
        syncSessionMessagesTools();
        persistDemo();
        return;
      }
      if (store) {
        store.bumpAction("task");
        if (store.setOperationProgress) {
          store.setOperationProgress(
            planId,
            "task",
            operationProgressFields("done", opened.operationId || taskOpId, opened, progress.task)
          );
        }
      }
    } else {
      opened = {
        ok: true,
        source: "resumed",
        outcome: { id: state.scenario.ticket.id, status: (state.proposal && state.proposal.artefactStatus) || "draft" },
        observations: { status: (state.proposal && state.proposal.artefactStatus) || "draft" }
      };
    }

    const outcomeStatus =
      (opened.outcome && opened.outcome.status) ||
      (opened.observations && opened.observations.status) ||
      "draft";
    if (state.proposal) {
      /* Approval/lifecycle confirmed; artefact status stays the tool outcome. */
      state.proposal = Object.assign({}, state.proposal, {
        status: "confirmed",
        artefactStatus: outcomeStatus
      });
      if (store) store.setProposal(state.proposal);
    }
    state.phase = "acted";
    if (store) store.markActed(opened);
    setThinking(false);
    pushMsg(
      "agent",
      "Handoff for " +
        (state.proposal.recipient && state.proposal.recipient.name) +
        " recorded. Notification source: " +
        (notify && notify.source ? notify.source : "mock") +
        ". Card/tool status from backend: " +
        outcomeStatus +
        " (approval confirmed; artefact status remains " +
        outcomeStatus +
        "). Sample ref " +
        state.scenario.ticket.id +
        " is ready to copy — it is not a gate credential."
    );
    setChips(proposalChips());
    renderCards();
    syncChrome();
    syncSessionMessagesTools();
    persistDemo();
  }

  async function switchToOtherStory() {
    const cur = state.scenarioId;
    const other = cur === "doorstep" ? "bedtime" : cur === "bedtime" ? "doorstep" : "bedtime";
    if (store && state.scenarioId) {
      syncSessionMessagesTools();
      persistDemo();
    }
    const existing = store ? store.getSession(other) : null;
    await ingest(other, {
      resume: canResumeSession(existing),
      forceRestart: false
    });
  }

  async function resetDemoFresh() {
    if (store) {
      const id = store.getActive() || state.scenarioId;
      store.clear();
      if (id) {
        await ingest(id, { fresh: true, forceRestart: true });
        return;
      }
    }
    hydrateUiFromSession(null);
    state.messages = [];
    pushMsg(
      "agent",
      "Demo cleared. Seeds are pristine — a new Doorstep run will not inherit a prior backup choice."
    );
    setChips(["Someone’s at the door", "Start bedtime", "Show shortcuts"]);
    renderCards();
    renderTimeline();
    syncChrome();
  }

  async function acknowledge() {
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try the doorstep story or the bedtime story.");
      return;
    }
    if (state.ack) {
      pushMsg(
        "agent",
        "Already holding this moment. I still remember both signals — we can connect the dots or pick a quiet-hours plan without starting over."
      );
      return;
    }
    setThinking(true);
    pushMsg("user", "Got it — hold both.");
    await runTool("session.ack", "Keep signals in this chat", async () => ({
      meta: "ACK " + state.scenario.ticket.id + " (local)"
    }));
    state.ack = true;
    state.phase = "ack";
    setThinking(false);
    pushMsg(
      "agent",
      "Got it. I’m holding that home moment in this chat. Next I can check the calendar, what happened last, and similar moments."
    );
    setChips([
      "Connect the dots",
      "Suggest a quiet-hours plan",
      artefactChip("skip")
    ]);
    renderCards();
    syncChrome();
  }

  async function correlate() {
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try a doorstep or bedtime story first.");
      return;
    }
    if (!state.ack) {
      await acknowledge();
    }
    setThinking(true);
    pushMsg("user", "Connect the dots.");
    await runTool("ring.query", "Who was home recently?", async () => ({
      meta: "presence pedigree"
    }));
    await runTool("order.lookup", "Delivery / device notes", async () => ({
      meta: "ETA · profile · routine"
    }));
    await runTool("notify.household", "Similar home moments", async () => ({
      meta: state.scenario.context.similar.split(":")[0]
    }));
    state.phase = "correlated";
    setThinking(false);

    const line =
      state.scenarioId === "doorstep"
        ? "Here’s the story: doorbell motion and an expected AMZL window are consistent with today’s order — still not a verified visitor identity. "
        : "Here’s the story: Fire TV is still on past quiet hours, so bedtime stalled. ";

    pushMsg(
      "agent",
      line +
        state.scenario.context.similar +
        " Last activity doesn’t show anyone home to finish this. I can suggest a quiet-hours plan on the household calendar (SAST)."
    );
    setChips([
      "Suggest a quiet-hours plan",
      artefactChip("make"),
      "What happened last?"
    ]);
    renderCards();
    syncChrome();
  }

  async function proposeWindow() {
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try a doorstep or bedtime story first.");
      return;
    }
    if (state.phase === "ingested" || state.phase === "ack") {
      await correlate();
    }
    setThinking(true);
    pushMsg("user", "Suggest a quiet-hours plan.");
    await runTool(
      "calendar.propose",
      "Household calendar · quiet hours (SAST)",
      async () => ({
        meta: state.scenario.window.proposed
      })
    );
    state.phase = "windowed";
    setThinking(false);
    pushMsg(
      "agent",
      "Best time: " +
        state.scenario.window.proposed +
        ". Backup: " +
        state.scenario.window.alt +
        ". " +
        state.scenario.window.rationale +
        " When you’re ready, I can open a " +
        artefactChip("noun") +
        " you can copy."
    );
    setChips([
      artefactChip("make"),
      "Use the backup plan instead",
      "Not yet — keep planning"
    ]);
    renderCards();
    syncChrome();
  }

  async function openTicket() {
    /* Legacy entry — route through explicit approve so refusal cannot reach here by substring. */
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try a doorstep or bedtime story first.");
      return;
    }
    if (!state.proposal) {
      setThinking(true);
      await autoInspectAndPropose(state.scenarioId);
      setThinking(false);
    }
    await handleApprove(artefactChip("make"));
  }

  function followup(text) {
    const s = state.scenario;
    if (!s) {
      pushMsg(
        "agent",
        "Home is quiet — nothing is on the board yet. Try the doorstep story (guest code GUEST-10421 path) or the bedtime story (TASK-22018), press D or B, or tap a suggestion below."
      );
      return;
    }
    const q = text.toLowerCase();
    if (q.includes("blast") || q.includes("impact") || q.includes("matter")) {
      pushMsg(
        "agent",
        "Why it matters: " + s.primary.blast + " Also: " + s.secondary.blast
      );
      return;
    }
    if (q.includes("deploy") || q.includes("activity") || q.includes("last") || q.includes("happened")) {
      pushMsg("agent", s.context.lastActivity);
      return;
    }
    if (
      q.includes("alternate") ||
      q.includes("alt") ||
      q.includes("auto-pause") ||
      q.includes("instead") ||
      q.includes("backup")
    ) {
      pushMsg(
        "agent",
        "Switching to the backup plan: " +
          s.window.alt +
          ". The card text will use this if you reopen it."
      );
      if (store) {
        store.setBackupChoice({ window: s.window.alt });
        store.mutateFixture(function (f) {
          if (f && f.window) f.window.proposed = f.window.alt + " (preferred)";
        });
        state.scenario = store.getFixture();
      } else {
        /* never touch OPS_SCENARIOS seeds */
        state.scenario = Object.assign({}, s, {
          window: Object.assign({}, s.window, {
            proposed: s.window.alt + " (preferred)"
          })
        });
      }
      if (["windowed", "ticketed", "proposed", "acted"].includes(state.phase) || ["windowed", "ticketed"].includes(uiPhase(state.phase)))
        renderCards();
      return;
    }
    if (q.includes("summar") || q.includes("household") || q.includes("family") || q.includes("bridge")) {
      pushMsg(
        "agent",
        "Family brief: " +
          s.title +
          ". " +
          s.primary.title +
          "; " +
          s.secondary.title +
          ". Status: " +
          PHASE_LABEL[state.phase] +
          ". Plan: " +
          s.window.proposed +
          "."
      );
      return;
    }
    if (q.includes("risk")) {
      pushMsg(
        "agent",
        "Still a demo: doorbell, package, and routine details are sample data. A live Alexa+ skill would need real Ring and shopping connections — and someone at home. The calendar here is simulated."
      );
      return;
    }
    if (q.includes("copy nothing") || q.includes("not yet") || q.includes("keep planning")) {
      pushMsg(
        "agent",
        "Understood — no card yet. The quiet-hours plan stays right here in this chat."
      );
      return;
    }
    pushMsg(
      "agent",
      "I’m not sure I caught that, but I still have “" +
        s.title +
        "” in this chat (" +
        PHASE_SHORT[state.phase] +
        "). I won’t start over. Try: got it · connect the dots · quiet hours · make the guest code / bedtime task — or tap a suggestion below. Press D for doorstep, B for bedtime, or ? for shortcuts."
    );
  }

  async function handleUtterance(raw) {
    const text = (raw || "").trim();
    if (state.thinking) return;
    if (!text) {
      showToast("Type a short ask, or tap a suggestion below", "err");
      announce("Message was empty. Type an ask or tap a suggestion.");
      pushMsg(
        "agent",
        "I didn’t catch a message. Try “Someone’s at the door”, “Start bedtime”, or tap a suggestion — or press D / B."
      );
      return;
    }

    if (
      text.toLowerCase() === "show shortcuts" ||
      text.toLowerCase() === "shortcuts" ||
      text === "?"
    ) {
      openShortcuts();
      return;
    }

    /* Intent first — NEVER broad substring approve (Don't make the guest code trap). */
    const classified = window.OpsIntent
      ? window.OpsIntent.classify(text, {
          phase: state.phase,
          storyId: state.scenarioId
        })
      : { intent: "ambiguous", utterance: text };
    const intent = classified.intent;

    if (intent === "decline") {
      await handleDecline(classified.utterance || text);
      return;
    }
    if (intent === "ask_info") {
      await handleAskInfo(classified.utterance || text);
      return;
    }
    if (intent === "replan_facts") {
      await handleReplan(classified.utterance || text);
      return;
    }
    if (intent === "approve") {
      /* Artefact / plan chips before story restarts — explicit approve only; carry planId */
      await handleApprove(classified.utterance || text, classified);
      return;
    }
    if (intent === "reset") {
      pushMsg("user", text);
      await resetDemoFresh();
      return;
    }
    if (intent === "switch_story") {
      pushMsg("user", text);
      const target = classified.target;
      if (target === "bedtime" || target === "doorstep") {
        await ingest(target, { resume: true });
      } else {
        await switchToOtherStory();
      }
      return;
    }
    if (intent === "inspect") {
      pushMsg("user", text);
      await ingest("doorstep", { fresh: !state.scenarioId });
      return;
    }

    /* Legacy helper verbs still useful mid-flow when not caught above */
    const q = text.toLowerCase();
    if (
      q.includes("acknowledge") ||
      q.includes("ack both") ||
      q === "ack" ||
      q.includes("got it") ||
      q.includes("hold both")
    ) {
      await acknowledge();
      return;
    }
    if (
      q.includes("correlat") ||
      q.includes("gather context") ||
      q.includes("connect the dots")
    ) {
      await correlate();
      return;
    }
    if (
      q.includes("quiet-hours") ||
      q.includes("quiet hours") ||
      q.includes("suggest a quiet")
    ) {
      await proposeWindow();
      return;
    }

    /* Try the other story — both directions (not bedtime-only) */
    if (q.includes("other demo") || q.includes("other story") || q.includes("try the other")) {
      pushMsg("user", text);
      await switchToOtherStory();
      return;
    }

    if (q.includes("start bedtime") || (q.includes("bedtime") && !state.scenarioId)) {
      await ingest("bedtime");
      return;
    }
    if (
      q.includes("doorstep") ||
      q.includes("someone") ||
      q.includes("at the door")
    ) {
      await ingest("doorstep");
      return;
    }

    pushMsg("user", text);
    followup(text);
  }

  function openShortcuts() {
    $("#shortcutsOverlay").hidden = false;
    $("#shortcutsOverlay").removeAttribute("hidden");
    announce("Keyboard shortcuts opened");
    $("#closeShortcuts").focus();
  }
  function closeShortcuts() {
    $("#shortcutsOverlay").hidden = true;
    $("#helpBtn").focus();
  }

  function bindHowStrip() {
    document.querySelectorAll(".how-step").forEach((step) => {
      step.addEventListener("click", () => {
        step.classList.toggle("is-active");
      });
      step.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          step.classList.toggle("is-active");
        }
      });
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", (e) => {
      const overlayOpen = !$("#shortcutsOverlay").hidden;
      const tag = (e.target && e.target.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Escape" && overlayOpen) {
        e.preventDefault();
        closeShortcuts();
        return;
      }

      if (e.key === "?" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (overlayOpen) closeShortcuts();
        else openShortcuts();
        return;
      }

      if (overlayOpen) return;
      if (state.thinking) return;

      if (!typing && (e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        ingest("doorstep");
        return;
      }

      if (!typing && (e.key === "b" || e.key === "B") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        ingest("bedtime");
        return;
      }

      if (!typing && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const idx = parseInt(e.key, 10) - 1;
        if (state.chipItems[idx]) {
          e.preventDefault();
          handleUtterance(state.chipItems[idx]);
        }
      }
    });
  }


  const COACH_KEY = "ops-coach-dismissed";

  function syncCompactMode() {
    const short = window.matchMedia("(max-height: 900px)").matches;
    document.documentElement.setAttribute("data-compact", short ? "1" : "0");
  }

  function syncStoryAttr() {
    const root = document.documentElement;
    if (state.scenarioId) root.setAttribute("data-story", state.scenarioId);
    else root.removeAttribute("data-story");
    const d1 = $("#demoBtn");
    const d2 = $("#demoBtn2");
    if (d1) d1.classList.toggle("is-story-active", state.scenarioId === "doorstep");
    if (d2) d2.classList.toggle("is-story-active", state.scenarioId === "bedtime");
  }

  function initCoach() {
    const banner = $("#coachBanner");
    if (!banner) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(COACH_KEY) === "1";
    } catch (_) {}
    if (dismissed) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    const dismiss = () => {
      banner.hidden = true;
      try {
        localStorage.setItem(COACH_KEY, "1");
      } catch (_) {}
      announce("Quick start tip dismissed");
    };
    const dismissBtn = $("#coachDismiss");
    const startBtn = $("#coachStartDoorstep");
    const startBed = $("#coachStartBedtime");
    if (dismissBtn) dismissBtn.addEventListener("click", dismiss);
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        dismiss();
        ingest("doorstep");
      });
    }
    if (startBed) {
      startBed.addEventListener("click", () => {
        dismiss();
        ingest("bedtime");
      });
    }
  }

  function bind() {
    $("#demoBtn").addEventListener("click", () => ingest("doorstep"));
    $("#demoBtn2").addEventListener("click", () => ingest("bedtime"));
    $("#sendBtn").addEventListener("click", () => {
      if (state.thinking) return;
      const v = ($("#utter").value || "").trim();
      $("#utter").value = "";
      syncSendEnabled();
      handleUtterance(v);
    });
    $("#utter").addEventListener("input", syncSendEnabled);
    $("#utter").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (state.thinking) return;
        const v = ($("#utter").value || "").trim();
        $("#utter").value = "";
        syncSendEnabled();
        handleUtterance(v);
      }
    });
    $("#helpBtn").addEventListener("click", openShortcuts);
    $("#closeShortcuts").addEventListener("click", closeShortcuts);
    $("#shortcutsOverlay").addEventListener("click", (e) => {
      if (e.target === $("#shortcutsOverlay")) closeShortcuts();
    });

    bindKeyboard();
    bindHowStrip();
    syncCompactMode();
    window.addEventListener("resize", syncCompactMode);
    initCoach();
    tickClock();
    setInterval(tickClock, 1000);
    startPlaceholderRotation();
    refreshMcpPill(true);
    setInterval(() => refreshMcpPill(false), 12000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshMcpPill(true);
    });

    let resumed = false;
    if (store) {
      const loaded = store.load();
      if (loaded && loaded.ok && loaded.active) {
        hydrateUiFromSession(store.getSession(loaded.active));
        resumed = !!(state.scenario && state.phase && state.phase !== "idle");
      }
    }

    if (resumed) {
      pushMsg(
        "agent",
        "Welcome back — restored synthetic demo state (ops-demo-v1). Your " +
          state.scenarioId +
          " plan is still here. Say “reset” or tap Reset demo to clear."
      );
      setChips(
        state.phase === "acted"
          ? ["Try the other story", "Reset demo", "What’s still risky?", "Show shortcuts"]
          : proposalChips().concat(["Reset demo"]).slice(0, 4)
      );
    } else {
      pushMsg(
        "agent",
        "Hi — I’m your home helper. Doorbell, packages, quiet hours, and Fire TV don’t usually talk to each other. I connect them into one clear plan: a guest code when someone’s at the door, or a bedtime task when the TV is still on. Try Doorstep or Bedtime below — no live device needed."
      );
      setChips(["Someone’s at the door", "Start bedtime", "Show shortcuts"]);
    }
    renderCards();
    renderTimeline();
    renderChat();
    syncChrome();
    syncSendEnabled();
  }

  /* Test/demo hooks — not product chrome */
  window.__OPS_STORE = store;
  window.__OPS_GET_STATE = function () { return state; };
  window.__OPS_SET_FORCE_FAIL = function (v) { state.forceToolFail = !!v; };
  window.__OPS_SET_FAIL_ONCE = function (toolName) {
    if (!window.__OPS_FAIL_ONCE || typeof window.__OPS_FAIL_ONCE !== "object") {
      window.__OPS_FAIL_ONCE = {};
    }
    if (toolName) window.__OPS_FAIL_ONCE[toolName] = true;
  };

  document.addEventListener("DOMContentLoaded", bind);
})();
