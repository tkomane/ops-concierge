(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /* Human status labels (keep phase keys for logic) */
  const PHASE_SHORT = {
    idle: "Ready",
    ingested: "Listening",
    ack: "Working",
    correlated: "Working",
    windowed: "Working",
    ticketed: "Done"
  };

  const PHASE_LABEL = {
    idle: "Ready — pick a doorstep or bedtime story",
    ingested: "Listening — two home signals are on the board",
    ack: "Working — holding this moment in session",
    correlated: "Working — connecting door, package, and calendar",
    windowed: "Working — quiet-hours plan is ready",
    ticketed: "Done — guest code or task is ready to copy"
  };

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

  const state = {
    scenarioId: null,
    scenario: null,
    phase: "idle",
    ack: false,
    tools: [],
    messages: [],
    thinking: false,
    sessionId: "sess-" + Date.now().toString(36),
    chipItems: []
  };

  let toastTimer = null;

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
    if (!current && state.phase === "ticketed") current = "task";
    else if (!current && ["windowed", "correlated"].includes(state.phase)) current = "quiet";
    else if (!current && ["ingested", "ack"].includes(state.phase)) current = "firetv";

    const phaseBoost = {
      idle: -1,
      ingested: 0,
      ack: 1,
      correlated: 1,
      windowed: 1,
      ticketed: 2
    };
    const pIdx = phaseBoost[state.phase] ?? -1;
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
    if (!current && state.phase === "ticketed") current = "guest";

    const phaseOrder = {
      idle: -1,
      ingested: 1,
      ack: 1,
      correlated: 2,
      windowed: 2,
      ticketed: 3
    };
    const pIdx = phaseOrder[state.phase] ?? -1;
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
      label.textContent =
        (names[state.scenarioId] || "Story") +
        (state.phase === "ticketed" ? " · " + outcome + " ready" : " · in progress");
    }
    // Rename last dot for scenario
    const last = document.querySelector('.story-dot[data-phase="ticketed"] .dot-name');
    if (last) {
      if (state.scenarioId === "bedtime") last.textContent = "Task";
      else if (state.scenarioId === "doorstep") last.textContent = "Code";
      else last.textContent = "Code / Task";
    }

    const idx = STORY_PHASES.indexOf(state.phase);
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

  function mcpArgsFor(name) {
    const scenario = state.scenarioId || "doorstep";
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
        return { scenario };
      case "task.open":
        return { scenario };
      default:
        return { scenario };
    }
  }

  async function runTool(name, meta, work) {
    const i = pushTool(name, "running", meta);
    await sleep(420 + Math.random() * 280);
    if (window.OpsMcpClient && window.OpsMcpClient.isEnabled()) {
      try {
        const live = await window.OpsMcpClient.callTool(name, mcpArgsFor(name));
        if (live && live.meta) {
          updateTool(i, "ok", live.meta + " · mcp");
          return { meta: live.meta + " · mcp", detail: live.detail };
        }
      } catch (_err) {
        /* fall through to mock */
      }
    }
    const result = await work();
    updateTool(i, "ok", result.meta || meta);
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
        `<p class="empty-copy">Doorstep: Door → Package → Quiet → Guest code. Bedtime: Fire TV → Quiet → Task. Same weight — pick either.</p>` +
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
    const kind = s.ticket.id.startsWith("GUEST")
      ? "GUEST CODE / INSTRUCTION"
      : "HOUSEHOLD TASK";
    return [
      `${kind}  ${s.ticket.id}`,
      `Title:       ${s.ticket.title}`,
      `Severity:    ${s.ticket.severity}`,
      `Assets:      ${s.ticket.assets}`,
      `Timezone:    ${s.window.tz}`,
      `Window:      ${s.window.proposed}`,
      `Alternate:   ${s.window.alt}`,
      ``,
      `Primary:     ${s.primary.title} @ ${s.primary.fired}`,
      `  ${s.primary.signal}`,
      `Secondary:   ${s.secondary.title} @ ${s.secondary.fired}`,
      `  ${s.secondary.signal}`,
      ``,
      `Last activity: ${s.context.lastActivity}`,
      `Similar:       ${s.context.similar}`,
      `Rationale:     ${s.window.rationale}`,
      ``,
      `Opened by Ops Concierge (Alexa+ simulation) session ${state.sessionId}`,
      `Household: Tshiamo Komane — Africa/Johannesburg`,
      `Status:    draft — copy into Notes / Shared Household list (offline demo)`
    ].join("\n");
  }

  function renderCards() {
    const el = $("#cards");
    if (!state.scenario) {
      el.innerHTML =
        `<div class="card empty">` +
        `<div class="empty-state">` +
        `<span class="empty-ic" aria-hidden="true">${ICONS.home}</span>` +
        `<span class="empty-title">Home is quiet right now</span>` +
        `<p class="empty-copy"><strong>Doorstep</strong> → guest code <strong>GUEST-10421</strong>. <strong>Bedtime</strong> → Fire TV task <strong>TASK-22018</strong>. Both fill this board equally.</p>` +
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

    if (["correlated", "windowed", "ticketed"].includes(state.phase)) {
      parts.push(
        `<div class="card sev-info enter-stagger"><div class="card-inner">` +
          `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.home}</span>` +
          `<h3>How it fits together</h3></div>` +
          `<dl class="kv">` +
          `<dt>Story</dt><dd>${escapeHtml(
            s.id === "doorstep"
              ? "The doorbell package matches today’s Amazon delivery — treat it as expected, not a stranger."
              : "Kids Fire TV is still on past quiet hours, so bedtime can’t finish — a caregiver nudge will help."
          )}</dd>` +
          `<dt>Calendar</dt><dd>${escapeHtml(s.context.householdCalendar)}</dd>` +
          `<dt>Last at home</dt><dd>${escapeHtml(s.context.lastActivity)}</dd>` +
          `<dt>Similar before</dt><dd>${escapeHtml(s.context.similar)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (["windowed", "ticketed"].includes(state.phase)) {
      parts.push(
        `<div class="card sev-warn enter-stagger"><div class="card-inner">` +
          `<div class="card-title-row"><span class="card-ic" aria-hidden="true">${ICONS.calendar}</span>` +
          `<h3>Quiet-hours plan (SAST)</h3></div>` +
          `<dl class="kv">` +
          `<dt>Best time</dt><dd>${escapeHtml(s.window.proposed)}</dd>` +
          `<dt>Backup</dt><dd>${escapeHtml(s.window.alt)}</dd>` +
          `<dt>Why</dt><dd>${escapeHtml(s.window.rationale)}</dd>` +
          `<dt>Timezone</dt><dd>${escapeHtml(s.window.tz)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (state.phase === "ticketed") {
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

    if (state.phase === "ticketed") {
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

  async function ingest(id) {
    const scenario = window.OPS_SCENARIOS[id];
    if (!scenario) return;
    const prevId = state.scenarioId;
    const switching =
      prevId && prevId !== id && state.phase && state.phase !== "idle";
    state.scenarioId = id;
    state.scenario = scenario;
    state.phase = "ingested";
    state.ack = false;
    state.tools = [];
    state.messages = [];
    state.sessionId = "sess-" + Date.now().toString(36);
    setThinking(true);
    resetHowStrip();
    highlightHow(id);
    syncChrome();
    announce(
      switching
        ? (id === "doorstep"
            ? "Switching to doorstep story"
            : "Switching to bedtime story")
        : id === "doorstep"
          ? "Starting doorstep story"
          : "Starting bedtime story"
    );
    const coach = $("#coachBanner");
    if (coach && !coach.hidden) {
      coach.hidden = true;
      try { localStorage.setItem(COACH_KEY, "1"); } catch (_) {}
    }
    pushMsg("user", scenario.spokenStart);
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
      "Okay — I’m checking what’s happening at home. I’ll look at the pieces that belong together, then we’ll make a simple plan."
    );

    if (id === "doorstep") {
      await runTool("ring.query", "Front door · package zone", async () => ({
        meta: "HIT " + scenario.primary.resource
      }));
      await runTool("order.lookup", "Amazon delivery expectation", async () => ({
        meta: "HIT " + scenario.secondary.resource
      }));
    } else {
      await runTool("ring.query", "Kids room · living motion", async () => ({
        meta: "HIT ring-kids-room / living"
      }));
      await runTool("order.lookup", "Fire TV session · routine", async () => ({
        meta: "HIT " + scenario.primary.resource
      }));
    }

    state.phase = "ingested";
    setThinking(false);
    pushMsg(
      "agent",
      "I see two things for “" +
        scenario.title +
        "”: " +
        scenario.primary.title +
        ", and " +
        scenario.secondary.title +
        ". Say “got it” and I’ll hold them here — then we’ll check the calendar and quiet hours."
    );
    setChips([
      "Got it — hold both",
      "Connect the dots",
      "Why does this matter?"
    ]);
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
        ? "Here’s the story: the doorbell package matches today’s Amazon delivery — same parcel. "
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
    if (!state.scenario) {
      pushMsg("agent", "Nothing on the board yet. Try a doorstep or bedtime story first.");
      return;
    }
    if (state.phase !== "windowed" && state.phase !== "ticketed") {
      await proposeWindow();
    }
    setThinking(true);
    pushMsg("user", artefactChip("make") + ".");
    await runTool("task.open", "Draft guest/task card (local)", async () => ({
      meta: state.scenario.ticket.id + " draft"
    }));
    await runTool("notify.household", "Queue a household nudge", async () => ({
      meta: "notify queued · sim"
    }));
    state.phase = "ticketed";
    setThinking(false);
    pushMsg(
      "agent",
      "Your " +
        (state.scenario.ticket.id.startsWith("GUEST") ? "guest code" : "bedtime task") +
        " " +
        state.scenario.ticket.id +
        " is ready to copy. This chat stays open — ask about timing, risk, or what happened last anytime."
    );
    setChips([
      "What’s still risky?",
      "Try the other story",
      "Summarise for the family"
    ]);
    renderCards();
    syncChrome();
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
      q.includes("neighbour") ||
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
      s.window.proposed = s.window.alt + " (preferred)";
      if (state.phase === "windowed" || state.phase === "ticketed") renderCards();
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
    const q = text.toLowerCase();

    if (q.includes("show shortcuts") || q === "shortcuts" || q === "?") {
      openShortcuts();
      return;
    }

    /* Artefact / plan chips before story restarts — "Make the bedtime task" must not re-ingest */
    if (
      q.includes("ticket") ||
      q.includes("artefact") ||
      q.includes("artifact") ||
      q.includes("skip to") ||
      q.includes("make the") ||
      (q.includes("guest code") && !q.includes("doorstep")) ||
      (q.includes("bedtime task") && !q.includes("start bedtime"))
    ) {
      await openTicket();
      return;
    }
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
      q.includes("context") ||
      q.includes("connect the dots") ||
      q.includes("connect")
    ) {
      await correlate();
      return;
    }
    if (
      q.includes("window") ||
      q.includes("propose") ||
      q.includes("presence") ||
      q.includes("quiet-hours") ||
      q.includes("quiet hours") ||
      q.includes("suggest a quiet")
    ) {
      await proposeWindow();
      return;
    }
    if (
      q.includes("bedtime") ||
      q.includes("fire tv") ||
      q.includes("firetv") ||
      q.includes("evening") ||
      q.includes("other demo") ||
      q.includes("other story")
    ) {
      await ingest("bedtime");
      return;
    }
    if (
      q.includes("demo") ||
      q.includes("doorstep") ||
      q.includes("delivery") ||
      q.includes("package") ||
      q.includes("doorbell") ||
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

    pushMsg(
      "agent",
      "Hi — I’m your home helper. Doorbell, packages, quiet hours, and Fire TV don’t usually talk to each other. I connect them into one clear plan: a guest code when someone’s at the door, or a bedtime task when the TV is still on. Try Doorstep or Bedtime below — no live device needed."
    );
    setChips(["Someone’s at the door", "Start bedtime", "Show shortcuts"]);
    renderCards();
    renderTimeline();
    syncChrome();
    syncSendEnabled();
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
