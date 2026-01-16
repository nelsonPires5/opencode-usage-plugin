import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startWorker, stopWorker } from './worker.ts';
import { fetchAllProviders } from './fetcher.ts';
import { noopLogger } from '../providers/common/logger.ts';
import { REFRESH_INTERVAL_SECONDS } from './types.ts';

vi.mock('./fetcher.ts', () => ({
  fetchAllProviders: vi.fn(),
}));

describe('cache/worker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopWorker(noopLogger);
  });

  it('starts worker and fetches immediately', () => {
    startWorker(noopLogger);
    expect(fetchAllProviders).toHaveBeenCalledTimes(1);
  });

  it('fetches periodically', () => {
    startWorker(noopLogger);
    expect(fetchAllProviders).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REFRESH_INTERVAL_SECONDS * 1000);
    expect(fetchAllProviders).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(REFRESH_INTERVAL_SECONDS * 1000);
    expect(fetchAllProviders).toHaveBeenCalledTimes(3);
  });

  it('stops fetching when stopped', () => {
    startWorker(noopLogger);
    expect(fetchAllProviders).toHaveBeenCalledTimes(1);

    stopWorker(noopLogger);

    vi.advanceTimersByTime(REFRESH_INTERVAL_SECONDS * 1000 * 5);
    expect(fetchAllProviders).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors silently', async () => {
    vi.mocked(fetchAllProviders).mockRejectedValue(new Error('Fetch failed'));
    const spyError = vi.spyOn(noopLogger, 'error');

    startWorker(noopLogger);
    expect(fetchAllProviders).toHaveBeenCalledTimes(1);

    // Wait for promise rejection to be handled
    await Promise.resolve();
    await Promise.resolve();

    expect(spyError).toHaveBeenCalledWith('Worker refresh failed', expect.any(Object));
  });

  it('does not start multiple intervals if called twice', () => {
    startWorker(noopLogger);
    startWorker(noopLogger);

    expect(fetchAllProviders).toHaveBeenCalledTimes(1); // Should only run once immediately

    vi.advanceTimersByTime(REFRESH_INTERVAL_SECONDS * 1000);
    expect(fetchAllProviders).toHaveBeenCalledTimes(2); // One interval ticking
  });
});
