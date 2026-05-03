---
name: meta-experiment-monitor
description: Monitor any running experiment by executing its declared evaluator, writing normalized results, checking guardrails and stop criteria, and triggering verdict or cleanup. Contains no domain-specific measurement logic.
---

# Meta Experiment Monitor

Monitor experiments by running the evaluator declared in `evaluate.md`. The monitor does not know what domain is being measured.

## When to Use

- A scheduled job calls `pepper experiment monitor exp-NNN`.
- The user asks for current experiment status.
- The runner needs an immediate baseline or post-deploy measurement.
- A recurring task checks all active experiments.

## Procedure

1. Load `program.md`, `evaluate.md`, `guardrails.md`, and `state.md`.
2. Run the evaluator command or follow the declared procedure.
3. Normalize output into result JSON.
4. Save to `results/YYYY-MM-DDTHH-MM-SSZ.json`.
5. Update `state.md.latest_result`.
6. Check guardrails.
7. Check budget and stop criteria.
8. Emit one monitor status: `on_track`, `ready_to_evaluate`, `guardrail_breach`, `budget_exhausted`, `blocked`, or `needs_manual_input`.
9. If terminal or unsafe, run cleanup command declared in `evaluate.md`.
10. Append a concise entry to `logs.md`.

## Evaluator Types

Supported evaluator declarations:

- `script`
- `command`
- `query`
- `browser_flow`
- `api_call`
- `manual_rubric`
- `markdown_procedure`

For anything that cannot produce JSON directly, summarize the result and normalize it before writing to `results/`.

## Normalized Result

```json
{
  "timestamp": "2026-05-03T10:00:00Z",
  "metric": "primary_metric_name",
  "direction": "increase",
  "control": { "value": 0.12, "n": 500 },
  "variant": { "value": 0.15, "n": 510 },
  "effect": 0.25,
  "confidence": 0.93,
  "guardrails": [
    {
      "name": "error_rate",
      "status": "pass",
      "value": 0.01,
      "threshold": 0.02
    }
  ],
  "raw": {}
}
```

## Status Rules

- `guardrail_breach`: any guardrail exceeds its threshold or required check fails.
- `ready_to_evaluate`: target appears met, variant appears worse, planned sample is reached, or max duration/budget is reached.
- `budget_exhausted`: budget is reached without enough evidence.
- `on_track`: experiment is still within budget and no terminal condition is met.
- `blocked`: evaluator failed, credentials are missing, output cannot be normalized, or required surfaces are not live.
- `needs_manual_input`: evaluator or task requires a human step before more monitoring can continue.

## Cleanup

On guardrail breach, immediately run `cleanup.on_guardrail_breach.command` from `evaluate.md` if present.

On terminal verdict or explicit stop, run `cleanup.on_terminal_verdict.command` to remove scheduled monitoring.

If cleanup is manual, report the exact manual instruction and mark the state accordingly.

## All Active Experiments

When checking all active experiments:

1. List `experiments/active/*/`.
2. Skip archived, stopped, or terminal-verdict experiments.
3. Run this monitor procedure for each active experiment.
4. Write a summary to a central alert file if the workspace uses one.
