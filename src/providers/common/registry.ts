import type { ProviderAlias, ProviderId } from '../../types.ts';

export const PROVIDER_ALIASES: Record<ProviderId, ProviderAlias[]> = {
  openai: ['openai', 'codex', 'chatgpt'],
  google: ['google', 'antigravity'],
  'zai-coding-plan': ['zai-coding-plan', 'zai', 'z.ai'],
};

export const parseProvider = (input?: string): ProviderId | null => {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  for (const [providerId, aliases] of Object.entries(PROVIDER_ALIASES)) {
    if (aliases.includes(normalized as ProviderAlias)) {
      return providerId as ProviderId;
    }
  }

  return null;
};

export const getProviderAliases = (provider: ProviderId): ProviderAlias[] => {
  return PROVIDER_ALIASES[provider];
};
