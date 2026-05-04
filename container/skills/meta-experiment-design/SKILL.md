---
name: meta-experiment-design
description: Build a domain-agnostic experiment contract from a user goal, optional program.md, and optional hypotheses. Produces program.md, hypotheses.md, task.md, evaluate.md, guardrails.md, and state.md.
---

# Meta Experiment Design

Create a runnable experiment contract for any optimization target. Do not assume a domain. Do not route by ads, onboarding, latency, debugging, or page speed. Express all domain details inside `task.md` and `evaluate.md`.

## Inputs

Accept any of:

- A user goal: "improve onboarding", "reduce latency", "debug this issue", "improve ad ROAS".
- Existing `program.md`.
- Optional user hypotheses.
- Existing evaluator script, query, API, dashboard, benchmark, or manual rubric.

## Output Folder

Create or update:

```text
experiments/active/exp-NNN/
  program.md
  hypotheses.md
  task.md
  evaluate.md
  guardrails.md
  state.md
  logs.md
  results/
```

## Design Procedure

1. Identify the objective.
2. Identify the one primary success metric.
3. Specify metric direction: `increase`, `decrease`, `not_increase`, or `not_decrease`.
4. Capture baseline or define how to collect one.
5. Define target or minimum meaningful effect.
6. Capture optional hypotheses. Generate additional hypotheses only when useful.
7. Define allowed intervention space in `task.md`.
8. Define evaluation procedure in `evaluate.md`.
9. Define guardrails in `guardrails.md`.
10. Define time, spend, traffic, compute, attempt, or sample budget.
11. Define stop criteria: ship, kill, wait, inconclusive, iterate.
12. Require rollback or pause instructions before approval.

Ask the user only for missing information that cannot be inferred safely.

## `program.md` Template

```markdown
# Program

## Objective
[What should improve.]

## Context
[Why this matters and any relevant constraints.]

## Success Metric
- name: [metric]
- direction: [increase|decrease|not_increase|not_decrease]
- baseline: [value or "to be collected by evaluator"]
- target: [value or minimum meaningful effect]
- minimum_meaningful_effect: [effect]

## Budget
- max_duration: [duration]
- max_spend: [amount or none]
- max_attempts: [count]
- max_traffic_or_samples: [count or none]

## Stop Criteria
- ship: [condition]
- kill: [condition]
- wait: [condition]
- inconclusive: [condition]
- iterate: [condition]

## Constraints
- [constraint]
```

## `hypotheses.md` Template

```markdown
# Hypotheses

## User Provided
- [hypothesis or none]

## Agent Generated
- [falsifiable hypothesis]

## Selected Hypothesis
[The hypothesis this experiment will test first.]
```

## `task.md` Template

```markdown
# Task

## Mode
[code_change|external_action|content_change|config_change|analysis_only|manual_step]

## Selected Hypothesis
[Hypothesis being tested.]

## Allowed Changes
- [allowed change]

## Forbidden Changes
- [forbidden change]

## Execution Plan
1. [step]

## Expected Surfaces
- type: [code|url|campaign|config|document|manual]
- location: [path, URL, external ID, or "created during execution"]

## Rollback Or Pause
[Exact command, PR revert, feature flag disable, campaign pause, or manual instruction.]
```

## `evaluate.md` Template

```yaml
evaluation:
  type: script | command | query | browser_flow | api_call | manual_rubric | markdown_procedure
  command: "[command to run, if applicable]"
  procedure: "[steps, if command is not applicable]"
  output_format: normalized_result_json | markdown_then_normalize

analysis:
  method: threshold | proportion_z_test | t_test | regression_check | benchmark_threshold | manual_rubric | custom
  primary_metric: "[metric]"
  direction: increase | decrease | not_increase | not_decrease
  baseline: "[value or collection method]"
  target: "[target]"
  minimum_meaningful_effect: "[effect]"

monitoring:
  mode: once | scheduled | on_deploy | manual
  scheduler: none | cron | github_actions | vercel_cron | cloud_scheduler | pepper_recurring_task
  cadence: "[cron expression, hourly, daily, on_deploy, or manual]"
  max_duration: "[duration]"
  command: "pepper experiment monitor exp-NNN"

cleanup:
  on_terminal_verdict:
    command: "[unschedule command or manual instruction]"
  on_guardrail_breach:
    command: "[pause/rollback command or manual instruction]"
```

## `guardrails.md` Template

```yaml
guardrails:
  - name: "[metric or constraint]"
    direction: not_decrease | not_increase | must_pass
    max_regression: "[threshold]"
    evaluator: "[same evaluator, separate command, or manual check]"
waivers: []
```

## `state.md` Template

```yaml
status: designed
created_at: "[UTC timestamp]"
locked_at: null
surfaces: []
scheduler:
  enabled: false
  type: none
  id: null
latest_result: null
verdict: null
```

## Approval Gate

Before preregistration, show the user:

- Objective
- Selected hypothesis
- Allowed changes
- Evaluation method
- Guardrails
- Budget
- Stop criteria
- Rollback or pause method

Proceed only after explicit approval.
