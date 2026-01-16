import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadCacheForDisplay } from './reader.ts';
import { readCache } from './file.ts';
import { noopLogger } from '../providers/common/logger.ts';
import type { CacheSchema } from './types.ts';
import { REFRESH_INTERVAL_SECONDS, STALE_THRESHOLD_MULTIPLIER } from './types.ts';

vi.mock('./file.ts', () => ({
  readCache: vi.fn(),
}));

describe('cache/reader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockCache: CacheSchema = {
    schema_version: 1,
    updated_at: new Date().toISOString(),
    refresh_interval_seconds: 300,
    providers: {
      openai: {
        supported: true,
        configured: true,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: '2024-01-01T00:00:00.000Z',
        data: { windows: {} },
        error: null,
      },
      google: {
        supported: true,
        configured: false,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: null,
        data: null,
        error: null,
      },
      'zai-coding-plan': {
        supported: true,
        configured: false,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: null,
        data: null,
        error: null,
      },
    },
  };

  it('filters out unconfigured providers', async () => {
    vi.mocked(readCache).mockResolvedValue(mockCache);

    const result = await loadCacheForDisplay(noopLogger);

    expect(result).not.toBeNull();
    expect(result?.providers.openai).toBeDefined();
    expect(result?.providers.google).toBeUndefined();
  });

  it('detects fresh cache', async () => {
    const now = new Date();
    const freshCache = { ...mockCache, updated_at: now.toISOString() };
    vi.mocked(readCache).mockResolvedValue(freshCache);

    const result = await loadCacheForDisplay(noopLogger);

    expect(result?.isStale).toBe(false);
  });

  it('detects stale cache', async () => {
    const now = new Date();
    const staleTime =
      now.getTime() - REFRESH_INTERVAL_SECONDS * 1000 * STALE_THRESHOLD_MULTIPLIER - 1000;
    const staleCache = { ...mockCache, updated_at: new Date(staleTime).toISOString() };
    vi.mocked(readCache).mockResolvedValue(staleCache);

    const result = await loadCacheForDisplay(noopLogger);

    expect(result?.isStale).toBe(true);
  });

  it('returns null if no cache', async () => {
    vi.mocked(readCache).mockResolvedValue(null);

    const result = await loadCacheForDisplay(noopLogger);

    expect(result).toBeNull();
  });
});
