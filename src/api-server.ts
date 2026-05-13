import http from 'http';
import fs from 'fs';
import path from 'path';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

import { logger } from './logger.js';
import { GROUPS_DIR } from './config.js';
import { downloadBuffer, processImage, processPdf } from './media.js';
import { Channel } from './types.js';
import {
  deleteTask,
  getAllRegisteredGroups,
  getAllTasks,
  getTaskById,
  storeMessage,
  updateTask,
  deleteSession,
  clearTaskContextCache,
} from './db.js';
import { enableIntegration, disableIntegration } from './integrations/activator.js';
import { reportScheduleHint, reportScheduleMirror } from './task-scheduler.js';

// Lazily resolved to avoid circular import at module load time
let _addAllowedNumber: ((phone: string) => void) | undefined;
let _removeAllowedNumber: ((phone: string) => void) | undefined;

export function setAllowedNumberFns(
  add: (phone: string) => void,
  remove: (phone: string) => void,
): void {
  _addAllowedNumber = add;
  _removeAllowedNumber = remove;
}

// Lazily resolved callbacks for webchat JID handling
let _enqueueWebchat: ((jid: string) => void) | undefined;
let _getWebchatChannel: (() => import('./channels/webchat.js').WebchatChannel | undefined) | undefined;

// Lazily resolved kill callback (set by index.ts after queue is initialised)
let _killProcess: ((jid: string) => boolean) | undefined;

export function setKillProcessFn(fn: (jid: string) => boolean): void {
  _killProcess = fn;
}

export function setWebchatFns(
  enqueue: (jid: string) => void,
  getChannel: () => import('./channels/webchat.js').WebchatChannel | undefined,
): void {
  _enqueueWebchat = enqueue;
  _getWebchatChannel = getChannel;
}

let _schedulerTick: (() => Promise<void>) | undefined;
let _onSessionReset: ((folder: string) => void) | undefined;

export function setSchedulerTickFn(fn: () => Promise<void>): void {
  _schedulerTick = fn;
}

export function setSessionResetFn(fn: (folder: string) => void): void {
  _onSessionReset = fn;
}

let connectedChannels: Channel[] = [];
const startTime = Date.now();

export function setChannels(channels: Channel[]): void {
  connectedChannels = channels;
}

