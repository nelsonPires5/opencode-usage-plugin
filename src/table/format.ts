import type { ProviderResult } from '../types/index.js';
import type { TableData, TableRow, StatusEmoji, StatusText } from '../types/table.js';
import { filterFlagshipModels } from '../toast/filter.js';

const getStatus = (remainingPercent: number | null): { emoji: StatusEmoji; text: StatusText } => {
  if (remainingPercent === null) {
    return { emoji: '⚪', text: 'N/A' };
  }

  if (remainingPercent < 10) {
    return { emoji: '🔴', text: 'Critical' };
  }

  if (remainingPercent < 30) {
    return { emoji: '🟡', text: 'Warning' };
  }

  return { emoji: '🟢', text: 'OK' };
};

const formatProviderRow = (result: ProviderResult): TableRow | null => {
  if (!result.usage) {
    return {
      provider: result.provider,
      usedPercent: null,
      remainingPercent: null,
      status: '⚪',
      statusText: 'N/A',
      resetsIn: 'N/A',
    };
  }

  let usage = result.usage;

  if (result.provider === 'google' && usage?.models) {
    usage = {
      ...usage,
      models: filterFlagshipModels(usage.models),
    };
  }

  const globalWindows = Object.values(usage.windows);
  let window = globalWindows.length > 0 ? globalWindows[0] : null;

  if (!window && usage?.models) {
    const modelEntries = Object.entries(usage.models);
    if (modelEntries.length > 0) {
      window = Object.values(modelEntries[0][1].windows)[0];
    }
  }

  const usedPercent = window?.usedPercent ?? null;
  const remainingPercent = window?.remainingPercent ?? null;
  const resetsIn = window?.resetAfterFormatted ?? 'N/A';
  const { emoji, text } = getStatus(remainingPercent);

  return {
    provider: result.provider,
    usedPercent,
    remainingPercent,
    status: emoji,
    statusText: text,
    resetsIn,
  };
};

export const formatUsageTable = (results: ProviderResult[]): TableData => {
  const rows: TableRow[] = [];

  for (const result of results) {
    const row = formatProviderRow(result);
    if (row) {
      rows.push(row);
    }
  }

  return { rows };
};
