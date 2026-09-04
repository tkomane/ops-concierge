"""Amazon-native simulated household fixtures (no live APIs, no secrets)."""

from __future__ import annotations

from typing import Any

# Simulation-only — Alexa+ hackathon path. Never claim live Ring / Orders / Fire TV.

FIXTURES: dict[str, dict[str, Any]] = {
    "doorstep": {
        "ring": {
            "resource": "ring-front-door / zone: stoop",
            "title": "Motion + package at front door",
            "signal": (
                "Person detected with cardboard parcel. Live view idle. "
                "Last unlock: none in 90m. Ambient light: dusk."
            ),
        },
        "order": {
            "resource": "order 702-8842101-4419284 / ship: AMZL",
            "title": "Same-day delivery expected — Echo Dot Kids",
            "signal": (
                "Out for delivery · ETA window 16:00–18:00 SAST · "
                "Signature not required · Destination: Home · Front door."
            ),
        },
        "calendar": {
            "proposed": "Secure handoff window today 18:20–18:45 SAST",
            "alt": "Neighbour leave-with 18:00–18:30 SAST (pre-authorised gate code)",
            "tz": "Africa/Johannesburg (SAST, UTC+2)",
        },
        "notify": {
            "channel": "household-shared-list",
            "message": "Parcel at front door — claim window proposed (sim).",
        },
        "task": {
            "id": "GUEST-10421",
            "title": "Simulated handoff plan — claim Amazon parcel at front door (sample ref)",
        },
    },
    "bedtime": {
        "ring": {
            "resource": "ring-kids-room / living",
            "title": "Kids-room presence sparse during bedtime stall",
            "signal": "No Ring kids-room motion in 12m; living-room motion correlated with Fire TV.",
        },
        "order": {
            # Re-used slot for device/session lookup in bedtime flow (Fire TV + routine).
            "resource": "fire-tv-living / profile: Kids",
            "title": "Kids profile still streaming past quiet hours",
            "signal": "Playback active · Bluey S3 · Volume 42% · Quiet-hours policy from 19:00.",
        },
        "calendar": {
            "proposed": "Caregiver check-in window tonight 19:15–19:30 SAST",
            "alt": "Auto-pause Fire TV now; resume bedtime routine at 19:20 SAST",
            "tz": "Africa/Johannesburg (SAST, UTC+2)",
        },
        "notify": {
            "channel": "caregiver-nudge",
            "message": "Bedtime routine stalled — caregiver check-in suggested (sim).",
        },
        "task": {
            "id": "TASK-22018",
            "title": "Caregiver card — pause Kids Fire TV + finish Alexa bedtime routine",
        },
    },
}


def get_fixture(scenario: str) -> dict[str, Any]:
    key = (scenario or "doorstep").strip().lower()
    if key not in FIXTURES:
        raise KeyError(f"Unknown scenario '{scenario}'. Use doorstep or bedtime.")
    return FIXTURES[key]
