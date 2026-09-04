# Implementation Plan: x.ai Inspired Visual System Redesign

**Branch**: `001-xai-visual-system` | **Date**: 2026-09-04 | **Spec**: specs/001-xai-visual-system/spec.md

**Input**: Feature specification from `/specs/001-xai-visual-system/spec.md`

## Summary

Restyle Ops Concierge to an x.ai-grade white cinematic shell while preserving Amazon-native doorstep and bedtime scenario logic. Primary work is CSS design tokens, typography, layout chrome, and restrained motion; JS stays intact except for class hooks if needed.

## Technical Context

**Language/Version**: HTML5, CSS3, ES2020+ JavaScript (browser)

**Primary Dependencies**: None (static files; Google Fonts Inter + IBM Plex Mono via link)

**Storage**: N/A (in-memory session mock)

**Testing**: Manual demo path + curl smoke + vendor grep

**Target Platform**: Modern desktop browsers; static hosting (GitHub Pages)

**Project Type**: Static web demo

**Performance Goals**: Calm transitions under ~220ms; light first paint

**Constraints**: Zero package-manager build; CSP + escapeHtml; Amazon-native only

**Scale/Scope**: Single-page shell (index.html, css/app.css); docs README + DEMO.md

## Constitution Check

*GATE: Must pass before implementation.*

- Spec-First: PASS — spec.md / plan.md / tasks.md for 001-xai-visual-system
- Amazon-native honesty: PASS — no vendor narrative change; scenarios unchanged
- Design excellence: PASS — explicit x.ai restraint goals
- Security by default: PASS — CSP/escapeHtml preserved; no secrets/trackers
- Simplicity / YAGNI: PASS — CSS/HTML chrome only; static deliverable
- Observability: PASS — timeline/phases retained
- Accessibility and performance: PASS — reduced-motion + keyboard paths retained

## Project Structure

### Documentation (this feature)

```text
specs/001-xai-visual-system/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
index.html
css/app.css
js/app.js
js/scenarios.js
README.md
DEMO.md
```

**Structure Decision**: Keep existing static single-page layout; redesign tokens and chrome in css/app.css and light HTML structure for cinematic header.

## Approach

1. Replace cyan-forward dark tokens with light x.ai palette (pure white, near-black type, soft gray, thin borders, optional multi-hue underline).
2. Rebuild header toward cinematic hero: more whitespace, larger mark typography, quieter meta row.
3. Soften panels/cards (hairline borders, soft or no elevation); remove glow filters.
4. Restyle primary CTA as solid near-black pill with white text (not cyan gradient).
5. Preserve all IDs/hooks used by js/app.js (demoBtn, chips, timeline, phasePill, etc.).
6. Update README design blurb and DEMO.md orientation copy.

## Complexity Tracking

No constitution violations requiring justification.
