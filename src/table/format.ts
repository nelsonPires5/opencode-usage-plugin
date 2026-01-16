import type { ProviderResult, ProviderUsage, UsageWindow } from '../types/index.js';
import type {
  DashboardData,
  DashboardProvider,
  DashboardSection,
  DashboardWindow,
  StatusEmoji,
  StatusText,
} from '../types/dashboard.js';
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

export const formatWindowLabel = (key: string): string => {
  switch (key) {
    case '5h':
      return '5h Window';
    case 'weekly':
      return 'Weekly Window';
    default:
      return `${key} Window`;
  }
};

export const renderBar = (percent: number | null, width: number = 20): string => {
  if (percent === null) {
    return `[${'░'.repeat(width)}]`;
  }

  // Clamp percent between 0 and 100
  const validPercent = Math.max(0, Math.min(100, percent));
  const filledLength = Math.round((validPercent / 100) * width);
  const emptyLength = width - filledLength;

  return `[${'█'.repeat(filledLength)}${'░'.repeat(emptyLength)}]`;
};

const formatWindow = (key: string, window: UsageWindow): DashboardWindow => {
  const remainingPercent = window.remainingPercent ?? null;
  const { emoji, text } = getStatus(remainingPercent);

  return {
    label: formatWindowLabel(key),
    usedPercent: window.usedPercent ?? null,
    remainingPercent,
    status: emoji,
    statusText: text,
    resetsIn: window.resetAfterFormatted ?? 'N/A',
  };
};

export const formatDashboardData = (results: ProviderResult[]): DashboardData => {
  const providers: DashboardProvider[] = [];

  for (const result of results) {
    if (!result.usage) {
      continue;
    }

    const sections: DashboardSection[] = [];
    let usage = result.usage;

    // Handle flagship filtering for Google
    if (result.provider === 'google' && usage.models) {
      usage = {
        ...usage,
        models: filterFlagshipModels(usage.models),
      };
    }

    // 1. Global Windows (Overall Usage)
    const globalWindows = Object.entries(usage.windows);
    if (globalWindows.length > 0) {
      sections.push({
        title: 'Overall Usage',
        windows: globalWindows.map(([key, win]) => formatWindow(key, win)),
      });
    }

    // 2. Per-Model Windows
    if (usage.models) {
      for (const [modelName, modelUsage] of Object.entries(usage.models)) {
        const modelWindowEntries = Object.entries(modelUsage.windows);
        if (modelWindowEntries.length > 0) {
          sections.push({
            title: modelName,
            windows: modelWindowEntries.map(([key, win]) => formatWindow(key, win)),
          });
        }
      }
    }

    if (sections.length > 0) {
      providers.push({
        name: result.provider.toUpperCase().replace(/-/g, ' '),
        sections,
      });
    }
  }

  return { providers };
};

export const formatDashboardString = (data: DashboardData): string => {
  if (data.providers.length === 0) {
    return 'No usage data available';
  }

  const lines: string[] = [];
  const HEADER_WIDTH = 65; // Adjust as needed to match 70 chars total roughly

  for (const provider of data.providers) {
    // Header: PROVIDER ─────────────
    // Calculate padding for dash line
    const providerName = provider.name;
    const dashCount = Math.max(0, HEADER_WIDTH - providerName.length - 1);
    lines.push(`${providerName} ${'─'.repeat(dashCount)}`);

    for (let i = 0; i < provider.sections.length; i++) {
      const section = provider.sections[i];
      // Section title (e.g., Overall Usage or model name)
      lines.push(section.title);

      for (let j = 0; j < section.windows.length; j++) {
        const window = section.windows[j];
        const isLastWindow = j === section.windows.length - 1;

        const branch = isLastWindow ? '└─' : '├─';
        const pipe = isLastWindow ? '  ' : '│ ';

        // Line 1: Label
        // Example: └─ 5h Window
        lines.push(`  ${branch} ${window.label}`);

        // Line 2: Progress Bar + Percent
        // Example:    [████░░░░] 45%
        const percentStr =
          window.usedPercent !== null ? `${Math.round(window.usedPercent)}%` : 'N/A';
        lines.push(`  ${pipe} ${renderBar(window.usedPercent)}  ${percentStr}`);

        // Line 3: Status
        // Example:    Status 🟢 OK • Resets in 2h 15m
        lines.push(
          `  ${pipe} Status ${window.status} ${window.statusText} • Resets in ${window.resetsIn}`
        );

        // Spacer line unless it's the very last window of the section
        if (!isLastWindow) {
          lines.push(`  ${pipe}`);
        }
      }

      // Add empty line after section (unless it's the last section of the provider? maybe)
      lines.push('');
    }
    // Add empty line between providers
    // (Already added one after last section, so maybe check logic)
  }

  return lines.join('\n').trim();
};
