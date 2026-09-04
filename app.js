(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const PHASE_SHORT = {
    idle: "IDLE",
    ingested: "INGESTED",
    ack: "ACK",
    correlated: "CORRELATED",
    windowed: "WINDOWED",
    ticketed: "TICKETED"
  };

  const PHASE_LABEL = {
    idle: "Idle — no household workflow in session",
    ingested: "Events ingested — awaiting acknowledge",
    ack: "Acknowledged — gathering household context",
    correlated: "Correlated — ready to propose presence window",
    windowed: "Presence window proposed — ready to open artefact",
    ticketed: "Task / guest artefact open — session complete"
  };

  const TOOL_HINT =
    "ring.query · order.lookup · session.ack<br>" +
    "calendar.propose · notify.household · task.open";

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

  function showToast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2200);
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

  function setThinking(on) {
    state.thinking = on;
    const orb = $("#orb");
    if (orb) {
      orb.dataset.state = on ? "thinking" : "idle";
      orb.textContent = on ? "THINKING" : "ALEXA+ SIM";
    }
    $("#sendBtn").disabled = on;
    $("#demoBtn").disabled = on;
    $("#demoBtn2").disabled = on;
  }

  function syncChrome() {
    $("#sessionId").textContent = state.sessionId;
    const pill = $("#phasePill");
    pill.textContent = PHASE_SHORT[state.phase] || state.phase.toUpperCase();
    pill.dataset.phase = state.phase;

    const boardTag = $("#boardTag");
    if (!state.scenario) {
      boardTag.textContent = "STANDBY";
    } else {
      boardTag.textContent = state.scenario.ticket.id;
    }

    const n = state.tools.length;
    $("#toolCount").textContent =
      n === 0 ? "0 EVENTS" : n + (n === 1 ? " EVENT" : " EVENTS");

    $("#sessionBox").innerHTML =
      `<span class="mono">${escapeHtml(state.sessionId)}</span>` +
      `<span class="muted">${escapeHtml(PHASE_LABEL[state.phase])}</span>`;
  }

  function pushMsg(role, text) {
    state.messages.push({ role, text, at: nowClock() });
    renderChat();
  }

  function pushTool(name, status, meta) {
    state.tools.push({ name, status, meta, at: nowClock() });
    renderTimeline();
    syncChrome();
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
  }

  async function runTool(name, meta, work) {
    const i = pushTool(name, "running", meta);
    await sleep(420 + Math.random() * 280);
    const result = await work();
    updateTool(i, "ok", result.meta || meta);
    return result;
  }

  function renderChat() {
    const el = $("#chat");
    el.innerHTML = state.messages
      .map((m) => {
        const who =
          m.role === "user" ? "YOU · VOICE" : "OPS CONCIERGE · ALEXA+ SIM";
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
        `<div class="timeline-empty">` +
        `<div class="empty-title">TOOL TIMELINE EMPTY</div>` +
        `Awaiting Amazon-native tool calls.<br>` +
        `<code>${TOOL_HINT}</code>` +
        `</div>`;
      return;
    }
    el.innerHTML = state.tools
      .map((t) => {
        const st =
          t.status === "running"
            ? "RUN"
            : t.status === "ok"
              ? "OK"
              : t.status.toUpperCase();
        return (
          `<div class="step ${escapeHtml(t.status)}">` +
          `<span class="dot" aria-hidden="true"></span>` +
          `<div class="tool">${escapeHtml(t.name)}` +
          `<span class="status-tag">${st}</span></div>` +
          `<div class="meta">${escapeHtml(t.meta)} · ${escapeHtml(t.at)}</div>` +
          `</div>`
        );
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function alertCard(a) {
    const rail =
      a.sev === "crit" ? "sev-crit" : a.sev === "warn" ? "sev-warn" : "sev-info";
    return (
      `<div class="card ${rail}">` +
      `<div class="card-inner">` +
      `<span class="sev ${escapeHtml(a.sev)}">${escapeHtml(a.sev.toUpperCase())}</span>` +
      `<h3>${escapeHtml(a.title)}</h3>` +
      `<dl class="kv">` +
      `<dt>Source</dt><dd>${escapeHtml(a.source)}</dd>` +
      `<dt>Fired</dt><dd>${escapeHtml(a.fired)}</dd>` +
      `<dt>Resource</dt><dd>${escapeHtml(a.resource)}</dd>` +
      `<dt>Signal</dt><dd>${escapeHtml(a.signal)}</dd>` +
      `<dt>Impact</dt><dd>${escapeHtml(a.blast)}</dd>` +
      `</dl></div></div>`
    );
  }

  function ticketText(s) {
    const kind = s.ticket.id.startsWith("GUEST")
      ? "GUEST INSTRUCTION"
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
        `<span class="empty-title">NO WORKFLOW LOADED</span>` +
        `Press <strong>Run demo</strong> or utter “run doorstep delivery”.<br>` +
        `Local Alexa+ simulation — no device, no cloud keys.` +
        `</div>`;
      syncChrome();
      return;
    }

    const s = state.scenario;
    const parts = [];

    parts.push(
      `<div class="alert-pair">${alertCard(s.primary)}${alertCard(s.secondary)}</div>`
    );

    if (state.ack) {
      parts.push(
        `<div class="card sev-info"><div class="card-inner">` +
          `<h3>Acknowledged</h3>` +
          `<p class="card-note">` +
          `Workflow held in session. Downstream tools keep using ` +
          `<strong>${escapeHtml(s.title)}</strong>` +
          ` — household context will not be re-prompted.` +
          `</p></div></div>`
      );
    }

    if (["correlated", "windowed", "ticketed"].includes(state.phase)) {
      parts.push(
        `<div class="card sev-info"><div class="card-inner">` +
          `<h3>Correlation &amp; household context</h3>` +
          `<dl class="kv">` +
          `<dt>Hypothesis</dt><dd>${escapeHtml(
            s.id === "doorstep"
              ? "Ring package event aligns with Amazon same-day ETA — treat as expected delivery, not a stranger."
              : "Fire TV kids stream past quiet hours is blocking Alexa bedtime routine completion — caregiver nudge needed."
          )}</dd>` +
          `<dt>Calendar</dt><dd>${escapeHtml(s.context.householdCalendar)}</dd>` +
          `<dt>Last activity</dt><dd>${escapeHtml(s.context.lastActivity)}</dd>` +
          `<dt>Similar</dt><dd>${escapeHtml(s.context.similar)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (["windowed", "ticketed"].includes(state.phase)) {
      parts.push(
        `<div class="card sev-warn"><div class="card-inner">` +
          `<h3>Proposed presence window (SAST)</h3>` +
          `<dl class="kv">` +
          `<dt>Primary</dt><dd>${escapeHtml(s.window.proposed)}</dd>` +
          `<dt>Alternate</dt><dd>${escapeHtml(s.window.alt)}</dd>` +
          `<dt>Why</dt><dd>${escapeHtml(s.window.rationale)}</dd>` +
          `<dt>Timezone</dt><dd>${escapeHtml(s.window.tz)}</dd>` +
          `</dl></div></div>`
      );
    }

    if (state.phase === "ticketed") {
      const body = ticketText(s);
      parts.push(
        `<div class="card sev-ok"><div class="card-inner">` +
          `<div class="ticket-head">` +
          `<span class="ticket-id">${escapeHtml(s.ticket.id)}</span>` +
          `<button class="btn btn-primary" type="button" id="copyTicket">Copy artefact</button>` +
          `</div>` +
          `<pre id="ticketBody">${escapeHtml(body)}</pre>` +
          `</div></div>`
      );
    }

    el.innerHTML = parts.join("");

    const copy = $("#copyTicket");
    if (copy) {
      copy.addEventListener("click", async () => {
        const text = ticketText(s);
        try {
          await navigator.clipboard.writeText(text);
          showToast("ARTEFACT COPIED · " + s.ticket.id);
          copy.textContent = "Copied";
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          showToast("ARTEFACT COPIED · " + s.ticket.id);
          copy.textContent = "Copied";
        }
      });
    }

    syncChrome();
  }

  function setChips(items) {
    state.chipItems = items.slice(0, 4);
    const el = $("#chips");
    el.innerHTML = state.chipItems
      .map(
        (t, i) =>
          `<button type="button" class="chip" data-key="${i + 1}" data-say="${escapeHtml(t)}">${escapeHtml(t)}</button>`
      )
      .join("");
    el.querySelectorAll(".chip").forEach((b) => {
      b.addEventListener("click", () => handleUtterance(b.dataset.say));
    });
  }

  async function ingest(id) {
    const scenario = window.OPS_SCENARIOS[id];
    if (!scenario) return;
    state.scenarioId = id;
    state.scenario = scenario;
    state.phase = "ingested";
    state.ack = false;
    state.tools = [];
    state.messages = [];
    state.sessionId = "sess-" + Date.now().toString(36);
    setThinking(true);
    syncChrome();
    pushMsg("user", scenario.spokenStart);
    pushMsg(
      "agent",
      "Ingesting paired household signals for the same moment. I will not treat this as a generic Q&A — I am orchestrating Amazon-native tools."
    );

    if (id === "doorstep") {
      await runTool("ring.query", "Doorbell + package zones (mock)", async () => ({
        meta: "HIT " + scenario.primary.resource
      }));
      await runTool("order.lookup", "Amazon delivery expectation (mock)", async () => ({
        meta: "HIT " + scenario.secondary.resource
      }));
    } else {
      await runTool("ring.query", "Kids-room presence + living motion (mock)", async () => ({
        meta: "HIT ring-kids-room / living"
      }));
      await runTool("order.lookup", "Fire TV session + routine state (mock)", async () => ({
        meta: "HIT " + scenario.primary.resource
      }));
    }

    state.phase = "ingested";
    setThinking(false);
    pushMsg(
      "agent",
      "Two signals on " +
        scenario.title +
        ". Primary: " +
        scenario.primary.title +
        ". Secondary: " +
        scenario.secondary.title +
        ". Say “acknowledge” to hold them in this session, then I will correlate calendar, last activity, and similar household tasks."
    );
    setChips([
      "Acknowledge both signals",
      "Correlate this household moment",
      "What is the impact?"
    ]);
    renderCards();
    renderTimeline();
    syncChrome();
  }

  async function acknowledge() {
    if (!state.scenario) {
      pushMsg("agent", "There is no workflow in session. Run a demo first.");
      return;
    }
    if (state.ack) {
      pushMsg(
        "agent",
        "Already acknowledged. I still have the pair in session — correlating or proposing a window will not re-ask you to describe the household."
      );
      return;
    }
    setThinking(true);
    pushMsg("user", "Acknowledge both signals.");
    await runTool("session.ack", "Bind signals to session state", async () => ({
      meta: "ACK " + state.scenario.ticket.id + " (local)"
    }));
    state.ack = true;
    state.phase = "ack";
    setThinking(false);
    pushMsg(
      "agent",
      "Acknowledged. Session now owns this household moment. Next I can gather context (calendar, last activity, similar tasks)."
    );
    setChips([
      "Gather context and correlate",
      "Propose a presence window",
      "Skip to artefact"
    ]);
    renderCards();
    syncChrome();
  }

  async function correlate() {
    if (!state.scenario) {
      pushMsg("agent", "No workflow loaded. Run a demo first.");
      return;
    }
    if (!state.ack) {
      await acknowledge();
    }
    setThinking(true);
    pushMsg("user", "Gather context and correlate.");
    await runTool("ring.query", "Presence history + zone pedigree (mock)", async () => ({
      meta: "presence pedigree"
    }));
    await runTool("order.lookup", "Delivery / device annotations (mock)", async () => ({
      meta: "ETA · profile · routine"
    }));
    await runTool("notify.household", "Scan similar household tasks (mock)", async () => ({
      meta: state.scenario.context.similar.split(":")[0]
    }));
    state.phase = "correlated";
    setThinking(false);

    const line =
      state.scenarioId === "doorstep"
        ? "Correlation: the Ring package event and the Amazon same-day ETA share one delivery story. "
        : "Correlation: Fire TV kids playback past quiet hours is why the Alexa bedtime routine stalled. ";

    pushMsg(
      "agent",
      line +
        state.scenario.context.similar +
        " Last activity does not show anyone home to finish this. I can propose a SAST presence window against the household calendar."
    );
    setChips([
      "Propose a presence window",
      "Open the artefact",
      "Remind me of last activity"
    ]);
    renderCards();
    syncChrome();
  }

  async function proposeWindow() {
    if (!state.scenario) {
      pushMsg("agent", "No workflow loaded. Run a demo first.");
      return;
    }
    if (state.phase === "ingested" || state.phase === "ack") {
      await correlate();
    }
    setThinking(true);
    pushMsg("user", "Propose a presence window.");
    await runTool(
      "calendar.propose",
      "Household calendar + quiet hours (mock, SAST)",
      async () => ({
        meta: state.scenario.window.proposed
      })
    );
    state.phase = "windowed";
    setThinking(false);
    pushMsg(
      "agent",
      "Primary window: " +
        state.scenario.window.proposed +
        ". Alternate: " +
        state.scenario.window.alt +
        ". " +
        state.scenario.window.rationale +
        " I can open a task- or guest-shaped artefact you can copy."
    );
    setChips([
      "Open the artefact",
      "Use the alternate window instead",
      "Copy nothing yet"
    ]);
    renderCards();
    syncChrome();
  }

  async function openTicket() {
    if (!state.scenario) {
      pushMsg("agent", "No workflow loaded. Run a demo first.");
      return;
    }
    if (state.phase !== "windowed" && state.phase !== "ticketed") {
      await proposeWindow();
    }
    setThinking(true);
    pushMsg("user", "Open the artefact.");
    await runTool("task.open", "Draft guest/task card locally (no network)", async () => ({
      meta: state.scenario.ticket.id + " draft"
    }));
    await runTool("notify.household", "Queue household nudge (mock)", async () => ({
      meta: "notify queued · sim"
    }));
    state.phase = "ticketed";
    setThinking(false);
    pushMsg(
      "agent",
      state.scenario.ticket.id +
        " is on the board as a copyable draft. Session stays warm — ask about impact, window, or last activity without starting over."
    );
    setChips([
      "What is still risky?",
      "Run the other demo",
      "Summarise for the household"
    ]);
    renderCards();
    syncChrome();
  }

  function followup(text) {
    const s = state.scenario;
    if (!s) {
      pushMsg("agent", "Session is empty. Use Run demo.");
      return;
    }
    const q = text.toLowerCase();
    if (q.includes("blast") || q.includes("impact")) {
      pushMsg(
        "agent",
        "Held in session: " + s.primary.blast + " Coupled with " + s.secondary.blast
      );
      return;
    }
    if (q.includes("deploy") || q.includes("activity") || q.includes("last")) {
      pushMsg("agent", s.context.lastActivity);
      return;
    }
    if (
      q.includes("alternate") ||
      q.includes("alt") ||
      q.includes("neighbour") ||
      q.includes("auto-pause") ||
      q.includes("instead")
    ) {
      pushMsg(
        "agent",
        "Switching preference in-session to the alternate: " +
          s.window.alt +
          ". Artefact text will use this if you reopen."
      );
      s.window.proposed = s.window.alt + " (operator preferred)";
      if (state.phase === "windowed" || state.phase === "ticketed") renderCards();
      return;
    }
    if (q.includes("summar") || q.includes("household") || q.includes("bridge")) {
      pushMsg(
        "agent",
        "Household brief: " +
          s.title +
          ". " +
          s.primary.title +
          "; " +
          s.secondary.title +
          ". Phase " +
          PHASE_LABEL[state.phase] +
          ". Window " +
          s.window.proposed +
          "."
      );
      return;
    }
    if (q.includes("risk")) {
      pushMsg(
        "agent",
        "Residual risk: Ring / order / routine correlation is simulated from seed data — a production Alexa+ skill would still need live Ring and Amazon Shopping connectors plus a human in the household. Calendar is mocked."
      );
      return;
    }
    if (q.includes("copy nothing")) {
      pushMsg(
        "agent",
        "Understood. Artefact stays unopened. Window remains proposed in this session."
      );
      return;
    }
    pushMsg(
      "agent",
      "I still have " +
        s.title +
        " in session (phase: " +
        state.phase +
        "). I will not restart intake. Try acknowledge, correlate, propose window, or open artefact — or press a suggestion chip."
    );
  }

  async function handleUtterance(raw) {
    const text = (raw || "").trim();
    if (!text || state.thinking) return;
    const q = text.toLowerCase();

    if (
      q.includes("bedtime") ||
      q.includes("fire tv") ||
      q.includes("firetv") ||
      q.includes("evening") ||
      q.includes("other demo")
    ) {
      await ingest("bedtime");
      return;
    }
    if (
      q.includes("demo") ||
      q.includes("doorstep") ||
      q.includes("delivery") ||
      q.includes("package") ||
      q.includes("doorbell")
    ) {
      await ingest("doorstep");
      return;
    }
    if (q.includes("acknowledge") || q.includes("ack both") || q === "ack") {
      await acknowledge();
      return;
    }
    if (q.includes("correlat") || q.includes("gather context") || q.includes("context")) {
      await correlate();
      return;
    }
    if (q.includes("window") || q.includes("propose") || q.includes("presence")) {
      await proposeWindow();
      return;
    }
    if (
      q.includes("ticket") ||
      q.includes("artefact") ||
      q.includes("artifact") ||
      q.includes("guest") ||
      q.includes("task") ||
      q.includes("skip to")
    ) {
      await openTicket();
      return;
    }
    pushMsg("user", text);
    followup(text);
  }

  function openShortcuts() {
    $("#shortcutsOverlay").hidden = false;
    $("#closeShortcuts").focus();
  }
  function closeShortcuts() {
    $("#shortcutsOverlay").hidden = true;
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

      if (!typing && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const idx = parseInt(e.key, 10) - 1;
        if (state.chipItems[idx]) {
          e.preventDefault();
          handleUtterance(state.chipItems[idx]);
        }
      }
    });
  }

  function bind() {
    $("#demoBtn").addEventListener("click", () => ingest("doorstep"));
    $("#demoBtn2").addEventListener("click", () => ingest("bedtime"));
    $("#sendBtn").addEventListener("click", () => {
      const v = $("#utter").value;
      $("#utter").value = "";
      handleUtterance(v);
    });
    $("#utter").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = $("#utter").value;
        $("#utter").value = "";
        handleUtterance(v);
      }
    });
    $("#helpBtn").addEventListener("click", openShortcuts);
    $("#closeShortcuts").addEventListener("click", closeShortcuts);
    $("#shortcutsOverlay").addEventListener("click", (e) => {
      if (e.target === $("#shortcutsOverlay")) closeShortcuts();
    });

    bindKeyboard();
    tickClock();
    setInterval(tickClock, 1000);

    pushMsg(
      "agent",
      "Ops Concierge online. Alexa+ simulation for Amazon Developer Hackathon 2026 (simulated path, rules §4) — local only, no device, no paid APIs. I orchestrate an Amazon household workflow: Ring + delivery (or Fire TV bedtime), then acknowledge, correlate, propose a SAST presence window, and open a copyable guest/task artefact. Press Run demo or hit D."
    );
    setChips(["Run doorstep delivery", "Run Fire TV bedtime routine"]);
    renderCards();
    renderTimeline();
    syncChrome();
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
