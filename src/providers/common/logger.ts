export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, extra?: Record<string, unknown>) => Promise<void>;
  info: (message: string, extra?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, extra?: Record<string, unknown>) => Promise<void>;
  error: (message: string, extra?: Record<string, unknown>) => Promise<void>;
}

export const maskSecret = (secret: string): string => {
  if (!secret || typeof secret !== 'string' || secret.length <= 8) {
    return '***';
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
};

const noOpLogger: Logger = {
  debug: async () => {},
  info: async () => {},
  warn: async () => {},
  error: async () => {},
};

interface LogOptions {
  service: string;
  level: LogLevel;
  message: string;
  extra?: Record<string, unknown>;
}

interface OpenCodeClient {
  app: {
    log: (_options: LogOptions) => Promise<boolean> | { ok: boolean };
  };
}

export const createLogger = (client: unknown): Logger => {
  const service = 'opencode-usage';

  return {
    debug: async (message, extra) => {
      await (client as OpenCodeClient).app.log({ service, level: 'debug', message, extra });
    },
    info: async (message, extra) => {
      await (client as OpenCodeClient).app.log({ service, level: 'info', message, extra });
    },
    warn: async (message, extra) => {
      await (client as OpenCodeClient).app.log({ service, level: 'warn', message, extra });
    },
    error: async (message, extra) => {
      await (client as OpenCodeClient).app.log({ service, level: 'error', message, extra });
    },
  };
};

export const noopLogger = noOpLogger;
