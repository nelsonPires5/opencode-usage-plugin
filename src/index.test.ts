import { describe, expect, it } from 'vitest';

import { parseProvider } from './providers/common/registry.ts';

describe('Plugin Utils', () => {
  describe('parseProvider', () => {
    it('returns openai for codex input', () => {
      expect(parseProvider('codex')).toBe('openai');
    });

    it('returns openai for chatgpt input', () => {
      expect(parseProvider('chatgpt')).toBe('openai');
    });

    it('returns google for antigravity input', () => {
      expect(parseProvider('antigravity')).toBe('google');
    });

    it('returns google for google input', () => {
      expect(parseProvider('google')).toBe('google');
    });

    it('returns zai-coding-plan for zai input', () => {
      expect(parseProvider('zai')).toBe('zai-coding-plan');
    });

    it('returns zai-coding-plan for z.ai input', () => {
      expect(parseProvider('z.ai')).toBe('zai-coding-plan');
    });

    it('returns null for undefined input', () => {
      expect(parseProvider(undefined)).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(parseProvider('invalid')).toBeNull();
    });

    it('handles case insensitivity', () => {
      expect(parseProvider('CODEX')).toBe('openai');
      expect(parseProvider('Antigravity')).toBe('google');
      expect(parseProvider('ZAI')).toBe('zai-coding-plan');
    });

    it('handles whitespace', () => {
      expect(parseProvider('  codex  ')).toBe('openai');
    });
  });
});
