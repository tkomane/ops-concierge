# DevOps / Live demo

## Live demo (GitHub Pages)

Intended public URL:

**https://tkomane.github.io/ops-concierge/**

### Enablement

The deploy workflow sets `enablement: true` on `actions/configure-pages`, so the first successful run can turn on Pages with **GitHub Actions** as the source. If your org blocks that API, do it once manually:

1. Open the GitHub repo **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` (or run **Deploy GitHub Pages** via Actions → workflow_dispatch).

Workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)  
Builds a lean `_site/` (HTML/CSS/JS/icons only — no `refs/`, Python, or evidence) then deploys with `upload-pages-artifact` + `deploy-pages`.

## CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

On push/PR to `main`:

1. Checkout
2. Verify required static files exist
3. Python check that `index.html` references `css/app.css` and JS assets
4. Smoke: `python3 -m http.server` + `curl` for `/`, CSS, JS, `robots.txt`

## Local serve with headers

```bash
python3 serve.py
```

Adds CSP and related headers for local demos. Plain `python3 -m http.server` remains fine for a quick check without those headers.

## Notes

- Do not commit secrets; the demo must stay secret-free.
- CI/Pages must not break the zero-build static app.
