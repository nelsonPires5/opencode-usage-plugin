import type { ProviderResult, ProviderUsage, UsageWindow } from '../types/index.js';
import type { ToastUsageResult } from '../types/toast.js';
import type { Logger } from '../providers/common/logger.js';
import type { DisplayCache } from '../cache/reader.js';
import { filterFlagshipModels } from './filter.js';

type StatusEmoji = '🔴' | '🟡' | '🟢' | '⚪';

const getStatus = (remainingPercent: number | null): StatusEmoji => {
  if (remainingPercent === null) return '⚪';
  if (remainingPercent < 10) return '🔴';
  if (remainingPercent < 30) return '🟡';
  return '🟢';
};

const formatWindowLine = (name: string, window: UsageWindow, isModel: boolean = false): string => {
  const used = window.usedPercent !== null ? Math.round(window.usedPercent) : 0;
  const reset = window.resetAfterFormatted ?? 'N/A';
  const remaining = window.remainingPercent ?? null;
  const emoji = isModel ? '' : `${getStatus(remaining)} `;
  const indent = isModel ? '  ' : '';

  // Format: "🟢 openai     75% • 2h" or "  gemini-3-pro   48% • 4h"
  return `${indent}${emoji}${name.padEnd(isModel ? 13 : 10)} ${used}% • ${reset}`;
};

const formatProviderSection = (provider: string, usage: ProviderUsage | null): string[] => {
  if (!usage) {
    return [`⚪ ${provider}: Not configured`];
  }

  const lines: string[] = [];
  const globalWindows = Object.values(usage.windows);

  // Provider Line
  if (globalWindows.length > 0) {
    lines.push(formatWindowLine(provider, globalWindows[0]));
  } else {
    lines.push(`⚪ ${provider}: No usage data`);
  }

  // Model Lines
  if (usage.models) {
    for (const [modelName, modelData] of Object.entries(usage.models)) {
      const modelWindow = Object.values(modelData.windows)[0];
      if (modelWindow) {
        lines.push(formatWindowLine(modelName, modelWindow, true));
      }
    }
  }

  return lines;
};

export const formatUsageToast = async (
  input: ProviderResult[] | DisplayCache | null,
  logger?: Logger
): Promise<ToastUsageResult> => {
  if (!input) {
    return {
      title: '📊 Usage',
      message: 'No providers configured',
      variant: 'info',
    };
  }

  const displayCache = 'providers' in input ? input : null;
  const results = 'providers' in input ? null : input;

  const lines: string[] = [];
  const contentLines: string[] = [];
  const DIVIDER = '─────────────────────';

  let updatedAt = '';
  let isStale = false;

  if (displayCache) {
    updatedAt = displayCache.updatedAt;
    isStale = displayCache.isStale;

    for (const [providerId, entry] of Object.entries(displayCache.providers)) {
      if (!entry.data) continue;

      let usage = entry.data;
      if (providerId === 'google' && usage?.models) {
        usage = {
          ...usage,
          models: filterFlagshipModels(usage.models),
        };
      }

      contentLines.push(...formatProviderSection(providerId, usage));
    }

    if (Object.values(displayCache.providers).some((e) => e.error !== null)) {
      contentLines.push('⚠️ Some providers failed');
    }
  } else if (results) {
    const now = new Date();
    updatedAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const result of results) {
      if (!result.usage) {
        await logger?.debug(`Provider ${result.provider} not configured, skipping`);
        continue;
      }

      let usage = result.usage;
      if (result.provider === 'google' && usage?.models) {
        usage = {
          ...usage,
          models: filterFlagshipModels(usage.models),
        };
      }

      contentLines.push(...formatProviderSection(result.provider, usage));
    }
  }

  if (contentLines.length === 0) {
    return {
      title: '📊 Usage',
      message: 'No providers configured',
      variant: 'info',
    };
  }

  lines.push(DIVIDER);
  lines.push(...contentLines);
  lines.push(DIVIDER);

  let footer = `Updated: ${updatedAt}`;
  if (isStale) footer += ' (stale)';
  lines.push(footer);

  return {
    title: '📊 Usage',
    message: lines.join('\n'),
    variant: 'info',
  };
};
