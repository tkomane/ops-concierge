# Shared contracts — 003 Adaptive Household Flow

Workers must not invent alternate shapes. Lead owns changes to this file.

## Result

```json
{
  "ok": true,
  "source": "mock|bridge|mcp",
  "operationId": "op_<stable>",
  "tool": "ring.query",
  "observations": { },
  "outcome": { },
  "error": null,
  "meta": "human timeline caption"
}
```

On failure: `ok: false`, `error: { code, message }`, no success outcome.

## Proposal

```json
{
  "planId": "plan_<n>",
  "status": "draft|queued|confirmed|superseded|refused",
  "recipient": { "name": "Thabo", "role": "neighbour" },
  "action": "notify_handoff",
  "timing": { "windowLabel": "...", "timezone": "Africa/Johannesburg" },
  "observations": ["ring motion at front door", "AMZL stop nearby"],
  "assumptions": ["neighbour usually available after 19:00"],
  "explanation": "short why",
  "sampleRef": "GUEST-10421"
}
```

`sampleRef` is documentation continuity only — never presented as an unlock credential.

## Intent

`inspect` | `ask_info` | `decline` | `approve` | `replan_facts` | `switch_story` | `reset` | `ambiguous`

Routing must not treat substrings of `guest code` as approve when negation/question markers present.

## Session phases

`idle` → `inspecting` → `proposed` → (`superseded` → `proposed`)* → `approved` → `acted`  
also: `refused` (terminal for that plan), `failed` (action error, recoverable)

## Resume blob (`ops-demo-v1`)

`{ "v": 1, "sessions": { "doorstep": {...}, "bedtime": {...} }, "active": "doorstep|bedtime|null" }`
