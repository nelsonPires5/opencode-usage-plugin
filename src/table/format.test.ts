import { describe, expect, it } from 'vitest';
import { formatUsageTable, formatTableString } from './format.js';
import type { ProviderResult } from '../types/index.js';
import type { TableData, StatusEmoji } from '../types/table.js';

describe('Table Format', () => {
  const mockWindow = {
    usedPercent: 45,
    remainingPercent: 55,
    windowSeconds: 18000,
    resetAfterSeconds: 7200,
    resetAt: Date.now(),
    resetAtFormatted: 'Monday, January 20, 2026',
    resetAfterFormatted: '2h',
  };

  describe('formatUsageTable', () => {
    it('formats OpenAI global window', () => {
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

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(1);
      expect(table.rows[0].provider).toBe('openai');
      expect(table.rows[0].model).toBe('-');
      expect(table.rows[0].usedPercent).toBe(45);
      expect(table.rows[0].remainingPercent).toBe(55);
      expect(table.rows[0].status).toBe('🟢');
      expect(table.rows[0].statusText).toBe('OK');
      expect(table.rows[0].resetsIn).toBe('2h');
    });

    it('assigns critical status when remaining < 10%', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 5, usedPercent: 95 } },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows[0].status).toBe('🔴');
      expect(table.rows[0].statusText).toBe('Critical');
    });

    it('assigns warning status when remaining < 30%', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 22, usedPercent: 78 } },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows[0].status).toBe('🟡');
      expect(table.rows[0].statusText).toBe('Warning');
    });

    it('assigns OK status when remaining >= 30%', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 35, usedPercent: 65 } },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows[0].status).toBe('🟢');
      expect(table.rows[0].statusText).toBe('OK');
    });

    it('formats Google with flagship models filtered (multiple rows)', () => {
      const results: ProviderResult[] = [
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': {
                windows: { '5h': { ...mockWindow, usedPercent: 45, remainingPercent: 55 } },
              },
              'claude-sonnet-4.5': { windows: { '5h': mockWindow } },
              'gemini-3-pro': {
                windows: { '5h': { ...mockWindow, usedPercent: 78, remainingPercent: 22 } },
              },
              'gemini-2.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(2);
      expect(table.rows[0].provider).toBe('google');
      expect(table.rows[0].model).toBe('claude-opus-4.5');
      expect(table.rows[0].usedPercent).toBe(45);
      expect(table.rows[0].remainingPercent).toBe(55);
      expect(table.rows[0].status).toBe('🟢');
      expect(table.rows[1].provider).toBe('google');
      expect(table.rows[1].model).toBe('gemini-3-pro');
      expect(table.rows[1].usedPercent).toBe(78);
      expect(table.rows[1].remainingPercent).toBe(22);
      expect(table.rows[1].status).toBe('🟡');
    });

    it('formats z.ai with token window', () => {
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

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(1);
      expect(table.rows[0].provider).toBe('zai-coding-plan');
      expect(table.rows[0].model).toBe('-');
      expect(table.rows[0].usedPercent).toBe(45);
      expect(table.rows[0].remainingPercent).toBe(55);
      expect(table.rows[0].resetsIn).toBe('2h');
    });

    it('handles multiple providers with different statuses', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 55, usedPercent: 45 } },
          },
        },
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 22, usedPercent: 78 } },
            models: {
              'gemini-3-pro': { windows: { '5h': mockWindow } },
            },
          },
        },
        {
          provider: 'zai-coding-plan',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: 5, usedPercent: 95 } },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(3);
      expect(table.rows[0].provider).toBe('openai');
      expect(table.rows[0].status).toBe('🟢');
      expect(table.rows[1].provider).toBe('google');
      expect(table.rows[1].status).toBe('🟡');
      expect(table.rows[2].provider).toBe('zai-coding-plan');
      expect(table.rows[2].status).toBe('🔴');
    });

    it('skips unconfigured providers', () => {
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

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(1);
      expect(table.rows[0].provider).toBe('google');
      expect(table.rows[0].status).toBe('🟢');
    });

    it('handles empty usage data', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: { windows: {} },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(0);
    });

    it('handles null remaining percent', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': { ...mockWindow, remainingPercent: null, usedPercent: null } },
          },
        },
      ];

      const table = formatUsageTable(results);

      expect(table.rows[0].status).toBe('⚪');
      expect(table.rows[0].statusText).toBe('N/A');
    });

    it('returns empty rows when no results', () => {
      const results: ProviderResult[] = [];

      const table = formatUsageTable(results);

      expect(table.rows).toHaveLength(0);
    });
  });

  describe('formatTableString', () => {
    it('shows N/A for null values', () => {
      const tableData: TableData = {
        rows: [
          {
            provider: 'openai',
            model: '-',
            usedPercent: null,
            remainingPercent: null,
            status: '⚪' as StatusEmoji,
            statusText: 'N/A',
            resetsIn: 'N/A',
          },
        ],
      };

      const result = formatTableString(tableData);

      expect(result).toContain('N/A');
    });

    it('returns message when no rows', () => {
      const tableData = { rows: [] };

      const result = formatTableString(tableData);

      expect(result).toBe('No usage data available');
    });

    it('formats multiple rows with different providers', () => {
      const tableData: TableData = {
        rows: [
          {
            provider: 'openai',
            model: '-',
            usedPercent: 0,
            remainingPercent: 100,
            status: '🟢' as StatusEmoji,
            statusText: 'OK',
            resetsIn: '5h',
          },
          {
            provider: 'google',
            model: 'claude-opus-4.5',
            usedPercent: 45,
            remainingPercent: 55,
            status: '🟢' as StatusEmoji,
            statusText: 'OK',
            resetsIn: '4d 15h',
          },
        ],
      };

      const result = formatTableString(tableData);

      expect(result).toMatch(/openai/);
      expect(result).toContain('0%');
      expect(result).toContain('100%');
      expect(result).toContain('🟢');
      expect(result).toContain('5h');
      expect(result).toMatch(/google/);
      expect(result).toContain('claude-opus-4.5');
      expect(result).toContain('45%');
      expect(result).toContain('55%');
      expect(result).toContain('🟢');
      expect(result).toContain('4d 15h');
    });
  });
});
