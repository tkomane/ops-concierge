# Contributing

Thanks for interest in **Ops Concierge** — a static, zero-build Alexa+ simulation demo.

## Ground rules

- Keep the app **client-only**: no build step, no bundler, no required backend.
- Do not add real cloud credentials, live AWS/Ring/Orders/ITSM calls, or tracking pixels.
- Prefer small, reviewable PRs.
- Do not delete or replace `demo-video/` assets unless the maintainer asks.

## Local run

```bash
python3 serve.py
# or: python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

`serve.py` adds optional security headers for local demos; `python3 -m http.server` does not.

## Checks before opening a PR

- App still loads with only `index.html`, `css/`, and `js/`.
- `index.html` still references `css/app.css`, `js/scenarios.js`, and `js/app.js`.
- CI workflow (`.github/workflows/ci.yml`) should pass on your PR.

## Docs

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- DevOps / Pages: [docs/DEVOPS.md](docs/DEVOPS.md)
- Security: [SECURITY.md](SECURITY.md)

## License

By contributing you agree your changes are under the same MIT license as this repository.
