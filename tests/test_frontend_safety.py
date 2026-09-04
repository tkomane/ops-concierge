"""Static safety net — theme, helper vocabulary, tickets, whole public surface, MCP."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _read(*parts: str) -> str:
    return (ROOT.joinpath(*parts)).read_text(encoding="utf-8")


def test_demo_ticket_ids_in_scenarios_and_fixtures():
    scenarios = _read("js", "scenarios.js")
    assert "GUEST-10421" in scenarios
    assert "TASK-22018" in scenarios
    fixtures = _read("mcp_server", "fixtures.py")
    assert "GUEST-10421" in fixtures
    assert "TASK-22018" in fixtures


def test_bedtime_ticket_id_wired_in_ui_and_app():
    """Loop B — bedtime TASK-22018 must be first-class across public surface."""
    html = _read("index.html")
    app = _read("js", "app.js")
    scenarios = _read("js", "scenarios.js")
    assert "TASK-22018" in scenarios
    assert "TASK-22018" in html  # bedtime path hint
    assert 'ingest("bedtime")' in app
    assert "Bedtime task ready" in app or "bedtime task" in app.lower()
    assert "howBedtimePath" in html
    assert 'data-bed="firetv"' in html
    assert 'data-bed="quiet"' in html
    assert 'data-bed="task"' in html
    assert "syncBedtimePath" in app


def test_helper_vocabulary_present():
    html = _read("index.html")
    app_js = _read("js", "app.js")
    css = _read("css", "app.css")
    blob = html + "\n" + app_js

    required = [
        "Talk to the helper",
        "What’s happening at home",
        "Steps the helper took",
        "Doorstep story",
        "Bedtime story",
        "Quiet hours",
        "Guest code",
        "home helper",
    ]
    for phrase in required:
        assert phrase in blob, f"missing helper phrase: {phrase}"

    assert "How it works" in html
    assert 'data-step="door"' in html
    assert 'data-step="package"' in html
    assert 'data-step="quiet"' in html
    assert 'data-step="guest"' in html

    assert "prefers-reduced-motion" in css
    assert "theme.js" in html
    assert "data-theme" in _read("js", "theme.js")


def test_how_strip_presence_and_modes():
    html = _read("index.html")
    css = _read("css", "app.css")
    app = _read("js", "app.js")
    assert 'class="how-strip"' in html or 'id="howStrip"' in html
    assert "how-steps" in html
    assert "how-bedtime-path" in html
    assert "how-bed-steps" in html
    assert "data-mode" in html or "data-mode" in app
    assert "is-bedtime-active" in css or "is-bedtime-active" in app
    assert "HOW_TOOL_MAP" in app


def test_theme_toggle_markup():
    html = _read("index.html")
    theme = _read("js", "theme.js")
    css = _read("css", "app.css")
    assert 'id="themeToggle"' in html
    assert 'class="btn btn-icon theme-toggle"' in html or "theme-toggle" in html
    assert "theme-icon-moon" in html and "theme-icon-sun" in html
    assert "aria-pressed" in html
    assert "OpsTheme" in theme
    assert 'data-theme="dark"' in css or "html[data-theme=\"dark\"]" in css
    assert 'data-theme="light"' in css or "html[data-theme=\"light\"]" in css


def test_forbidden_vendor_names_absent_from_ui():
    for rel in (
        "index.html",
        "css/app.css",
        "js/app.js",
        "js/scenarios.js",
        "js/theme.js",
        "js/mcp-client.js",
        "manifest.webmanifest",
    ):
        text = _read(*rel.split("/"))
        for bad in ("Azure", "GreenLake", "HPE", "Hewlett"):
            assert bad not in text, f"{bad} found in {rel}"


def test_theme_persistence_logic():
    theme = _read("js", "theme.js")
    assert 'var KEY = "ops-theme"' in theme or 'KEY = "ops-theme"' in theme
    assert "localStorage.getItem(KEY)" in theme
    assert "localStorage.setItem(KEY, theme)" in theme
    assert "prefers-color-scheme: dark" in theme
    assert 'meta[name="theme-color"]' in theme
    assert '"#0A0A0A"' in theme and '"#FFFFFF"' in theme
    assert "window.OpsTheme" in theme
    assert "theme-ready" in theme
    assert "Apply immediately" in theme or "apply(resolve())" in theme


def test_accessibility_hooks():
    html = _read("index.html")
    assert 'class="skip-link"' in html
    assert 'href="#main"' in html
    assert 'id="a11yLive"' in html
    assert 'aria-live="polite"' in html
    assert 'id="themeToggle"' in html
    assert "aria-pressed" in html
    app = _read("js", "app.js")
    assert "function announce(" in app
    assert "syncHowFromTools" in app
    assert "syncStoryProgress" in app


def test_story_progress_and_demos_wired():
    html = _read("index.html")
    assert 'id="storyProgress"' in html
    assert 'id="demoBtn"' in html
    assert 'id="demoBtn2"' in html
    app = _read("js", "app.js")
    assert 'ingest("doorstep")' in app
    assert 'ingest("bedtime")' in app
    assert "GUEST" in app
    assert 'e.key === "b"' in app or 'e.key === "B"' in app


def test_first_run_coach_banner():
    html = _read("index.html")
    app = _read("js", "app.js")
    css = _read("css", "app.css")
    assert 'id="coachBanner"' in html
    assert "ops-coach-dismissed" in app
    assert "initCoach" in app
    assert "coach-banner" in css
    assert "Doorstep story" in html or "doorstep" in html.lower()


def test_trophy_reveal_both_stories():
    app = _read("js", "app.js")
    css = _read("css", "app.css")
    assert "ticket-trophy" in app
    assert "ticket-id-hero" in app
    assert "Guest code ready" in app
    assert "Bedtime task ready" in app
    assert "Copy bedtime task" in app or "Copy guest code" in app
    assert "ticket-trophy" in css
    assert "ticket-id-hero" in css


def test_judge_skim_strip():
    html = _read("index.html")
    css = _read("css", "app.css")
    assert 'id="judgeStrip"' in html
    assert "For judges" in html
    assert "Alexa+" in html
    assert "MCP" in html
    assert "judge-strip" in css


def test_compact_short_viewport():
    css = _read("css", "app.css")
    app = _read("js", "app.js")
    assert "max-height: 900px" in css
    assert "max-height: 780px" in css
    assert "data-compact" in css or "data-compact" in app
    assert "syncCompactMode" in app


def test_offline_font_fallbacks_documented():
    css = _read("css", "app.css")
    sec = _read("SECURITY.md")
    readme = _read("README.md")
    assert "system-ui" in css
    assert "BlinkMacSystemFont" in css or "Segoe UI" in css
    assert "ui-monospace" in css
    assert "display=swap" in _read("index.html") or "display=swap" in css
    assert "Fonts / offline resilience" in sec or "system-ui" in sec
    assert "fallback" in readme.lower() or "system-ui" in readme


def test_csp_and_serve_headers_present():
    html = _read("index.html")
    assert "Content-Security-Policy" in html
    assert "script-src 'self'" in html
    serve = _read("serve.py")
    assert "Content-Security-Policy" in serve
    assert "frame-ancestors 'none'" in serve


def test_mcp_tool_dispatch_health():
    from mcp_server.tools import TOOL_NAMES, dispatch, task_open

    assert "ring.query" in TOOL_NAMES
    guest = task_open(scenario="doorstep")
    assert guest["ok"] is True
    assert guest["detail"]["id"] == "GUEST-10421"
    bed = task_open(scenario="bedtime")
    assert bed["detail"]["id"] == "TASK-22018"
    r = dispatch("ring.query", {"zone": "stoop", "scenario": "doorstep"})
    assert r["ok"] is True


def test_public_surface_panels_and_composer():
    html = _read("index.html")
    assert 'id="chat"' in html
    assert 'id="cards"' in html
    assert 'id="timeline"' in html
    assert 'id="chips"' in html
    assert 'id="utter"' in html
    assert 'id="sendBtn"' in html
    assert 'id="helpBtn"' in html
    assert 'id="shortcutsOverlay"' in html
    assert "panel-voice" in html
    assert "panel-board" in html
    assert "panel-telemetry" in html


def test_mcp_status_pill_markup_and_logic():
    """Loop C — Helper/MCP connection pill for non-engineers."""
    html = _read("index.html")
    app = _read("js", "app.js")
    css = _read("css", "app.css")
    mcp = _read("js", "mcp-client.js")
    assert 'id="mcpPill"' in html
    assert "Helper link" in html
    assert "Local mock" in html
    assert "refreshMcpPill" in app
    assert "mcpStateLabel" in app
    assert 'data-state="mock"' in html or "data-state" in app
    assert "Connected" in app and "Offline" in app
    assert ".mcp-pill" in css
    assert "OpsMcpClient" in mcp
    assert "OPS_USE_MCP" in mcp


def test_reduced_motion_and_high_contrast_hooks():
    """Loop C — prefers-reduced-motion + prefers-contrast audit."""
    css = _read("css", "app.css")
    assert "prefers-reduced-motion" in css
    assert css.count("prefers-reduced-motion") >= 3
    assert "prefers-contrast: more" in css
    assert "animation: none" in css or "animation-duration: 0.01ms" in css


def test_print_and_share_guest_code_ux():
    """Loop C — print-friendly trophy + obvious copy toast tones."""
    app = _read("js", "app.js")
    css = _read("css", "app.css")
    assert "printTicket" in app
    assert "Print guest card" in app
    assert "Print task card" in app
    assert "data-print-ticket" in app
    assert "data-tone" in app or 'tone === "err"' in app
    assert "Copy failed" in app
    assert "@media print" in css
    assert "toast[data-tone" in css or 'data-tone="ok"' in css
    assert "ticket-actions" in css


def test_pwa_manifest_helper_story():
    """Loop C — PWA manifest matches helper story; maskable icon present."""
    man = _read("manifest.webmanifest")
    html = _read("index.html")
    theme = _read("js", "theme.js")
    assert "Home Helper" in man or "home helper" in man.lower()
    assert "guest code" in man.lower() or "Guest" in man or "bedtime" in man.lower()
    assert "maskable" in man
    assert "icon-maskable.svg" in man
    assert "theme_color" in man
    assert 'rel="manifest"' in html
    assert '"#0A0A0A"' in theme and '"#FFFFFF"' in theme
    root = ROOT
    assert (root / "icon-maskable.svg").is_file()
    assert (root / "icon-192.svg").is_file()


def test_composer_chip_send_disabled_empty():
    """Loop C — contextual placeholders; Send disabled when empty with aria."""
    html = _read("index.html")
    app = _read("js", "app.js")
    css = _read("css", "app.css")
    assert 'id="sendBtn"' in html
    assert "aria-disabled" in html or "aria-disabled" in app
    assert "syncSendEnabled" in app
    assert "PLACEHOLDERS" in app
    assert "startPlaceholderRotation" in app
    assert "chip-key" in app or "chip-label" in app
    assert "composer-kb-hint" in html
    assert "composer-kb-hint" in css


def test_shortcuts_power_user_layer_documented():
    """Loop C — D/B/?/1-4 documented; overlay polish + composer hint."""
    html = _read("index.html")
    app = _read("js", "app.js")
    assert "<kbd>D</kbd>" in html
    assert "<kbd>B</kbd>" in html
    assert "<kbd>?</kbd>" in html
    assert "1</kbd>–<kbd>4" in html or "1</kbd>-<kbd>4" in html or "1</kbd>–<kbd>4</kbd>" in html
    assert "overlay-lead" in html
    assert "Power-user" in html or "power-user" in html.lower() or "Power-user layer" in html
    assert 'e.key === "d"' in app or 'e.key === "D"' in app
    assert 'e.key === "b"' in app or 'e.key === "B"' in app
    assert 'e.key === "?"' in app


def test_bedtime_strip_and_coach_still_present():
    """Regression — bedtime strip + coach remain after Loop C."""
    html = _read("index.html")
    app = _read("js", "app.js")
    assert "howBedtimePath" in html
    assert "coachBanner" in html
    assert "syncBedtimePath" in app
    assert "initCoach" in app
    assert "ticket-trophy" in app


def test_vendor_ban_includes_new_assets():
    """Vendor scrub extends to new PWA icons."""
    for rel in ("icon-maskable.svg", "icon-192.svg", "favicon.svg"):
        text = _read(rel)
        for bad in ("Azure", "GreenLake", "HPE", "Hewlett"):
            assert bad not in text, f"{bad} in {rel}"


def test_loop_d_scenario_content_richness():
    """Loop D — vivid doorstep/bedtime copy; ticket ids + SAST + Ring/Fire TV intact."""
    scenarios = _read("js", "scenarios.js")
    assert "GUEST-10421" in scenarios
    assert "TASK-22018" in scenarios
    assert "SAST" in scenarios
    assert "Ring" in scenarios
    assert "Fire TV" in scenarios
    assert "Echo Dot Kids" in scenarios or "Echo Dot" in scenarios
    assert "Bluey" in scenarios
    assert "Mira" in scenarios or "Parent A" in scenarios
    assert "Lebo" in scenarios or "Kids" in scenarios
    assert "Africa/Johannesburg" in scenarios


def test_loop_d_error_and_edge_paths():
    """Loop D — empty send, unknown utterance, mid-story switch, copy failure guidance."""
    app = _read("js", "app.js")
    assert "Type a short ask, or tap a suggestion below" in app
    assert "I didn’t catch a message" in app or "I didn't catch a message" in app
    assert "Switching to doorstep story" in app
    assert "pausing the" in app
    assert "Copy blocked" in app
    assert "Ctrl+C" in app
    assert "I’m not sure I caught that" in app or "I'm not sure I caught that" in app
    assert "Home is quiet — nothing is on the board yet" in app
    assert "GUEST-10421" in app
    assert "TASK-22018" in app


def test_loop_d_csp_matches_serve_and_meta():
    """Loop D — CSP: no unsafe-inline scripts; SVGs/print-safe; meta ↔ serve synced."""
    import re

    html = _read("index.html")
    serve = _read("serve.py")
    sec = _read("SECURITY.md")
    app = _read("js", "app.js")
    assert "script-src 'self'" in html
    assert "script-src 'self'" in serve
    for blob, label in ((html, "index"), (serve, "serve")):
        m = re.search(r"script-src[^;\"']+", blob)
        assert m, f"script-src missing in {label}"
        assert "unsafe-inline" not in m.group(0), f"unsafe-inline scripts in {label}"
    assert "frame-ancestors 'none'" in html
    assert "frame-ancestors 'none'" in serve
    assert "manifest-src 'self'" in html
    assert "manifest-src 'self'" in serve
    assert "object-src 'none'" in html
    assert "object-src 'none'" in serve
    assert "img-src 'self' data:" in html
    assert "img-src 'self' data:" in serve
    assert "127.0.0.1:8766" in html and "127.0.0.1:8766" in serve
    assert "unsafe-inline" in sec and "script" in sec.lower()
    assert "ticket-title-tight" in app
    assert 'style="margin-bottom:0"' not in app


def test_loop_d_docs_helper_vocabulary():
    """Loop D — DEMO/README match helper vocabulary + stories; no Azure denials."""
    demo = _read("DEMO.md")
    readme = _read("README.md")
    blob = demo + "\n" + readme
    for phrase in ("Doorstep", "Bedtime", "GUEST-10421", "TASK-22018", "helper", "SAST"):
        assert phrase in blob, f"missing {phrase}"
    assert "guest code" in blob.lower()
    assert "dark" in blob.lower() or "theme" in blob.lower()
    for bad in ("Azure", "GreenLake", "HPE", "Hewlett"):
        assert bad not in blob, f"{bad} in docs"


def test_loop_e_a11y_automated_checks():
    """Loop E — lightweight HTML a11y: skip-link, main, theme aria, live region, img alts."""
    import re
    from html.parser import HTMLParser

    html = _read("index.html")
    assert 'class="skip-link"' in html
    assert 'href="#main"' in html
    assert re.search(r'<main[^>]*\bid=["\']main["\']', html)
    assert 'id="themeToggle"' in html
    assert 'aria-label="Switch theme"' in html
    assert "aria-pressed" in html
    assert 'id="a11yLive"' in html
    assert 'aria-live="polite"' in html
    assert 'role="status"' in html

    class ImgAltChecker(HTMLParser):
        def __init__(self):
            super().__init__()
            self.imgs = []

        def handle_starttag(self, tag, attrs):
            if tag.lower() != "img":
                return
            self.imgs.append(dict(attrs))

    checker = ImgAltChecker()
    checker.feed(html)
    for img in checker.imgs:
        assert "alt" in img, f"img missing alt: {img}"
    assert 'aria-hidden="true"' in html
    assert "aria-pressed" in html
    assert 'setAttribute("aria-pressed"' in _read("js", "theme.js")


def test_loop_e_bedtime_parity_no_doorstep_bias():
    """Loop E — bedtime UI/copy/coach/strip/trophy as strong as doorstep."""
    html = _read("index.html")
    app = _read("js", "app.js")
    demo = _read("DEMO.md")
    assert "coachStartBedtime" in html
    assert "coachStartDoorstep" in html
    assert "Start bedtime" in html
    assert "Start doorstep" in html
    assert "Guest / Task" in html
    assert "Either story" in html
    assert "Bedtime path" in html
    assert "artefactChip" in app
    assert "Make the bedtime task" in app
    assert "Make the guest code" in app
    # Regression: artefact chips must resolve before bedtime re-ingest
    assert "Make the bedtime task" in app and "Artefact / plan chips before story restarts" in app
    assert "syncGuestStepLabel" in app
    assert "TASK-22018" in app
    assert "GUEST-10421" in app
    assert 'data-empty-cta="bedtime"' in app
    assert 'data-empty-cta="doorstep"' in app
    assert 'btn-primary" data-empty-cta="doorstep"' not in app
    assert "Bedtime task ready" in app
    assert "Copy bedtime task" in app
    assert "Print task card" in app
    assert "Doorstep story" in demo
    assert "Bedtime story" in demo
    assert "Make the guest code" in demo
    assert "Make the bedtime task" in demo
    assert "TASK-22018" in demo
    assert "GUEST-10421" in demo


def test_loop_e_csp_pages_headers_documented():
    """Loop E — CSP via serve.py documented; Pages gap; optional _headers local-safe."""
    sec = _read("SECURITY.md")
    readme = _read("README.md")
    headers = _read("_headers")
    serve = _read("serve.py")
    assert "serve.py" in sec and "GitHub Pages" in sec
    assert "meta" in sec.lower()
    assert "_headers" in sec
    assert "Content-Security-Policy" in headers
    assert "script-src 'self'" in headers
    assert "frame-ancestors 'none'" in headers
    assert "script-src 'self'" in serve
    assert "_headers" in readme or "GitHub Pages" in readme
    assert "script-src 'self' 'unsafe-inline'" not in headers
