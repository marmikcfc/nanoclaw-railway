---
name: delegate
description: Delegate a task to another agent in your workspace. Use when you need a teammate with different expertise to handle part of the work — e.g. dev agent delegating QA review, security audit, or content writing.
---

## When to use

- You've completed a phase of work that requires a different skill set (testing, security review, writing, design)
- You want to hand off a well-defined task to a specialist agent
- You need work done in parallel by another agent while you continue on something else

## When NOT to use

- When you can complete the task yourself
- When no other agents are in your workspace (check with `delegate list` first)

## Commands

### See available teammates
```bash
delegate list
```
Returns each agent's name, role, and current status.

### Delegate a task
```bash
delegate task \
  --to "<agent-id>" \
  --title "QA Review: checkout flow" \
  --description "Run through the checkout flow and verify all edge cases pass" \
  --summary "I built and unit-tested the checkout flow. PR is at branch feat/checkout. Known edge case: empty cart redirect needs manual test."
```

The receiving agent will be notified immediately and will start working. You'll see a confirmation in your chat.

## Notes

- If the target agent is paused, the system will unpause them automatically
- You do not need to wait for results — delegation is fire-and-forget
- Always check `delegate list` first to confirm the agent ID before delegating
