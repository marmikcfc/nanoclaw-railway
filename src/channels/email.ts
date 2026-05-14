import { logger } from '../logger.js';
import {
  Channel,
  OnChatMetadata,
  OnInboundMessage,
  NewMessage,
} from '../types.js';
import { randomUUID } from 'crypto';

export interface EmailChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
}

export interface InboundEmailPayload {
  type: 'email';
  email_row_id: string | null;
  from: string;
  subject: string;
  body: string;
  message_id: string;
  email_id: string;
}

interface ThreadMeta {
  sender: string;
  senderName: string;
  subject: string;
  messageId: string;
}

/**
 * First-class email channel. Inbound flows through handleInbound() from the
 * api-server email-incoming command. Outbound is intentionally a no-op here —
 * agents send via the Composio RESEND_SEND_EMAIL tool explicitly so that the
 * decide-then-act + AGENT_APPROVAL_MODE gate flow stays intact.
 */
export class EmailChannel implements Channel {
  name = 'email';
  private opts: EmailChannelOpts;
  private connected = false;
  private threadMeta = new Map<string, ThreadMeta>();

  constructor(opts: EmailChannelOpts) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    if (!process.env.AGENT_EMAIL_FROM) {
      logger.info('[email-channel] AGENT_EMAIL_FROM not set — channel disabled');
      return;
    }
    this.connected = true;
    logger.info({ from: process.env.AGENT_EMAIL_FROM }, '[email-channel] connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('email:');
  }

  async sendMessage(_jid: string, _text: string): Promise<void> {
    // No-op by design. Outbound goes through Composio RESEND_SEND_EMAIL with approval gate.
  }

  handleInbound(payload: InboundEmailPayload): void {
    const senderAddr = extractAddress(payload.from);
    const senderName = extractName(payload.from) ?? senderAddr;
    const chatJid = `email:${senderAddr.toLowerCase()}`;

    this.threadMeta.set(chatJid, {
      sender: senderAddr,
      senderName,
      subject: payload.subject,
      messageId: payload.message_id,
    });

    this.opts.onChatMetadata(
      chatJid,
      new Date().toISOString(),
      senderName,
      'email',
      false,
    );

    const content = `[email from ${payload.from}]\nSubject: ${payload.subject}\n\n${payload.body}`;
    const message: NewMessage = {
      id: randomUUID(),
      chat_jid: chatJid,
      sender: `email:${senderAddr}`,
      sender_name: senderName,
      content,
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: false,
    };

    this.opts.onMessage(chatJid, message);
    logger.info(
      { chatJid, from: senderAddr, subject: payload.subject, email_row_id: payload.email_row_id },
      '[email-channel] inbound message delivered',
    );
  }

  getThreadMeta(chatJid: string): ThreadMeta | undefined {
    return this.threadMeta.get(chatJid);
  }
}

function extractAddress(rfc5322: string): string {
  const match = rfc5322.match(/<([^>]+)>/);
  return match ? match[1].trim() : rfc5322.trim();
}

function extractName(rfc5322: string): string | undefined {
  const match = rfc5322.match(/^([^<]+)</);
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, '') || undefined;
}
