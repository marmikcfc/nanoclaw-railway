---
name: workspace-memory
description: Query and update shared workspace memory across all team members. Use when you need context from other agents or want to store decisions for the team.
---

## When to use

- When you need information another agent may have produced
- When you want to store a decision or finding for the team to access
- When you want to see what other agents have been doing recently
- When you need context about the broader company or workspace

## When NOT to use

- When the information is already in your current context
- For storing temporary notes (use your local filesystem instead)

## Commands

### Get context for a task
```bash
workspace-memory context "Build keyword strategy for top pages"
```
Returns relevant facts, decisions, and knowledge related to the query.

### Search shared knowledge
```bash
workspace-memory search "customer ICP"
```
Searches across all agents' knowledge for matching information.

### Store a decision or finding
```bash
workspace-memory remember "We chose $49/mo pricing after competitive analysis showed competitors at $39-79/mo range"
```
Stores a fact that all team members can access.

### View recent team activity
```bash
workspace-memory activity
```
Shows what other agents have been working on recently.
