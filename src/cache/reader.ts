import type { Logger } from '../providers/common/logger.ts';
import { readCache } from './file.ts';
import { REFRESH_INTERVAL_SECONDS, STALE_THRESHOLD_MULTIPLIER, type CacheSchema } from './types.ts';

export interface DisplayCache {
  providers: CacheSchema['providers'];
  updatedAt: string;
  isStale: boolean;
}

export const loadCacheForDisplay = async (logger: Logger): Promise<DisplayCache | null> => {
  const cache = await readCache(logger);
  if (!cache) {
    await logger.warn('No cache available');
    return null;
  }

  const updatedAt = new Date(cache.updated_at);
  const now = new Date();
  const staleThresholdMs = REFRESH_INTERVAL_SECONDS * 1000 * STALE_THRESHOLD_MULTIPLIER;
  const isStale = now.getTime() - updatedAt.getTime() > staleThresholdMs;

  if (isStale) {
    await logger.debug('Cache is stale', {
      updatedAt: cache.updated_at,
      staleThresholdSeconds: REFRESH_INTERVAL_SECONDS * STALE_THRESHOLD_MULTIPLIER,
    });
  }

  const configuredProviders: CacheSchema['providers'] = {} as CacheSchema['providers'];

  for (const [providerId, entry] of Object.entries(cache.providers)) {
    if (entry.configured) {
      configuredProviders[providerId as keyof typeof configuredProviders] = entry;
    }
  }

  return {
    providers: configuredProviders,
    updatedAt: cache.updated_at,
    isStale,
  };
};
