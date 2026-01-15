import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectQuotaNotConfigured, isRealAuthEnabled } from '../common/test-helpers.ts';
import { fetchOpenaiQuota } from './fetch.ts';
import * as auth from './auth.ts';

vi.mock('./auth.ts', () => ({
  getOpenaiAuth: vi.fn(),
}));

const mockGetOpenaiAuth = auth.getOpenaiAuth as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('OpenAI Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with mocks', () => {
    it('handles missing auth', async () => {
      mockGetOpenaiAuth.mockResolvedValue(null);

      const result = await fetchOpenaiQuota();
      expectQuotaNotConfigured(result, 'Not configured');
    });

    it('handles missing access token', async () => {
      mockGetOpenaiAuth.mockResolvedValue({});

      const result = await fetchOpenaiQuota();
      expectQuotaNotConfigured(result, 'access token missing');
    });

    it('handles invalid token with 401 error', async () => {
      mockGetOpenaiAuth.mockResolvedValue({ access: 'invalid-token' });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => 'Unauthorized',
      } as Response);

      const result = await fetchOpenaiQuota();
      expect(result.ok).toBe(false);
      expect(result.configured).toBe(true);
      expect(result.error).toContain('401');
    });

    it('handles fetch errors', async () => {
      mockGetOpenaiAuth.mockResolvedValue({ access: 'test-token' });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchOpenaiQuota();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Request failed');
    });

    it('parses quota response correctly', async () => {
      mockGetOpenaiAuth.mockResolvedValue({ access: 'test-token' });

      const mockResponse = {
        plan_type: 'plus',
        rate_limit: {
          allowed: true,
          limit_reached: false,
          primary_window: {
            used_percent: 32,
            limit_window_seconds: 18000,
            reset_after_seconds: 5137,
            reset_at: 1768368727,
          },
          secondary_window: {
            used_percent: 42,
            limit_window_seconds: 604800,
            reset_after_seconds: 83959,
            reset_at: 1768447549,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchOpenaiQuota();
      expect(result.ok).toBe(true);
      expect(result.configured).toBe(true);
      expect(result.usage).not.toBeNull();
      if (result.usage) {
        expect(result.usage.windows['5h']?.usedPercent).toBe(32);
        expect(result.usage.windows['5h']?.resetAt).toBe(1768368727000);
        expect(result.usage.windows['5h']?.resetAfterFormatted).toBe('1h 25m 37s');
        expect(result.usage.windows['5h']?.resetAtFormatted).toMatch(
          /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/
        );
        expect(result.usage.windows.weekly?.usedPercent).toBe(42);
        expect(result.usage.windows.weekly?.resetAt).toBe(1768447549000);
        expect(result.usage.windows.weekly?.resetAfterFormatted).toBe('23h 19m 19s');
        expect(result.usage.windows.weekly?.resetAtFormatted).toMatch(
          /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/
        );
      }
    });

    it('handles success with no usage data', async () => {
      mockGetOpenaiAuth.mockResolvedValue({ access: 'test-token' });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          plan_type: 'plus',
          rate_limit: { allowed: true, limit_reached: false },
        }),
      } as Response);

      const result = await fetchOpenaiQuota();
      expect(result.ok).toBe(true);
      if (result.usage) {
        expect(result.usage.windows).toEqual({});
      }
    });
  });

  describe.skipIf(!isRealAuthEnabled('openai'))('with real auth', () => {
    it('fetches quota successfully', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetOpenaiAuth.mockImplementation(realAuth.getOpenaiAuth);

      const result = await fetchOpenaiQuota();
      expect(result.configured).toBe(true);
    });

    it('returns correct usage data when available', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetOpenaiAuth.mockImplementation(realAuth.getOpenaiAuth);

      const result = await fetchOpenaiQuota();
      if (result.ok && result.usage) {
        const window = result.usage.windows['5h'];
        if (window) {
          expect(window.usedPercent).toBeGreaterThanOrEqual(0);
          expect(window.usedPercent).toBeLessThanOrEqual(100);
          expect(window.resetAtFormatted).toBeDefined();
          expect(window.resetAfterFormatted).toBeDefined();
        }
      }
    });
  });
});