function verifyHmac(body: string, signatureHeader: string | undefined): boolean {
  const isPepperMode = process.env.PEPPER_MODE === 'true';
  const secret = isPepperMode
    ? process.env.PEPPER_SERVICE_SECRET
    : process.env.PEPPER_EVENT_SECRET;

  if (!secret) {
    const varName = isPepperMode ? 'PEPPER_SERVICE_SECRET' : 'PEPPER_EVENT_SECRET';
    logger.warn(`${varName} not set — rejecting command request`);
    return false;
  }
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  if (expected.length !== signatureHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const MAX_BODY_BYTES = 512 * 1024; // 512KB — webhook payloads can be large

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleHealth(res: http.ServerResponse): Promise<void> {
  const channelNames = connectedChannels
    .filter((ch) => ch.isConnected())
    .map((ch) => ch.name);
  json(res, 200, {
    status: 'ok',
    channels: channelNames,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}

async function handleRefreshPairing(_body: unknown, res: http.ServerResponse): Promise<void> {
  const waChannel = connectedChannels.find((ch) => ch.name === 'whatsapp');
  if (!waChannel) {
    json(res, 404, { error: 'WhatsApp channel not active' });
    return;
  }
  if (!waChannel.refreshPairing) {
    json(res, 501, { error: 'Channel does not support pairing refresh' });
    return;
  }
  // Fire-and-forget: pairing requires user interaction (entering code on phone)
  // which takes longer than the proxy timeout. Return immediately and let the
  // new pairing code arrive via the existing pushToCloud → Realtime path.
  waChannel.refreshPairing().catch((err) => {
    logger.error({ err }, 'Failed to refresh pairing');
  });
  json(res, 200, { success: true, message: 'Pairing refresh initiated' });
}

async function handleEnableIntegration(body: unknown, res: http.ServerResponse): Promise<void> {
  const { integrationId } = body as { integrationId: string };
  if (!integrationId) { json(res, 400, { error: 'integrationId required' }); return; }
  enableIntegration(integrationId);
  json(res, 200, { success: true });
}

async function handleDisableIntegration(body: unknown, res: http.ServerResponse): Promise<void> {
  const { integrationId } = body as { integrationId: string };
  if (!integrationId) { json(res, 400, { error: 'integrationId required' }); return; }
  disableIntegration(integrationId);
  json(res, 200, { success: true });
}

export async function processWebhookEvent(body: unknown): Promise<void> {
  // PEPPER_MODE: all webhook-event calls go to the Pepper agent runner
  if (process.env.PEPPER_MODE === 'true') {
    const { runPepperRailwayAgent } = await import('./pepper-tasks/runner.js');
    runPepperRailwayAgent(body).catch((err) => {
      logger.error({ err }, 'Pepper Railway agent error');
    });
    return;
  }

  const { integrationId, eventType, payload } = body as {
    integrationId: string;
    eventType: string;
    payload: unknown;
  };

  // Webchat path: bypass groupEntries lookup, store directly to admin@pepper
  if (integrationId === 'webchat') {
    const { content, traceId, task_id, turn_id, attachments: rawAttachments } = (payload as {
      content?: string;
      traceId: string;
      task_id?: string;
      turn_id?: string;
      attachments?: { url: string; mimeType: string; filename?: string }[];
    });
    logger.info(
      {
        traceId,
        taskId: task_id ?? null,
        turnId: turn_id ?? null,
        contentLength: content?.length ?? 0,
        attachmentCount: rawAttachments?.length ?? 0,
      },
      'Webchat webhook received',
    );

    // Download and process any attachments (images/PDFs)
    const processedAttachments: import('./media.js').ProcessedAttachment[] = [];
    if ((rawAttachments ?? []).length > 0) {
      logger.info({ count: rawAttachments!.length }, 'Downloading webchat attachments');
    }
    for (const att of rawAttachments ?? []) {
      try {
        logger.info({ mimeType: att.mimeType, filename: att.filename }, 'Downloading attachment');
        const buffer = await downloadBuffer(att.url);
        logger.info({ mimeType: att.mimeType, filename: att.filename, bytes: buffer.length }, 'Attachment downloaded');
        const processed = att.mimeType === 'application/pdf'
          ? processPdf(buffer, att.filename)
          : await processImage(buffer, att.mimeType, att.filename);
        logger.info({ type: processed.type, filename: processed.filename, base64Len: processed.base64.length }, 'Attachment processed');
        processedAttachments.push(processed);
      } catch (err) {
        logger.warn({ err, url: att.url }, 'Failed to process webchat attachment');
      }
    }
    logger.info(
      { requested: (rawAttachments ?? []).length, processed: processedAttachments.length },
      'Attachment processing complete',
    );

    const rawContent = content || processedAttachments.map((a) =>
      a.type === 'image' ? '[Image]' : '[PDF]'
    ).join(' ') || '';
    // Context is now pulled by Railway on-demand (context-fetcher.ts),
    // no longer embedded in stored messages.
    const messageContent = rawContent;

    storeMessage({
      id: randomUUID(),
      chat_jid: 'admin@pepper',
      sender: 'dashboard-owner',
      sender_name: 'You',
      content: messageContent,
      timestamp: new Date().toISOString(),
      is_from_me: true,
      is_bot_message: false,
      attachments: processedAttachments.length ? processedAttachments : undefined,
    });

    // Queue the trace ID on the channel BEFORE enqueueing. Using incomingTraceId
    // (not currentTraceId) keeps the handoff separate from the restore that
    // processGroupMessages performs just before sendMessage, preventing a new
    // webhook from overwriting a mid-flight run's traceId.
    // task_id is always a real UUID from the cloud (get-or-create misc task),
    // so no sentinel needed here.
    const channel = _getWebchatChannel?.();
    if (channel) {
      channel.incomingTraceIds.push(traceId);
      channel.incomingTaskIds.push(task_id ?? null);
      channel.incomingTurnIds.push(turn_id ?? null);
      logger.info(
        {
          traceId,
          taskId: task_id ?? null,
          turnId: turn_id ?? null,
          queuedTraceIds: channel.incomingTraceIds.length,
          queuedTaskIds: channel.incomingTaskIds.length,
          queuedTurnIds: channel.incomingTurnIds.length,
        },
        'Webchat webhook queued for group processing',
      );
    } else {
      logger.warn({ traceId, taskId: task_id ?? null, turnId: turn_id ?? null }, 'Webchat webhook had no channel instance');
    }

    if (_enqueueWebchat) {
      _enqueueWebchat('admin@pepper');
      logger.info({ traceId, taskId: task_id ?? null, turnId: turn_id ?? null }, 'Webchat group enqueue requested');
    } else {
      logger.warn({ traceId, taskId: task_id ?? null }, 'Webchat enqueue function missing');
    }
    return;
  }

  // Deliver webhook to first registered group (single-tenant Railway deploys typically have one)
  const groups = getAllRegisteredGroups();
  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    logger.warn({ integrationId }, 'Webhook received but no group registered');
    return;
  }

  const [mainJid] = groupEntries[0];
  storeMessage({
    id: randomUUID(),
    chat_jid: mainJid,
    sender: `webhook:${integrationId}`,
    sender_name: integrationId,
    content: `[${integrationId} webhook: ${eventType}]\n\n${JSON.stringify(payload, null, 2)}`,
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  });
}

async function handleWebhookEvent(body: unknown, res: http.ServerResponse): Promise<void> {
  await processWebhookEvent(body);

  if (process.env.PEPPER_MODE === 'true') {
    json(res, 202, { accepted: true });
    return;
  }
  json(res, 200, { ok: true });
}

async function handleDrainInbox(body: unknown, res: http.ServerResponse): Promise<void> {
  const payload = (body as { event_id?: string; reason?: string }) || {};
  logger.info(
    {
      eventId: payload.event_id ?? null,
      reason: payload.reason ?? null,
    },
    '[railway<-cloud] drain-inbox requested',
  );

  json(res, 202, { accepted: true, draining: true });

  import('./cloud-inbox-drain.js')
    .then(({ drainCloudInboxEvents }) => drainCloudInboxEvents())
    .catch((err) => {
      logger.error(
        {
          eventId: payload.event_id ?? null,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        '[railway<-cloud] drain-inbox failed',
      );
    });
}

async function handleAllowNumber(body: unknown, res: http.ServerResponse): Promise<void> {
  const payload = body as Record<string, unknown>;
  const phone = payload?.phone;
  if (typeof phone !== 'string' || !phone) {
    json(res, 400, { error: 'Missing phone in payload' });
    return;
  }
  if (_addAllowedNumber) {
    _addAllowedNumber(phone);
    logger.info({ phone }, 'Added phone to WhatsApp whitelist');
    json(res, 200, { success: true });
  } else {
    json(res, 503, { error: 'Whitelist not yet initialised' });
  }
}

async function handleRemoveNumber(body: unknown, res: http.ServerResponse): Promise<void> {
  const payload = body as Record<string, unknown>;
  const phone = payload?.phone;
  if (typeof phone !== 'string' || !phone) {
    json(res, 400, { error: 'Missing phone in payload' });
    return;
  }
  if (_removeAllowedNumber) {
    _removeAllowedNumber(phone);
    logger.info({ phone }, 'Removed phone from WhatsApp whitelist');
    json(res, 200, { success: true });
  } else {
    json(res, 503, { error: 'Whitelist not yet initialised' });
  }
}

async function handleSendFile(body: unknown, res: http.ServerResponse): Promise<void> {
  const p = body as {
    artifact_id?: string;
    filename?: string;
    mime_type?: string;
    ephemeral_url?: string;
    chat_jid?: string;
    channel?: string;
  };

  if (!p.ephemeral_url || !p.chat_jid || !p.filename) {
    json(res, 400, { error: 'Missing ephemeral_url, chat_jid, or filename' });
    return;
  }

  // Find the right channel — prefer the specified one, fall back to any connected
  const channel = connectedChannels.find(
    (ch) => ch.isConnected() && (!p.channel || ch.name === p.channel),
  ) ?? connectedChannels.find((ch) => ch.isConnected());

  if (!channel) {
    json(res, 503, { error: 'No connected channel available' });
    return;
  }

  if (!channel.sendFile) {
    json(res, 501, { error: `Channel "${channel.name}" does not support sendFile` });
    return;
  }

  // Acknowledge immediately; delivery is async
  json(res, 200, { ok: true });

  channel.sendFile(p.chat_jid, p.ephemeral_url, p.filename, p.mime_type ?? 'application/octet-stream').catch(
    (err) => {
      logger.error({ err, artifact_id: p.artifact_id, chat_jid: p.chat_jid }, 'sendFile failed');
    },
  );
}

async function handleCronTick(_body: unknown, res: http.ServerResponse): Promise<void> {
  if (!_schedulerTick) {
    json(res, 503, { error: 'Scheduler not initialised' });
    return;
  }
  // Fire-and-forget: task execution is async and long-running.
  // Respond immediately so the cron service can exit cleanly.
  json(res, 200, { ok: true });
  _schedulerTick().catch((err) => {
    logger.error({ err }, 'cron-tick handler error');
  });
}

function runtimeScheduleId(body: unknown): string | null {
  const id = (body as { runtime_schedule_id?: string })?.runtime_schedule_id;
  return id || null;
}

async function handleListScheduledTasks(_body: unknown, res: http.ServerResponse): Promise<void> {
  json(res, 200, { tasks: getAllTasks() });
}

async function handlePauseScheduledTask(body: unknown, res: http.ServerResponse): Promise<void> {
  const taskId = runtimeScheduleId(body);
  if (!taskId) {
    json(res, 400, { error: 'runtime_schedule_id required' });
    return;
  }
  const task = getTaskById(taskId);
  if (!task) {
    json(res, 404, { error: 'Scheduled task not found' });
    return;
  }
  updateTask(taskId, { status: 'paused' });
  const updatedTask = getTaskById(taskId)!;
  void reportScheduleMirror('pause', updatedTask);
  void reportScheduleHint();
  json(res, 200, { ok: true, task: updatedTask });
}

async function handleResumeScheduledTask(body: unknown, res: http.ServerResponse): Promise<void> {
  const taskId = runtimeScheduleId(body);
  if (!taskId) {
    json(res, 400, { error: 'runtime_schedule_id required' });
    return;
  }
  const task = getTaskById(taskId);
  if (!task) {
    json(res, 404, { error: 'Scheduled task not found' });
    return;
  }
  updateTask(taskId, { status: 'active' });
  const updatedTask = getTaskById(taskId)!;
  void reportScheduleMirror('resume', updatedTask);
  void reportScheduleHint();
  json(res, 200, { ok: true, task: updatedTask });
}

async function handleCancelScheduledTask(body: unknown, res: http.ServerResponse): Promise<void> {
  const taskId = runtimeScheduleId(body);
  if (!taskId) {
    json(res, 400, { error: 'runtime_schedule_id required' });
    return;
  }
  const task = getTaskById(taskId);
  if (!task) {
    json(res, 404, { error: 'Scheduled task not found' });
    return;
  }
  void reportScheduleMirror('cancel', task, 'cancelled');
  deleteTask(taskId);
  void reportScheduleHint();
  json(res, 200, { ok: true, task: { ...task, status: 'cancelled', next_run: null } });
}

async function handleResetSession(body: unknown, res: http.ServerResponse): Promise<void> {
  const { groupFolder } = (body as { groupFolder?: string }) || {};
  const folder = groupFolder || 'webchat';

  // Clear session from DB
  deleteSession(folder);
  clearTaskContextCache();

  // Delete session directory on disk
  const sessionDir = path.join(GROUPS_DIR, '..', 'sessions', folder, '.claude');
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err, sessionDir }, 'Failed to delete session directory');
    }
  }

  // Clear in-memory session map
  _onSessionReset?.(folder);

  logger.info({ folder }, 'Session reset');
  json(res, 200, { ok: true });
}

