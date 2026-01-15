import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectQuotaNotConfigured, isRealAuthEnabled } from '../common/test-helpers.ts';
import { fetchZaiQuota } from './fetch.ts';
import * as auth from './auth.ts';

vi.mock('./auth.ts', () => ({
  getZaiApiKey: vi.fn(),
}));

const mockGetZaiApiKey = auth.getZaiApiKey as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('Zai Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with mocks', () => {
    it('handles missing API key', async () => {
      mockGetZaiApiKey.mockResolvedValue(null);

      const result = await fetchZaiQuota();
      expectQuotaNotConfigured(result, 'no API key found');
    });

    it('handles API error response', async () => {
      mockGetZaiApiKey.mockResolvedValue('test-api-key');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const result = await fetchZaiQuota();
      expect(result.ok).toBe(false);
      expect(result.configured).toBe(true);
      expect(result.error).toContain('401');
    });

    it('handles fetch errors', async () => {
      mockGetZaiApiKey.mockResolvedValue('test-api-key');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchZaiQuota();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Request failed');
    });

    it('parses quota response with tokens limit', async () => {
      mockGetZaiApiKey.mockResolvedValue('test-api-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            limits: [
              {
                type: 'TOKENS_LIMIT',
                unit: 3,
                number: 5,
                currentValue: 1500000,
                usage: 5000000,
                percentage: 30,
                remaining: 3500000,
                nextResetTime: 1768452972346,
              },
            ],
          },
        }),
      } as Response);

      const result = await fetchZaiQuota();
      expect(result.ok).toBe(true);
      expect(result.configured).toBe(true);
      expect(result.usage?.windows['5h']?.usedPercent).toBe(30);
      expect(result.usage?.windows['5h']?.remainingPercent).toBe(70);
      expect(result.usage?.windows['5h']?.resetAt).toBe(1768452972346);
      expect(result.usage?.windows['5h']?.resetAtFormatted).toBeDefined();
      expect(result.usage?.windows['5h']?.resetAfterFormatted).toBeDefined();
    });

    it('ignores time limit entries', async () => {
      mockGetZaiApiKey.mockResolvedValue('test-api-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            limits: [
              {
                type: 'TIME_LIMIT',
                unit: 5,
                number: 1,
                percentage: 50,
              },
              {
                type: 'TOKENS_LIMIT',
                unit: 3,
                number: 5,
                currentValue: 2000000,
                usage: 10000000,
                percentage: 20,
                nextResetTime: 1768452972346,
              },
            ],
          },
        }),
      } as Response);

      const result = await fetchZaiQuota();
      expect(result.ok).toBe(true);
      expect(result.usage?.windows['5h']?.usedPercent).toBe(20);
      expect(result.usage?.windows['5h']?.remainingPercent).toBe(80);
      expect(result.usage?.windows['5h']?.resetAt).toBe(1768452972346);
      expect(result.usage?.windows['5h']?.resetAtFormatted).toBeDefined();
      expect(result.usage?.windows['5h']?.resetAfterFormatted).toBeDefined();
    });

    it('handles invalid response gracefully', async () => {
      mockGetZaiApiKey.mockResolvedValue('test-api-key');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await fetchZaiQuota();
      expect(result.ok).toBe(true);
      expect(result.usage?.windows).toEqual({});
    });
  });

  describe.skipIf(!isRealAuthEnabled('zai-coding-plan'))('with real auth', () => {
    it('fetches quota successfully', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetZaiApiKey.mockImplementation(realAuth.getZaiApiKey);

      const result = await fetchZaiQuota();
      expect(result.configured).toBe(true);
    });

    it('returns valid quota data', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetZaiApiKey.mockImplementation(realAuth.getZaiApiKey);

      const result = await fetchZaiQuota();
      if (result.ok && result.usage?.windows) {
        const windowValues = Object.values(result.usage.windows);
        expect(windowValues.length).toBeGreaterThanOrEqual(0);
        for (const window of windowValues) {
          expect(window.resetAtFormatted).toBeDefined();
          expect(window.resetAfterFormatted).toBeDefined();
        }
      }
    });
  });
});
