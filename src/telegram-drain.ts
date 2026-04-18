import { createHmac } from 'crypto';
import { logger } from './logger.js';

interface PendingMessage {
  id: string;
  chat_id: string;
  update_payload: unknown;
}

/**
 * Fetch and process pending Telegram messages that queued up while
 * this Railway service was sleeping (numReplicas=0).
 *
 * Called once on startup, after TelegramChannel.connect() resolves.
 * The `handleUpdate` callback should be TelegramChannel.handleUpdate.
 */
export async function drainPendingTelegramMessages(
  handleUpdate: (update: unknown) => Promise<void>,
): Promise<void> {
  const cloudUrl = process.env.PEPPER_CLOUD_URL;
  const agentId = process.env.AGENT_ID;
  const secret = process.env.PEPPER_EVENT_SECRET;
  if (!cloudUrl || !agentId || !secret) return;

  // Sign the agentId as the payload (matches pending endpoint verifyHmac)
  const signature = createHmac('sha256', secret).update(agentId).digest('hex');

  try {
    const res = await fetch(`${cloudUrl}/api/telegram/pending/${agentId}`, {
      headers: { 'x-event-signature': signature },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'telegram-drain: fetch returned non-200');
      return;
    }

    const { messages } = (await res.json()) as { messages: PendingMessage[] };
    if (!messages || messages.length === 0) return;

    logger.info({ count: messages.length }, 'telegram-drain: processing pending messages');

    for (const msg of messages) {
      try {
        await handleUpdate(msg.update_payload);
      } catch (err: any) {
        logger.warn({ err, messageId: msg.id }, 'telegram-drain: failed to process message');
      }
    }

    logger.info({ count: messages.length }, 'telegram-drain: done');
  } catch (err) {
    logger.warn({ err }, 'telegram-drain: request failed (non-fatal)');
  }
}