async function handlePushApproval(body: unknown, res: http.ServerResponse): Promise<void> {
  const p = body as {
    channel?: string;
    chat_jid?: string;
    approval_id?: string;
    tool_name?: string;
    tool_input_summary?: string;
  };

  if (!p.channel || !p.chat_jid || !p.approval_id) {
    json(res, 400, { error: 'Missing channel, chat_jid, or approval_id' });
    return;
  }

  const channel = connectedChannels.find((ch) => ch.name === p.channel && ch.isConnected());
  if (!channel) {
    json(res, 503, { error: `Channel "${p.channel}" not connected` });
    return;
  }

  // Duck-type: only channels exposing sendApprovalRequest can render buttons.
  const cap = channel as Channel & {
    sendApprovalRequest?: (
      jid: string,
      approvalId: string,
      toolName: string,
      summary: string,
    ) => Promise<void>;
  };
  if (!cap.sendApprovalRequest) {
    json(res, 501, { error: `Channel "${p.channel}" does not support approval buttons` });
    return;
  }

  json(res, 200, { ok: true });
  cap
    .sendApprovalRequest(p.chat_jid, p.approval_id, p.tool_name ?? 'tool', p.tool_input_summary ?? '')
    .catch((err) => {
      logger.error({ err, approval_id: p.approval_id, chat_jid: p.chat_jid }, 'sendApprovalRequest failed');
    });
}

