# Friction log (draft for Devpost / judging bonus)

Format: task attempted · steps · expected vs actual · severity · workaround · suggestion.

## 1. Alexa+ without hardware (simulated path)

- **Task:** Build an Alexa+ experience without Echo / device access from South Africa shipping delays.
- **Steps:** Read Official Rules §4 simulated web-app path; build browser agent UI.
- **Expected:** Clear Amazon sample “simulated Alexa+” starter with voice chrome and session APIs.
- **Actual:** Rules allow any agentic tool; little opinionated UI kit for the simulation path. Easy to accidentally ship a plain chatbot.
- **Severity:** Important
- **Workaround:** Labelled “SIMULATION · NOT A LIVE ALEXA DEVICE”; Amazon-native tool timeline; multi-step chips.
- **Suggestion:** Ship an official simulated-Alexa+ web scaffold (session memory + tool cards) on the hackathon resources page.

## 2. No TTS / voice in simulation

- **Task:** Make the demo feel voice-adjacent for a ≤3 min video.
- **Steps:** Consider Web Speech API; skip paid voice APIs (no keys / credits).
- **Expected:** Optional free TTS that works offline in the demo.
- **Actual:** Browser TTS quality/locale inconsistent; skipped to keep the demo deterministic offline.
- **Severity:** Nice-to-have
- **Workaround:** Voice-adjacent chrome + explicit simulation badge; spoken narration in the video.
- **Suggestion:** Provide a muted “Alexa speaking” caption pattern in the sample app.

## 3. Mock Ring / Orders / Fire TV

- **Task:** Show household correlation without live device credentials.
- **Steps:** Invent realistic Ring package + Amazon same-day ETA (and Fire TV bedtime) seed data in SAST.
- **Expected:** Public sandbox APIs for Ring events + order ETA for hackathons.
- **Actual:** No free public sandbox that fits an 8h build; all mocked client-side.
- **Severity:** Important
- **Workaround:** Explicit “mocked” footer and tool names that mirror Amazon-native domains.
- **Suggestion:** Publish read-only sample JSON packs for Ring package events + Amazon delivery ETA + Fire TV session state.

## 4. Devpost join while account flagged

- **Task:** Register for the hackathon immediately after deciding to enter.
- **Steps:** Join → automated suspension → support email → wait for unsuspend.
- **Expected:** Instant join for a long-standing real identity.
- **Actual:** Automated false positive blocked registration until support removed the flag.
- **Severity:** Critical (for time-to-first-commit)
- **Workaround:** Email support@devpost.com; retry Join after restoration.
- **Suggestion:** Faster appeal path or less aggressive first-time join heuristics for established GitHub-linked accounts.

## 5. OSI license visibility for judges

- **Task:** Meet “detectable open source license in About”.
- **Steps:** Add MIT LICENSE at repo root before publishing.
- **Expected:** GitHub auto-detects license on first push.
- **Actual:** Requires public repo + LICENSE at root (local draft alone does not satisfy judges).
- **Severity:** Important
- **Workaround:** Publish public GitHub with LICENSE before submission.
- **Suggestion:** Hackathon checklist callout: “LICENSE file must be on the default branch before you click Submit.”
