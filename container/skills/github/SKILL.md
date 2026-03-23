---
name: github
description: Interact with GitHub repos, issues, PRs, and Actions using the gh CLI
---

Use the `gh` CLI for all GitHub operations. `GITHUB_TOKEN` is pre-configured.

Common patterns:
- Clone: `gh repo clone owner/repo`
- List issues: `gh issue list --repo owner/repo --state open`
- Create PR: `gh pr create --title "..." --body "..." --base main`
- Check CI: `gh run list --repo owner/repo --limit 5`
- View PR status: `gh pr status --repo owner/repo`
- Merge PR: `gh pr merge <number> --squash --repo owner/repo`

For file operations on repos, clone first then use standard file tools.
