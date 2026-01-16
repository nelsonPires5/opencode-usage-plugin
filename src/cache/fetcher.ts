import { fetchGoogleUsage } from '../providers/google/fetch.ts';
import { fetchOpenaiUsage } from '../providers/openai/fetch.ts';
import { fetchZaiUsage } from '../providers/zai-coding-plan/fetch.ts';
import type { Logger } from '../providers/common/logger.ts';
import { PROVIDERS, type ProviderId, type ProviderResult } from '../types/index.ts';
import { readCache, writeCache } from './file.ts';
import { REFRESH_INTERVAL_SECONDS, SCHEMA_VERSION, type CacheSchema } from './types.ts';

const fetchUsage = async (provider: ProviderId, logger: Logger): Promise<ProviderResult> => {
  switch (provider) {
    case 'openai':
      return fetchOpenaiUsage(logger);
    case 'google':
      return fetchGoogleUsage(logger);
    case 'zai-coding-plan':
      return fetchZaiUsage(logger);
  }
};

export const fetchAllProviders = async (logger: Logger): Promise<CacheSchema> => {
  await logger.info('Fetching usage for all providers');

  const existingCache = await readCache(logger);

  const results = await Promise.all(PROVIDERS.map((provider) => fetchUsage(provider, logger)));

  const providers: Record<ProviderId, CacheSchema['providers'][ProviderId]> = {} as Record<
    ProviderId,
    CacheSchema['providers'][ProviderId]
  >;

  const now = new Date().toISOString();

  for (const result of results) {
    const providerId = result.provider;
    const wasConfigured = existingCache?.providers[providerId]?.configured ?? false;

    providers[providerId] = {
      supported: true,
      configured: result.configured,
      last_attempt_at: now,
      last_success_at: result.ok ? now : null,
      data: result.ok ? result.usage : null,
      error: result.ok ? null : (result.error ?? null),
    };

    if (!result.configured && wasConfigured) {
      providers[providerId].data = null;
      await logger.debug(`Wiped data for ${providerId} (no longer configured)`);
    }
  }

  const cache: CacheSchema = {
    schema_version: SCHEMA_VERSION,
    updated_at: now,
    refresh_interval_seconds: REFRESH_INTERVAL_SECONDS,
    providers,
  };

  await writeCache(cache, logger);
  return cache;
};
