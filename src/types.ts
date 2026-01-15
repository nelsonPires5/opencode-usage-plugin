export type ProviderId = 'openai' | 'google' | 'zai-coding-plan';

export type ProviderAlias = ProviderId | 'codex' | 'antigravity' | 'zai' | 'z.ai' | 'chatgpt';

export const PROVIDERS: ProviderId[] = ['openai', 'google', 'zai-coding-plan'];

export interface QuotaWindow {
  usedPercent: number | null;
  remainingPercent: number | null;
  windowSeconds: number | null;
  resetAfterSeconds: number | null;
  resetAt: number | null;
  resetAtFormatted: string | null;
  resetAfterFormatted: string | null;
}

export interface UsageWindows {
  windows: Record<string, QuotaWindow>;
}

export interface ProviderUsage extends UsageWindows {
  models?: Record<string, UsageWindows>;
}

export interface ProviderResult {
  provider: ProviderId;
  ok: boolean;
  configured: boolean;
  error?: string;
  usage: ProviderUsage | null;
}

export type OpenCodeAuth = Record<string, string | ProviderAuthData>;

export interface ProviderAuthData {
  type?: 'oauth' | 'api' | string;
  access?: string;
  refresh?: string;
  expires?: number;
  api_key?: string;
  token?: string;
  key?: string;
  accountId?: string;
}

export interface AntigravityAccount {
  email: string;
  refreshToken: string;
  projectId?: string;
  addedAt: number | string;
  lastUsed?: number;
  rateLimitResetTimes?: Record<string, number>;
  managedProjectId?: string;
}

export interface AntigravityAccountsFile {
  version?: number;
  accounts: AntigravityAccount[];
  activeIndex?: number;
  activeIndexByFamily?: Record<string, number>;
}
