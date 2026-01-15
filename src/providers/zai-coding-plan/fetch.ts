import type { ProviderResult, ProviderUsage, UsageWindow } from '../../types.ts';
import { maskSecret, type Logger, noopLogger } from '../common/logger.ts';
import { calculateResetAfterSeconds, formatDuration, formatResetAt } from '../common/time.ts';
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

interface ZaiUsageResponse {
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

const toWindow = (limit?: ZaiLimit): UsageWindow | null => {
  if (!limit) {
    return null;
  }

  const usedPercent = limit.percentage ?? null;
  const remainingPercent = usedPercent !== null ? Math.max(0, 100 - usedPercent) : null;
  const resetAt = limit.nextResetTime ? normalizeTimestamp(limit.nextResetTime) : null;
  const resetAfterSeconds = calculateResetAfterSeconds(resetAt);

  return {
    usedPercent,
    remainingPercent,
    windowSeconds: resolveWindowSeconds(limit),
    resetAfterSeconds,
    resetAt,
    resetAtFormatted: resetAt ? formatResetAt(resetAt) : null,
    resetAfterFormatted: resetAfterSeconds !== null ? formatDuration(resetAfterSeconds) : null,
  };
};

export const fetchZaiUsage = async (logger: Logger = noopLogger): Promise<ProviderResult> => {
  const apiKey = await getZaiApiKey(logger);

  if (!apiKey) {
    await logger.warn('No auth configured for zai-coding-plan');
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
      await logger.error(`API error ${response.status} for zai-coding-plan`, {
        token: maskSecret(apiKey),
      });
      return {
        provider: 'zai-coding-plan',
        ok: false,
        configured: true,
        error: `API error: ${response.status}`,
        usage: null,
      };
    }

    const payload = (await response.json()) as ZaiUsageResponse;
    const limits = payload.data?.limits ?? [];
    const tokensLimit = limits.find((limit) => limit.type === 'TOKENS_LIMIT');

    const windows: Record<string, UsageWindow> = {};
    const window = toWindow(tokensLimit);
    if (window) {
      const label = resolveWindowLabel(window.windowSeconds);
      windows[label] = window;
    }

    const usage: ProviderUsage = {
      windows,
    };

    await logger.info('zai-coding-plan usage fetched successfully');

    return {
      provider: 'zai-coding-plan',
      ok: true,
      configured: true,
      usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.error(`Request failed for zai-coding-plan: ${message}`);
    return {
      provider: 'zai-coding-plan',
      ok: false,
      configured: true,
      error: `Request failed: ${message}`,
      usage: null,
    };
  }
};
