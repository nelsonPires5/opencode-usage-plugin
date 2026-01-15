import type { Logger } from '../common/logger.ts';
import type { OpenCodeAuth } from '../../types.ts';
import { loadOpenCodeAuth } from '../common/files.ts';
import { getProviderAliases } from '../common/registry.ts';

const resolveAuthValue = (entry: OpenCodeAuth[string]): string | null => {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return entry;
  }

  if (typeof entry === 'object') {
    return entry.api_key ?? entry.token ?? entry.key ?? null;
  }

  return null;
};

export const getZaiApiKey = async (logger?: Logger): Promise<string | null> => {
  if (process.env.ZAI_API_KEY) {
    return process.env.ZAI_API_KEY;
  }

  const auth = await loadOpenCodeAuth(logger);
  if (!auth) {
    return null;
  }

  for (const alias of getProviderAliases('zai-coding-plan')) {
    const value = resolveAuthValue(auth[alias]);
    if (value) {
      return value;
    }
  }

  return null;
};
