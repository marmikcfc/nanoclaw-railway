---
name: resend-email
description: Send and receive emails via Resend using either Pepper's platform address or a user-connected Resend account. Use whenever the agent needs to email a human, reply to an inbound message, or batch-send notifications.
---

## Credentials check

If `AGENT_EMAIL_FROM` is not set, tell the user:
> "I don't have an email address yet. Pick one in Settings → Agent email address on the Pepper dashboard."

Read `AGENT_EMAIL_PROVIDER` before choosing a send path:
- `platform` or `resend`: use Pepper's platform Resend key and the `resend-send` command.
- `composio` or `user`: use the user's connected Resend account through Composio.

If `AGENT_EMAIL_PROVIDER` is `platform` or `resend` and `RESEND_API_KEY` is not set, tell the user:
> "Email sending is not configured on this Pepper deployment. Contact your workspace admin."

---

## Your email identity

Your sender address is in `AGENT_EMAIL_FROM`.

For Pepper platform email (`AGENT_EMAIL_PROVIDER=platform` or `resend`), send as `ASSISTANT_NAME <AGENT_EMAIL_FROM>`. The `resend-send` command does this automatically, so pass only recipients, subject, and body.

For user-connected Resend (`AGENT_EMAIL_PROVIDER=composio` or `user`), use the user-provided `AGENT_EMAIL_FROM` exactly as configured. It may already be a full sender identity such as `Agent Name <sender@domain.com>`.

---

## When a webhook event arrives

When you receive a message that starts with `[email from <sender>]\nSubject: <subject>\n\n<body>`, a new email has landed in your inbox.

Read the content carefully:
- The first line `[email from <sender>]` tells you who sent it.
- The `Subject:` line is the email subject.
- Everything after the blank line is the body.

Reply using the send path selected by `AGENT_EMAIL_PROVIDER`, threading via the inbound message's `Message-ID` when available (passed in the metadata).

---

## Sending email

Check `AGENT_EMAIL_PROVIDER` first.

### Platform Resend

When `AGENT_EMAIL_PROVIDER` is `platform` or `resend`, use Pepper's platform key:

```
resend-send '{"to":["user@example.com"],"subject":"Quick update","text":"Hi! Here is the status..."}'
```

To thread a reply:

```
resend-send '{"to":["'"$INBOUND_FROM"'"],"subject":"Re: '"$INBOUND_SUBJECT"'","text":"Thanks for the note...","headers":{"In-Reply-To":"<inbound-message-id>"}}'
```

### User-connected Resend

When `AGENT_EMAIL_PROVIDER` is `composio` or `user`, send through Composio's Resend integration. The tool slug is `RESEND_SEND_EMAIL`.

Required arguments:
- `from`: `$AGENT_EMAIL_FROM` exactly as configured
- `to`: array of recipient email addresses
- `subject`: short subject line
- `text` and/or `html`: body content (plain text is fine for most messages)

Optional:
- `reply_to`: alternate reply-to address (rare)
- `headers`: extra headers — to thread a reply, set `In-Reply-To` to the inbound `message_id`

```
composio-tool execute RESEND_SEND_EMAIL '{"from":"'"$AGENT_EMAIL_FROM"'","to":["user@example.com"],"subject":"Quick update","text":"Hi! Here is the status..."}'
```

To thread a reply:

```
composio-tool execute RESEND_SEND_EMAIL '{"from":"'"$AGENT_EMAIL_FROM"'","to":["'"$INBOUND_FROM"'"],"subject":"Re: '"$INBOUND_SUBJECT"'","text":"Thanks for the note...","headers":{"In-Reply-To":"<inbound-message-id>"}}'
```

---

## What you cannot do

- You cannot send from an address outside the configured provider/domain. Resend rejects unverified senders.
- You cannot create new inboxes. The platform domain is shared; new agent addresses are picked in the dashboard.
- You cannot delete inbound mail. If a message was sent to your address it is in your record.

---

## Common patterns

**Daily summary email to the workspace owner:**

```
resend-send '{"to":["'"$WORKSPACE_OWNER_EMAIL"'"],"subject":"'"$(date +%Y-%m-%d)"' — Daily summary","text":"Today I..."}'
```

**Acknowledge an inbound and follow up async:**

Reply immediately with a short ack, then continue working and send a follow-up when the task is done. Always thread both messages by passing the original `message_id` in `In-Reply-To`.
