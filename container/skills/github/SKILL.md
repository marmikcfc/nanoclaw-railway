---
name: github
description: Interact with GitHub repos, issues, PRs, and Actions using the gh CLI
---

Use the `gh` CLI for all GitHub operations. `gh` is pre-installed in the container.

## Credentials check

If `GITHUB_TOKEN` is not set, `gh` will prompt for auth or fail. Tell the user:
> "To use GitHub, connect GitHub in Settings → Integrations at your NanoClaw Cloud dashboard."

---

## Authentication

```bash
gh auth status                          # check current auth
gh auth login --with-token <<< "$GITHUB_TOKEN"  # if auto-auth doesn't work
```

## Repositories

```bash
gh repo clone owner/repo               # clone a repo
gh repo create myrepo --public         # create new repo
gh repo list --limit 20                # list your repos
gh repo fork owner/repo                # fork a repo
gh repo view owner/repo                # view repo details
gh repo sync                           # sync fork with upstream
```

## Issues

```bash
gh issue list --repo owner/repo --state open
gh issue list --repo owner/repo --assignee @me
gh issue view 123 --repo owner/repo
gh issue create --repo owner/repo --title "Bug" --body "Description"
gh issue close 123 --repo owner/repo
gh issue comment 123 --repo owner/repo --body "Comment"
```

## Pull Requests

```bash
gh pr list --repo owner/repo
gh pr view 123 --repo owner/repo
gh pr create --title "Fix" --body "Description" --base main
gh pr merge 123 --squash --repo owner/repo
gh pr checkout 123
gh pr review 123 --approve
gh pr review 123 --request-changes --body "Needs work"
gh pr diff 123 --repo owner/repo
gh pr status --repo owner/repo         # PRs involving you
```

## GitHub Actions

```bash
gh run list --repo owner/repo --limit 10
gh run view RUN_ID --repo owner/repo
gh run watch RUN_ID --repo owner/repo  # stream live logs
gh workflow list --repo owner/repo
gh workflow run WORKFLOW_FILE --repo owner/repo
gh workflow enable WORKFLOW_FILE --repo owner/repo
```

## Releases

```bash
gh release list --repo owner/repo
gh release create v1.0.0 --repo owner/repo --title "v1.0.0" --notes "Release notes"
gh release upload v1.0.0 ./dist/binary --repo owner/repo
gh release download v1.0.0 --repo owner/repo
```

## Advanced: JSON output and filtering

```bash
# Get PR list as JSON, filter with jq
gh pr list --repo owner/repo --json number,title,state | jq '.[] | select(.state=="OPEN")'

# Get issue details as JSON
gh issue view 123 --repo owner/repo --json title,body,labels,assignees

# Direct API calls
gh api repos/owner/repo/pulls --jq '.[].title'
gh api graphql -f query='{ viewer { login } }'
```

## Tips

- For file operations on repos, clone first then use standard file tools
- Use `--json` flag on any command to get machine-readable output
- Use `gh api` for operations not covered by subcommands
