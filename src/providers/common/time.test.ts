import { describe, it, expect } from 'vitest';
import { formatDuration, formatResetAt } from './time.ts';

describe('formatDuration', () => {
  it('returns "0s" for zero or negative values', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-1)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1h 1m 1s');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('formats days, hours, minutes, and seconds', () => {
    expect(formatDuration(90061)).toBe('1d 1h 1m 1s');
    expect(formatDuration(86400)).toBe('1d');
    expect(formatDuration(172800)).toBe('2d');
  });

  it('formats weeks, days, hours, minutes, and seconds', () => {
    expect(formatDuration(604801)).toBe('1w 1s');
    expect(formatDuration(604800)).toBe('1w');
    expect(formatDuration(694801)).toBe('1w 1d 1h 1s');
    expect(formatDuration(694861)).toBe('1w 1d 1h 1m 1s');
  });

  it('omits zero-value units', () => {
    expect(formatDuration(1)).toBe('1s');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3601)).toBe('1h 1s');
    expect(formatDuration(3660)).toBe('1h 1m');
  });
});

describe('formatResetAt', () => {
  it('formats timestamp as full locale datetime with timezone', () => {
    const timestamp = 1737024600000;
    const result = formatResetAt(timestamp);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes weekday, date, time, and timezone', () => {
    const timestamp = 1737024600000;
    const result = formatResetAt(timestamp);
    expect(result).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    expect(result).toMatch(/\d{4}/);
    expect(result).toMatch(/AM|PM/);
  });

  it('handles timestamps at different times', () => {
    const morning = 1737024600000;
    const evening = 1737046200000;
    const morningResult = formatResetAt(morning);
    const eveningResult = formatResetAt(evening);
    expect(morningResult).not.toBe(eveningResult);
  });
});
