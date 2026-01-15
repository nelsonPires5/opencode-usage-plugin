import { expect } from 'vitest';

import type { AntigravityAccountsFile, ProviderId, ProviderResult } from '../../types/index.ts';

export const mockOpenaiAuth = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

export const mockGoogleAccounts: AntigravityAccountsFile = {
  version: 3,
  activeIndex: 0,
  accounts: [
    {
      email: 'test@example.com',
      refreshToken: 'mock-refresh-token',
      projectId: 'mock-project-id',
      addedAt: 1704067200000,
    },
  ],
};

export const mockZaiApiKey = 'mock-zai-api-key';

export const expectUsageSuccess = (result: ProviderResult) => {
  expect(result.ok).toBe(true);
  expect(result.configured).toBe(true);
  expect(result.usage).not.toBeNull();
};

export const expectUsageError = (result: ProviderResult, expectedError?: string) => {
  expect(result.ok).toBe(false);
  expect(result.error).toBeTruthy();
  if (expectedError) {
    expect(result.error).toContain(expectedError);
  }
};

export const expectUsageNotConfigured = (result: ProviderResult, expectedError?: string) => {
  expect(result.ok).toBe(false);
  expect(result.configured).toBe(false);
  expect(result.error).toBeTruthy();
  if (expectedError) {
    expect(result.error).toContain(expectedError);
  }
};

const REAL_AUTH_ENV: Record<ProviderId, string> = {
  openai: 'TEST_REAL_OPENAI_AUTH',
  google: 'TEST_REAL_GOOGLE_AUTH',
  'zai-coding-plan': 'TEST_REAL_ZAI_CODING_PLAN_AUTH',
};

export const isRealAuthEnabled = (provider: ProviderId): boolean => {
  return process.env[REAL_AUTH_ENV[provider]] === '1';
};
