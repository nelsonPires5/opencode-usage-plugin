import type { ProviderResult, ProviderUsage } from '../types/index.js';
import type { ToastUsageResult } from '../types/toast.js';
import type { Logger } from '../providers/common/logger.js';
import { filterFlagshipModels } from './filter.js';

const formatProviderLine = (provider: string, usage: ProviderUsage | null): string => {
  if (!usage) {
    return `${provider}: Not configured`;
  }

  const globalWindows = Object.values(usage.windows);
  if (globalWindows.length > 0) {
    const window = globalWindows[0];
    const used = window.usedPercent ?? 0;
    const reset = window.resetAfterFormatted ?? 'N/A';
    return `${provider}: ${used}% used • resets in ${reset}`;
  }

  if (usage.models) {
    const models = Object.entries(usage.models);
    if (models.length === 1) {
      const [modelName, modelData] = models[0];
      const window = Object.values(modelData.windows)[0];
      const used = window.usedPercent ?? 0;
      const reset = window.resetAfterFormatted ?? 'N/A';
      return `${provider}: ${modelName} ${used}% • resets in ${reset}`;
    }

    if (models.length > 1) {
      const parts: string[] = [];
      for (const [modelName, modelData] of models) {
        const window = Object.values(modelData.windows)[0];
        const used = window.usedPercent ?? 0;
        parts.push(`${modelName} ${used}%`);
      }
      return `${provider}: ${parts.join(', ')}`;
    }
  }

  return `${provider}: No usage data`;
};

export const formatUsageToast = async (
  results: ProviderResult[],
  logger?: Logger
): Promise<ToastUsageResult> => {
  const lines: string[] = [];

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

    const line = formatProviderLine(result.provider, usage);
    lines.push(line);
  }

  if (lines.length === 0) {
    return {
      title: 'Usage',
      message: 'No providers configured',
      variant: 'info',
    };
  }

  return {
    title: 'Usage',
    message: lines.join('\n'),
    variant: 'info',
  };
};
