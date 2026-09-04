/**
 * Optional MCP HTTP bridge for Ops Concierge.
 * Offline-first: disabled unless OPS_MCP.enabled or localStorage OPS_USE_MCP=1.
 * Falls back silently when the self-hosted server is down.
 */
(function (global) {
  "use strict";

  var DEFAULT_BASE = "http://127.0.0.1:8766";

  function readFlag() {
    var cfg = global.OPS_MCP || {};
    if (cfg.enabled === true) return true;
    if (cfg.enabled === false) return false;
    try {
      return global.localStorage && global.localStorage.getItem("OPS_USE_MCP") === "1";
    } catch (_e) {
      return false;
    }
  }

  function baseUrl() {
    var cfg = global.OPS_MCP || {};
    return String(cfg.baseUrl || DEFAULT_BASE).replace(/\/$/, "");
  }

  var cachedHealthy = null;
  var lastProbe = 0;

  async function probeHealth(force) {
    if (!readFlag()) {
      cachedHealthy = false;
      return false;
    }
    var now = Date.now();
    if (!force && cachedHealthy !== null && now - lastProbe < 5000) {
      return cachedHealthy;
    }
    lastProbe = now;
    try {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 800) : null;
      var res = await fetch(baseUrl() + "/healthz", {
        method: "GET",
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);
      cachedHealthy = res.ok;
    } catch (_err) {
      cachedHealthy = false;
    }
    return cachedHealthy;
  }

  /**
   * Call a product tool via the JSON demo bridge.
   * @returns {Promise<{meta: string, detail?: object}|null>} null => caller should use mock
   */
  async function callTool(name, argumentsObj) {
    if (!readFlag()) return null;
    var up = await probeHealth(false);
    if (!up) return null;
    try {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 2500) : null;
      var res = await fetch(baseUrl() + "/demo/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: name,
          arguments: argumentsObj || {}
        }),
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        cachedHealthy = false;
        return null;
      }
      var data = await res.json();
      if (!data || data.ok === false) return null;
      return {
        meta: data.meta || name + " · mcp",
        detail: data.detail || data
      };
    } catch (_err) {
      cachedHealthy = false;
      return null;
    }
  }

  global.OpsMcpClient = {
    isEnabled: readFlag,
    baseUrl: baseUrl,
    probeHealth: probeHealth,
    callTool: callTool
  };
})(window);
