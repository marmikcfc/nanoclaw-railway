---
name: resend-email
description: Send and receive emails via Resend using the agent's assigned platform address. Use whenever the agent needs to email a human, reply to an inbound message, or batch-send notifications.
---

## Credentials check

If `AGENT_EMAIL_FROM` is not set, tell the user:
> "I don't have an email address yet. Pick one in Settings → Agent email address on the Pepper dashboard."

If `RESEND_API_KEY` is not set, tell the user:
> "Email sending is not configured on this Pepper deployment. Contact your workspace admin."

---

## Your email identity

Your `From:` address is in the environment variable `AGENT_EMAIL_FROM`. It always looks like `<your-name>@mail.pepper.thestartupcompany.xyz`. **Always** use exactly this value as the `from` field on every send. Do not invent, modify, or substitute it — Resend will reject any send from an unverified address.

---

## When a webhook event arrives

When you receive a message that starts with `[email from <sender>]\nSubject: <subject>\n\n<body>`, a new email has landed in your inbox.

Read the content carefully:
- The first line `[email from <sender>]` tells you who sent it.
- The `Subject:` line is the email subject.
- Everything after the blank line is the body.

Reply using the Composio Resend tool, threading via the inbound message's `Message-ID` when available (passed in the metadata).

---

## Sending email

You send mail through Composio's Resend integration. The tool slug is `RESEND_SEND_EMAIL`. Use your delegate or tool runner the same way you would for any other Composio tool.

Required arguments:
- `from`: **always** `$AGENT_EMAIL_FROM` from the environment
- `to`: array of recipient email addresses
- `subject`: short subject line
- `text` and/or `html`: body content (plain text is fine for most messages)

Optional:
- `reply_to`: alternate reply-to address (rare)
- `headers`: extra headers — to thread a reply, set `In-Reply-To` to the inbound `message_id`

Example invocation (pseudocode):

```
composio-tool execute RESEND_SEND_EMAIL '{"from":"'"$AGENT_EMAIL_FROM"'","to":["user@example.com"],"subject":"Quick update","text":"Hi! Here is the status..."}'
```

To thread a reply:

```
composio-tool execute RESEND_SEND_EMAIL '{"from":"'"$AGENT_EMAIL_FROM"'","to":["'"$INBOUND_FROM"'"],"subject":"Re: '"$INBOUND_SUBJECT"'","text":"Thanks for the note...","headers":{"In-Reply-To":"<inbound-message-id>"}}'
```

---

## What you cannot do

- You cannot send from any address other than `AGENT_EMAIL_FROM`. Resend rejects unverified senders.
- You cannot create new inboxes. The platform domain is shared; new agent addresses are picked in the dashboard.
- You cannot delete inbound mail. If a message was sent to your address it is in your record.

---

## Common patterns

**Daily summary email to the workspace owner:**

```
composio-tool execute RESEND_SEND_EMAIL '{"from":"'"$AGENT_EMAIL_FROM"'","to":["'"$WORKSPACE_OWNER_EMAIL"'"],"subject":"'"$(date +%Y-%m-%d)"' — Daily summary","text":"Today I..."}'
```

**Acknowledge an inbound and follow up async:**

Reply immediately with a short ack, then continue working and send a follow-up when the task is done. Always thread both messages by passing the original `message_id` in `In-Reply-To`.
