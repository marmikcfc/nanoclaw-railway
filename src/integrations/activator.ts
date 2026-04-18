import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';
import { addMcpServer, removeMcpServer, rebuildMcpJson } from '../mcp-installer.js';
import { logger } from '../logger.js';
import { getIntegration } from './catalog.js';

const LOCK_FILE = path.join(DATA_DIR, 'integrations.json');

interface IntegrationsLock {
  active: string[];
}

function readLock(): IntegrationsLock {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
  } catch {
    return { active: [] };
  }
}

function writeLock(lock: IntegrationsLock): void {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
}

export function getActiveIntegrations(): string[] {
  return readLock().active;
}

export function enableIntegration(integrationId: string): void {
  const integration = getIntegration(integrationId);
  if (!integration) throw new Error(`Unknown integration: ${integrationId}`);

  const lock = readLock();
  if (!lock.active.includes(integrationId)) {
    lock.active.push(integrationId);
    writeLock(lock);
  }

  if (integration.implementation.mcp) {
    const { command, args } = integration.implementation.mcp;
    // Build env refs using ${VAR} syntax — addMcpServer parses these refs
    // (see mcp-installer.ts line ~63 which explicitly handles this pattern)
    const env: Record<string, string> = {};
    for (const envKey of Object.values(integration.envVars)) {
      env[envKey] = `\${${envKey}}`;
    }
    addMcpServer(integrationId, { command, args, env });
    rebuildMcpJson();
  }

  logger.info({ integrationId }, 'Integration enabled');
}

export function disableIntegration(integrationId: string): void {
  const lock = readLock();
  lock.active = lock.active.filter((id) => id !== integrationId);
  writeLock(lock);

  const integration = getIntegration(integrationId);
  if (integration?.implementation.mcp) {
    removeMcpServer(integrationId);
    rebuildMcpJson();
  }

  logger.info({ integrationId }, 'Integration disabled');
}

export function syncIntegrationsOnStartup(): void {
  const { active } = readLock();
  if (active.length === 0) return;

  logger.info({ count: active.length }, 'Syncing integrations on startup');
  for (const id of active) {
    try {
      enableIntegration(id);
    } catch (e) {
      logger.error({ err: e, integrationId: id }, 'Failed to activate integration on startup');
    }
  }
}
