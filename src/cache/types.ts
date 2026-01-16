import type { ProviderId, ProviderUsage } from '../types/index.ts';

export const SCHEMA_VERSION = 1;
export const REFRESH_INTERVAL_SECONDS = 300;
export const STALE_THRESHOLD_MULTIPLIER = 2;

export interface ProviderCacheEntry {
  supported: boolean;
  configured: boolean;
  last_attempt_at: string;
  last_success_at: string | null;
  data: ProviderUsage | null;
  error: string | null;
}

export interface CacheSchema {
  schema_version: number;
  updated_at: string;
  refresh_interval_seconds: number;
  providers: Record<ProviderId, ProviderCacheEntry>;
}
