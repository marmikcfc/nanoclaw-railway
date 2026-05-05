import { createHmac } from 'crypto';

import { logger } from './logger.js';
import {
  processSlackIncomingEvent,
  processTelegramIncomingUpdate,
  processWakeTask,
  processWebhookEvent,
} from './api-server.js';

interface CloudInboxEvent {
  id: string;
  channel: string;
  kind: string;
  railway_command: string;
  payload: unknown;
}

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

async function postResult(
  cloudUrl: string,
  agentId: string,
  secret: string,
  eventId: string,
  action: 'ack' | 'fail',
  body: Record<string, unknown>,
): Promise<void> {
  const bodyText = JSON.stringify(body);
  const res = await fetch(`${cloudUrl}/api/agents/${agentId}/inbox/${eventId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-event-signature': sign(secret, bodyText),
    },
    body: bodyText,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    logger.warn({ eventId, action, status: res.status }, 'cloud-inbox: result callback failed');
  }
}

async function processInboxEvent(event: CloudInboxEvent): Promise<void> {
  if (event.railway_command === 'webhook-event') {
    await processWebhookEvent(event.payload);
    return;
  }

  if (event.railway_command === 'telegram-incoming') {
    const payload = event.payload as { update?: unknown };
    if (!payload.update) throw new Error('Inbox telegram event missing update');
    await processTelegramIncomingUpdate(payload.update);
    return;
  }

  if (event.railway_command === 'slack-incoming') {
    const payload = event.payload as { event?: unknown; team_id?: string };
    if (!payload.event) throw new Error('Inbox slack event missing event payload');
    await processSlackIncomingEvent(payload.event, payload.team_id);
    return;
  }

  if (event.railway_command === 'wake-task') {
    await processWakeTask(event.payload);
    return;
  }

  throw new Error(`Unsupported inbox command: ${event.railway_command}`);
}

export async function drainCloudInboxEvents(): Promise<void> {
  const cloudUrl = process.env.PEPPER_CLOUD_URL;
  const agentId = process.env.AGENT_ID;
  const secret = process.env.PEPPER_EVENT_SECRET;
  if (!cloudUrl || !agentId || !secret) return;

  const signature = sign(secret, agentId);
  let drained = 0;

  for (let page = 0; page < 5; page++) {
    const res = await fetch(`${cloudUrl}/api/agents/${agentId}/inbox?limit=50`, {
      headers: { 'x-event-signature': signature },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'cloud-inbox: fetch pending returned non-200');
      return;
    }

    const { events } = (await res.json()) as { events?: CloudInboxEvent[] };
    if (!events || events.length === 0) break;

    logger.info({ count: events.length }, 'cloud-inbox: processing pending events');
    for (const event of events) {
      try {
        await processInboxEvent(event);
        await postResult(cloudUrl, agentId, secret, event.id, 'ack', { ok: true });
        drained++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn({ eventId: event.id, error }, 'cloud-inbox: event processing failed');
        await postResult(cloudUrl, agentId, secret, event.id, 'fail', { error });
      }
    }
  }

  if (drained > 0) {
    logger.info({ drained }, 'cloud-inbox: drain complete');
  }
}
