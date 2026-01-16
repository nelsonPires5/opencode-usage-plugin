import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { createLogger, type Logger } from './providers/common/logger.ts';
import { fetchGoogleUsage } from './providers/google/fetch.ts';
import { fetchOpenaiUsage } from './providers/openai/fetch.ts';
import { fetchZaiUsage } from './providers/zai-coding-plan/fetch.ts';
import { PROVIDERS, type ProviderId, type ProviderResult } from './types/index.ts';
import { formatDashboardData, formatDashboardString } from './table/format.js';
import { formatUsageToast } from './toast/format.js';

const fetchUsage = async (provider: ProviderId, logger: Logger): Promise<ProviderResult> => {
  switch (provider) {
    case 'openai':
      return fetchOpenaiUsage(logger);
    case 'google':
      return fetchGoogleUsage(logger);
    case 'zai-coding-plan':
      return fetchZaiUsage(logger);
  }
};

export const UsagePlugin: Plugin = async ({ client }) => {
  const logger = createLogger(client);

  const usageToastTool = tool({
    description: 'Show subscription usage as toast for OpenAI, Google, and z.ai providers',
    args: {},
    async execute() {
      await logger.info('Fetching usage for all providers');

      const results = await Promise.all(PROVIDERS.map((provider) => fetchUsage(provider, logger)));

      const toast = await formatUsageToast(results, logger);

      await client.tui.showToast({
        body: {
          title: toast.title,
          message: toast.message,
          variant: toast.variant,
        },
      });

      return 'Usage displayed';
    },
  });

  const usageTableTool = tool({
    description:
      'Get subscription usage data for OpenAI, Google, and z.ai providers as a formatted table',
    args: {},
    async execute() {
      await logger.info('Fetching usage for all providers');

      const results = await Promise.all(PROVIDERS.map((provider) => fetchUsage(provider, logger)));

      const dashboardData = formatDashboardData(results);

      return formatDashboardString(dashboardData);
    },
  });

  return {
    tool: {
      usage_toast: usageToastTool,
      usage_table: usageTableTool,
    },
    async config(config) {
      config.command = config.command ?? {};

      config.command['usage-toast'] = {
        template: 'Call the usage_toast tool.',
        description: 'Show subscription usage as toast notification',
      };

      config.command.usage = {
        template: 'Call the usage_table tool and display the formatted table.',
        description: 'Show subscription usage as formatted table',
      };
    },
  };
};

export default UsagePlugin;
