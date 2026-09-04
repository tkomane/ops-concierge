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

  /**
   * Evidence strength for visitor identity.
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

    list.forEach(function (r) {
      if (!r) return;
      var tool = (r.tool || "").toLowerCase();
      var obs = r.observations || {};
      var blob =
        JSON.stringify(obs).toLowerCase() +
        " " +
        String(r.meta || "").toLowerCase() +
        " " +
        JSON.stringify(r.outcome || {}).toLowerCase();

      if (tool.indexOf("ring") !== -1 || blob.indexOf("ring") !== -1) {
        if (
          blob.indexOf("motion") !== -1 ||
          blob.indexOf("person") !== -1 ||
          blob.indexOf("parcel") !== -1 ||
          blob.indexOf("package") !== -1 ||
          blob.indexOf("cardboard") !== -1
        ) {
          hasRingMotion = true;
        }
        if (blob.indexOf("parcel") !== -1 || blob.indexOf("package") !== -1 || blob.indexOf("box") !== -1) {
          hasParcelVisual = true;
        }
      }
      if (tool.indexOf("order") !== -1 || blob.indexOf("eta") !== -1 || blob.indexOf("amzl") !== -1) {
        hasOrderEta = true;
        if (blob.indexOf("match") !== -1 || blob.indexOf("silhouette") !== -1) {
          hasOrderMatchHint = true;
        }
      }
      if (
        blob.indexOf("mismatch") !== -1 ||
        blob.indexOf("does not match") !== -1 ||
        obs.matched === false ||
        (r.outcome && r.outcome.matched === false)
      ) {
        hasMismatch = true;
      }
      if (
        blob.indexOf("insufficient") !== -1 ||
        obs.insufficient === true ||
        (r.outcome && r.outcome.insufficient === true)
      ) {
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
      canClaimVisitorIdentity: identityClaimOk
    };
  }

  function canClaimVisitorIdentity(results) {
    return evidenceAssessment(results).canClaimVisitorIdentity;
  }

  function defaultDoorstepPlan(ctx) {
    var facts = ctx.facts || {};
    var neighbourUnavailable =
      facts.neighbourAvailable === false ||
      facts.neighbourUnavailable === true ||
      (facts.unavailable && String(facts.unavailable).toLowerCase().indexOf("neighbour") !== -1) ||
      (facts.unavailable && String(facts.unavailable).toLowerCase().indexOf("thabo") !== -1);

    var evidence = ctx.evidence || {};
    var observations = ctx.observations.slice();
    var assumptions = [];
    var recipient;
    var action;
    var timing;
    var explanation;
    var sampleRef = ctx.sampleRef !== undefined ? ctx.sampleRef : "GUEST-10421";

    if (neighbourUnavailable) {
      recipient = { name: "Mira", role: "parent" };
      action = "defer_handoff_parent";
      timing = {
        windowLabel: "Parent claim window today 18:20–18:45 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Parent A (Mira) is free after school pickup ~18:20");
      assumptions.push("Parcel can wait briefly on stoop until Mira arrives");
      explanation =
        "Neighbour Thabo is unavailable, so the handoff shifts to Mira’s return window instead of a leave-with guest card.";
    } else {
      recipient = { name: "Thabo", role: "neighbour" };
      action = "notify_handoff";
      timing = {
        windowLabel: "Neighbour leave-with 18:00–18:30 SAST",
        timezone: "Africa/Johannesburg"
      };
      assumptions.push("Neighbour usually available after 19:00 is stale — using leave-with window 18:00–18:30");
      assumptions.push("Thabo is pre-authorised for gate/guest handoff in household context");
      explanation =
        "Ring motion plus an expected AMZL stop suggest a parcel handoff; propose notifying neighbour Thabo while Mira is still at pickup.";
    }

    if (!evidence.canClaimVisitorIdentity) {
      assumptions.push("Visitor identity is not verified from order ETA alone");
      if (evidence.hasMismatch || evidence.hasInsufficient) {
        explanation =
          "Evidence is insufficient or mismatched for a confident visitor claim — proposal stays cautious and asks for clarification before any unlock narrative.";
      } else if (evidence.hasOrderEta && !evidence.hasRingMotion) {
        explanation =
          "An expected delivery window is not enough to identify who is at the door. Waiting on doorbell evidence before treating this as a verified handoff.";
      }
    }

    if (!observations.length) {
      observations.push("simulated household inspection complete");
    }

    return {
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
  }

  function defaultBedtimePlan(ctx) {
    var facts = ctx.facts || {};
    var caregiverUnavailable =
      facts.caregiverAvailable === false || facts.miraAvailable === false;

    var observations = ctx.observations.slice();
    var assumptions = [];
    var recipient;
    var action;
    var timing;
    var explanation;

    if (caregiverUnavailable) {
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

    if (!observations.length) {
      observations.push("Fire TV kids profile still streaming past quiet hours");
    }

    return {
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
    _resetSeq: _resetSeq
  };

  root.OpsPlanner = OpsPlanner;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = OpsPlanner;
  }
})(typeof window !== "undefined" ? window : globalThis);
