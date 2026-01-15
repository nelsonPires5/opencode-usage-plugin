import type { ProviderResult, ProviderUsage, QuotaWindow } from '../../types.ts';
import { calculateResetAfterSeconds } from '../common/time.ts';
import { getZaiApiKey } from './auth.ts';

interface ZaiLimit {
  type: 'TIME_LIMIT' | 'TOKENS_LIMIT';
  unit: number;
  number: number;
  usage: number;
  currentValue: number;
  remaining: number;
  percentage: number;
  nextResetTime?: number;
}

interface ZaiQuotaResponse {
  code: number;
  msg: string;
  data?: {
    limits?: ZaiLimit[];
  };
  success: boolean;
}

const normalizeTimestamp = (value: number): number => {
  return value < 1_000_000_000_000 ? value * 1000 : value;
};

const TOKEN_WINDOW_SECONDS: Record<number, number> = {
  3: 3600,
};

const resolveWindowSeconds = (limit?: ZaiLimit): number | null => {
  if (!limit) {
    return null;
  }

  if (!limit.number) {
    return null;
  }

  const unitSeconds = TOKEN_WINDOW_SECONDS[limit.unit];
  if (!unitSeconds) {
    return null;
  }

  return unitSeconds * limit.number;
};

const resolveWindowLabel = (windowSeconds: number | null): string => {
  if (!windowSeconds) {
    return 'tokens';
  }

  if (windowSeconds % 86400 === 0) {
    const days = windowSeconds / 86400;
    return days === 7 ? 'weekly' : `${days}d`;
  }

  if (windowSeconds % 3600 === 0) {
    return `${windowSeconds / 3600}h`;
  }

  return `${windowSeconds}s`;
};

const toWindow = (limit?: ZaiLimit): QuotaWindow | null => {
  if (!limit) {
    return null;
  }

  const usedPercent = limit.percentage ?? null;
  const remainingPercent = usedPercent !== null ? Math.max(0, 100 - usedPercent) : null;
  const resetAt = limit.nextResetTime ? normalizeTimestamp(limit.nextResetTime) : null;

  return {
    usedPercent,
    remainingPercent,
    windowSeconds: resolveWindowSeconds(limit),
    resetAfterSeconds: calculateResetAfterSeconds(resetAt),
    resetAt,
  };
};

export const fetchZaiQuota = async (): Promise<ProviderResult> => {
  const apiKey = await getZaiApiKey();

  if (!apiKey) {
    return {
      provider: 'zai-coding-plan',
      ok: false,
      configured: false,
      error: 'Not configured - no API key found',
      usage: null,
    };
  }

  try {
    const response = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        provider: 'zai-coding-plan',
        ok: false,
        configured: true,
        error: `API error: ${response.status}`,
        usage: null,
      };
    }

    const payload = (await response.json()) as ZaiQuotaResponse;
    const limits = payload.data?.limits ?? [];
    const tokensLimit = limits.find((limit) => limit.type === 'TOKENS_LIMIT');

    const windows: Record<string, QuotaWindow> = {};
    const window = toWindow(tokensLimit);
    if (window) {
      const label = resolveWindowLabel(window.windowSeconds);
      windows[label] = window;
    }

    const usage: ProviderUsage = {
      windows,
    };

    return {
      provider: 'zai-coding-plan',
      ok: true,
      configured: true,
      usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      provider: 'zai-coding-plan',
      ok: false,
      configured: true,
      error: `Request failed: ${message}`,
      usage: null,
    };
  }
};
