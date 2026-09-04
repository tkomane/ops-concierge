# Feature Specification: x.ai Inspired Visual System Redesign

**Feature Branch**: `001-xai-visual-system`

**Created**: 2026-09-04

**Status**: Active

**Input**: User description: "x.ai inspired visual system redesign for Ops Concierge"

## User Scenarios and Testing (mandatory)

### User Story 1 - Cinematic first impression (Priority: P1)

A hackathon judge opens the static demo and immediately feels an x.ai-grade product: pure white canvas, vast whitespace, huge restrained headlines, near-black primary text, muted secondary, almost no color accent. The chrome feels cinematic and editorial — not a dense ops dashboard and not Alexa cyan candy. Doorstep and bedtime demos still work.

**Why this priority**: Visual polish is the highest-leverage differentiator for judges scanning many entries; product scenarios already exist.

**Independent Test**: Load the home page; verify palette, typography, and layout restraint without running a scenario.

**Acceptance Scenarios**:

1. **Given** a cold load of index.html, **When** the page renders, **Then** the background is pure white, primary text is near-black, secondary text is muted, and cyan glow accents are absent or reduced to a whisper.
2. **Given** the landing chrome, **When** a judge scans the header, **Then** they see a cinematic hero/header with confident typography — not dense mission-control chrome.
3. **Given** reduced-motion preference, **When** the page loads, **Then** animations are suppressed.

---

### User Story 2 - Scenarios remain fully operable (Priority: P1)

Judges can still run doorstep delivery and bedtime demos, reach GUEST-10421, use chips/keyboard shortcuts, and observe tools timeline plus session phases.

**Why this priority**: Design must not regress the hackathon demo path.

**Independent Test**: Click Run demo, follow chips to artefact; press D; run Bedtime; press ?.

**Acceptance Scenarios**:

1. **Given** idle session, **When** judge clicks Run demo (or presses D), **Then** doorstep scenario seeds and tools fire.
2. **Given** doorstep flow, **When** chips are followed to Open the artefact, **Then** GUEST-10421 appears and is copyable.
3. **Given** any phase, **When** judge uses Enter / 1-4 / ? / Esc, **Then** shortcuts behave as before.

---

### User Story 3 - Docs match the new design language (Priority: P2)

README design section and DEMO.md click-path describe the x.ai-inspired shell so recording instructions stay accurate.

**Why this priority**: Demo video and judges follow written paths.

**Independent Test**: Read README plus DEMO.md; labels match on-screen chrome.

**Acceptance Scenarios**:

1. **Given** updated UI labels, **When** DEMO.md is followed, **Then** named buttons and panes match the live UI.
2. **Given** README design bullets, **When** compared to CSS tokens, **Then** they describe white-canvas restraint — not luminous cyan candy.

### Edge Cases

- Narrow viewports: layout stacks with readable hierarchy and no horizontal overflow.
- prefers-reduced-motion: motion disabled; layout and contrast unchanged.
- Vendor leakage: grep must find no Azure/GreenLake/HPE product narrative in UI or docs (except constitution forbidding them).

## Requirements (mandatory)

### Functional Requirements
- FR-001: Restyle CSS tokens for pure white canvas and near-black text.
- FR-002: Present cinematic header chrome with editorial typography scale.
- FR-003: Keep doorstep and bedtime JS, tools timeline, phases, GUEST-10421, shortcuts, CSP, escapeHtml.
- FR-004: Remove or whisper loud cyan glow on mark, buttons, chips, badges, agent messages.
- FR-005: Cards must be ultra-clean with soft elevation or none.
- FR-006: README design section and DEMO.md must reflect new visual language.
- FR-007: Remain a static deliverable with no package-manager build step.

### Key Entities

- Design tokens: CSS custom properties for color, type, radius, shadow, motion.
- Chrome: Header, panes (Voice/Chat, Household Board, Tools), footer, overlay, toast.
- Scenario surface: Unchanged agent behavior; visual wrappers only.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: curl to local server returns HTTP 200 for index.html.
- SC-002: Doorstep demo still reaches GUEST-10421.
- SC-003: Grep finds no Azure/GreenLake/HPE in product UI/docs outside constitution bans.
- SC-004: Primary accent cyan usage in CSS is removed or limited to optional whisper.
- SC-005: Judges can complete the DEMO.md path in under 3 minutes.

## Assumptions

- Existing JS scenario engine is correct and should not be rewritten.
- Font stack may keep Inter + IBM Plex Mono without adding build steps.
- x.ai inspiration is aesthetic only; product remains Amazon-native Alexa+ simulation.