// Plain text notification push — used by the cloud's notification-dispatch worker
// for task `notify_on_done` events. Mirror of handlePushApproval but without
// inline button rendering — just `sendMessage(jid, text)`.
async function handlePushNotification(body: unknown, res: http.ServerResponse): Promise<void> {
  const p = body as {
    channel?: string;
    chat_jid?: string;
    text?: string;
  };

  if (!p.channel || !p.chat_jid || !p.text) {
    json(res, 400, { error: 'Missing channel, chat_jid, or text' });
    return;
  }

  const channel = connectedChannels.find((ch) => ch.name === p.channel && ch.isConnected());
  if (!channel) {
    json(res, 503, { error: `Channel "${p.channel}" not connected` });
    return;
  }

  json(res, 200, { ok: true });
  channel.sendMessage(p.chat_jid, p.text).catch((err) => {
    logger.error({ err, channel: p.channel, chat_jid: p.chat_jid }, 'sendMessage failed for push-notification');
  });
}

async function handleStopQuery(_body: unknown, res: http.ServerResponse): Promise<void> {
  const killed = _killProcess?.('admin@pepper');
  if (!killed) {
    // No active process — nothing to kill (idempotent)
    json(res, 200, { ok: true, message: 'No active process' });
    return;
  }
  logger.info('Stop-query command received — SIGTERM sent to agent process');
  json(res, 200, { ok: true });
}

