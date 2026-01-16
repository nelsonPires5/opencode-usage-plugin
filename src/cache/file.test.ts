import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CACHE_PATH, clearCache, readCache, writeCache } from './file.ts';
import { noopLogger } from '../providers/common/logger.ts';
import type { CacheSchema } from './types.ts';

// Mock fs promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
}));

// Mock files util to control xdgCacheHome
vi.mock('../providers/common/files.ts', () => ({
  xdgCacheHome: () => '/mock/cache',
}));

describe('cache/file', () => {
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
        data: null,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CACHE_PATH', () => {
    it('returns correct path under xdgCacheHome', () => {
      expect(CACHE_PATH()).toBe('/mock/cache/opencode/opencode-usage-plugin/usage.json');
    });
  });

  describe('writeCache', () => {
    it('writes content atomically to tmp file then renames', async () => {
      await writeCache(mockCache, noopLogger);

      expect(mkdir).toHaveBeenCalledWith('/mock/cache/opencode/opencode-usage-plugin', {
        recursive: true,
      });

      const expectedPath = '/mock/cache/opencode/opencode-usage-plugin/usage.json';
      const tmpPath = `${expectedPath}.tmp`;
      const expectedContent = JSON.stringify(mockCache, null, 2);

      expect(writeFile).toHaveBeenCalledWith(tmpPath, expectedContent, 'utf-8');
      expect(rename).toHaveBeenCalledWith(tmpPath, expectedPath);
    });

    it('handles mkdir errors safely if they are EEXIST', async () => {
      const eexistError = new Error('EEXIST');
      (eexistError as any).code = 'EEXIST';
      vi.mocked(mkdir).mockRejectedValueOnce(eexistError);

      await writeCache(mockCache, noopLogger);

      expect(writeFile).toHaveBeenCalled();
    });

    it('throws on other write errors', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce(new Error('Write failed'));

      await expect(writeCache(mockCache, noopLogger)).rejects.toThrow('Write failed');
    });
  });

  describe('readCache', () => {
    it('returns parsed cache if file exists and valid', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockCache));

      const result = await readCache(noopLogger);
      expect(result).toEqual(mockCache);
    });

    it('returns null if file does not exist', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await readCache(noopLogger);
      expect(result).toBeNull();
    });

    it('returns null if JSON is invalid', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('invalid json');

      const result = await readCache(noopLogger);
      expect(result).toBeNull();
    });

    it('returns null if schema is invalid', async () => {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));

      const result = await readCache(noopLogger);
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('unlinks the cache file', async () => {
      await clearCache(noopLogger);
      expect(unlink).toHaveBeenCalledWith('/mock/cache/opencode/opencode-usage-plugin/usage.json');
    });

    it('ignores ENOENT error', async () => {
      const enoentError = new Error('ENOENT');
      (enoentError as any).code = 'ENOENT';
      vi.mocked(unlink).mockRejectedValueOnce(enoentError);

      await expect(clearCache(noopLogger)).resolves.not.toThrow();
    });
  });
});
