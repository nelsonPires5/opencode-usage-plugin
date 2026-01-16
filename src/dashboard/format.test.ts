import { describe, expect, it } from 'vitest';
import {
  formatDashboardData,
  formatDashboardString,
  renderBar,
  formatWindowLabel,
} from './format.js';
import type { ProviderResult } from '../types/index.js';
import type { DashboardData } from '../types/dashboard.js';

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
      expect(data.providers[0].sections[0].title).toBe('Overall Usage');
      expect(data.providers[0].sections[0].windows).toHaveLength(2);
      expect(data.providers[0].sections[0].windows[0].label).toBe('5h Window');
      expect(data.providers[0].sections[0].windows[1].label).toBe('Weekly Window');
      expect(data.providers[0].sections[0].windows[1].usedPercent).toBe(80);
    });

    it('formats Google with flagship models', () => {
      const results: ProviderResult[] = [
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: {},
            models: {
              'claude-opus-4.5': {
                windows: { '5h': mockWindow },
              },
              'gemini-3-pro': {
                windows: { '5h': { ...mockWindow, usedPercent: 10, remainingPercent: 90 } },
              },
              'non-flagship': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const data = formatDashboardData(results);

      expect(data.providers).toHaveLength(1);
      expect(data.providers[0].name).toBe('GOOGLE');
      // Should have 1 section "Model Usage"
      expect(data.providers[0].sections).toHaveLength(1);
      expect(data.providers[0].sections[0].title).toBe('Model Usage');

      // Should have 2 subsections (claude, gemini)
      const subsections = data.providers[0].sections[0].sections;
      expect(subsections).toBeDefined();
      expect(subsections).toHaveLength(2);
      expect(subsections?.map((s) => s.title)).toEqual(['claude-opus-4.5', 'gemini-3-pro']);
    });

    it('formats Google with both global and model windows', () => {
      const results: ProviderResult[] = [
        {
          provider: 'google',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': mockWindow },
            models: {
              'claude-opus-4.5': { windows: { '5h': mockWindow } },
            },
          },
        },
      ];

      const data = formatDashboardData(results);

      expect(data.providers[0].sections).toHaveLength(2);
      expect(data.providers[0].sections[0].title).toBe('Overall Usage');
      expect(data.providers[0].sections[1].title).toBe('Model Usage');

      const modelSection = data.providers[0].sections[1];
      expect(modelSection.sections).toHaveLength(1);
      expect(modelSection.sections?.[0].title).toBe('claude-opus-4.5');
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
          provider: 'zai-coding-plan',
          ok: true,
          configured: true,
          usage: {
            windows: { '5h': mockWindow },
          },
        },
      ];

      const data = formatDashboardData(results);

      expect(data.providers).toHaveLength(1);
      expect(data.providers[0].name).toBe('ZAI CODING PLAN');
    });

    it('handles null remaining percent (N/A status)', () => {
      const results: ProviderResult[] = [
        {
          provider: 'openai',
          ok: true,
          configured: true,
          usage: {
            windows: {
              '5h': { ...mockWindow, remainingPercent: null, usedPercent: null },
            },
          },
        },
      ];

      const data = formatDashboardData(results);
      const window = data.providers[0].sections[0].windows[0];

      expect(window.status).toBe('⚪');
      expect(window.statusText).toBe('N/A');
      expect(window.usedPercent).toBeNull();
    });
  });

  describe('formatDashboardString', () => {
    it('returns message when no data', () => {
      const data: DashboardData = { providers: [] };
      expect(formatDashboardString(data)).toBe('No usage data available');
    });

    it('formats full dashboard correctly', () => {
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

      const output = formatDashboardString(data);

      expect(output).toContain('OPENAI ─────');
      expect(output).toContain('Overall Usage');
      expect(output).toContain('└─ 5h Window');
      expect(output).toContain('• Resets in 2h');
      expect(output).not.toContain('Status 🟢 OK');
      // Check for bar (rough check)
      expect(output).toContain('[██');
    });
  });
});
