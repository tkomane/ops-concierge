# Ops Concierge Constitution

## Core Principles

### I. Spec-First
Every meaningful change begins as Spec Kit artifacts. No implementation lands without a linked `spec.md`, and non-trivial work also requires `plan.md` and `tasks.md`. Specs gate scope: if it is not in the spec, it is out of scope until the artifacts are amended. Ad-hoc prompts never override ratified specs.

### II. Amazon-Native Product Honesty
Ops Concierge is an Amazon Developer Hackathon 2026 entry on the **Alexa+ simulated** path. Product surface, copy, demos, and architecture stay Amazon-native: Ring, Amazon Orders, household calendar, Fire TV, Alexa bedtime routines, guest/task artefacts. **No** Azure, GreenLake, HPE, generic on-prem ops, or day-job cloud vendor narratives. Judges must recognize an honest household concierge simulation — never a rebranded enterprise ops dashboard.

### III. Design Excellence
Visual system targets live x.ai-grade restraint: pure white canvas (#FFFFFF), vast whitespace, huge restrained headlines with tight tracking, near-black primary text (#0A0A0A), soft gray secondary, almost no color accent (optional soft multi-hue underline). Compact nav, pill controls, thin light-gray borders. Cinematic hero — not dark mission-control grids, not Alexa cyan candy. Editorial typography. Soft elevation or none. Confidence over ornament.

### IV. Security by Default
Static deliverable with CSP in index.html, escapeHtml on all dynamic text, no secrets, no API keys, no trackers, no eval, no inline scripts. Simulation badge must remain visible. Prefer fail-closed defaults. Security regressions block merge.

### V. Simplicity / YAGNI
Ship a static deliverable; prefer deleting chrome over adding panels.
Quality is measurable via HTTP 200 and demo completion to GUEST-10421.

### VI. Observability of Agent Behavior
Agentic behavior must be visible: tools timeline, session ID, phase pill (IDLE to TICKETED), and chat that reflects multi-turn state.
Judges must see orchestration, not a forgetful chatbot.

### VII. Accessibility and Performance Budgets
Respect prefers-reduced-motion. Maintain keyboard paths (Enter, 1-4, D, ?, Esc).
Contrast must remain readable on black canvas. Keep first paint light with local CSS/JS and display=swap fonts.
Target calm motion under about 220ms when motion is allowed.

## Product Constraints

- Author attribution: Tshiamo Komane, Africa/Johannesburg (SAST clock).
- Scenarios: doorstep delivery (Ring + order to GUEST-10421) and bedtime (Fire TV + Alexa routine).
- Offline mock only; never claim live Alexa hardware or live Ring/Orders/Fire TV.

## Development Workflow

1. Amend or create Spec Kit feature artifacts under specs/.
2. Constitution Check in plan.md must pass before implementation.
3. Implement against tasks.md; mark tasks complete as work lands.
4. Verify: HTTP 200, doorstep demo to GUEST-10421, bedtime path intact, vendor grep clean.
5. Update README / DEMO.md when UI labels or design language change.

## Governance

This constitution supersedes ad-hoc prompts, chat instructions, and informal style preferences.
Amendments require updating this file with version bump, rationale, and migration notes for open specs.

Pull requests must cite the relevant spec.md / plan.md / tasks.md paths.
Reviewers verify Spec-First compliance, Amazon-native honesty, design restraint, security defaults, and measurable demo quality.
Complexity must be justified in Complexity Tracking when a Constitution Check gate is waived.

**Version**: 1.0.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
