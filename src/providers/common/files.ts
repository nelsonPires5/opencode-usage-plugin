import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Logger } from './logger.ts';
import type { OpenCodeAuth } from '../../types/index.ts';

export const xdgDataHome = (): string =>
  process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');

export const xdgConfigHome = (): string =>
  process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');

export const xdgCacheHome = (): string => process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache');

export const AUTH_PATHS = {
  opencode: (): string => join(xdgDataHome(), 'opencode', 'auth.json'),
  openaiPlugin: (): string => join(homedir(), '.opencode', 'auth', 'openai.json'),
  antigravityConfig: (): string => join(xdgConfigHome(), 'opencode', 'antigravity-accounts.json'),
  antigravityData: (): string => join(xdgDataHome(), 'opencode', 'antigravity-accounts.json'),
} as const;

export const readJson = async <T>(filePath: string, logger?: Logger): Promise<T | null> => {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (logger) {
      const message = error instanceof Error ? error.message : String(error);
      await logger.debug(`Auth file not found or invalid: ${filePath}`, { error: message });
    }
    return null;
  }
};

export const loadOpenCodeAuth = async (logger?: Logger): Promise<OpenCodeAuth | null> => {
  return readJson<OpenCodeAuth>(AUTH_PATHS.opencode(), logger);
};
