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
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src https://fonts.gstatic.com`
- `img-src 'self' data:`
- `connect-src 'self'`
- `base-uri 'self'`
- `form-action 'none'`
- `frame-ancestors 'none'`

Also set: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a locked-down `Permissions-Policy`.

**GitHub Pages** does not apply these custom headers from `serve.py`. Treat Pages as a public static host; rely on same-origin static assets and avoid introducing inline scripts/styles that would break a future meta-CSP.

## Secrets

Do not commit credentials, `.env` files, cloud keys, or customer data. The demo must remain runnable with **zero secrets**.
