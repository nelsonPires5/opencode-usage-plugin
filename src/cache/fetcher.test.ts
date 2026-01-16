import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAllProviders } from './fetcher.ts';
import { readCache, writeCache } from './file.ts';
import { noopLogger } from '../providers/common/logger.ts';
import type { CacheSchema } from './types.ts';
import type { ProviderResult } from '../types/index.ts';

// Mock file ops
vi.mock('./file.ts', () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
}));

// Mock provider fetchers
const mockFetchOpenai = vi.fn();
const mockFetchGoogle = vi.fn();
const mockFetchZai = vi.fn();

vi.mock('../providers/openai/fetch.ts', () => ({
  fetchOpenaiUsage: () => mockFetchOpenai(),
}));
vi.mock('../providers/google/fetch.ts', () => ({
  fetchGoogleUsage: () => mockFetchGoogle(),
}));
vi.mock('../providers/zai-coding-plan/fetch.ts', () => ({
  fetchZaiUsage: () => mockFetchZai(),
}));

describe('cache/fetcher', () => {
  const mockCache: CacheSchema = {
    schema_version: 1,
    updated_at: '2024-01-01T00:00:00.000Z',
    refresh_interval_seconds: 300,
    providers: {
      openai: {
        supported: true,
        configured: true,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: '2024-01-01T00:00:00.000Z',
        data: { windows: {} },
        error: null,
      },
      google: {
        supported: true,
        configured: false,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: null,
        data: null,
        error: null,
      },
      'zai-coding-plan': {
        supported: true,
        configured: false,
        last_attempt_at: '2024-01-01T00:00:00.000Z',
        last_success_at: null,
        data: null,
        error: null,
      },
    },
  };

  const successResult = (provider: string): ProviderResult => ({
    provider: provider as any,
    ok: true,
    configured: true,
    usage: { windows: {} },
    error: undefined,
  });

  const notConfiguredResult = (provider: string): ProviderResult => ({
    provider: provider as any,
    ok: false,
    configured: false,
    usage: null,
    error: 'Not configured',
  });

  const errorResult = (provider: string): ProviderResult => ({
    provider: provider as any,
    ok: false,
    configured: true,
    usage: null,
    error: 'API Error',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readCache).mockResolvedValue(mockCache);
  });

  it('fetches all providers and updates cache', async () => {
    mockFetchOpenai.mockResolvedValue(successResult('openai'));
    mockFetchGoogle.mockResolvedValue(successResult('google'));
    mockFetchZai.mockResolvedValue(successResult('zai-coding-plan'));

    await fetchAllProviders(noopLogger);

    expect(mockFetchOpenai).toHaveBeenCalled();
    expect(mockFetchGoogle).toHaveBeenCalled();
    expect(mockFetchZai).toHaveBeenCalled();

    expect(writeCache).toHaveBeenCalledTimes(1);
    const writtenCache = vi.mocked(writeCache).mock.calls[0][0];

    expect(writtenCache.providers.openai.configured).toBe(true);
    expect(writtenCache.providers.google.configured).toBe(true);
    expect(writtenCache.providers['zai-coding-plan'].configured).toBe(true);
  });

  it('handles provider errors', async () => {
    mockFetchOpenai.mockResolvedValue(errorResult('openai'));
    mockFetchGoogle.mockResolvedValue(successResult('google'));
    mockFetchZai.mockResolvedValue(notConfiguredResult('zai-coding-plan'));

    await fetchAllProviders(noopLogger);

    const writtenCache = vi.mocked(writeCache).mock.calls[0][0];

    // OpenAI: Error
    expect(writtenCache.providers.openai.configured).toBe(true);
    expect(writtenCache.providers.openai.error).toBe('API Error');
    expect(writtenCache.providers.openai.data).toBeNull();

    // Google: Success
    expect(writtenCache.providers.google.configured).toBe(true);
    expect(writtenCache.providers.google.error).toBeNull();
    expect(writtenCache.providers.google.data).not.toBeNull();

    // Zai: Not configured
    expect(writtenCache.providers['zai-coding-plan'].configured).toBe(false);
  });

  it('wipes data if provider was configured but now is not', async () => {
    // OpenAI is configured in mockCache with data
    // Fetch result says not configured
    mockFetchOpenai.mockResolvedValue(notConfiguredResult('openai'));
    mockFetchGoogle.mockResolvedValue(notConfiguredResult('google'));
    mockFetchZai.mockResolvedValue(notConfiguredResult('zai-coding-plan'));

    await fetchAllProviders(noopLogger);

    const writtenCache = vi.mocked(writeCache).mock.calls[0][0];

    expect(writtenCache.providers.openai.configured).toBe(false);
    expect(writtenCache.providers.openai.data).toBeNull(); // Should be wiped
  });
});