// Wake an agent because a task transitioned into a status this agent listens for,
// or because a next_task_id chain activated. Mirrors the webchat trigger path used
// by the delegate route so the agent picks up the task immediately.
export async function processWakeTask(body: unknown): Promise<void> {
  const { task_id, reason, task_title, task_description } =
    (body as { task_id?: string; reason?: string; task_title?: string; task_description?: string }) || {};

  if (!task_id) {
    throw new Error('task_id required');
  }

  logger.info({ task_id, reason, task_title }, 'wake-task received — triggering agent');

  // Build a briefing the agent will see as its incoming message.
  const briefing = task_title
    ? `**Task ready:** ${task_title}${task_description ? `\n\n${task_description}` : ''}`
    : `You have a new task (id: ${task_id}). Check your task list and proceed.`;

  storeMessage({
    id: randomUUID(),
    chat_jid: 'admin@pepper',
    sender: 'system',
    sender_name: 'System',
    content: briefing,
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  });

  // Register task_id so the agent's turn is attributed to this task.
  const channel = _getWebchatChannel?.();
  if (channel) {
    channel.incomingTraceIds.push(randomUUID());
    channel.incomingTaskIds.push(task_id);
    channel.incomingTurnIds.push((body as { turn_id?: string })?.turn_id ?? null);
  }

  _enqueueWebchat?.('admin@pepper');
}

async function handleWakeTask(body: unknown, res: http.ServerResponse): Promise<void> {
  try {
    await processWakeTask(body);
  } catch (err) {
    json(res, 400, { error: err instanceof Error ? err.message : 'wake-task failed' });
    return;
  }
  json(res, 200, { ok: true });
}

