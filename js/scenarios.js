window.OPS_SCENARIOS = {
  doorstep: {
    id: "doorstep",
    title: "Doorstep — package handoff",
    spokenStart: "Someone’s at the door — help with the package.",
    primary: {
      source: "Ring Video Doorbell Pro (simulated)",
      sev: "warn",
      title: "Courier at the stoop with a sealed Amazon box",
      fired: "2026-09-04 17:42 SAST",
      resource: "ring-front-door / zone: stoop · live view idle",
      signal:
        "Person + cardboard parcel ~35cm · Ring Live View idle · motion clip 00:14 · Last unlock: none in 90m · Ambient: dusk · Porch light auto-on.",
      blast:
        "Unattended package on Mira’s stoop — porch-piracy risk until Parent A is home (~18:20 SAST)."
    },
    secondary: {
      source: "Amazon Orders (simulated)",
      sev: "info",
      title: "Same-day AMZL — Echo Dot Kids for Lebo",
      fired: "2026-09-04 14:05 SAST",
      resource: "order 702-8842101-4419284 / ship: AMZL Johannesburg",
      signal:
        "Out for delivery · ETA 16:00–18:00 SAST · Signature not required · Drop: Home · Front door · Item: Echo Dot Kids (blue).",
      blast:
        "Ring shows a parcel-shaped object and AMZL has an expected stop nearby — consistent with today’s order, but not proof of who is at the door."
    },
    context: {
      householdCalendar:
        "School pickup (Lebo) until 18:15 SAST. Parent A (Mira) free after 18:20. Quiet hours / kids bedtime prep starts 19:00 SAST.",
      lastActivity:
        "Alexa routine ‘I’m home’ last ran yesterday 18:41 SAST. No one marked home today. Fire TV Stick living-room idle since 15:02.",
      similar:
        "TASK-991 (Aug 2026): Ring package + matching Amazon ETA → guest instruction card for neighbour Thabo. Handoff completed in 11m."
    },
    window: {
      proposed: "Secure handoff window today 18:20–18:45 SAST",
      alt: "Neighbour Thabo leave-with 18:00–18:30 SAST (pre-authorised gate code)",
      rationale:
        "Order ETA closes at 18:00; Mira returns ~18:20. Propose a short presence window so the parcel is claimed before dusk fully settles — or fall back to Thabo’s leave-with guest card.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "GUEST-10421",
      title: "Simulated handoff plan — claim Amazon parcel at front door (sample ref)",
      severity: "Household · delivery",
      assets: "ring-front-door, order-702-8842101, alexa-echo-living, neighbour-thabo"
    }
  },
  bedtime: {
    id: "bedtime",
    title: "Bedtime — Fire TV still on",
    spokenStart: "Start bedtime — Fire TV is still on.",
    primary: {
      source: "Fire TV Stick 4K (simulated)",
      sev: "info",
      title: "Kids profile still streaming Bluey past quiet hours",
      fired: "2026-09-04 19:12 SAST",
      resource: "fire-tv-living / profile: Kids · HDMI-CEC on",
      signal:
        "Playback active 38m · Bluey S3E12 ‘Pass the Parcel’ · Volume 42% · Captions on · Quiet-hours policy started 19:00 SAST.",
      blast:
        "Bedtime wind-down delayed; living-room Fire TV competing with dimmed kids-room lights and queued white-noise."
    },
    secondary: {
      source: "Alexa+ Household Routine (simulated)",
      sev: "warn",
      title: "Bedtime routine waiting — Lebo not confirmed in room",
      fired: "2026-09-04 19:08 SAST",
      resource: "routine: kids-bedtime / echo-dot-kids-room",
      signal:
        "Step 2/5 waiting: ‘confirm kids in room’. Lights dimmed 40%; white-noise queued. Ring kids-room: no motion in 12m.",
      blast:
        "Routine cannot finish without presence confirm — accessibility path needs a caregiver (Mira) nudge before lights-out 19:30."
    },
    context: {
      householdCalendar:
        "School night. Lights-out target 19:30 SAST for Lebo. Mira free until 20:00 then focus block.",
      lastActivity:
        "Echo Dot Kids last ‘Alexa, good night’ attempt 19:06 SAST (interrupted by Fire TV audio). Ring kids-room last motion 18:54 SAST.",
      similar:
        "TASK-880 (Jul 2026): Fire TV kids profile past quiet hours → pause stream + resume bedtime routine. Caregiver card cleared in 6m."
    },
    window: {
      proposed: "Caregiver check-in window tonight 19:15–19:30 SAST",
      alt: "Auto-pause Fire TV now; resume bedtime routine at 19:20 SAST",
      rationale:
        "Quiet hours already started at 19:00. Short caregiver window keeps the accessibility path human-in-the-loop without killing Bluey captions mid-episode — alt is full auto-pause if Mira cannot check in.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "TASK-22018",
      title: "Bedtime task — pause Kids Fire TV + finish Alexa bedtime routine",
      severity: "Household · evening routine",
      assets: "fire-tv-living, echo-dot-kids-room, routine-kids-bedtime, ring-kids-room"
    }
  }
};
