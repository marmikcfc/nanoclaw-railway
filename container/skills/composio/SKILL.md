---
name: composio
description: Use composio-tool to take actions on 500+ external apps (HubSpot, Gmail, Jira, Slack, Notion, Salesforce, etc.) — search tools, inspect schemas, and execute actions.
---

## CRITICAL: Never guess tool slugs

**ALWAYS search first.** Tool slugs are unpredictable (e.g. `HUBSPOT_CUSTOMIZABLE_CONTACTS_PAGE_RETRIEVAL`, not `HUBSPOT_LIST_CONTACTS`). If you guess, you will waste calls on "not found" errors.

---

## Credentials check

If `composio-tool apps` returns an error about missing API key, tell the user:
> "To use external app tools, set up Composio in Settings → Integrations at your Pepper Cloud dashboard."

---

## DO NOT use Composio for these services

These have dedicated Platform skills. Always prefer them:

- **GitHub** → use `gh` CLI (gh-cli skill)
- **Supabase** → use `supabase` CLI (supabase skill)
- **Email** → use AgentMail MCP tools (agentmail-cli skill)

---

## Twitter / X workflows

Use Composio for all Twitter **actions** (post, like, reply, retweet, DM, follow/unfollow).
Use `x-search` for Twitter **research** (search tweets, check mentions, look up users).

### Post a tweet
```bash
composio-tool search "post tweet" --toolkit twitter --limit 3
composio-tool schema TWITTER_CREATE_TWEET
composio-tool execute TWITTER_CREATE_TWEET '{"text": "Hello from my AI agent!"}'
```

### Reply to a tweet
```bash
composio-tool search "reply" --toolkit twitter --limit 3
composio-tool execute TWITTER_REPLY_TO_TWEET '{"tweet_id": "123456", "text": "Great post!"}'
```

### Research then engage (recommended pattern)
```bash
# 1. Search for mentions
x-search query "@myhandle" --from 2026-04-04

# 2. Like or reply to relevant mentions via Composio
composio-tool execute TWITTER_LIKE_TWEET '{"tweet_id": "..."}'
```

---

## Ideal workflow (3 calls max)

```bash
# 1. Search — get the exact slug (NEVER skip this)
composio-tool search "list contacts" --toolkit hubspot --limit 3

# 2. Schema — check required params (skip if obvious)
composio-tool schema HUBSPOT_CUSTOMIZABLE_CONTACTS_PAGE_RETRIEVAL

# 3. Execute — run it
composio-tool execute HUBSPOT_CUSTOMIZABLE_CONTACTS_PAGE_RETRIEVAL '{}'
```

**Do NOT:**
- Invent slugs like `HUBSPOT_LIST_CONTACTS` or `HUBSPOT_GET_CONTACTS_PAGE`
- Run `tools <toolkit>` to dump 100+ tools then grep — use `search` instead
- Re-execute the same tool to "verify" — trust the first result

---

## Check connected apps

```bash
composio-tool apps
```

If the toolkit isn't connected, tell the user:
> "HubSpot isn't connected yet. Connect it in Settings → Integrations at your Pepper Cloud dashboard."

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `composio-tool search "query" --toolkit name` | Find tools (always start here) |
| `composio-tool search "query" --limit 3` | Fewer results, save tokens |
| `composio-tool schema TOOL_SLUG` | Get input parameters |
| `composio-tool execute TOOL_SLUG '{"..."}'` | Execute a tool |
| `composio-tool apps` | List connected apps |
| `composio-tool tools <toolkit> --limit 20` | Browse toolkit (only if search fails) |

---

## Vercel workflows

Use Composio for all Vercel operations. Do NOT use the Vercel CLI directly.

### Set up CI/CD (link GitHub repo to Vercel)
```bash
# 1. Search for the project creation tool
composio-tool search "create project" --toolkit vercel --limit 3

# 2. Create project linked to GitHub repo (enables auto-deploy on push)
composio-tool execute VERCEL_CREATE_PROJECT2 '{"name":"my-app","gitRepository":{"type":"github","repo":"owner/repo"}}'
```

### Deploy from GitHub
```bash
# 1. Get numeric repo ID from GitHub
composio-tool execute GITHUB_GET_A_REPOSITORY '{"owner":"myorg","repo":"myrepo"}'
# Note the "id" field in the response

# 2. Deploy latest from branch
composio-tool execute VERCEL_CREATE_NEW_DEPLOYMENT '{"name":"my-app","gitSource":{"type":"github","repoId":"668449998","ref":"main"}}'

# 3. Deploy specific commit
composio-tool execute VERCEL_CREATE_NEW_DEPLOYMENT '{"name":"my-app","gitSource":{"type":"github","repoId":"668449998","ref":"main","sha":"abc123"}}'
```

### Get deployment URL and details
```bash
composio-tool search "deployment details" --toolkit vercel --limit 3
composio-tool execute VERCEL_GET_DEPLOYMENT_DETAILS '{"idOrUrl":"<deployment-id>"}'
```

### List all deployments
```bash
composio-tool execute VERCEL_LIST_ALL_DEPLOYMENTS '{"project":"my-app"}'
```

### Pull logs for debugging
```bash
composio-tool execute VERCEL_GET_DEPLOYMENT_LOGS '{"id":"<deployment-id>"}'
composio-tool execute VERCEL_GET_DEPLOYMENT_EVENTS '{"idOrUrl":"<deployment-id>"}'
```

### Manage environment variables
```bash
composio-tool search "environment variable" --toolkit vercel --limit 5
composio-tool execute VERCEL_LIST_ENV_VARIABLES '{"idOrName":"my-project"}'
composio-tool execute VERCEL_ADD_ENVIRONMENT_VARIABLE '{"idOrName":"my-project","key":"API_KEY","value":"xxx","target":["production"],"type":"encrypted"}'
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Guessing a slug | **Always** `search` first — slugs are unpredictable |
| Dumping all tools then grepping | Use `search` with `--toolkit` — it's faster and targeted |
| Re-executing to verify data | Trust the first result — don't repeat calls |
| Skipping schema check | Run `schema` if you're unsure about required params |
| Wrong parameter format | Arguments must be valid JSON: `'{"key":"value"}'` |