export async function processSlackIncomingEvent(event: unknown, teamId?: string, turnId?: string): Promise<void> {
  const slackChannel = connectedChannels.find(
    (ch) => ch.name === 'slack' && 'handleSlackEvent' in ch,
  ) as (Channel & { handleSlackEvent(e: unknown, t?: string): Promise<void> }) | undefined;

  if (!slackChannel) {
    throw new Error('Slack channel not connected');
  }

  const channelId = (event as { channel?: string })?.channel;
  if (turnId && channelId && 'setIncomingTurnId' in slackChannel) {
    (slackChannel as Channel & { setIncomingTurnId(jid: string, turnId: string): void })
      .setIncomingTurnId(`slack:${channelId}`, turnId);
  }

  await slackChannel.handleSlackEvent(event, teamId);
}

async function handleSlackIncoming(body: unknown, res: http.ServerResponse): Promise<void> {
  const { event, team_id, turn_id } = body as { event?: unknown; team_id?: string; turn_id?: string };
  if (!event) {
    json(res, 400, { error: 'Missing event' });
    return;
  }

  try {
    await processSlackIncomingEvent(event, team_id, turn_id);
    json(res, 200, { ok: true });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.stack : err }, 'Slack handleSlackEvent failed');
    json(res, 503, { error: err instanceof Error ? err.message : 'Slack handling failed' });
  }
}

export async function processTelegramIncomingUpdate(update: unknown, turnId?: string): Promise<void> {
  const upd = update as { message?: { chat?: { id: number }; text?: string; message_id?: number } };
  logger.info({ chatId: upd.message?.chat?.id, text: upd.message?.text?.slice(0, 60), msgId: upd.message?.message_id }, '[tg-incoming] update parsed');

  const tgChannel = connectedChannels.find(
    (ch) => ch.name === 'telegram' && 'handleUpdate' in ch,
  ) as (Channel & { handleUpdate(u: unknown): Promise<void> }) | undefined;

  logger.info({ found: !!tgChannel, connectedChannelCount: connectedChannels.length, channelNames: connectedChannels.map((c) => c.name) }, '[tg-incoming] channel lookup');

  if (!tgChannel) {
    logger.error('[tg-incoming] Telegram channel NOT connected — cannot handle update');
    throw new Error('Telegram channel not connected');
  }

  const chatId = upd.message?.chat?.id;
  if (turnId && chatId != null && 'setIncomingTurnId' in tgChannel) {
    (tgChannel as Channel & { setIncomingTurnId(jid: string, turnId: string): void })
      .setIncomingTurnId(`tg:${chatId}`, turnId);
  }

  logger.info('[tg-incoming] dispatching handleUpdate');
  await tgChannel.handleUpdate(update);
  logger.info('[tg-incoming] handleUpdate completed');
}

async function handleEmailIncoming(body: unknown, res: http.ServerResponse): Promise<void> {
  const p = body as {
    type?: string;
    from?: string;
    subject?: string;
    body?: string;
    message_id?: string;
    email_id?: string;
  };

  if (!p.from || !p.message_id) {
    json(res, 400, { error: 'Missing required fields: from, message_id' });
    return;
  }

  const subject = p.subject ?? '';
  const content = `[email from ${p.from}]\nSubject: ${subject}\n\n${p.body ?? ''}`;

  try {
    storeMessage({
      id: randomUUID(),
      chat_jid: 'admin@pepper',
      sender: `email:${p.from}`,
      sender_name: p.from,
      content,
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: false,
    });

    const channel = _getWebchatChannel?.();
    if (channel) {
      channel.incomingTraceIds.push(randomUUID());
      channel.incomingTaskIds.push(null);
      channel.incomingTurnIds.push(null);
    }

    _enqueueWebchat?.('admin@pepper');

    logger.info({ from: p.from, subject, message_id: p.message_id }, 'email-incoming stored and enqueued');
    json(res, 200, { ok: true });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.stack : err }, 'email-incoming handler failed');
    json(res, 503, { error: err instanceof Error ? err.message : 'Email handling failed' });
  }
}

