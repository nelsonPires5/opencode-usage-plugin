import type { Logger } from '../providers/common/logger.ts';
import { fetchAllProviders } from './fetcher.ts';
import { REFRESH_INTERVAL_SECONDS } from './types.ts';

let intervalId: ReturnType<typeof globalThis.setInterval> | null = null;

export const startWorker = (logger: Logger): void => {
  if (intervalId !== null) {
    logger.warn('Worker already started');
    return;
  }

  const refreshLoop = async (): Promise<void> => {
    try {
      await fetchAllProviders(logger);
    } catch (error) {
      await logger.error('Worker refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void refreshLoop();

  intervalId = globalThis.setInterval(refreshLoop, REFRESH_INTERVAL_SECONDS * 1000);

  void logger.info(`Worker started, refreshing every ${REFRESH_INTERVAL_SECONDS}s`);
};

export const stopWorker = (logger: Logger): void => {
  if (intervalId === null) {
    return;
  }

  globalThis.clearInterval(intervalId);
  intervalId = null;

  void logger.info('Worker stopped');
};

export const isWorkerRunning = (): boolean => intervalId !== null;
