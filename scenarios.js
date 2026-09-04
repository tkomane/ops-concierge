window.OPS_SCENARIOS = {
  doorstep: {
    id: "doorstep",
    title: "Doorstep delivery — secure handoff",
    spokenStart: "Run the doorstep delivery concierge.",
    primary: {
      source: "Ring Video Doorbell (simulated)",
      sev: "warn",
      title: "Motion + package at front door",
      fired: "2026-09-04 17:42 SAST",
      resource: "ring-front-door / zone: stoop",
      signal:
        "Person detected with cardboard parcel. Live view idle. Last unlock: none in 90m. Ambient light: dusk.",
      blast: "Unattended package on stoop — porch-piracy risk until someone is home."
    },
    secondary: {
      source: "Amazon Orders (simulated)",
      sev: "info",
      title: "Same-day delivery expected — Echo Dot Kids",
      fired: "2026-09-04 14:05 SAST",
      resource: "order 702-8842101-4419284 / ship: AMZL",
      signal:
        "Out for delivery · ETA window 16:00–18:00 SAST · Signature not required · Destination: Home · Front door.",
      blast: "Matches Ring package silhouette and ETA; high confidence this is the expected Amazon parcel."
    },
    context: {
      householdCalendar:
        "School pickup until 18:15 SAST. Parent A free after 18:20. Quiet hours / kids bedtime prep starts 19:00.",
      lastActivity:
        "Alexa routine ‘I’m home’ last ran yesterday 18:41. No one marked home today. Fire TV idle.",
      similar:
        "TASK-991 (Aug 2026): Ring package + matching Amazon ETA → guest instruction card for neighbour. Handoff completed in 11m."
    },
    window: {
      proposed: "Secure handoff window today 18:20–18:45 SAST",
      alt: "Neighbour leave-with 18:00–18:30 SAST (pre-authorised gate code)",
      rationale:
        "Order ETA closes at 18:00; household returns ~18:20. Propose a short presence window so the parcel is claimed before dusk fully settles — or fall back to the neighbour leave-with card.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "GUEST-10421",
      title: "Guest instruction — claim Amazon parcel at front door (Ring-verified)",
      severity: "Household · delivery",
      assets: "ring-front-door, order-702-8842101, alexa-echo-living"
    }
  },
  bedtime: {
    id: "bedtime",
    title: "Evening routine — Fire TV + kids bedtime",
    spokenStart: "Run the Fire TV evening bedtime routine.",
    primary: {
      source: "Fire TV Stick (simulated)",
      sev: "info",
      title: "Kids profile still streaming past quiet hours",
      fired: "2026-09-04 19:12 SAST",
      resource: "fire-tv-living / profile: Kids",
      signal:
        "Playback active 38m · title: Bluey S3. Volume 42%. Accessibility captions on. Quiet-hours policy starts 19:00.",
      blast: "Bedtime wind-down delayed; living-room TV competing with wind-down lights / story."
    },
    secondary: {
      source: "Alexa+ Household Routine (simulated)",
      sev: "warn",
      title: "Bedtime routine stalled — presence incomplete",
      fired: "2026-09-04 19:08 SAST",
      resource: "routine: kids-bedtime / echo-kids-room",
      signal:
        "Step 2/5 waiting: ‘confirm kids in room’. Lights dimmed; white-noise queued. No Ring kids-room motion in 12m.",
      blast: "Routine cannot finish without presence confirm — accessibility path needs a caregiver nudge."
    },
    context: {
      householdCalendar:
        "School night. Lights-out target 19:30 SAST. Caregiver free until 20:00 then focus block.",
      lastActivity:
        "Echo Dot Kids last ‘Alexa, good night’ attempt 19:06 (interrupted). Ring kids-room last motion 18:54.",
      similar:
        "TASK-880 (Jul 2026): Fire TV kids profile past quiet hours → pause stream + resume bedtime routine. Caregiver card cleared in 6m."
    },
    window: {
      proposed: "Caregiver check-in window tonight 19:15–19:30 SAST",
      alt: "Auto-pause Fire TV now; resume bedtime routine at 19:20 SAST",
      rationale:
        "Quiet hours already started. Short caregiver window keeps the accessibility path human-in-the-loop without killing captions mid-episode abruptly — alt is full auto-pause if nobody can check in.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "TASK-22018",
      title: "Caregiver card — pause Kids Fire TV + finish Alexa bedtime routine",
      severity: "Household · evening routine",
      assets: "fire-tv-living, echo-kids-room, routine-kids-bedtime, ring-kids-room"
    }
  }
};