async function handleTelegramIncoming(body: unknown, res: http.ServerResponse): Promise<void> {
  const { update, turn_id } = body as { update?: unknown; turn_id?: string };
  logger.info({ has_update: !!update }, '[tg-incoming] received from Vercel gateway');
  if (!update) {
    logger.warn('[tg-incoming] missing update field in body');
    json(res, 400, { error: 'Missing update' });
    return;
  }

  try {
    await processTelegramIncomingUpdate(update, turn_id);
    json(res, 200, { ok: true });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.stack : err, update: JSON.stringify(update).slice(0, 200) }, '[tg-incoming] handleUpdate FAILED');
    json(res, 503, { error: err instanceof Error ? err.message : 'Telegram handling failed' });
  }
}

async function handleVapiWebhook(body: string, parsedBody: unknown, res: http.ServerResponse): Promise<void> {
  const payload = parsedBody as {
    type?: string;
    call?: { id?: string; status?: string; endedReason?: string };
    transcript?: string;
    recordingUrl?: string;
    summary?: string;
  };

  const callId = payload.call?.id ?? 'unknown';
  const status = payload.call?.status ?? 'unknown';
  const endedReason = payload.call?.endedReason ?? 'unknown';
  const transcript = payload.transcript ?? '(no transcript)';
  const recordingUrl = payload.recordingUrl ?? '(no recording)';

  const content = `[vapi call completed: ${callId}]\n\nStatus: ${status}\nEnded: ${endedReason}\nRecording: ${recordingUrl}\n\nTranscript:\n${transcript}`;

  const groups = getAllRegisteredGroups();
  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    logger.warn({ callId }, 'VAPI webhook received but no group registered');
    json(res, 200, { ok: true });
    return;
  }

  const [mainJid] = groupEntries[0];
  storeMessage({
    id: randomUUID(),
    chat_jid: mainJid,
    sender: 'webhook:vapi',
    sender_name: 'VAPI',
    content,
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  });

  logger.info({ callId, status, endedReason }, 'VAPI call-completed webhook stored');
  json(res, 200, { ok: true });
}

async function handleBolnaWebhook(body: string, parsedBody: unknown, res: http.ServerResponse): Promise<void> {
  const payload = parsedBody as {
    call_id?: string;
    status?: string;
    transcript?: string;
    recording_url?: string;
    end_reason?: string;
  };

  const callId = payload.call_id ?? 'unknown';
  const status = payload.status ?? 'unknown';
  const endReason = payload.end_reason ?? 'unknown';
  const transcript = payload.transcript ?? '(no transcript)';
  const recordingUrl = payload.recording_url ?? '(no recording)';

  const content = `[bolna call completed: ${callId}]\n\nStatus: ${status}\nEnded: ${endReason}\nRecording: ${recordingUrl}\n\nTranscript:\n${transcript}`;

  const groups = getAllRegisteredGroups();
  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    logger.warn({ callId }, 'Bolna webhook received but no group registered');
    json(res, 200, { ok: true });
    return;
  }

  const [mainJid] = groupEntries[0];
  storeMessage({
    id: randomUUID(),
    chat_jid: mainJid,
    sender: 'webhook:bolna',
    sender_name: 'Bolna',
    content,
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  });

  logger.info({ callId, status, endReason }, 'Bolna call-completed webhook stored');
  json(res, 200, { ok: true });
}

