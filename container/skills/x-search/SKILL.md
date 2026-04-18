---
name: x-search
description: Search Twitter/X for mentions, trends, conversations, and user profiles using Grok.
---

## When to use

Use `x-search` to **read and research** Twitter/X content:
- Find what people are saying about a topic, brand, or product
- Check mentions of a specific account
- Research a user's profile and recent activity
- Fetch and summarize tweet threads
- Discover trending conversations
- Research context before posting/replying via Composio Twitter tools

## When NOT to use

- **To post, like, reply, retweet, DM, or follow** → use `composio-tool` with the `twitter` toolkit instead
- `x-search` is read-only intelligence. `composio-tool --toolkit twitter` is for actions.

---

## Commands

```bash
# Search for tweets/conversations
x-search query "what are people saying about Pepper"

# Search specific handles only
x-search query "AI agents" --handles elonmusk,sama

# Exclude specific handles
x-search query "startup funding" --exclude bot1,bot2

# Date-bounded search
x-search query "product launch" --from 2026-04-01 --to 2026-04-05

# Look up a user
x-search user "elonmusk"

# Fetch a tweet thread
x-search thread "https://x.com/user/status/123456"
```

---

## Typical workflow: research then act

```bash
# 1. Research — find relevant conversations
x-search query "@myhandle" --from 2026-04-04

# 2. Decide — which mentions deserve engagement?
# (Use your judgment based on relevance and context)

# 3. Act — use composio-tool for Twitter actions
composio-tool search "reply to tweet" --toolkit twitter --limit 3
composio-tool execute TWITTER_REPLY_TO_TWEET '{"tweet_id": "...", "text": "..."}'
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `x-search query "text"` | Search tweets by keyword or semantic meaning |
| `x-search query "text" --handles h1,h2` | Restrict to specific accounts (max 10) |
| `x-search query "text" --from DATE --to DATE` | Date-bounded search (ISO8601) |
| `x-search user "username"` | Look up user profile and recent activity |
| `x-search thread "url"` | Fetch and summarize a tweet thread |

---

## Fallback: Composio Twitter (if x-search unavailable)

If `x-search` is unavailable or `XAI_API_KEY` is missing, use Composio's Twitter toolkit for searching:

```bash
composio-tool search "search tweets" --toolkit twitter --limit 5
composio-tool execute TWITTER_SEARCH_TWEETS '{"query": "voice AI operations", "max_results": 10}'
```

Note: Composio Twitter is primarily for **actions** (post, reply, like) but `TWITTER_SEARCH_TWEETS` can also retrieve recent tweets matching a query.

## Credentials check

If `x-search` reports `XAI_API_KEY not set`, this is a platform configuration issue. Contact the Pepper Cloud team.
