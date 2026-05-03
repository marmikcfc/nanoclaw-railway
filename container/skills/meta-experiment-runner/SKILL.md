---
name: meta-experiment-runner
description: Execute a domain-agnostic experiment by reading task.md and evaluate.md. Performs only allowed mutations, records surfaces in state.md, and registers scheduled monitoring when requested.
---

# Meta Experiment Runner

Execute the experiment described by `task.md`. This skill never branches by domain. It executes the declared task mode and records what changed.

## Prerequisites

- `experiments/active/exp-NNN/program.md`
- `experiments/active/exp-NNN/task.md`
- `experiments/active/exp-NNN/evaluate.md`
- `experiments/active/exp-NNN/guardrails.md`
- `experiments/active/exp-NNN/locked.md`
- User approval for any external spend, deploy, or irreversible mutation.

## Execution Modes

### `code_change`

Modify code within the scope allowed by `task.md`. Run relevant tests. Create a PR or preview if the repository workflow supports it. Record PR, branch, commit, preview URL, and rollback command in `state.md`.

### `external_action`

Use declared external tools or APIs only if credentials and permissions are present. Record external IDs, URLs, spend caps, pause commands, and owner approval in `state.md`.

### `content_change`

Create or update content, copy, images, documents, landing pages, posts, emails, or other assets. Record file paths, published URLs, and rollback instructions.

### `config_change`

Change feature flags, settings, infrastructure config, routing, prompts, or other configuration. Record previous value, new value, and exact restore command.

### `analysis_only`

Run diagnostic checks or implement no mutation. Record observations and result artifacts.

### `manual_step`

Prepare instructions for a human-controlled step. Mark the surface as `pending_manual` until the user confirms completion.

## Procedure

1. Read `task.md`, `evaluate.md`, and `guardrails.md`.
2. Confirm `locked.md` exists.
3. Verify the requested mutation is allowed and rollback/pause exists.
4. Execute the task.
5. Record surfaces in `state.md`.
6. If `evaluate.md` declares scheduled monitoring, register the scheduler.
7. Run the evaluator once if `monitoring.mode` is `once`, `on_deploy`, or an immediate baseline check is needed.
8. Update `logs.md`.

## Surface Record

All surfaces must be recorded generically:

```yaml
surfaces:
  - id: "[stable id]"
    type: code_change | external_action | content_change | config_change | analysis_only | manual_step
    location: "[path, URL, PR, deployment, external object ID, or manual record]"
    status: staged | live | paused | failed | pending_manual
    created_at: "[UTC timestamp]"
    rollback: "[command or instruction]"
```

## Scheduler Setup

If `evaluate.md` includes:

```yaml
monitoring:
  mode: scheduled
  scheduler: cron
  cadence: hourly
  command: "pepper experiment monitor exp-NNN"
```

Register that schedule using the available scheduler. The scheduled job must call only the generic monitor entrypoint. It must not contain domain logic.

Record:

```yaml
scheduler:
  enabled: true
  type: cron
  id: "[scheduler id or cron label]"
  command: "pepper experiment monitor exp-NNN"
  cadence: hourly
```

If the requested scheduler is unavailable, write a `manual_step` surface with exact setup instructions and tell the user monitoring is not active yet.

## Safety Rules

- Do not run unbounded spend or traffic changes.
- Do not deploy to production without explicit approval if the local workflow requires it.
- Do not mutate outside `Allowed Changes`.
- Stop and ask when rollback is missing.
- Preserve user changes in the worktree.