const ALLOWED_COMMANDS: Record<string, (body: unknown, res: http.ServerResponse) => Promise<void>> = {
  'refresh-pairing': handleRefreshPairing,
  'enable-integration': handleEnableIntegration,
  'disable-integration': handleDisableIntegration,
  'webhook-event': handleWebhookEvent,
  'drain-inbox': handleDrainInbox,
  'allow-number': handleAllowNumber,
  'remove-number': handleRemoveNumber,
  'send-file': handleSendFile,
  'cron-tick': handleCronTick,
  'list-scheduled-tasks': handleListScheduledTasks,
  'pause-scheduled-task': handlePauseScheduledTask,
  'resume-scheduled-task': handleResumeScheduledTask,
  'cancel-scheduled-task': handleCancelScheduledTask,
  'reset-session': handleResetSession,
  'email-incoming': handleEmailIncoming,
  'telegram-incoming': handleTelegramIncoming,
  'slack-incoming': handleSlackIncoming,
  'stop-query': handleStopQuery,
  'wake-task': handleWakeTask,
  'push-approval': handlePushApproval,
  'push-notification': handlePushNotification,
};

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url || '';
  const method = req.method || '';
  const startedAt = Date.now();
  logger.info(
    {
      method,
      url,
      userAgent: req.headers['user-agent'] ?? null,
      forwardedFor: req.headers['x-forwarded-for'] ?? null,
      remoteAddress: req.socket.remoteAddress ?? null,
    },
    '[railway-http] request received',
  );
  res.once('finish', () => {
    logger.info(
      {
        method,
        url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      '[railway-http] request completed',
    );
  });

  // Health check — no auth required
  if (method === 'GET' && url === '/api/health') {
    return handleHealth(res);
  }

  // Public webhook endpoints — VAPI and Bolna call-completed events (no HMAC required)
  const webhookMatch = url.match(/^\/webhooks\/(vapi|bolna)$/);
  if (method === 'POST' && webhookMatch) {
    const provider = webhookMatch[1] as 'vapi' | 'bolna';
    const body = await readBody(req);
    let parsed: unknown = {};
    try { parsed = JSON.parse(body); } catch {}
    if (provider === 'vapi') return handleVapiWebhook(body, parsed, res);
    return handleBolnaWebhook(body, parsed, res);
  }

  // Command endpoints — require HMAC auth
  const commandMatch = url.match(/^\/api\/commands\/(.+)$/);
  if (method === 'POST' && commandMatch) {
    const command = commandMatch[1];
    const body = await readBody(req);
    const signature = req.headers['x-event-signature'] as string | undefined;
    logger.info(
      {
        command,
        method,
        bodyBytes: Buffer.byteLength(body),
        hasSignature: Boolean(signature),
        userAgent: req.headers['user-agent'] ?? null,
        forwardedFor: req.headers['x-forwarded-for'] ?? null,
      },
      '[railway<-cloud] command received',
    );

    if (!verifyHmac(body, signature)) {
      logger.warn(
        {
          command,
          hasSignature: Boolean(signature),
          bodyBytes: Buffer.byteLength(body),
        },
        '[railway<-cloud] command rejected: invalid signature',
      );
      json(res, 401, { error: 'Invalid signature' });
      return;
    }
    logger.info({ command }, '[railway<-cloud] command authenticated');

    const handler = ALLOWED_COMMANDS[command];
    if (!handler) {
      logger.warn({ command }, '[railway<-cloud] command rejected: unknown command');
      json(res, 400, { error: `Unknown command: ${command}` });
      return;
    }

    let parsed: unknown = {};
    try { parsed = JSON.parse(body); } catch {}
    logger.info({ command }, '[railway<-cloud] command dispatching handler');
    try {
      await handler(parsed, res);
      logger.info(
        {
          command,
          responseEnded: res.writableEnded,
          statusCode: res.statusCode,
        },
        '[railway<-cloud] command handler completed',
      );
      return;
    } catch (err) {
      logger.error(
        {
          command,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        '[railway<-cloud] command handler failed',
      );
      throw err;
    }
  }

  // Preview route — serve HTML/CSS/JS/images from preview directory (no auth)
  const previewMatch = url.match(/^\/preview\/(.+)$/);
  if (method === 'GET' && previewMatch) {
    const filename = decodeURIComponent(previewMatch[1]);
    if (filename.includes('..')) {
      return json(res, 400, { error: 'Invalid filename' });
    }
    // Serve from any group's preview dir — find the file
    const groupDirs = fs.existsSync(GROUPS_DIR) ? fs.readdirSync(GROUPS_DIR) : [];
    for (const group of groupDirs) {
      const filePath = path.join(GROUPS_DIR, group, 'preview', filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
          '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif',
          '.webp': 'image/webp', '.ico': 'image/x-icon',
        };
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    return json(res, 404, { error: 'Preview not found' });
  }

  json(res, 404, { error: 'Not found' });
}

export function startApiServer(port: number): void {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      logger.error({ err }, 'API server error');
      if (!res.writableEnded) {
        json(res, 500, { error: 'Internal server error' });
      }
    });
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'API server listening');
  });

  server.on('error', (err) => {
    logger.error({ err }, 'API server failed to start');
  });
}
