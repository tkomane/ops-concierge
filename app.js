(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    scenarioId: null,
    scenario: null,
    phase: "idle", // idle | ingested | ack | correlated | windowed | ticketed
    ack: false,
    tools: [],
    messages: [],
    thinking: false,
    sessionId: "sess-" + Date.now().toString(36)
  };

  const PHASE_LABEL = {
    idle: "Idle — no incident in session",
    ingested: "Alerts ingested — awaiting acknowledge",
    ack: "Acknowledged — gathering context",
    correlated: "Correlated — ready to propose window",
    windowed: "Change window proposed — ready to open ticket",
    ticketed: "ITSM artefact open — session complete"
  };

  function nowClock() {
    return new Date().toLocaleTimeString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " SAST";
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setThinking(on) {
    state.thinking = on;
    $(".orb").classList.toggle("thinking", on);
    $("#sendBtn").disabled = on;
    $("#demoBtn").disabled = on;
    $("#demoBtn2").disabled = on;
  }

  function pushMsg(role, text) {
    state.messages.push({ role, text, at: nowClock() });
    renderChat();
  }

  function pushTool(name, status, meta) {
    const step = { name, status, meta, at: nowClock() };
    state.tools.push(step);
    renderTimeline();
    return state.tools.length - 1;
  }

  function updateTool(idx, status, meta) {
    Object.assign(state.tools[idx], { status, meta: meta || state.tools[idx].meta, at: nowClock() });
    renderTimeline();
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
      .map(
        (m) =>
          `<div class="msg ${m.role}"><div class="who">${m.role === "user" ? "You · voice" : "Ops Concierge · Alexa+ sim"} · ${m.at}</div>${escapeHtml(m.text)}</div>`
      )
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function renderTimeline() {
    const el = $("#timeline");
    if (!state.tools.length) {
      el.innerHTML = `<div class="step"><span class="dot"></span><div class="meta">No tool calls yet. MCP-like surface: azure.query, onprem.query, calendar.propose, ticket.open</div></div>`;
      return;
    }
    el.innerHTML = state.tools
      .map(
        (t) =>
          `<div class="step ${t.status}"><span class="dot"></span><div class="tool">${escapeHtml(t.name)}</div><div class="meta">${escapeHtml(t.meta)} · ${t.at}</div></div>`
      )
      .join("");
    el.scrollTop = el.scrollHeight;
    $("#sessionBox").innerHTML = `Session <strong>${state.sessionId}</strong><br>Phase: <strong>${PHASE_LABEL[state.phase]}</strong>`;
  }

  function renderCards() {
    const el = $("#cards");
    if (!state.scenario) {
      el.innerHTML = `<div class="card empty">No live incident. Say “run demo incident” or press the demo button. This is a local Alexa+ simulation — no device, no cloud keys.</div>`;
      return;
    }
    const s = state.scenario;
    const parts = [];
    parts.push(`<div class="alert-pair">
      ${alertCard(s.azure)}
      ${alertCard(s.onprem)}
    </div>`);

    if (state.ack) {
      parts.push(`<div class="card"><h3>Acknowledged</h3>
        <p style="margin:0;font-size:13px;color:var(--muted)">Incident held in this session. Downstream tools will keep using ${s.title} — you will not be asked to re-state the blast radius.</p></div>`);
    }

    if (["correlated", "windowed", "ticketed"].includes(state.phase)) {
      parts.push(`<div class="card"><h3>Correlation &amp; context</h3>
        <dl class="kv">
          <dt>Hypothesis</dt><dd>Same blast radius: on-prem path is the origin/replication fabric for the Azure symptom.</dd>
          <dt>Change calendar</dt><dd>${escapeHtml(s.context.changeCalendar)}</dd>
          <dt>Last deploy</dt><dd>${escapeHtml(s.context.lastDeploy)}</dd>
          <dt>Similar incidents</dt><dd>${escapeHtml(s.context.similar)}</dd>
        </dl></div>`);
    }

    if (["windowed", "ticketed"].includes(state.phase)) {
      parts.push(`<div class="card"><h3>Proposed change window (SAST)</h3>
        <dl class="kv">
          <dt>Primary</dt><dd>${escapeHtml(s.window.proposed)}</dd>
          <dt>Alternate</dt><dd>${escapeHtml(s.window.alt)}</dd>
          <dt>Why</dt><dd>${escapeHtml(s.window.rationale)}</dd>
          <dt>Timezone</dt><dd>${escapeHtml(s.window.tz)}</dd>
        </dl></div>`);
    }

    if (state.phase === "ticketed") {
      const body = ticketText(s);
      parts.push(`<div class="card ticket"><h3>ITSM artefact ${escapeHtml(s.ticket.id)}</h3>
        <pre id="ticketBody">${escapeHtml(body)}</pre>
        <div class="row">
          <button class="primary" type="button" id="copyTicket">Copy ticket</button>
        </div></div>`);
    }

    el.innerHTML = parts.join("");
    const copy = $("#copyTicket");
    if (copy) {
      copy.addEventListener("click", async () => {
        const text = ticketText(s);
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = "Copied";
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          copy.textContent = "Copied";
        }
      });
    }
  }

  function alertCard(a) {
    return `<div class="card">
      <span class="sev ${a.sev}">${a.sev.toUpperCase()}</span>
      <h3>${escapeHtml(a.title)}</h3>
      <dl class="kv">
        <dt>Source</dt><dd>${escapeHtml(a.source)}</dd>
        <dt>Fired</dt><dd>${escapeHtml(a.fired)}</dd>
        <dt>Resource</dt><dd>${escapeHtml(a.resource)}</dd>
        <dt>Signal</dt><dd>${escapeHtml(a.signal)}</dd>
        <dt>Blast radius</dt><dd>${escapeHtml(a.blast)}</dd>
      </dl>
    </div>`;
  }

  function ticketText(s) {
    return [
      `ITSM CHANGE  ${s.ticket.id}`,
      `Title:       ${s.ticket.title}`,
      `Severity:    ${s.ticket.severity}`,
      `CMDB:        ${s.ticket.cmdb}`,
      `Timezone:    ${s.window.tz}`,
      `Window:      ${s.window.proposed}`,
      `Alternate:   ${s.window.alt}`,
      ``,
      `Azure signal: ${s.azure.title} @ ${s.azure.fired}`,
      `  ${s.azure.signal}`,
      `On-prem:      ${s.onprem.title} @ ${s.onprem.fired}`,
      `  ${s.onprem.signal}`,
      ``,
      `Last deploy: ${s.context.lastDeploy}`,
      `Similar:     ${s.context.similar}`,
      `Rationale:   ${s.window.rationale}`,
      ``,
      `Opened by Ops Concierge (Alexa+ simulation) session ${state.sessionId}`,
      `Requester: Tshiamo Komane — SA cloud architect`,
      `Status:    draft — copy into ServiceNow / Jira SM (offline demo)`
    ].join("\n");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setChips(items) {
    $("#chips").innerHTML = items
      .map((t) => `<button type="button" class="chip" data-say="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
      .join("");
    $("#chips").querySelectorAll(".chip").forEach((b) => {
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
    pushMsg("user", scenario.spokenStart);
    pushMsg(
      "agent",
      "Ingesting a paired cloud and on-prem signal for the same blast radius. I will not treat this as a generic Q&A — I am orchestrating tools."
    );
    await runTool("azure.query", "Service Health + Monitor workspace (mock)", async () => ({
      meta: `HIT ${scenario.azure.resource}`
    }));
    await runTool("onprem.query", "GreenLake / SNMP trap store (mock)", async () => ({
      meta: `HIT ${scenario.onprem.resource}`
    }));
    state.phase = "ingested";
    setThinking(false);
    pushMsg(
      "agent",
      `Two alerts on ${scenario.title}. Cloud: ${scenario.azure.title}. On-prem: ${scenario.onprem.title}. Say “acknowledge” to hold them in this session, then I will correlate change calendar, last deploy, and similar incidents.`
    );
    setChips(["Acknowledge both alerts", "Correlate this blast radius", "What is the blast radius?"]);
    renderCards();
    renderTimeline();
  }

  async function acknowledge() {
    if (!state.scenario) {
      pushMsg("agent", "There is no incident in session. Run a demo incident first.");
      return;
    }
    if (state.ack) {
      pushMsg("agent", "Already acknowledged. I still have the pair in session — correlating or proposing a window will not re-ask you to describe the estate.");
      return;
    }
    setThinking(true);
    pushMsg("user", "Acknowledge both alerts.");
    await runTool("session.ack", "Bind alerts to session state", async () => ({
      meta: `ACK ${state.scenario.ticket.id.replace("CHG", "INC")} (local)`
    }));
    state.ack = true;
    state.phase = "ack";
    setThinking(false);
    pushMsg(
      "agent",
      "Acknowledged. Session now owns this blast radius. Next I can gather context (calendar, last deploy, similar incidents)."
    );
    setChips(["Gather context and correlate", "Propose a change window", "Skip to ticket"]);
    renderCards();
  }

  async function correlate() {
    if (!state.scenario) {
      pushMsg("agent", "No incident loaded. Run a demo first.");
      return;
    }
    if (!state.ack) {
      await acknowledge();
    }
    setThinking(true);
    pushMsg("user", "Gather context and correlate.");
    await runTool("azure.query", "Change + deploy annotations (mock)", async () => ({
      meta: "last deploy portal/backup path"
    }));
    await runTool("onprem.query", "Hardware history + SNMP neighbours (mock)", async () => ({
      meta: "optic / disk pedigree"
    }));
    await runTool("itsm.similar", "Search closed incidents (mock CMDB)", async () => ({
      meta: state.scenario.context.similar.split(":")[0]
    }));
    state.phase = "correlated";
    setThinking(false);
    pushMsg(
      "agent",
      `Correlation: the Azure symptom and the GreenLake signal share a fabric. ${state.scenario.context.similar} Last deploy does not look like a code regression. I can propose a SAST change window against the freeze/backup calendar.`
    );
    setChips(["Propose a change window", "Open the ITSM ticket", "Remind me of last deploy"]);
    renderCards();
  }

  async function proposeWindow() {
    if (!state.scenario) {
      pushMsg("agent", "No incident loaded. Run a demo first.");
      return;
    }
    if (state.phase === "ingested" || state.phase === "ack") {
      await correlate();
    }
    setThinking(true);
    pushMsg("user", "Propose a change window.");
    await runTool("calendar.propose", "CAB + promo/backup calendar (mock, SAST)", async () => ({
      meta: state.scenario.window.proposed
    }));
    state.phase = "windowed";
    setThinking(false);
    pushMsg(
      "agent",
      `Primary window: ${state.scenario.window.proposed}. Alternate: ${state.scenario.window.alt}. ${state.scenario.window.rationale} I can open a ticket-shaped artefact you can copy into ITSM.`
    );
    setChips(["Open the ITSM ticket", "Use the Saturday window instead", "Copy nothing yet"]);
    renderCards();
  }

  async function openTicket() {
    if (!state.scenario) {
      pushMsg("agent", "No incident loaded. Run a demo first.");
      return;
    }
    if (state.phase !== "windowed" && state.phase !== "ticketed") {
      await proposeWindow();
    }
    setThinking(true);
    pushMsg("user", "Open the ITSM ticket.");
    await runTool("ticket.open", "Draft change in local ITSM shape (no network)", async () => ({
      meta: state.scenario.ticket.id + " draft"
    }));
    state.phase = "ticketed";
    setThinking(false);
    pushMsg(
      "agent",
      `${state.scenario.ticket.id} is on the board as a copyable draft. Session stays warm — ask about blast radius, window, or last deploy without starting over.`
    );
    setChips(["What is still risky?", "Run the other demo incident", "Summarise for the bridge"]);
    renderCards();
  }

  function followup(text) {
    const s = state.scenario;
    if (!s) {
      pushMsg("agent", "Session is empty. Use Run demo incident.");
      return;
    }
    const q = text.toLowerCase();
    if (q.includes("blast")) {
      pushMsg("agent", `Held in session: ${s.azure.blast} Coupled with ${s.onprem.blast}`);
      return;
    }
    if (q.includes("deploy")) {
      pushMsg("agent", s.context.lastDeploy);
      return;
    }
    if (q.includes("saturday") || q.includes("alternate") || q.includes("alt")) {
      pushMsg("agent", `Switching preference in-session to the alternate: ${s.window.alt}. Ticket text will use this if you reopen.`);
      s.window.proposed = s.window.alt + " (operator preferred)";
      if (state.phase === "windowed" || state.phase === "ticketed") renderCards();
      return;
    }
    if (q.includes("summar") || q.includes("bridge")) {
      pushMsg(
        "agent",
        `Bridge brief: ${s.title}. Azure ${s.azure.title}; on-prem ${s.onprem.title}. Phase ${PHASE_LABEL[state.phase]}. Window ${s.window.proposed}.`
      );
      return;
    }
    if (q.includes("risk")) {
      pushMsg(
        "agent",
        "Residual risk: dual-vendor correlation is simulated from seed data — a production Alexa+ skill would still need live Monitor and GreenLake connectors plus a human on CAB. Promo/backup calendar is mocked."
      );
      return;
    }
    if (q.includes("copy nothing")) {
      pushMsg("agent", "Understood. Ticket stays unopened. Window remains proposed in this session.");
      return;
    }
    pushMsg(
      "agent",
      `I still have ${s.title} in session (phase: ${state.phase}). I will not restart intake. Try acknowledge, correlate, propose window, or open ticket — or press a suggestion chip.`
    );
  }

  async function handleUtterance(raw) {
    const text = (raw || "").trim();
    if (!text || state.thinking) return;
    const q = text.toLowerCase();

    if (q.includes("backup") || q.includes("primera") || q.includes("storage") || q.includes("other demo")) {
      await ingest("storage");
      return;
    }
    if (q.includes("demo") || q.includes("portal") || q.includes("johannesburg") || q.includes("retail")) {
      await ingest("portal");
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
    if (q.includes("window") || q.includes("propose")) {
      await proposeWindow();
      return;
    }
    if (q.includes("ticket") || q.includes("itsm") || q.includes("skip to ticket")) {
      await openTicket();
      return;
    }
    pushMsg("user", text);
    followup(text);
  }

  function bind() {
    $("#demoBtn").addEventListener("click", () => ingest("portal"));
    $("#demoBtn2").addEventListener("click", () => ingest("storage"));
    $("#sendBtn").addEventListener("click", () => {
      const v = $("#utter").value;
      $("#utter").value = "";
      handleUtterance(v);
    });
    $("#utter").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = $("#utter").value;
        $("#utter").value = "";
        handleUtterance(v);
      }
    });
    pushMsg(
      "agent",
      "Ops Concierge online. This is an Alexa+ simulation for Amazon Developer Hackathon 2026 (simulated path, rules §4) — local only, no device, no paid APIs. I orchestrate a hybrid-estate incident: Azure Monitor-style plus HPE GreenLake-style alerts, then acknowledge, correlate, propose a SAST window, and open a copyable ITSM draft. Press Run demo incident."
    );
    setChips(["Run demo incident", "Run backup replication incident"]);
    renderCards();
    renderTimeline();
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
