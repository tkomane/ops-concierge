# Tasks: x.ai Inspired Visual System Redesign

**Input**: Design documents from `/specs/001-xai-visual-system/`

**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Confirm Spec Kit feature dir specs/001-xai-visual-system and constitution v1.0.0
- [x] T002 Write spec.md / plan.md / tasks.md from templates

## Phase 2: Foundational tokens

- [x] T003 [P] Rewrite :root design tokens in css/app.css (black/white/muted; remove loud cyan)
- [x] T004 [P] Update ambient canvas (starfield) to subtle monochrome, no cyan wash

## Phase 3: User Story 1 - Cinematic chrome (P1)

- [x] T005 [US1] Restyle topbar/header toward cinematic hero whitespace in css/app.css + index.html if needed
- [x] T006 [US1] Editorial typography scale for mark, panel titles, headlines
- [x] T007 [US1] Ultra-clean cards/panels: hairline borders, soft or no elevation; remove glow
- [x] T008 [US1] Restyle buttons/chips/badge/phase pills to monochrome restraint
- [x] T009 [US1] Quiet agent message accents (hairline, not cyan bar glow)

**Checkpoint**: Visual shell looks x.ai-grade without running scenarios

## Phase 4: User Story 2 - Scenario integrity (P1)

- [x] T010 [US2] Verify all JS hooks/IDs unchanged (demoBtn, demoBtn2, chips, timeline, phasePill, GUEST-10421 path)
- [x] T011 [US2] Manual doorstep path to GUEST-10421; bedtime button still works
- [x] T012 [US2] Keyboard shortcuts overlay still matches chrome

## Phase 5: User Story 3 - Docs (P2)

- [x] T013 [P] [US3] Update README design section to x.ai black/white language
- [x] T014 [P] [US3] Update DEMO.md UI orientation if labels/chrome wording changed

## Phase 6: Polish

- [x] T015 Vendor grep clean (Azure/GreenLake/HPE) in product files
- [x] T016 curl HTTP 200 smoke on local server
- [x] T017 Mark completed tasks in this file

## Dependencies

- Setup before foundational; foundational before US1; US2 after US1 chrome; US3 parallelizable after chrome labels settle; polish last.

## Implementation Strategy

MVP = Phase 2 + Phase 3 (visual). Then verify scenarios (Phase 4), docs (Phase 5), polish (Phase 6).
