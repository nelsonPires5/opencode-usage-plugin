import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectQuotaNotConfigured, isRealAuthEnabled } from '../common/test-helpers.ts';
import { fetchGoogleQuota } from './fetch.ts';
import * as auth from './auth.ts';

vi.mock('./auth.ts', () => ({
  getGoogleAuth: vi.fn(),
}));

const mockGetGoogleAuth = auth.getGoogleAuth as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('Google Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with mocks', () => {
    it('handles missing accounts', async () => {
      mockGetGoogleAuth.mockResolvedValue(null);

      const result = await fetchGoogleQuota();
      expectQuotaNotConfigured(result, 'no accounts found');
    });

    it('handles failed token refresh', async () => {
      mockGetGoogleAuth.mockResolvedValue({ refreshToken: 'invalid-refresh-token' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      const result = await fetchGoogleQuota();
      expect(result.ok).toBe(false);
      expect(result.configured).toBe(true);
      expect(result.error).toContain('Failed to refresh OAuth token');
    });

    it('handles API timeout', async () => {
      mockGetGoogleAuth.mockResolvedValue({ refreshToken: 'mock-refresh-token' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockRejectedValue(new Error('Timeout'));

      const result = await fetchGoogleQuota();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Failed to fetch models from API');
    });

    it('parses models response correctly', async () => {
      mockGetGoogleAuth.mockResolvedValue({ refreshToken: 'mock-refresh-token' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: {
              'claude-3-opus': {
                displayName: 'Claude 3 Opus',
                quotaInfo: {
                  remainingFraction: 0.75,
                  resetTime: '2024-01-01T12:00:00Z',
                },
              },
              'gemini-pro': {
                displayName: 'Gemini Pro',
                quotaInfo: {
                  remainingFraction: 0.5,
                  resetTime: '2024-01-01T06:00:00Z',
                },
              },
            },
          }),
        } as Response);

      const result = await fetchGoogleQuota();
      expect(result.ok).toBe(true);
      expect(result.configured).toBe(true);
      expect(result.usage?.models).toBeDefined();
      expect(result.usage?.models?.['claude-3-opus'].windows['5h'].remainingPercent).toBe(75);
      expect(result.usage?.models?.['gemini-pro'].windows['5h'].remainingPercent).toBe(50);
      expect(result.usage?.models?.['claude-3-opus'].windows['5h'].resetAtFormatted).toBeDefined();
      expect(
        result.usage?.models?.['claude-3-opus'].windows['5h'].resetAfterFormatted
      ).toBeDefined();
    });

    it('handles empty models response', async () => {
      mockGetGoogleAuth.mockResolvedValue({ refreshToken: 'mock-refresh-token' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ models: {} }),
        } as Response);

      const result = await fetchGoogleQuota();
      expect(result.ok).toBe(true);
      expect(result.usage?.models).toBeUndefined();
    });
  });

  describe.skipIf(!isRealAuthEnabled('google'))('with real auth', () => {
    it('fetches quota successfully', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetGoogleAuth.mockImplementation(realAuth.getGoogleAuth);

      const result = await fetchGoogleQuota();
      expect(result.configured).toBe(true);
    });

    it('returns valid quota data', async () => {
      const realAuth = await vi.importActual<typeof import('./auth.ts')>('./auth.ts');
      mockGetGoogleAuth.mockImplementation(realAuth.getGoogleAuth);

      const result = await fetchGoogleQuota();
      if (result.ok && result.usage) {
        expect(result.usage.windows).toBeInstanceOf(Object);
        if (result.usage.models) {
          for (const modelData of Object.values(result.usage.models)) {
            for (const window of Object.values(modelData.windows)) {
              expect(window.resetAtFormatted).toBeDefined();
              expect(window.resetAfterFormatted).toBeDefined();
            }
          }
        }
      }
    });
  });
});
