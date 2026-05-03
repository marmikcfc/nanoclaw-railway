---
name: meta-experiment-preregister
description: Lock a domain-agnostic experiment contract before execution. Validates program.md, task.md, evaluate.md, guardrails.md, and state.md, then writes locked.md with file hashes and amendment rules.
---

# Meta Experiment Preregister

Lock the experiment contract before execution. This prevents changing the objective, success metric, evaluator, guardrails, or stop criteria after results are known.

## When to Use

- After the user approves the designed experiment.
- Before running mutations, spending budget, sending traffic, or collecting treatment results.
- Before setting up scheduled monitoring.

## Required Files

```text
experiments/active/exp-NNN/
  program.md
  hypotheses.md
  task.md
  evaluate.md
  guardrails.md
  state.md
```

## Validation Checklist

Do not lock until all are true:

- `program.md` exists.
- `task.md` exists.
- `evaluate.md` exists.
- `guardrails.md` exists, or guardrails are explicitly waived with a reason.
- Objective is clear.
- Primary metric has a direction.
- Baseline exists or baseline collection method exists.
- Target or minimum meaningful effect exists.
- Budget exists.
- Stop criteria exist.
- Allowed and forbidden changes are defined.
- Rollback or pause method exists.
- Evaluator command or procedure exists.
- Monitoring mode is defined.
- Scheduled monitoring, if requested, has cleanup instructions.

## Lock Procedure

1. Read all contract files.
2. Compute a hash for each file.
3. Write `locked.md`.
4. Update `state.md.status` to `locked`.
5. Append a lock entry to `logs.md`.

## `locked.md` Template

```markdown
# Locked Experiment Contract

Experiment: exp-NNN
Locked: [UTC timestamp]
Status: locked

## File Hashes

| File | SHA256 |
|------|--------|
| program.md | [hash] |
| hypotheses.md | [hash] |
| task.md | [hash] |
| evaluate.md | [hash] |
| guardrails.md | [hash] |
| state.md | [hash at lock time] |

## Approval

Approved by: [user or owner]
Approval note: [short note]

## Amendment Rule

After this lock, changes to objective, selected hypothesis, success metric, evaluator, guardrails, budget, or stop criteria require an amendment in `amendments.md`.

Each amendment must include:

- timestamp
- changed file
- previous value
- new value
- reason
- whether prior results remain valid
```

## Amendment Handling

Allowed without amendment:

- Runtime state updates in `state.md`.
- New result files in `results/`.
- Execution logs in `logs.md`.
- Surface IDs written after execution.

Requires amendment:

- Metric definition changes.
- Target or MDE changes.
- Evaluator changes.
- Guardrail changes.
- Budget changes.
- Stop criteria changes.
- Selected hypothesis changes.

## Handoff

After locking, use `meta-experiment-runner`.
