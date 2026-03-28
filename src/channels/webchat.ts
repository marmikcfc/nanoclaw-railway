import { createHmac, randomUUID } from 'crypto';
import { Channel } from '../types.js';
import { logger } from '../logger.js';
import { registerChannel, ChannelOpts } from './registry.js';

const WEBCHAT_JID = 'admin@nanoclaw';

export class WebchatChannel implements Channel {
  readonly name = 'webchat';
  /**
   * Queue of traceIds from incoming webhooks. Each webhook pushes its traceId
   * here; processGroupMessages drains the queue and uses the last (most recent)
   * entry as webchatTraceId for this run. Using a queue instead of a single
   * slot ensures rapid back-to-back messages don't silently drop earlier IDs.
   */
  incomingTraceIds: string[] = [];
  /**
   * Set by processGroupMessages just before calling sendMessage; read
   * synchronously by sendMessage before its first await so no webhook
   * can interleave between the set and the read.
   */
  currentTraceId: string | null = null;

  ownsJid(jid: string): boolean {
    return jid === WEBCHAT_JID;
  }

  isConnected(): boolean {
    return true;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async sendMessage(_jid: string, text: string): Promise<void> {
    const cloudUrl = process.env.NANOCLAW_CLOUD_URL;
    const agentId = process.env.AGENT_ID;
    const secret = process.env.NANOCLAW_EVENT_SECRET;

    if (!cloudUrl || !agentId || !secret) {
      logger.error('WebchatChannel: missing env vars (NANOCLAW_CLOUD_URL, AGENT_ID, NANOCLAW_EVENT_SECRET)');
      return;
    }

    const event = {
      id: randomUUID(),
      tenant_id: agentId,
      trace_id: this.currentTraceId ?? randomUUID(),
      parent_event_id: null,
      seq: 1,
      event_type: 'webchat_agent_message',
      status: 'complete',
      agent_name: 'agent',
      channel: process.env.CHANNEL_TYPE ?? 'unknown',
      data: { content: text, summary: '' },
      tokens_used: null,
      cost_usd: null,
      duration_ms: null,
      client_ts: new Date().toISOString(),
    };

    const body = JSON.stringify({ events: [event] });
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    try {
      const res = await fetch(`${cloudUrl}/api/events/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error({ status: res.status, body: text }, 'WebchatChannel: failed to POST agent reply');
      }
    } catch (err) {
      logger.error({ err }, 'WebchatChannel: network error posting agent reply');
    }
  }
}

// Self-register. WebchatChannel needs no external credentials — it's always available.
// The factory accepts ChannelOpts even though WebchatChannel doesn't use them,
// because ChannelFactory type requires it.
registerChannel('webchat', (_opts: ChannelOpts) => new WebchatChannel());
