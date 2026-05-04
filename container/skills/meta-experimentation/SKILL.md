---
name: meta-experimentation
description: End-to-end domain-agnostic experimentation playbook. Use when a user wants to optimize any metric through long-running experiments using program.md, task.md, evaluate.md, guardrails, normalized results, monitoring, verdicts, and archival.
---

# Meta Experimentation

## DEMO_MODE

Before fetching any data from external platforms (Composio, ads APIs, analytics), run:

```bash
echo $DEMO_MODE
```

If the output is `true`, use fixture data instead of live API calls:

| Platform | Fixture path |
|----------|-------------|
| Meta Ads | `/app/fixtures/meta_ads.json` |

Before reading the fixture, print this exact line so the operator can confirm the data source:

```
[DATA SOURCE] DEMO_MODE=true — loading Meta Ads data from /app/fixtures/meta_ads.json (synthetic, not live)
```

Read the fixture with `cat /app/fixtures/meta_ads.json` and treat its contents as the live response. Skip Composio calls for that platform. Fixture data already has `_signal` annotations on each campaign — reference these when forming hypotheses.

If `DEMO_MODE` is unset or not `true`, print:

```
[DATA SOURCE] DEMO_MODE=false — fetching Meta Ads data live via Composio
```

---

Run experiments for any use case without hardcoding the domain. This skill orchestrates the full loop:

`intake -> design -> preregister -> run -> monitor -> evaluate -> archive`

The core rule: the experiment system does not know about ads, onboarding, latency, page speed, debugging, pricing, or any other domain. It only knows objective, allowed task, evaluator, guardrails, budget, stop criteria, results, and decision.

## When to Use

- The user wants to optimize anything over time.
- The user provides `program.md`, or asks the agent to create one.
- The user has optional hypotheses and wants the agent to test them.
- The experiment requires repeated measurement, scheduled monitoring, or kill/ship decisions.
- The system must keep a durable record of what was changed, how it was measured, and what was learned.

## Experiment Folder

Every experiment lives in its own folder:

```text
experiments/
  active/
    exp-NNN/
      program.md
      hypotheses.md
      task.md
      evaluate.md
      guardrails.md
      state.md
      locked.md
      logs.md
      results/
        YYYY-MM-DDTHH-MM-SSZ.json
  archive/
    exp-NNN/
      archive.md
      program.md
      hypotheses.md
      task.md
      evaluate.md
      guardrails.md
      state.md
      logs.md
      results/
```

## Canonical Contracts

### `program.md`

What to optimize and why.

Required fields:

- Objective
- Success metric
- Metric direction: `increase`, `decrease`, `not_increase`, or `not_decrease`
- Baseline value or baseline collection method
- Target or minimum meaningful effect
- Budget: time, spend, traffic, compute, attempts, or another bounded resource
- Stop criteria
- Constraints

### `hypotheses.md`

Optional user-provided and agent-generated hypotheses. Hypotheses must be falsifiable and tied to the success metric.

### `task.md`

What the agent may change or operate on.

Valid execution modes:

- `code_change`
- `external_action`
- `content_change`
- `config_change`
- `analysis_only`
- `manual_step`

Required fields:

- Mode
- Allowed changes
- Forbidden changes
- Execution plan
- Expected surfaces
- Rollback or pause method

### `evaluate.md`

How success is measured. This can point to a script, CLI command, query, browser flow, API call, manual rubric, or markdown procedure.

Required fields:

- Evaluation type
- Command or procedure
- Output format
- Primary metric
- Analysis method
- Monitoring mode
- Monitoring cadence if scheduled
- Maximum duration or budget

Evaluators must emit normalized result JSON when possible.

### `guardrails.md`

What must not regress. Guardrails can be metrics, budgets, compliance constraints, UX constraints, correctness constraints, or manual checks.

### `state.md`

Mutable runtime state. Records status, surfaces, scheduler details, latest result, and terminal verdict.

## Normalized Result

Every evaluator should produce this shape or an equivalent markdown result that can be normalized:

```json
{
  "timestamp": "2026-05-03T10:00:00Z",
  "metric": "primary_metric_name",
  "direction": "increase",
  "control": { "value": 0.12, "n": 500 },
  "variant": { "value": 0.15, "n": 510 },
  "effect": 0.25,
  "confidence": 0.93,
  "guardrails": [],
  "raw": {}
}
```

Use `null` for fields that do not apply.

## Workflow

### 1. Intake

Ask for, read, or create `program.md`.

If the user only provides a goal, create the full contract using `meta-experiment-design`.

### 2. Design

Call `meta-experiment-design` to create:

- `program.md`
- `hypotheses.md`
- `task.md`
- `evaluate.md`
- `guardrails.md`
- initial `state.md`

Stop for user approval before preregistration.

### 3. Preregister

Before running the experiment, validate that required files exist and hash the contract into `locked.md`.

Do not change objective, success metric, evaluator, guardrails, or stop criteria after locking unless an amendment is explicitly recorded.

### 4. Run

Call `meta-experiment-runner`.

The runner reads `task.md`, performs allowed work, records surfaces in `state.md`, and sets up scheduled monitoring if `evaluate.md` requests it.

### 5. Monitor

Call `meta-experiment-monitor`.

Monitoring always runs the declared evaluator. It never contains domain logic. If scheduled, the scheduler calls a generic command such as:

```bash
pepper experiment monitor exp-NNN
```

### 6. Evaluate

Call `meta-experiment-evaluate`.

The evaluator reads normalized results and emits one verdict:

- `SHIP`
- `KILL`
- `WAIT`
- `INCONCLUSIVE`
- `ITERATE`
- `STOPPED`

### 7. Archive

Call `meta-experiment-archive`.

Archive the full folder, record the decision, and distill a reusable learning.

## Scheduler Contract

Scheduled monitoring is declared in `evaluate.md`, not hardcoded in the monitor:

```yaml
monitoring:
  mode: scheduled
  scheduler: cron
  cadence: hourly
  command: "pepper experiment monitor exp-NNN"
  max_duration: 72h
cleanup:
  on_terminal_verdict:
    command: "pepper experiment unschedule exp-NNN"
  on_guardrail_breach:
    command: "node experiments/active/exp-NNN/pause.js"
```

The runner registers the scheduler, writes its ID to `state.md`, and the monitor removes it after a terminal verdict.

## Domain Adapters

Domain adapters are examples only. They may help write `task.md` and `evaluate.md`, but core skills must not branch on domain names.

Use `meta-experiment-adapters` only as translation guidance.
