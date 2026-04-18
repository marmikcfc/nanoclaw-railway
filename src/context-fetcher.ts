import { createHmac } from 'crypto';

import {
  getTaskContextCache,
  markTaskContextInjected,
  setTaskContextCache,
} from './db.js';
import { logger } from './logger.js';

/**
 * Returns task context if it hasn't been injected into the current session yet.
 * Fetches from cloud on first call per task_id, then caches in SQLite.
 * Returns null if already injected, or if fetch fails (will retry next message).
 */
export async function getTaskContextIfNeeded(
  taskId: string,
): Promise<string | null> {
  const cached = getTaskContextCache(taskId);
  if (cached?.injected) return null;

  if (cached) {
    markTaskContextInjected(taskId);
    return cached.context;
  }

  // Fetch from cloud
  const cloudUrl = process.env.PEPPER_CLOUD_URL;
  const agentId = process.env.AGENT_ID;
  const secret = process.env.PEPPER_EVENT_SECRET;
  if (!cloudUrl || !agentId || !secret) return null;

  try {
    const signature = createHmac('sha256', secret).update(taskId).digest('hex');
    const res = await fetch(`${cloudUrl}/api/context/${agentId}/${taskId}`, {
      headers: { 'x-event-signature': signature },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, taskId }, 'Failed to fetch task context from cloud');
      return null;
    }

    const data = (await res.json()) as { context?: string };
    const context = data.context || '';

    if (context) {
      setTaskContextCache(taskId, context);
      markTaskContextInjected(taskId);
      return context;
    }

    return null;
  } catch (err) {
    logger.warn({ err, taskId }, 'Error fetching task context from cloud');
    return null;
  }
}
