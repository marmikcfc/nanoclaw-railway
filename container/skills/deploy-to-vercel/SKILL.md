---
name: deploy-to-vercel
description: Deploy applications and websites to Vercel. Use when the user requests deployment actions like "deploy my app", "deploy and give me the link", "push this live", or "create a preview deployment".
metadata:
  author: vercel
  version: "3.0.0"
inputs:
  - name: VERCEL_TOKEN
    description: Vercel personal access token — required for all CLI operations
  - name: VERCEL_ORG_ID
    description: Vercel team/org ID — optional, pins team without --scope flag
    required: false
  - name: VERCEL_PROJECT_ID
    description: Vercel project ID — optional, pins project without linking
    required: false
---

## Credentials check

```bash
echo "Vercel token set: $([ -n "$VERCEL_TOKEN" ] && echo yes || echo NO)"
vercel whoami --token $VERCEL_TOKEN 2>/dev/null || echo "Auth failed — check VERCEL_TOKEN"
vercel teams list --token $VERCEL_TOKEN --format json 2>/dev/null
```

If `VERCEL_TOKEN` is not set, tell the user:
> "To use Vercel, add VERCEL_TOKEN in Railway → Service → Variables. Get it from vercel.com → Account Settings → Tokens."

Always pass `--token $VERCEL_TOKEN` on every CLI command — do NOT run `vercel login`.

---

# Deploy to Vercel

Deploy any project to Vercel. **Always deploy as preview** (not production) unless the user explicitly asks for production.

The goal is to get the user into the best long-term setup: their project linked to Vercel with git-push deploys. Every method below tries to move the user closer to that state.

## Step 1: Gather Project State

Run all four checks before deciding which method to use:

```bash
# 1. Check for a git remote
git remote get-url origin 2>/dev/null

# 2. Check if locally linked to a Vercel project (either file means linked)
cat .vercel/project.json 2>/dev/null || cat .vercel/repo.json 2>/dev/null

# 3. Check if authenticated
vercel whoami --token $VERCEL_TOKEN 2>/dev/null

# 4. List available teams
vercel teams list --token $VERCEL_TOKEN --format json 2>/dev/null
```

### Team selection

If the user belongs to multiple teams, present all available team slugs as a bulleted list and ask which one to deploy to. Once the user picks a team, proceed immediately — do not ask for additional confirmation.

Pass the team slug via `--scope` on all subsequent CLI commands.

If the project is already linked (`.vercel/project.json` or `.vercel/repo.json` exists), the `orgId` in those files determines the team. If there is only one team (or just a personal account), skip the prompt.

**About the `.vercel/` directory:** A linked project has either:
- `.vercel/project.json` — created by `vercel link`. Contains `projectId` and `orgId`.
- `.vercel/repo.json` — created by `vercel link --repo`. Contains `orgId`, `remoteName`, and a `projects` array.

**Do NOT** use `vercel project inspect`, `vercel ls`, or `vercel link` to detect state in an unlinked directory.

## Step 2: Choose a Deploy Method

### Linked + has git remote → Git Push
1. Ask before pushing. Never push without explicit approval.
2. Commit and push.
3. Retrieve the preview URL via `vercel ls --token $VERCEL_TOKEN --format json`.

### Linked + no git remote → `vercel deploy`
```bash
vercel deploy [path] --token $VERCEL_TOKEN -y --no-wait
vercel inspect <deployment-url> --token $VERCEL_TOKEN
```

### Not linked + authenticated → Link first, then deploy
1. Ask which team (if multiple).
2. Link: `vercel link --token $VERCEL_TOKEN --repo --scope <team-slug>` (if git remote exists) or `vercel link --token $VERCEL_TOKEN --scope <team-slug>`.
3. Deploy via git push or `vercel deploy --token $VERCEL_TOKEN`.

### Not linked + token missing → Tell the user
> "VERCEL_TOKEN is not set. Add it in Railway → Service → Variables (vercel.com → Account Settings → Tokens), then redeploy."

## Output

Always show the user the deployment URL.

- Do NOT curl or fetch the deployed URL to verify it works.
- Show preview URL for preview deployments, production URL for production deployments.

## Troubleshooting

- **Auth failure:** Verify `VERCEL_TOKEN` is correct: `vercel whoami --token $VERCEL_TOKEN`
- **Wrong team:** Use `vercel teams list --token $VERCEL_TOKEN` to see available teams, pass correct `--scope`
- **Build failure:** Check `vercel inspect <url> --token $VERCEL_TOKEN` for build logs
