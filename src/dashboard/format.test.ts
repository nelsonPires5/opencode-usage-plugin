import { describe, expect, it } from 'vitest';
import {
  formatDashboardData,
  formatDashboardString,
  renderBar,
  formatWindowLabel,
} from './format.js';
import type { ProviderResult } from '../types/index.js';
import type { DashboardData } from '../types/dashboard.js';
import type { DisplayCache } from '../cache/reader.ts';

describe('Dashboard Format', () => {
  const mockWindow = {
    usedPercent: 45,
    remainingPercent: 55,
    windowSeconds: 18000,
    resetAfterSeconds: 7200,
    resetAt: Date.now(),
    resetAtFormatted: 'Monday, January 20, 2026',
    resetAfterFormatted: '2h',
  };

  describe('Utilities', () => {
    describe('renderBar', () => {
      it('renders empty bar for null percent', () => {
        expect(renderBar(null, 10)).toBe('[░░░░░░░░░░]');
      });

      it('renders 0% bar', () => {
        expect(renderBar(0, 10)).toBe('[░░░░░░░░░░]');
      });

      it('renders 50% bar', () => {
        expect(renderBar(50, 10)).toBe('[█████░░░░░]');
      });

      it('renders 100% bar', () => {
        expect(renderBar(100, 10)).toBe('[██████████]');
      });

      it('clamps negative values to 0%', () => {
        expect(renderBar(-10, 10)).toBe('[░░░░░░░░░░]');
      });

      it('clamps values > 100 to 100%', () => {
        expect(renderBar(150, 10)).toBe('[██████████]');
      });
    });

    describe('formatWindowLabel', () => {
      it('formats 5h', () => {
        expect(formatWindowLabel('5h')).toBe('5h Window');
      });

      it('formats weekly', () => {
        expect(formatWindowLabel('weekly')).toBe('Weekly Window');
      });

      it('formats unknown keys', () => {
        expect(formatWindowLabel('custom')).toBe('custom Window');
      });
    });
  });

  describe('formatDashboardData', () => {
    describe('with ProviderResult[] (Legacy)', () => {
      it('formats OpenAI with multiple global windows', () => {
        const results: ProviderResult[] = [
          {
            provider: 'openai',
            ok: true,
            configured: true,
            usage: {
              windows: {
                '5h': mockWindow,
                weekly: { ...mockWindow, usedPercent: 80, remainingPercent: 20 },
              },
            },
          },
        ];

        const data = formatDashboardData(results);

        expect(data.providers).toHaveLength(1);
        expect(data.providers[0].name).toBe('OPENAI');
        expect(data.providers[0].sections).toHaveLength(1);
      });
    });

    describe('with DisplayCache (New)', () => {
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
                '5h': mockWindow,
              },
            },
            error: null,
          },
          google: {
            supported: true,
            configured: true,
            last_attempt_at: '2024-01-01T00:00:00.000Z',
            last_success_at: '2024-01-01T00:00:00.000Z',
            data: {
              windows: {},
              models: {
                'claude-opus-4.5': { windows: { '5h': mockWindow } },
              },
            },
            error: null,
          },
        } as any,
      };

      it('formats correctly from cache', () => {
        const data = formatDashboardData(mockCache);

        expect(data.providers).toHaveLength(2);

        const openai = data.providers.find((p) => p.name === 'OPENAI');
        expect(openai).toBeDefined();
        expect(openai?.sections[0].windows[0].label).toBe('5h Window');

        const google = data.providers.find((p) => p.name === 'GOOGLE');
        expect(google).toBeDefined();
        expect(google?.sections[0].title).toBe('Model Usage');
      });

      it('handles null cache', () => {
        const data = formatDashboardData(null);
        expect(data.providers).toHaveLength(0);
      });
    });
  });

  describe('formatDashboardString', () => {
    it('returns message when no data', () => {
      const data: DashboardData = { providers: [] };
      expect(formatDashboardString(data)).toBe('No usage data available');
    });

    it('appends Updated at when provided', () => {
      const data: DashboardData = { providers: [] };
      expect(formatDashboardString(data, '2024-01-01')).toContain('Updated at: 2024-01-01');
    });

    it('appends STALE warning when isStale is true', () => {
      const data: DashboardData = {
        providers: [
          {
            name: 'OPENAI',
            sections: [
              {
                title: 'Overall Usage',
                windows: [
                  {
                    label: '5h Window',
                    usedPercent: 45,
                    remainingPercent: 55,
                    status: '🟢',
                    statusText: 'OK',
                    resetsIn: '2h',
                  },
                ],
              },
            ],
          },
        ],
      };

      const output = formatDashboardString(data, '2024-01-01', true);
      expect(output).toContain('(STALE)');
    });
  });
});
