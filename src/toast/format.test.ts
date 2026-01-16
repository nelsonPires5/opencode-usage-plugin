import { describe, expect, it } from 'vitest';

import { formatUsageToast } from './format.ts';
import type { DisplayCache } from '../cache/reader.ts';
import { noopLogger } from '../providers/common/logger.ts';

describe('toast/format', () => {
  const mockCache: DisplayCache = {
    updatedAt: '2024-01-01T00:00:00.000Z',
    isStale: false,
    providers: {
      openai: {
        supported: true,
        configured: true,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: '2024-01-01T00:00:00.000Z',
        data: {
          windows: {
            '5h': {
              usedPercent: 50,
              remainingPercent: 50,
              windowSeconds: 18000,
              resetAfterSeconds: 9000,
              resetAt: null,
              resetAtFormatted: null,
              resetAfterFormatted: '2h 30m',
            },
          },
        },
        error: null,
      },
    } as any, // Cast because we omit other providers
  };

  it('formats toast message with usage data', async () => {
    const result = await formatUsageToast(mockCache, noopLogger);

    expect(result.message).toContain('openai: 50% used • resets in 2h 30m');
    expect(result.message).toContain('Updated at: 2024-01-01T00:00:00.000Z');
  });

  it('prepends stale warning when cache is stale', async () => {
    const staleCache = { ...mockCache, isStale: true };
    const result = await formatUsageToast(staleCache, noopLogger);

    expect(result.message).toContain('⚠ STALE CACHE');
    expect(result.message).toContain('openai: 50% used');
  });

  it('shows error line when some providers failed', async () => {
    const errorCache = {
      ...mockCache,
      providers: {
        ...mockCache.providers,
        google: {
          configured: true,
          error: 'API Error',
          data: null,
        },
      } as any,
    };

    const result = await formatUsageToast(errorCache, noopLogger);

    expect(result.message).toContain('Some providers failed');
    expect(result.message).toContain('openai: 50% used');
  });

  it('handles empty/no providers', async () => {
    const emptyCache: DisplayCache = {
      updatedAt: '2024-01-01T00:00:00.000Z',
      isStale: false,
      providers: {} as any,
    };

    const result = await formatUsageToast(emptyCache, noopLogger);

    expect(result.message).toBe('No providers configured');
  });

  it('handles null input', async () => {
    const result = await formatUsageToast(null, noopLogger);
    expect(result.message).toBe('No providers configured');
  });
});
