import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';

import { xdgCacheHome } from '../providers/common/files.ts';
import type { Logger } from '../providers/common/logger.ts';
import type { CacheSchema } from './types.ts';

const CACHE_DIR = (): string => `${xdgCacheHome()}/opencode/opencode-usage-plugin`;

export const CACHE_PATH = (): string => `${CACHE_DIR()}/usage.json`;

const TMP_PATH = (): string => `${CACHE_PATH()}.tmp`;

const ensureCacheDir = async (): Promise<void> => {
  try {
    await mkdir(CACHE_DIR(), { recursive: true });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code !== 'EEXIST'
    ) {
      throw error;
    }
  }
};

export const readCache = async (logger?: Logger): Promise<CacheSchema | null> => {
  try {
    const content = await readFile(CACHE_PATH(), 'utf-8');
    const parsed = JSON.parse(content) as unknown;

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'schema_version' in parsed &&
      'updated_at' in parsed &&
      'refresh_interval_seconds' in parsed &&
      'providers' in parsed
    ) {
      return parsed as CacheSchema;
    }

    await logger?.warn('Invalid cache schema, returning null');
    return null;
  } catch (error) {
    if (logger) {
      const message = error instanceof Error ? error.message : String(error);
      await logger.debug('Cache file not found or invalid', { error: message });
    }
    return null;
  }
};

export const writeCache = async (cache: CacheSchema, logger?: Logger): Promise<void> => {
  try {
    await ensureCacheDir();
    const content = JSON.stringify(cache, null, 2);
    await writeFile(TMP_PATH(), content, 'utf-8');
    await rename(TMP_PATH(), CACHE_PATH());
    await logger?.debug('Cache written successfully', { path: CACHE_PATH() });
  } catch (error) {
    await logger?.error('Failed to write cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const clearCache = async (logger?: Logger): Promise<void> => {
  try {
    await unlink(CACHE_PATH());
    await logger?.debug('Cache cleared', { path: CACHE_PATH() });
  } catch (error) {
    if (logger) {
      const code =
        error instanceof Error && 'code' in error ? (error as { code: string }).code : 'UNKNOWN';
      if (code === 'ENOENT') {
        await logger.debug('Cache file does not exist, nothing to clear');
      } else {
        await logger?.error('Failed to clear cache', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
};
