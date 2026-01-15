import type {
  AntigravityAccount,
  AntigravityAccountsFile,
  OpenCodeAuth,
  ProviderAuthData,
} from '../../types/index.ts';
import type { Logger } from '../common/logger.ts';
import { AUTH_PATHS, loadOpenCodeAuth, readJson } from '../common/files.ts';
import { getProviderAliases } from '../common/registry.ts';

export interface GoogleAuthContext {
  refreshToken?: string;
  accessToken?: string;
  expires?: number;
  projectId?: string;
  email?: string;
}

const toAuthData = (entry: OpenCodeAuth[string]): ProviderAuthData | null => {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return { token: entry };
  }

  if (typeof entry === 'object') {
    return entry as ProviderAuthData;
  }

  return null;
};

const loadOpenCodeAuthEntry = async (logger?: Logger): Promise<ProviderAuthData | null> => {
  const auth = await loadOpenCodeAuth(logger);
  if (!auth) {
    return null;
  }

  for (const alias of getProviderAliases('google')) {
    const entry = toAuthData(auth[alias]);
    if (entry) {
      return entry;
    }
  }

  return null;
};

const toAuthContext = (entry: ProviderAuthData | null): GoogleAuthContext | null => {
  if (!entry) {
    return null;
  }

  const accessToken = entry.access ?? entry.token;
  let refreshToken = entry.refresh;
  let projectId: string | undefined = undefined;

  if (refreshToken && refreshToken.includes('|')) {
    const parts = refreshToken.split('|');
    refreshToken = parts[0];
    projectId = parts[1];
  }

  if (!accessToken && !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expires: entry.expires,
    projectId,
  };
};

const selectAccount = (accounts: AntigravityAccountsFile | null): AntigravityAccount | null => {
  if (!accounts?.accounts?.length) {
    return null;
  }

  const candidateIndex = accounts.activeIndex ?? 0;
  const account = accounts.accounts[candidateIndex] ?? accounts.accounts[0];
  return account ?? null;
};

const loadAuthFromAccounts = async (logger?: Logger): Promise<GoogleAuthContext | null> => {
  const configAccounts = await readJson<AntigravityAccountsFile>(
    AUTH_PATHS.antigravityConfig(),
    logger
  );
  const account = selectAccount(configAccounts);
  if (account) {
    return {
      refreshToken: account.refreshToken,
      projectId: account.projectId ?? account.managedProjectId,
      email: account.email,
    };
  }

  const dataAccounts = await readJson<AntigravityAccountsFile>(
    AUTH_PATHS.antigravityData(),
    logger
  );
  const fallbackAccount = selectAccount(dataAccounts);
  if (!fallbackAccount) {
    return null;
  }

  return {
    refreshToken: fallbackAccount.refreshToken,
    projectId: fallbackAccount.projectId ?? fallbackAccount.managedProjectId,
    email: fallbackAccount.email,
  };
};

export const getGoogleAuth = async (logger?: Logger): Promise<GoogleAuthContext | null> => {
  const openCodeAuth = await loadOpenCodeAuthEntry(logger);
  const authContext = toAuthContext(openCodeAuth);
  if (authContext) {
    return authContext;
  }

  return loadAuthFromAccounts(logger);
};
