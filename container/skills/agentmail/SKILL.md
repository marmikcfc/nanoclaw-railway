---
name: agentmail
description: Send and receive emails as the agent using AgentMail. Use curl or SDK for API calls, MCP tools when connected.
---

AgentMail gives you a dedicated email inbox. Use it to send emails, read incoming messages, reply to threads, and manage your inbox.

## Credentials check

If `AGENTMAIL_API_KEY` is not set, tell the user:
> "To use email, connect AgentMail in Settings → Integrations at your NanoClaw Cloud dashboard."

---

## When a webhook event arrives

When you receive a message like `[agentmail webhook: new_email]`, a new email has arrived in your inbox. The payload in the message contains the full email details including `inboxId`, `messageId`, `from`, `subject`, and `text`/`html`.

Read the payload, understand the email, then reply or take action using the AgentMail API.

---

## Using AgentMail via curl

```bash
# List your inboxes
curl -s https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" | jq .

# Create an inbox
curl -s -X POST https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "myagent"}' | jq .

# List messages in inbox
curl -s "https://api.agentmail.to/v0/inboxes/INBOX_ID/messages" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" | jq .

# Get a specific message
curl -s "https://api.agentmail.to/v0/inboxes/INBOX_ID/messages/MESSAGE_ID" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" | jq .

# Send a message
curl -s -X POST "https://api.agentmail.to/v0/inboxes/INBOX_ID/messages" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello",
    "text": "Message body"
  }' | jq .

# Reply to a message
curl -s -X POST "https://api.agentmail.to/v0/inboxes/INBOX_ID/messages/MESSAGE_ID/reply" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Thanks for your email!"}' | jq .

# List threads (filter by label)
curl -s "https://api.agentmail.to/v0/inboxes/INBOX_ID/threads?labels=unreplied" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" | jq .

# Label a message
curl -s -X PATCH "https://api.agentmail.to/v0/inboxes/INBOX_ID/messages/MESSAGE_ID" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"addLabels": ["replied"], "removeLabels": ["unreplied"]}' | jq .
```

---

## Using AgentMail via Node.js SDK

```bash
npm install agentmail
```

```typescript
import { AgentMailClient } from "agentmail";
const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });

// Create inbox
const inbox = await client.inboxes.create({ username: "myagent" });

// Send email
await client.inboxes.messages.send({
  inboxId: "agent@agentmail.to",
  to: "recipient@example.com",
  subject: "Hello",
  text: "Plain text version",
  html: "<p>HTML version</p>",
});

// Reply to a message
await client.inboxes.messages.reply({
  inboxId: "agent@agentmail.to",
  messageId: "msg_123",
  text: "Thanks for your email!",
});

// List unread threads
const threads = await client.inboxes.threads.list({
  inboxId: "agent@agentmail.to",
  labels: ["unreplied"],
});

// Send with attachment (Base64)
const content = Buffer.from(fileBytes).toString("base64");
await client.inboxes.messages.send({
  inboxId: "agent@agentmail.to",
  to: "recipient@example.com",
  subject: "Report",
  attachments: [{ content, filename: "report.pdf", contentType: "application/pdf" }],
});

// Create draft for human approval before sending
const draft = await client.inboxes.drafts.create({
  inboxId: "agent@agentmail.to",
  to: "recipient@example.com",
  subject: "Pending approval",
  text: "Draft content",
});
await client.inboxes.drafts.send({ inboxId: "agent@agentmail.to", draftId: draft.draftId });
```

---

## MCP tools (available when AgentMail integration is connected via Settings)

When connected, AgentMail MCP tools are available as direct tool calls — same operations as above without writing code.
