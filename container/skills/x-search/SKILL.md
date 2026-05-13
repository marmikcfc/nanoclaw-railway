---
name: x-search
description: Search Twitter/X for recent tweets (last 7 days) via Composio. Returns structured JSON with author, link, and metrics.
---

## When to use

Use `x-search query` to find recent tweets matching a search query (last 7 days):
- Mention monitoring (`@yourhandle`)
- Keyword discovery (`"just launched"`, `"raised funding"`)
- Tracking specific users (`--handles`)
- Topic exploration

Returns structured JSON: `tweets[]`, `newest_id`, `oldest_id`, `result_count`. Each tweet has `id`, `author`, `author_name`, `followers`, `verified`, `text`, `link`, `created_at`, `likes`, `retweets`, `replies`.

## When NOT to use

- **To post, like, reply, retweet, DM, or follow** → use `composio-tool` with the `twitter` toolkit (`TWITTER_CREATION_OF_A_POST`, `TWITTER_RETWEET_POST`, `TWITTER_USER_LIKE_POST`, etc.).
- **Older than 7 days** → use `composio-tool execute TWITTER_FULL_ARCHIVE_SEARCH` directly (requires X API Pro tier).
- **User lookup or thread fetch** → use `TWITTER_USER_LOOKUP_BY_USERNAME` or `TWITTER_POST_LOOKUP_BY_POST_ID` directly.

## Commands

```bash
# Basic search
x-search query "what are people saying about Pepper"

# Restrict to specific handles
x-search query "AI agents" --handles elonmusk,sama

# Exclude handles
x-search query "startup funding" --exclude bot1,bot2

# Date-bounded
x-search query "product launch" --from 2026-05-06 --to 2026-05-13

# Monitoring loop with cursor-based dedup
x-search query "@myhandle" \
  --since-id "$(cat /workspace/last_seen_id.txt 2>/dev/null || echo)" \
  --max-results 100
```

## Query syntax

`x-search` accepts the standard X API v2 query operators:

| Operator | Meaning |
|---|---|
| `"exact phrase"` | Exact match |
| `OR` (caps) | Either |
| space (implicit AND) | Both |
| `-foo` | Exclude |
| `is:retweet` / `is:reply` / `is:quote` | Filter by type |
| `has:links` / `has:images` / `has:videos` | Has media |
| `lang:en` | Language |
| `from:user` / `to:user` | By user |
| `#tag` | Hashtag |
| `(...)` | Group |

Recent-search hard limit: query string ≤ 512 chars on Basic tier.

## Typical workflow: monitor → approve → reply

```bash
# 1. Search with dedup
x-search query '("just launched" OR "raised $") -is:retweet -is:reply lang:en' \
  --max-results 100 \
  --since-id "$(cat /workspace/last_seen_id.txt 2>/dev/null || echo)" \
  > /workspace/search.json

# 2. Persist cursor for the next run
jq -r '.newest_id // empty' /workspace/search.json > /workspace/last_seen_id.txt

# 3. Build Excel from .tweets[], send to channel for approval
# 4. On approve, reply via composio-tool:
composio-tool execute TWITTER_CREATION_OF_A_POST \
  '{"text": "<reply>", "reply__in__reply__to__tweet__id": "<tweet_id>"}'
# Note: Composio flattens nested X v2 fields into double-underscored keys.
# `reply__in__reply__to__tweet__id` (four underscores: reply.in_reply_to_tweet_id).
# Run `composio-tool schema TWITTER_CREATION_OF_A_POST` for the full param list.
```

## Output shape

```json
{
  "result_count": 30,
  "newest_id": "2054495480533385624",
  "oldest_id": "2054490311951302664",
  "tweets": [
    {
      "id": "2054495480533385624",
      "author": "UnderlineVC",
      "author_name": "Underline Ventures",
      "followers": 387,
      "verified": false,
      "text": "@designverseai have raised a $5.5M seed round ...",
      "link": "https://x.com/UnderlineVC/status/2054495480533385624",
      "created_at": "2026-05-13T09:09:32.000Z",
      "likes": 0,
      "retweets": 0,
      "replies": 0
    }
  ]
}
```

## Credentials

Auto-injected: `COMPOSIO_API_KEY` (platform) and `COMPOSIO_USER_ID` (workspace). Requires Twitter OAuth connected for the workspace at Settings → Integrations → Twitter. Without that, the search fails with a `not_connected` error.
