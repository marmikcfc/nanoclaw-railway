---
name: propose-setup-plan
description: Propose a structured setup plan for a closed-loop workflow (experimentation, software factory, idea validation, GTM). Use when the customer expresses a setup intent — "I want to run X" or "Set up Y". Produces JSON the chat UI renders as a reviewable card with one-click create.
---

## When to use

- Customer asks to set up a recurring workflow.
- Common setup intents: closed-loop experimentation, software factory, idea validation, GTM engineering, newsletter, content factory, customer success watcher.
- "Help me build X" / "I want to run Y" / "Set up Z to improve W."

## When NOT to use

- Single ad-hoc tasks the customer can create directly.
- Questions about existing setups (use `workspace-memory` instead).
- Casual chat — answer conversationally.

## Inputs you should gather BEFORE proposing

- The customer's actual goal (signup conversion? feature velocity? hypothesis validation?).
- Existing workspace state — call `workspace-memory context` to learn which employees and integrations already exist.
- For experimentation intents: query the customer's analytics integration (PostHog if connected) for funnel data and drop-off points so the proposal cites real signals.

If you don't have enough context, ask ONE clarifying question first. Don't guess.

## Output

You MUST emit a single fenced code block tagged `proposal`. The chat UI looks
for the literal opener ` ```proposal ` and parses the body as JSON.

Schema (validated by Zod on the server — invalid proposals are rejected):

```
{
  "intent": string,                          // human-readable echo of what we're proposing
  "reasoning": string,                       // one paragraph: why this plan, citing evidence

  "employees": [                             // new employees to hire (empty if reusing existing)
    {
      "ref": string,                         // local handle within proposal (e.g. "marketer")
      "name": string,
      "role": string,
      "model": string,                       // default "anthropic/claude-sonnet-4.6"
      "channel": "telegram"|"slack"|"whatsapp"|"webchat"|"gmail",
      "skills": string[],                    // skill IDs from the catalog
      "playbooks": string[],                 // playbook IDs (composite skills)
      "persona": {
        "soul_md": string,                   // 6–10 lines, identity + voice + boundaries
        "agents_md": string                  // 8–12 lines, procedures + tool usage + post-action
      },
      "approval_mode": "yolo"|"write_actions"|"always",
      "approval_routing": "dashboard_only"|"channel_only"|"both"
    }
  ],

  "tasks": [                                 // task chain (one parent + sub-tasks)
    {
      "ref": string,                         // local handle (e.g. "propose")
      "title": string,
      "description"?: string,
      "parent_ref"?: string,                 // ref of parent task in this proposal
      "assignee_ref": string,                // ref of an employee in this proposal OR existing agent UUID
      "next_ref"?: string,                   // ref of next task — wakes when this hits done
      "notify_on_done": boolean,
      "notify_channels": ("email"|"dashboard"|"telegram"|"slack")[],
      "recurrence_pattern"?: "daily"|"weekly"|"monthly"   // parent tasks only
    }
  ],

  "missing_integrations": string[],          // integration IDs not yet connected
  "workspace_users_md_addendum"?: string     // optional content to append to workspace users.md
}
```

## Defaults

- model: `anthropic/claude-sonnet-4.6`
- approval_routing: `both`
- For experiment chains, default 5 sub-tasks: Propose, Approve, Build, Run, Decide
- Notify on the human-in-loop steps (Approve, Decide); silent on automated steps
- Persona files: write actual content tailored to the role; reference `@users.md` in agents.md when tone matters

## Validation rules

- `tasks` must have at least one entry with no `parent_ref` (the parent task).
- Every `parent_ref` and `next_ref` must reference another task's `ref` in the same proposal.
- Every `assignee_ref` must reference an employee.ref in this proposal OR a UUID for an existing agent.
- Don't propose hiring employees the workspace already has — reference their UUID instead.
- If a required integration is missing, list it under `missing_integrations` and explain in `reasoning`.

## Example output (closed-loop Meta ads experimentation)

```proposal
{
  "intent": "Closed-loop Meta ads experimentation to improve signups",
  "reasoning": "Funnel shows 38% drop-off at the pricing→checkout step. Three employees, weekly cycle: Marketer proposes hypotheses from funnel + ad data, you approve, Builder provisions surfaces (Vercel landing + Meta ad + PostHog flag), Monitor watches metrics and recommends ship/kill.",
  "employees": [
    {
      "ref": "marketer",
      "name": "Marketer",
      "role": "experiment-proposer",
      "model": "anthropic/claude-sonnet-4.6",
      "channel": "telegram",
      "skills": ["posthog", "web-search"],
      "playbooks": ["idea-validation-playbook"],
      "persona": {
        "soul_md": "# Marketer\n## Identity\nYou propose experiments...",
        "agents_md": "# How I work\n## Proposing experiments\n1. Pull funnel data...\n"
      },
      "approval_mode": "write_actions",
      "approval_routing": "both"
    }
  ],
  "tasks": [
    { "ref": "parent", "title": "Meta ads experimentation — weekly cycle", "assignee_ref": "marketer", "notify_on_done": false, "notify_channels": ["dashboard"], "recurrence_pattern": "weekly" },
    { "ref": "propose", "parent_ref": "parent", "title": "Propose hypothesis", "assignee_ref": "marketer", "next_ref": "approve", "notify_on_done": false, "notify_channels": ["dashboard"] },
    { "ref": "approve", "parent_ref": "parent", "title": "Get your approval", "assignee_ref": "marketer", "next_ref": "build", "notify_on_done": true, "notify_channels": ["email", "dashboard"] }
  ],
  "missing_integrations": ["posthog"]
}
```

After emitting the block, briefly tell the customer what they'll review and what to click. Do not duplicate the JSON in prose.
