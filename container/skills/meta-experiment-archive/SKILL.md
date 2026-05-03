---
name: meta-experiment-archive
description: Archive a completed, stopped, killed, shipped, inconclusive, or iterated domain-agnostic experiment. Moves the full folder, preserves results, and distills reusable learning.
---

# Meta Experiment Archive

Archive the full experiment folder and record what was learned. This skill is domain-agnostic.

## When to Use

- A terminal verdict exists in `state.md`.
- A user explicitly stops an experiment.
- Guardrails were breached and the experiment was paused.
- The experiment is abandoned or superseded.

## Procedure

1. Read `program.md`, `hypotheses.md`, `task.md`, `evaluate.md`, `guardrails.md`, `state.md`, `logs.md`, and `results/`.
2. Confirm the final verdict.
3. Confirm scheduled monitoring has been removed or mark cleanup as manual.
4. Create `archive.md`.
5. Move or copy the full folder from `experiments/active/exp-NNN/` to `experiments/archive/exp-NNN/`.
6. Append a reusable learning to the workspace learning log if one exists.

## `archive.md` Template

```markdown
# exp-NNN Archive

## Verdict
[SHIP | KILL | INCONCLUSIVE | ITERATE | STOPPED]

## Objective
[Objective from program.md]

## Selected Hypothesis
[Hypothesis tested]

## Task Summary
[What changed or what was tested]

## Evaluation Summary
- metric: [metric]
- direction: [direction]
- baseline: [baseline]
- observed: [observed]
- effect: [effect]
- confidence: [confidence or not applicable]

## Guardrails
[Pass/fail summary]

## Decision
[What happens next]

## Learning
[Generalizable principle, not just an observation]

## Next Hypothesis
[Follow-up experiment if useful]
```

## Learning Quality Bar

A good learning should be reusable:

- Bad: "Variant B won."
- Good: "For this ICP, problem-framed onboarding copy produced higher completion than aspiration-framed copy under the same flow."

## Cleanup

If active surfaces remain live after a `KILL`, `STOPPED`, or guardrail breach, run or report the rollback/pause instruction from `task.md` or `evaluate.md`.
