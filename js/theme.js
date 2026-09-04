/* Ops Concierge theme — sync early (head) to avoid FOUC; CSP script-src 'self' only. */
(function () {
  var KEY = "ops-theme";
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');

  function systemPref() {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === "light" || v === "dark") return v;
    } catch (e) { /* private mode */ }
    return null;
  }

  function writeStored(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* ignore */ }
  }

  function queryOverride() {
    try {
      var q = new URLSearchParams(window.location.search).get("theme");
      if (q === "light" || q === "dark") return q;
    } catch (e) { /* ignore */ }
    return null;
  }

  function apply(theme) {
    if (theme !== "light" && theme !== "dark") theme = "light";
    root.setAttribute("data-theme", theme);
    root.classList.add("theme-ready");
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0A0A" : "#FFFFFF");
    var btn = document.getElementById("themeToggle");
    if (btn) {
      var next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + next + " mode");
      btn.setAttribute("title", "Theme: " + theme + " (click for " + next + ")");
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.dataset.theme = theme;
    }
    return theme;
  }

  function current() {
    var t = root.getAttribute("data-theme");
    return t === "dark" || t === "light" ? t : "light";
  }

  function resolve() {
    var fromQuery = queryOverride();
    if (fromQuery) return fromQuery;
    var stored = readStored();
    return stored || systemPref();
  }

  function set(theme) {
    writeStored(theme);
    return apply(theme);
  }

  function toggle() {
    return set(current() === "dark" ? "light" : "dark");
  }

  // Apply immediately (head, before paint when possible)
  apply(resolve());

  function bindToggle() {
    var btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    apply(current());
    btn.addEventListener("click", function () {
      toggle();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle);
  } else {
    bindToggle();
  }

  window.OpsTheme = {
    key: KEY,
    get: current,
    set: set,
    toggle: toggle,
    resolve: resolve
  };
})();
