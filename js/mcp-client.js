/**
 * Optional MCP HTTP bridge for Ops Concierge.
 * Offline-first: disabled unless OPS_MCP.enabled or localStorage OPS_USE_MCP=1.
 * Preserves structured bridge errors; null means bridge unavailable before attempt.
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

  function normalizeBridgePayload(data, httpStatus) {
    if (!data || typeof data !== "object") {
      return {
        ok: false,
        source: "bridge",
        operationId: null,
        tool: null,
        observations: null,
        outcome: null,
        error: {
          code: "bridge_http_" + String(httpStatus || "error"),
          message: "Bridge returned non-JSON or empty error body"
        },
        meta: "bridge failure",
        failureKind: "bridge_failure",
        attempted: true
      };
    }
    var ok = data.ok === true;
    var err = data.error;
    if (!err && !ok) {
      err = {
        code: data.failureKind || "bridge_failure",
        message: data.meta || "Bridge tool failed"
      };
    }
    return {
      ok: ok,
      source: data.source || "bridge",
      operationId: data.operationId || null,
      tool: data.tool || null,
      observations: data.observations || (data.detail && data.detail.observations) || null,
      outcome: data.outcome || data.detail || null,
      error: ok ? null : err,
      meta: data.meta || (ok ? "bridge ok" : "bridge failure"),
      failureKind: data.failureKind || (ok ? null : (err && err.code) || "bridge_failure"),
      fallback: data.fallback,
      detail: data.detail || data,
      attempted: true
    };
  }

  /**
   * Call a product tool via the JSON demo bridge.
   * @returns {Promise<object|null>}
   *   null → bridge unavailable before attempt (caller may use labelled mock for reads)
   *   object with ok:false + attempted → bridge was reached; do NOT mock mutations
   *   object with ok:true → bridge success
   */
  async function callTool(name, argumentsObj) {
    if (!readFlag()) return null;
    var up = await probeHealth(false);
    if (!up) return null;
    /* Once POST may have been dispatched, never return null (mock blockers need attempted). */
    var dispatched = false;
    try {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 2500) : null;
      var requestOpId =
        argumentsObj && typeof argumentsObj === "object" && argumentsObj.operationId
          ? String(argumentsObj.operationId)
          : null;
      dispatched = true;
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

      var data = null;
      try {
        data = await res.json();
      } catch (_parseErr) {
        data = null;
      }

      if (!res.ok) {
        /* Preserve structured JSON errors — never collapse HTTP 500 + body to null. */
        if (data && typeof data === "object") {
          var failed = normalizeBridgePayload(data, res.status);
          if (requestOpId) {
            if (failed.operationId && failed.operationId !== requestOpId) {
              failed.responseOperationId = failed.operationId;
            }
            failed.operationId = requestOpId;
          }
          return failed;
        }
        cachedHealthy = false;
        return {
          ok: false,
          source: "bridge",
          operationId: requestOpId,
          tool: name,
          observations: null,
          outcome: null,
          error: {
            code: "bridge_http_" + res.status,
            message: "Bridge HTTP " + res.status + " with no JSON body"
          },
          meta: "bridge HTTP " + res.status,
          failureKind: "bridge_failure",
          attempted: true
        };
      }

      var normalized = normalizeBridgePayload(data, res.status);
      if (!normalized.ok) {
        if (requestOpId) {
          if (normalized.operationId && normalized.operationId !== requestOpId) {
            normalized.responseOperationId = normalized.operationId;
          }
          normalized.operationId = requestOpId;
        }
        return normalized;
      }
      return {
        ok: true,
        source: normalized.source || "bridge",
        operationId: requestOpId || normalized.operationId,
        responseOperationId:
          requestOpId && normalized.operationId && normalized.operationId !== requestOpId
            ? normalized.operationId
            : undefined,
        tool: normalized.tool || name,
        observations: normalized.observations,
        outcome: normalized.outcome,
        error: null,
        meta: normalized.meta || name + " · mcp",
        detail: normalized.detail || data,
        attempted: true
      };
    } catch (_err) {
      cachedHealthy = false;
      if (dispatched) {
        /* Mutation may already have been accepted server-side — unknown/attempted failure. */
        return {
          ok: false,
          source: "bridge",
          operationId:
            argumentsObj && typeof argumentsObj === "object" && argumentsObj.operationId
              ? String(argumentsObj.operationId)
              : null,
          tool: name,
          observations: null,
          outcome: null,
          error: {
            code: "bridge_unknown_after_dispatch",
            message:
              "Bridge request may have been sent but no usable response was received (" +
              String(_err && _err.message ? _err.message : _err) +
              ")"
          },
          meta: "bridge unknown after dispatch · no mock fallback",
          failureKind: "unknown_after_dispatch",
          attempted: true
        };
      }
      /* Transport failure before dispatch — treat as unavailable. */
      return null;
    }
  }

  global.OpsMcpClient = {
    isEnabled: readFlag,
    baseUrl: baseUrl,
    probeHealth: probeHealth,
    callTool: callTool
  };
})(typeof window !== "undefined" ? window : globalThis);
