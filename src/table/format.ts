import type { ProviderResult, ProviderUsage } from '../types/index.js';
import type { TableRow, TableData, StatusEmoji, StatusText } from '../types/table.js';
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

const formatProviderWindow = (
  provider: string,
  model: string | null,
  usage: ProviderUsage
): TableRow | null => {
  let window = null;

  const globalWindows = Object.values(usage.windows);
  if (globalWindows.length > 0) {
    window = globalWindows[0];
  } else if (usage.models && model) {
    const modelWindows = usage.models[model];
    if (modelWindows) {
      const modelWindowEntries = Object.values(modelWindows.windows);
      if (modelWindowEntries.length > 0) {
        window = modelWindowEntries[0];
      }
    }
  }

  if (!window) {
    return null;
  }

  const usedPercent = window.usedPercent ?? null;
  const remainingPercent = window.remainingPercent ?? null;
  const resetsIn = window.resetAfterFormatted ?? 'N/A';
  const { emoji, text } = getStatus(remainingPercent);

  return {
    provider,
    model: model ?? '-',
    usedPercent,
    remainingPercent,
    status: emoji,
    statusText: text,
    resetsIn,
  };
};

const formatProviderRows = (result: ProviderResult): TableRow[] => {
  if (!result.usage) {
    return [];
  }

  let usage = result.usage;

  if (result.provider === 'google' && usage?.models) {
    usage = {
      ...usage,
      models: filterFlagshipModels(usage.models),
    };
  }

  const globalWindows = Object.values(usage.windows);
  const hasGlobalWindow = globalWindows.length > 0;
  const models = usage.models ? Object.keys(usage.models) : [];

  if (hasGlobalWindow) {
    const row = formatProviderWindow(result.provider, null, usage);
    return row ? [row] : [];
  }

  if (models.length > 0) {
    const rows: TableRow[] = [];
    for (const modelName of models) {
      const row = formatProviderWindow(result.provider, modelName, usage);
      if (row) {
        rows.push(row);
      }
    }
    return rows;
  }

  return [];
};

const formatTableCell = (
  text: string | number | null,
  width: number,
  align: 'left' | 'right' = 'left'
): string => {
  const str = String(text ?? 'N/A');
  if (align === 'right') {
    return str.padStart(width, ' ');
  }
  return str.padEnd(width, ' ');
};

export const formatUsageTable = (results: ProviderResult[]): TableData => {
  const rows: TableRow[] = [];

  for (const result of results) {
    const providerRows = formatProviderRows(result);
    rows.push(...providerRows);
  }

  return { rows };
};

export const formatTableString = (tableData: TableData): string => {
  if (tableData.rows.length === 0) {
    return 'No usage data available';
  }

  const colWidths = {
    provider: 16,
    model: 18,
    used: 6,
    remaining: 11,
    status: 8,
    resets: 12,
  };

  const header = `| ${formatTableCell('Provider', colWidths.provider)} | ${formatTableCell('Model', colWidths.model)} | ${formatTableCell('Used', colWidths.used, 'right')} | ${formatTableCell('Remaining', colWidths.remaining, 'right')} | ${formatTableCell('Status', colWidths.status)} | ${formatTableCell('Resets In', colWidths.resets)} |`;

  const separator = `|${'-'.repeat(colWidths.provider + 2)}|${'-'.repeat(colWidths.model + 2)}|${'-'.repeat(colWidths.used + 2)}|${'-'.repeat(colWidths.remaining + 2)}|${'-'.repeat(colWidths.status + 2)}|${'-'.repeat(colWidths.resets + 2)}|`;

  const rows = tableData.rows.map((row) => {
    return `| ${formatTableCell(row.provider, colWidths.provider)} | ${formatTableCell(row.model, colWidths.model)} | ${formatTableCell(row.usedPercent !== null ? `${row.usedPercent}%` : null, colWidths.used, 'right')} | ${formatTableCell(row.remainingPercent !== null ? `${row.remainingPercent}%` : null, colWidths.remaining, 'right')} | ${formatTableCell(row.status, colWidths.status)} | ${formatTableCell(row.resetsIn, colWidths.resets)} |`;
  });

  return [header, separator, ...rows].join('\n');
};
