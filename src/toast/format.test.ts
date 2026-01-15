import { describe, expect, it, vi } from 'vitest';
import { formatUsageToast } from './format.js';
import type { ProviderResult } from '../types/index.js';
import type { Logger } from '../providers/common/logger.js';

describe('Toast Format', () => {
  const mockWindow = {
    usedPercent: 45,
    remainingPercent: 55,
    windowSeconds: 18000,
    resetAfterSeconds: 7200,
    resetAt: Date.now(),
    resetAtFormatted: 'Monday, January 20, 2026',
    resetAfterFormatted: '2h',
  };

  describe('formatUsageToast', () => {
    it('formats OpenAI global window', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': mockWindow },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.title).toBe('Usage');
      expect(toast.variant).toBe('info');
      expect(toast.message).toContain('openai: 45% used');
      expect(toast.message).toContain('resets in 2h');
    });

    it('formats Google with flagship models filtered', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': { windows: { '5h': mockWindow } },
              'claude-sonnet-4.5': { windows: { '5h': mockWindow } },
              'gemini-3-pro': { windows: { '5h': mockWindow } },
              'gemini-2.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toContain('claude-opus-4.5 45%');
      expect(toast.message).toContain('gemini-3-pro 45%');
      expect(toast.message).not.toContain('claude-sonnet-4.5');
      expect(toast.message).not.toContain('gemini-2.5');
    });

    it('formats z.ai with token window', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'zai-coding-plan',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': mockWindow },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toContain('zai-coding-plan: 45% used');
      expect(toast.message).toContain('resets in 2h');
    });

    it('handles multiple providers', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': mockWindow },
          },
        },
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'gemini-3-pro': { windows: { '5h': mockWindow } },
              'gemini-3-flash': { windows: { '5h': mockWindow } },
            },
          },
        },
        {
          provider: 'zai-coding-plan',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, usedPercent: 30 } },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toContain('openai: 45% used');
      expect(toast.message).toContain('google: gemini-3-pro 45%, gemini-3-flash 45%');
      expect(toast.message).toContain('zai-coding-plan: 30% used');
    });

    it('handles unconfigured providers', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: false,
          configured: false,
          error: 'Not configured',
          usage: null,
        },
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).not.toContain('openai');
      expect(toast.message).toContain('google: claude-opus-4.5 45%');
    });

    it('handles empty usage data', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: { windows: {} },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toContain('openai: No usage data');
    });

    it('handles single Google model (compact format)', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toContain('claude-opus-4.5 45%');
      expect(toast.message).toContain('resets in 2h');
    });

    it('always returns info variant', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: { windows: { '5h': mockWindow } },
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.variant).toBe('info');
    });

    it('shows fallback message when all providers are unconfigured', async () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: false,
          configured: false,
          error: 'Not configured',
          usage: null,
        },
        {
          provider: 'google',
          ok: false,
          configured: false,
          error: 'Not configured',
          usage: null,
        },
      ];

      const toast = await formatUsageToast(results);

      expect(toast.message).toBe('No providers configured');
      expect(toast.variant).toBe('info');
    });

    it('calls logger.debug for unconfigured providers', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as Logger;

      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: false,
          configured: false,
          error: 'Not configured',
          usage: null,
        },
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      await formatUsageToast(results, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith('Provider openai not configured, skipping');
      expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('google'));
    });
  });
});
