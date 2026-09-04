# Security Policy

## Reporting a vulnerability

This project is a **static, client-only demo** (no backend, no accounts, no API keys).

If you believe you have found a security issue in the repository itself (e.g. accidental secret commit, unsafe CI configuration, or a problem that would matter if someone forked and extended the mock into a real integration):

1. Prefer a **private** report: open a GitHub Security Advisory for the repo, or email the maintainer listed in the README / GitHub profile.
2. Do **not** open a public issue that includes exploit details until a fix or clarification is published.
3. Include: what you observed, steps to reproduce, and impact if the static mock were extended.

We aim to acknowledge reports within a few days. This is a hackathon demo maintained by an individual contributor — response times may vary.

## Threat model (current scope)

| Asset | Status |
|-------|--------|
| User secrets / API keys | **None** — nothing is collected or stored |
| Backend / database | **None** — zero-build static HTML/CSS/JS |
| Session state | In-browser only (JS memory / DOM); cleared on reload |
| Network calls | Local mock / tool simulation only; no live cloud or ITSM APIs |
| AuthN / AuthZ | Not applicable in this demo |

### Intended threats we care about

- **Supply-chain / repo hygiene:** accidental secrets, malicious PRs to CI or Pages deploy.
- **Local serve misuse:** treating `serve.py` as production infrastructure (it is a convenience static server for demos).
- **Content injection assumptions:** if someone later adds user-generated HTML without escaping, XSS risk appears — the current mock should keep rendering data as text.

### Explicit non-goals

- Protecting against attackers who already control the user's browser.
- Hardening a live Alexa skill, AWS account, or ITSM integration (those are out of scope and mocked).

## Content Security Policy (CSP)

When you run `python3 serve.py`, responses include a restrictive **Content-Security-Policy** plus other baseline headers:

- `default-src 'self'`
- `script-src 'self'` (**no** `unsafe-inline` scripts)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` (inline styles only for theme tokens / print; fonts CSS)
- `font-src https://fonts.gstatic.com`
- `img-src 'self' data:` (covers favicon / PWA SVG icons)
- `connect-src 'self' http://127.0.0.1:8766 http://localhost:8766` (optional local MCP)
- `manifest-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'none'`
- `frame-ancestors 'none'`

Print guest/task card uses the browser `window.print()` API (no extra CSP hosts). Meta CSP in `index.html` matches `serve.py`.

Also set: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a locked-down `Permissions-Policy`.

**How CSP is enforced:** `python3 serve.py` is the authoritative local demo path — it attaches the CSP (and related headers) on every response. `index.html` also carries a matching `<meta http-equiv="Content-Security-Policy">` so browsers still see a policy when the page is opened without `serve.py` (e.g. raw `python3 -m http.server` or opening the file). Prefer `serve.py` for judge demos.

**GitHub Pages** does **not** apply custom response headers from `serve.py` (or from a static `_headers` file). Treat Pages as a public static host: rely on the meta CSP + same-origin assets, and avoid introducing inline scripts that would break `script-src 'self'`.

**Optional `_headers`:** This repo includes a Cloudflare/Netlify-style [`_headers`](_headers) file that mirrors the `serve.py` CSP for hosts that honor it. Local `serve.py` does not read `_headers` (headers come from Python). GitHub Pages ignores `_headers`. Zero impact on the local demo.

## Secrets

Do not commit credentials, `.env` files, cloud keys, or customer data. The demo must remain runnable with **zero secrets**.

## Optional local MCP server

The optional `mcp_server` package binds **127.0.0.1** by default and enables Host/Origin DNS-rebinding protection for localhost. It exposes simulated Amazon-native tools only — no API keys, no cloud credentials. Prefer keeping it off the public internet. The static GitHub Pages demo does not require MCP.

## Fonts / offline resilience

The UI prefers **Inter** and **IBM Plex Mono** from Google Fonts (`display=swap`, preconnect + preload). CSP allows `fonts.googleapis.com` / `fonts.gstatic.com`.

If the CDN is blocked (offline LAN, strict network), CSS falls back to a premium **system-ui** stack:

- UI: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Mono: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

No layout hard-dependency on webfonts; the demo remains readable and intentional without them.
