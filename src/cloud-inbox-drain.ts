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

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'invalid-url';
  }
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
  const url = `${cloudUrl}/api/agents/${agentId}/inbox/${eventId}/${action}`;
  logger.info({ eventId, action, cloudOrigin: safeOrigin(cloudUrl) }, 'cloud-inbox: posting result callback');
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-event-signature': sign(secret, bodyText),
      },
      body: bodyText,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.warn(
      {
        eventId,
        action,
        cloudOrigin: safeOrigin(cloudUrl),
        error: err instanceof Error ? err.message : String(err),
      },
      'cloud-inbox: result callback network error',
    );
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ eventId, action, status: res.status, body: text.slice(0, 500) }, 'cloud-inbox: result callback failed');
  } else {
    logger.info({ eventId, action, status: res.status }, 'cloud-inbox: result callback ok');
  }
}

async function processInboxEvent(event: CloudInboxEvent): Promise<void> {
  logger.info(
    {
      eventId: event.id,
      channel: event.channel,
      kind: event.kind,
      command: event.railway_command,
    },
    'cloud-inbox: processing event',
  );
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
  if (!cloudUrl || !agentId || !secret) {
    logger.warn(
      {
        hasCloudUrl: Boolean(cloudUrl),
        hasAgentId: Boolean(agentId),
        hasSecret: Boolean(secret),
      },
      'cloud-inbox: missing env vars, skipping drain',
    );
    return;
  }

  const signature = sign(secret, agentId);
  let drained = 0;
  let failed = 0;

  logger.info({ agentId }, 'cloud-inbox: drain start');

  for (let page = 0; page < 5; page++) {
    const url = `${cloudUrl}/api/agents/${agentId}/inbox?limit=50`;
    logger.info({ page, cloudOrigin: safeOrigin(cloudUrl) }, 'cloud-inbox: fetching pending events');
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'x-event-signature': signature },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      logger.warn(
        {
          page,
          cloudOrigin: safeOrigin(cloudUrl),
          error: err instanceof Error ? err.message : String(err),
        },
        'cloud-inbox: fetch pending network error',
      );
      throw err;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text.slice(0, 500) }, 'cloud-inbox: fetch pending returned non-200');
      return;
    }

    const { events } = (await res.json()) as { events?: CloudInboxEvent[] };
    if (!events || events.length === 0) {
      logger.info({ page }, 'cloud-inbox: no pending events');
      break;
    }

    logger.info({ count: events.length }, 'cloud-inbox: processing pending events');
    for (const event of events) {
      try {
        await processInboxEvent(event);
        await postResult(cloudUrl, agentId, secret, event.id, 'ack', { ok: true });
        drained++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        failed++;
        logger.warn({ eventId: event.id, error }, 'cloud-inbox: event processing failed');
        await postResult(cloudUrl, agentId, secret, event.id, 'fail', { error });
      }
    }
  }

  logger.info({ drained, failed }, 'cloud-inbox: drain complete');
}
