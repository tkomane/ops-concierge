/**
 * Ops Concierge — deterministic intent classifier (Worker A).
 * Separates ask_info / decline / approve / replan_facts / ambiguous
 * without broad "guest code" / "make the" substring collisions.
 * Attaches window.OpsIntent.
 */
(function (root) {
  "use strict";

  var INTENTS = Object.freeze([
    "inspect",
    "ask_info",
    "decline",
    "approve",
    "replan_facts",
    "switch_story",
    "reset",
    "ambiguous"
  ]);

  function normalize(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripEdgePunct(s) {
    return s.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
  }

  function isQuestion(q) {
    if (q.indexOf("?") !== -1) return true;
    return /^(what|what's|whats|who|who's|how|why|when|where|which|explain|tell me)\b/.test(q);
  }

  function isDecline(q) {
    var exact = stripEdgePunct(q);
    if (
      exact === "not yet" ||
      exact === "no" ||
      exact === "nope" ||
      exact === "nah" ||
      exact === "cancel" ||
      exact === "stop" ||
      exact === "don't" ||
      exact === "dont"
    ) {
      return true;
    }

    if (
      /^(not yet|no thanks|no thank you|don't|dont|do not)\b/.test(q) ||
      /\b(not yet|no thanks|keep planning|copy nothing)\b/.test(q)
    ) {
      return true;
    }

    if (
      /\b(don't|dont|do not|never|stop)\b/.test(q) &&
      /\b(make|create|open|send|approve|confirm|issue)\b/.test(q)
    ) {
      return true;
    }

    if (
      /\b(don't|dont|do not)\b/.test(q) &&
      /\b(guest code|bedtime task|handoff|notification)\b/.test(q)
    ) {
      return true;
    }

    if (/\b(refuse|decline|reject)\b/.test(q)) return true;

    return false;
  }

  function isAskInfo(q) {
    var aboutArtefact =
      /\b(guest code|guest codes|bedtime task|sample ref|GUEST-\d+)\b/i.test(q) ||
      /\bwhat\b.*\b(guest code|bedtime task|handoff|proposal|plan)\b/.test(q);

    if (isQuestion(q) && aboutArtefact) return true;
    if (/^(what|explain|tell me)\b/.test(q) && aboutArtefact) return true;
    if (/\bwhat (is|are|does|do)\b/.test(q) && aboutArtefact) return true;
    if (/\b(explain|tell me about)\b/.test(q) && aboutArtefact) return true;

    return false;
  }

  function isApprove(q) {
    var exact = stripEdgePunct(q);

    var approveExact = [
      "make the guest code",
      "make guest code",
      "make the bedtime task",
      "make the task",
      "make bedtime task",
      "approve",
      "approve it",
      "approve the plan",
      "approve the proposal",
      "yes",
      "yes please",
      "yes, make it",
      "yes make it",
      "go ahead",
      "do it",
      "confirm",
      "confirm it",
      "create the guest code",
      "create guest code",
      "open the guest code",
      "send it",
      "looks good",
      "lgtm"
    ];
    if (approveExact.indexOf(exact) !== -1) return true;

    if (
      /^(please\s+)?(make|create|open|issue)\s+(the\s+)?(guest\s+code|bedtime\s+task|task)\b/.test(q)
    ) {
      return true;
    }
    if (/^(please\s+)?(approve|confirm)\b/.test(q)) return true;
    if (/^yes[,.]?\s+(make|create|approve|confirm|do|go)\b/.test(q)) return true;
    if (/^go ahead\b/.test(q) || /^do it\b/.test(q)) return true;

    return false;
  }

  function exactPhrase(q, phrase) {
    return stripEdgePunct(q) === phrase || q.indexOf(phrase) !== -1;
  }

  function isReplanFacts(q) {
    if (
      /\b(neighbour|neighbor|thabo)\b/.test(q) &&
      /\b(unavailable|can't|cannot|can not|not available|busy|away|out|won't be|will not be)\b/.test(q)
    ) {
      return true;
    }
    if (/\b(neighbour|neighbor|thabo)\b/.test(q) && /\b(is|are)\s+not\b/.test(q)) {
      return true;
    }
    if (
      /\b(mira|parent|caregiver)\b/.test(q) &&
      /\b(unavailable|can't|cannot|busy|away)\b/.test(q)
    ) {
      return true;
    }
    if (/\bunavailable\b/.test(q) && /\b(neighbour|neighbor|thabo|backup)\b/.test(q)) {
      return true;
    }
    if (
      exactPhrase(q, "use the backup plan instead") ||
      exactPhrase(q, "use the backup plan") ||
      exactPhrase(q, "backup plan instead") ||
      /\b(use|switch to|try)\b.*\b(backup|alternate|alternative)\b/.test(q)
    ) {
      return true;
    }
    if (/\bchanged (my )?mind\b/.test(q) && /\b(recipient|neighbour|neighbor|plan)\b/.test(q)) {
      return true;
    }
    if (/\breplan\b/.test(q) || /\bnew plan\b/.test(q) || /\bdifferent plan\b/.test(q)) {
      return true;
    }
    return false;
  }

  function isSwitchStory(q) {
    if (/\btry the other (story|demo)\b/.test(q) || /\bother (story|demo)\b/.test(q)) return true;
    if (exactPhrase(q, "switch story") || exactPhrase(q, "switch stories")) return true;
    if (/^start bedtime\b/.test(q) || exactPhrase(q, "bedtime story")) return true;
    if (/^start doorstep\b/.test(q) || exactPhrase(q, "doorstep story")) return true;
    if (/\bswitch to (bedtime|doorstep)\b/.test(q)) return true;
    return false;
  }

  function isReset(q) {
    var exact = stripEdgePunct(q);
    if (exact === "reset" || exact === "start over" || exact === "clear" || exact === "fresh start") {
      return true;
    }
    if (/\b(reset|start over|clear (demo|session|state)|fresh (run|start))\b/.test(q)) return true;
    return false;
  }

  function isInspect(q) {
    if (
      /\b(someone('?s| is)? at the door|doorbell|package|parcel|delivery)\b/.test(q)
    ) {
      return true;
    }
    if (/\b(inspect|check (what('?s| is)|the (door|package|order)))\b/.test(q)) return true;
    return false;
  }

  function classify(utterance, context) {
    context = context || {};
    var original = String(utterance || "");
    var q = normalize(original);

    if (!q) {
      return { intent: "ambiguous", utterance: original, normalized: q, reason: "empty" };
    }

    /* Order: decline + ask_info before approve (guest-code substring trap). */
    if (isDecline(q)) {
      return { intent: "decline", utterance: original, normalized: q, reason: "negation_or_deferral" };
    }
    if (isAskInfo(q)) {
      return { intent: "ask_info", utterance: original, normalized: q, reason: "information_request" };
    }
    if (isApprove(q)) {
      return { intent: "approve", utterance: original, normalized: q, reason: "explicit_positive" };
    }
    if (isReplanFacts(q)) {
      return { intent: "replan_facts", utterance: original, normalized: q, reason: "changed_facts" };
    }
    if (isReset(q)) {
      return { intent: "reset", utterance: original, normalized: q, reason: "reset_request" };
    }
    if (isSwitchStory(q)) {
      return {
        intent: "switch_story",
        utterance: original,
        normalized: q,
        reason: "story_switch",
        target: /\bbedtime\b/.test(q) ? "bedtime" : /\bdoorstep\b/.test(q) ? "doorstep" : "other"
      };
    }
    if (isInspect(q)) {
      return { intent: "inspect", utterance: original, normalized: q, reason: "inspect_or_start" };
    }

    return { intent: "ambiguous", utterance: original, normalized: q, reason: "unmatched" };
  }

  var OpsIntent = {
    INTENTS: INTENTS,
    classify: classify,
    normalize: normalize
  };

  root.OpsIntent = OpsIntent;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = OpsIntent;
  }
})(typeof window !== "undefined" ? window : globalThis);
