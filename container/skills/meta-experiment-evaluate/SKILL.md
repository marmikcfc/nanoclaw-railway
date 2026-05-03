---
name: meta-experiment-evaluate
description: Evaluate any experiment from normalized result files. Applies declared analysis and stop criteria, emits SHIP/KILL/WAIT/INCONCLUSIVE/ITERATE/STOPPED, and updates state.md.
---

# Meta Experiment Evaluate

Emit a verdict from normalized result files. This skill does not fetch live data. Live data collection belongs in `evaluate.md` and `meta-experiment-monitor`.

## Inputs

- `program.md`
- `evaluate.md`
- `guardrails.md`
- `state.md`
- `results/*.json`

## Procedure

1. Load the experiment contract.
2. Load the latest result and any historical results needed by the declared analysis.
3. Check guardrail statuses.
4. Apply the declared analysis method.
5. Compare the result with target, minimum meaningful effect, and budget.
6. Emit a verdict.
7. Write verdict details to `state.md` and `logs.md`.

## Analysis Methods

Use the method declared in `evaluate.md`:

- `threshold`: compare value to target.
- `proportion_z_test`: compare two proportions.
- `t_test`: compare continuous samples.
- `regression_check`: check whether a metric moved beyond an allowed threshold.
- `benchmark_threshold`: compare benchmark output against target.
- `manual_rubric`: evaluate against a rubric and record rationale.
- `custom`: follow the custom procedure in `evaluate.md`.

If the result lacks enough data for the declared method, return `WAIT` if budget remains, otherwise `INCONCLUSIVE`.

## Verdicts

```text
SHIP          Target or MDE met, guardrails clean, and decision rule passes.
KILL          Variant is worse, guardrail breached, or explicit kill criterion is met.
WAIT          Evidence is insufficient and budget remains.
INCONCLUSIVE  Budget is exhausted and no meaningful effect is shown.
ITERATE       Partial signal suggests a sharper next hypothesis, but current variant should not ship as-is.
STOPPED       Manual stop, cleanup stop, or safety stop.
```

## Evaluation Record

Append a concise record to `logs.md` and update `state.md`:

```yaml
verdict:
  status: SHIP | KILL | WAIT | INCONCLUSIVE | ITERATE | STOPPED
  decided_at: "[UTC timestamp]"
  reason: "[one sentence]"
  latest_result: "results/YYYY-MM-DDTHH-MM-SSZ.json"
  next_action: "[ship, pause, continue, archive, create follow-up]"
```

## Handoff

- `SHIP`, `KILL`, `INCONCLUSIVE`, `ITERATE`, and `STOPPED` are terminal for the current experiment unless the user explicitly extends or amends it.
- After a terminal verdict, run cleanup from `evaluate.md` and then use `meta-experiment-archive`.
- `WAIT` returns to monitoring.
