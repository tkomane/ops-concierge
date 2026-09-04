/**
 * Ops Concierge — proposal planner (Worker A).
 * Builds Proposal objects from tool Results; supersedes on replan_facts.
 * Never claims visitor identity from order ETA alone.
 * Attaches window.OpsPlanner.
 */
(function (root) {
  "use strict";

  var planSeq = 0;

  function nextPlanId() {
    planSeq += 1;
    return "plan_" + planSeq;
  }

  /** Reset counter (tests only). */
  function _resetSeq(n) {
    planSeq = typeof n === "number" ? n : 0;
  }

  /** Keep plan ids unique across reload when prior proposals are restored. */
  function ensureSeqAtLeast(n) {
    var v = typeof n === "number" ? n : parseInt(n, 10);
    if (!isFinite(v) || v < 0) return planSeq;
    if (v > planSeq) planSeq = v;
    return planSeq;
  }

  function noteExistingPlanId(planId) {
    if (!planId || typeof planId !== "string") return;
    var m = planId.match(/^plan_(\d+)$/i);
    if (m) ensureSeqAtLeast(parseInt(m[1], 10));
  }

  function asArray(v) {
    if (!v) return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

  function collectResults(results) {
    if (!results) return [];
    if (Array.isArray(results)) return results.slice();
    if (results.ok !== undefined || results.tool) return [results];
    if (typeof results === "object") {
      return Object.keys(results).map(function (k) {
        var r = results[k];
        if (r && typeof r === "object" && !r.tool) {
          return Object.assign({ tool: k }, r);
        }
        return r;
      });
    }
    return [];
  }

  function obsFromResult(r) {
    var out = [];
    if (!r || !r.ok) return out;
    var o = r.observations;
    if (!o) {
      if (r.meta && typeof r.meta === "string") out.push(r.meta);
      return out;
    }
    if (typeof o === "string") {
      out.push(o);
      return out;
    }
    if (Array.isArray(o)) {
      o.forEach(function (x) {
        if (typeof x === "string") out.push(x);
        else if (x && x.text) out.push(x.text);
        else if (x && x.label) out.push(x.label);
      });
      return out;
    }
    if (typeof o === "object") {
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (v == null) return;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          out.push(k + ": " + v);
        } else if (v && v.summary) {
          out.push(String(v.summary));
        }
      });
    }
    return out;
  }

  function truthyTyped(v) {
    return v === true || v === 1 || v === "true" || v === "yes";
  }

  function falsyTyped(v) {
    return v === false || v === 0 || v === "false" || v === "no";
  }

  function readObs(r) {
    if (!r) return {};
    var o = r.observations;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return o;
  }

  /**
   * Evidence strength for visitor identity — typed observations only.
   * motion:false / parcelVisual:false are negatives, never positives via JSON string search.
   * Order ETA / expected delivery alone is insufficient.
   */
  function evidenceAssessment(results) {
    var list = collectResults(results);
    var hasRingMotion = false;
    var hasParcelVisual = false;
    var hasOrderEta = false;
    var hasOrderMatchHint = false;
    var hasMismatch = false;
    var hasInsufficient = false;
    var anyOkRead = false;
    var anyFailedRead = false;
    var calendarProposed = null;
    var calendarNeighbourAvailable = undefined;

    list.forEach(function (r) {
      if (!r) return;
      if (r.ok === false) {
        anyFailedRead = true;
        return;
      }
      anyOkRead = true;
      var tool = (r.tool || "").toLowerCase();
      var obs = readObs(r);
      var outcome = r.outcome && typeof r.outcome === "object" ? r.outcome : {};

      if (tool.indexOf("ring") !== -1) {
        if (Object.prototype.hasOwnProperty.call(obs, "motion")) {
          if (truthyTyped(obs.motion)) hasRingMotion = true;
          /* explicit false stays false */
        } else if (truthyTyped(obs.person) || truthyTyped(obs.detected)) {
          hasRingMotion = true;
        } else if (typeof obs.summary === "string" && /\bmotion\b|\bperson\b/i.test(obs.summary) && !/\bno motion\b|\bmotion:\s*false\b/i.test(obs.summary)) {
          hasRingMotion = true;
        }
        if (Object.prototype.hasOwnProperty.call(obs, "parcelVisual")) {
          if (truthyTyped(obs.parcelVisual)) hasParcelVisual = true;
        } else if (Object.prototype.hasOwnProperty.call(obs, "parcel")) {
          if (truthyTyped(obs.parcel)) hasParcelVisual = true;
        } else if (typeof obs.summary === "string" && /\bparcel\b|\bpackage\b|\bcardboard\b/i.test(obs.summary)) {
          hasParcelVisual = true;
        }
      }

      if (tool.indexOf("order") !== -1) {
        if (obs.eta || outcome.eta || obs.carrier || /amzl/i.test(String(obs.summary || ""))) {
          hasOrderEta = true;
        }
        if (truthyTyped(obs.matched) || truthyTyped(outcome.matched) || truthyTyped(obs.matchHint) || truthyTyped(obs.silhouetteMatch)) {
          hasOrderMatchHint = true;
        }
        if (falsyTyped(obs.matched) || falsyTyped(outcome.matched)) {
          hasMismatch = true;
        }
      }

      if (tool.indexOf("calendar") !== -1) {
        if (obs.proposed) calendarProposed = String(obs.proposed);
        else if (outcome.proposed) calendarProposed = String(outcome.proposed);
        if (Object.prototype.hasOwnProperty.call(obs, "neighbourAvailable")) {
          calendarNeighbourAvailable = !!obs.neighbourAvailable && !falsyTyped(obs.neighbourAvailable);
          if (falsyTyped(obs.neighbourAvailable)) calendarNeighbourAvailable = false;
        } else if (Object.prototype.hasOwnProperty.call(outcome, "neighbourAvailable")) {
          calendarNeighbourAvailable = !falsyTyped(outcome.neighbourAvailable) && !!outcome.neighbourAvailable;
          if (falsyTyped(outcome.neighbourAvailable)) calendarNeighbourAvailable = false;
        }
      }

      if (obs.mismatch === true || outcome.mismatch === true || falsyTyped(obs.matched)) {
        hasMismatch = true;
      }
      if (obs.insufficient === true || outcome.insufficient === true) {
        hasInsufficient = true;
      }
    });

    var identityClaimOk =
      !hasMismatch &&
      !hasInsufficient &&
      hasRingMotion &&
      hasParcelVisual &&
      (hasOrderMatchHint || (hasOrderEta && hasParcelVisual && hasRingMotion));

    /* Order ETA alone — never enough */
    if (hasOrderEta && !hasRingMotion && !hasParcelVisual) {
      identityClaimOk = false;
    }

    return {
      hasRingMotion: hasRingMotion,
      hasParcelVisual: hasParcelVisual,
      hasOrderEta: hasOrderEta,
      hasOrderMatchHint: hasOrderMatchHint,
      hasMismatch: hasMismatch,
      hasInsufficient: hasInsufficient,
      canClaimVisitorIdentity: identityClaimOk,
      anyOkRead: anyOkRead,
      anyFailedRead: anyFailedRead,
      allReadsFailed: anyFailedRead && !anyOkRead,
      calendarProposed: calendarProposed,
      calendarNeighbourAvailable: calendarNeighbourAvailable
    };
  }

  function canClaimVisitorIdentity(results) {
    return evidenceAssessment(results).canClaimVisitorIdentity;
  }

  /**
   * Minimum usable evidence for Doorstep: positive door signal + successful order read.
   * Empty, negative, unknown, or failed required inputs are not approvable.
   */
  function hasDoorstepMinimumEvidence(evidence, results) {
    var list = collectResults(results);
    if (!list.length) return false;
    if (!evidence || evidence.allReadsFailed) return false;
    if (!evidence.hasRingMotion && !evidence.hasParcelVisual) return false;
    var orderOk = false;
    list.forEach(function (r) {
      if (!r) return;
      var tool = (r.tool || "").toLowerCase();
      if (tool.indexOf("order") === -1) return;
      if (r.ok) orderOk = true;
    });
    if (!orderOk) return false;
    if (!evidence.hasOrderEta && !evidence.hasOrderMatchHint) return false;
    return true;
  }

  /**
   * Minimum usable evidence for Bedtime: at least one successful primary inspection read.
   */
  function hasBedtimeMinimumEvidence(evidence, results) {
    var list = collectResults(results);
    if (!list.length) return false;
    if (!evidence || evidence.allReadsFailed) return false;
    var primaryOk = false;
    var primarySeen = false;
    list.forEach(function (r) {
      if (!r) return;
      var tool = (r.tool || "").toLowerCase();
      if (tool.indexOf("ring") === -1 && tool.indexOf("order") === -1) return;
      primarySeen = true;
      if (r.ok) primaryOk = true;
    });
    if (!primarySeen) return false;
    return primaryOk;
  }

  function defaultDoorstepPlan(ctx) {
    var facts = ctx.facts || {};
    var evidence = ctx.evidence || {};
    var neighbourUnavailable =
      facts.neighbourAvailable === false ||
      facts.neighbourUnavailable === true ||
      evidence.calendarNeighbourAvailable === false ||
      (facts.unavailable && String(facts.unavailable).toLowerCase().indexOf("neighbour") !== -1) ||
      (facts.unavailable && String(facts.unavailable).toLowerCase().indexOf("thabo") !== -1);

    var observations = ctx.observations.slice();
    var assumptions = [];
    var recipient;
    var action;
    var timing;
    var explanation;
    var sampleRef = ctx.sampleRef !== undefined ? ctx.sampleRef : "GUEST-10421";
    var needsClarification = false;
    var calendarWindow = evidence.calendarProposed || null;

    var doorstepEvidenceOk = hasDoorstepMinimumEvidence(evidence, ctx.results || []);
    if (!doorstepEvidenceOk || evidence.allReadsFailed) {
      needsClarification = true;
      recipient = { name: "household", role: "clarification" };
      action = "ask_clarification";
      timing = {
        windowLabel: calendarWindow || "Awaiting reliable inspection (SAST)",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Inspection tools did not return usable evidence");
      if (!evidence.hasRingMotion && !evidence.hasParcelVisual) {
        assumptions.push("No positive door/parcel observation is available");
        assumptions.push("Visitor identity is not verified from order ETA alone");
      }
      if (evidence.anyFailedRead) {
        assumptions.push("At least one required inspection read failed");
      }
      explanation =
        evidence.hasOrderEta && !evidence.hasRingMotion && !evidence.hasParcelVisual
          ? "Order ETA alone is not enough for a confident visitor claim. I need a successful doorbell/parcel observation plus a reliable order read before proposing an approvable handoff."
          : "Household inspection is missing, negative, unknown, or failed. I need a successful doorbell event plus a successful order read before proposing an approvable handoff.";
      if (!observations.length) {
        observations.push("inspection reads failed, empty, or insufficient — clarification required");
      }
    } else if (evidence.hasMismatch || evidence.hasInsufficient || (!evidence.hasRingMotion && !evidence.hasParcelVisual && evidence.hasOrderEta)) {
      needsClarification = true;
      recipient = { name: "household", role: "clarification" };
      action = "ask_clarification";
      timing = {
        windowLabel: calendarWindow || "Clarify before handoff (SAST)",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Visitor identity is not verified from order ETA alone");
      if (evidence.hasMismatch) {
        assumptions.push("Order evidence is mismatched with the door event");
        explanation =
          "Order evidence does not match the door event. Please confirm whether this parcel is yours before any handoff or unlock narrative.";
      } else {
        explanation =
          "Evidence is insufficient for a confident visitor claim. Please clarify who is at the door before approving a handoff.";
      }
    } else if (neighbourUnavailable) {
      recipient = { name: "Mira", role: "parent" };
      action = "defer_handoff_parent";
      timing = {
        windowLabel: calendarWindow
          ? ("Parent claim window " + calendarWindow)
          : "Parent claim window today 18:20–18:45 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Parent A (Mira) is free after school pickup ~18:20");
      assumptions.push("Parcel can wait briefly on stoop until Mira arrives");
      assumptions.push("Neighbour Thabo is unavailable — not listed as active backup");
      explanation =
        "Neighbour Thabo is unavailable, so the handoff shifts to Mira’s return window instead of a leave-with guest card.";
    } else {
      recipient = { name: "Thabo", role: "neighbour" };
      action = "notify_handoff";
      timing = {
        windowLabel: calendarWindow
          ? ("Neighbour leave-with " + calendarWindow)
          : "Neighbour leave-with 18:00–18:30 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push(
        calendarWindow
          ? ("Using calendar-proposed leave-with window " + calendarWindow)
          : "Neighbour usually available after 19:00 is stale — using leave-with window 18:00–18:30"
      );
      assumptions.push("Thabo is pre-authorised for gate/guest handoff in household context");
      explanation =
        "Ring motion plus an expected AMZL stop suggest a parcel handoff; propose notifying neighbour Thabo while Mira is still at pickup.";
    }

    if (!evidence.canClaimVisitorIdentity && !needsClarification) {
      assumptions.push("Visitor identity is not verified from order ETA alone");
    }

    if (!observations.length && !needsClarification) {
      observations.push("household inspection complete");
    }

    var proposal = {
      planId: nextPlanId(),
      status: "draft",
      recipient: recipient,
      action: action,
      timing: timing,
      observations: observations,
      assumptions: assumptions,
      explanation: explanation,
      sampleRef: sampleRef || undefined,
      identityClaim: evidence.canClaimVisitorIdentity
        ? "correlated_parcel_evidence"
        : "no_confident_visitor_identity"
    };
    if (needsClarification) {
      proposal.needsClarification = true;
    }
    return proposal;
  }

  function defaultBedtimePlan(ctx) {
    var facts = ctx.facts || {};
    var evidence = ctx.evidence || {};
    var caregiverUnavailable =
      facts.caregiverAvailable === false || facts.miraAvailable === false;

    var observations = ctx.observations.slice();
    var assumptions = [];
    var recipient;
    var action;
    var timing;
    var explanation;
    var needsClarification = false;

    if (!hasBedtimeMinimumEvidence(evidence, ctx.results || [])) {
      needsClarification = true;
      recipient = { name: "household", role: "clarification" };
      action = "ask_clarification";
      timing = {
        windowLabel: "Awaiting reliable bedtime inspection (SAST)",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Bedtime inspection tools did not return usable evidence");
      explanation =
        "Bedtime inspection reads are missing or failed. I need at least one successful device/presence read before proposing an approvable caregiver action.";
      if (!observations.length) {
        observations.push("bedtime inspection failed or empty — clarification required");
      }
    } else if (caregiverUnavailable) {
      recipient = { name: "Alexa routine", role: "automation" };
      action = "auto_pause_firetv";
      timing = {
        windowLabel: "Auto-pause Fire TV now; resume bedtime routine at 19:20 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Caregiver cannot check in before lights-out target");
      explanation =
        "Caregiver is unavailable, so the plan switches to auto-pause Fire TV and resume the bedtime routine without a live nudge.";
    } else {
      recipient = { name: "Mira", role: "parent" };
      action = "caregiver_nudge";
      timing = {
        windowLabel: "Caregiver check-in window tonight 19:15–19:30 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Mira is free until 20:00 for a short check-in");
      explanation =
        "Fire TV is past quiet hours and the bedtime routine is waiting on presence confirm — propose a short caregiver nudge before lights-out.";
    }

    if (!observations.length && !needsClarification) {
      observations.push("Fire TV kids profile still streaming past quiet hours");
    }

    var bedtimeProposal = {
      planId: nextPlanId(),
      status: "draft",
      recipient: recipient,
      action: action,
      timing: timing,
      observations: observations,
      assumptions: assumptions,
      explanation: explanation,
      sampleRef: ctx.sampleRef !== undefined ? ctx.sampleRef : "TASK-22018",
      identityClaim: "n/a_bedtime"
    };
    if (needsClarification) {
      bedtimeProposal.needsClarification = true;
    }
    return bedtimeProposal;
  }

  /**
   * Build a Proposal from tool Results and optional facts / story context.
   *
   * @param {object} input
   * @param {string} [input.storyId] doorstep|bedtime
   * @param {object|object[]} [input.results] Result contract objects
   * @param {object} [input.facts] e.g. { neighbourAvailable: false }
   * @param {object} [input.priorProposal] when replanning
   * @param {string|null} [input.sampleRef] optional; doorstep defaults GUEST-10421
   * @param {object} [input.fixture] session fixture clone (optional hints)
   */
  function buildProposal(input) {
    input = input || {};
    var storyId = input.storyId || (input.fixture && input.fixture.id) || "doorstep";
    var results = collectResults(input.results);
    var evidence = evidenceAssessment(results);
    var observations = [];
    results.forEach(function (r) {
      obsFromResult(r).forEach(function (line) {
        if (observations.indexOf(line) === -1) observations.push(line);
      });
    });

    /* Prefer fixture-derived observation captions when results are thin */
    var fixture = input.fixture;
    if (fixture && fixture.primary && fixture.primary.title && observations.length < 2) {
      observations.push(fixture.primary.title);
    }
    if (storyId === "doorstep" && fixture && fixture.secondary && evidence.hasOrderEta) {
      var cap = "AMZL stop nearby / expected delivery window";
      if (observations.indexOf(cap) === -1) observations.push(cap);
    }

    var ctx = {
      facts: input.facts || {},
      observations: observations,
      evidence: evidence,
      results: results,
      sampleRef: input.sampleRef,
      fixture: fixture,
      priorProposal: input.priorProposal || null
    };

    if (input.sampleRef === null) {
      ctx.sampleRef = null;
    } else if (input.sampleRef === undefined && storyId === "doorstep") {
      ctx.sampleRef = "GUEST-10421";
    } else if (input.sampleRef === undefined && storyId === "bedtime") {
      ctx.sampleRef = "TASK-22018";
    }

    var proposal =
      storyId === "bedtime" ? defaultBedtimePlan(ctx) : defaultDoorstepPlan(ctx);

    /* Strip undefined sampleRef */
    if (proposal.sampleRef == null) {
      delete proposal.sampleRef;
    }

    return proposal;
  }

  /**
   * Supersede prior proposal and build a new one under changed facts.
   * Returns { superseded, proposal }.
   */
  function replan(input) {
    input = input || {};
    var prior = input.priorProposal ? Object.assign({}, input.priorProposal) : null;
    if (prior) {
      prior.status = "superseded";
    }
    var nextInput = Object.assign({}, input, {
      priorProposal: prior,
      facts: Object.assign({}, (prior && prior._facts) || {}, input.facts || {})
    });
    var proposal = buildProposal(nextInput);
    proposal.status = "draft";
    if (prior && prior.planId && proposal.planId === prior.planId) {
      proposal.planId = nextPlanId();
    }
    return {
      superseded: prior,
      proposal: proposal
    };
  }

  var OpsPlanner = {
    buildProposal: buildProposal,
    replan: replan,
    canClaimVisitorIdentity: canClaimVisitorIdentity,
    evidenceAssessment: evidenceAssessment,
    nextPlanId: nextPlanId,
    ensureSeqAtLeast: ensureSeqAtLeast,
    noteExistingPlanId: noteExistingPlanId,
    _resetSeq: _resetSeq
  };

  root.OpsPlanner = OpsPlanner;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = OpsPlanner;
  }
})(typeof window !== "undefined" ? window : globalThis);
