import type { ProviderResult, ProviderUsage, UsageWindow } from '../../types.ts';
import { maskSecret, type Logger, noopLogger } from '../common/logger.ts';
import { calculateResetAfterSeconds, formatDuration, formatResetAt } from '../common/time.ts';
import { getGoogleAuth } from './auth.ts';

const GOOGLE_CLIENT_ID =
  '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const DEFAULT_PROJECT_ID = 'rising-fact-p41fc';
const WINDOW_SECONDS = 5 * 60 * 60;

const ENDPOINTS: readonly string[] = [
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://autopush-cloudcode-pa.sandbox.googleapis.com',
  'https://cloudcode-pa.googleapis.com',
];

const HEADERS = {
  'User-Agent': 'antigravity/1.11.5 windows/amd64',
  'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
  'Client-Metadata':
    '{"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}',
} as const;

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

interface ModelUsageInfoResponse {
  displayName?: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
}

interface ModelsResponse {
  models?: Record<string, ModelUsageInfoResponse>;
}

const refreshAccessToken = async (
  refreshToken: string,
  logger: Logger
): Promise<TokenResponse | null> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      await logger.warn('Failed to refresh OAuth token for google', {
        status: response.status,
        token: maskSecret(refreshToken),
      });
      return null;
    }

    return (await response.json()) as TokenResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.warn(`Token refresh failed for google: ${message}`);
    return null;
  }
};

const fetchModels = async (
  accessToken: string,
  projectId: string | undefined,
  logger: Logger
): Promise<ModelsResponse | null> => {
  const body = projectId ? { project: projectId } : {};

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}/v1internal:fetchAvailableModels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...HEADERS,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        await logger.debug(`Fetched models from ${endpoint}`, { projectId });
        return (await response.json()) as ModelsResponse;
      }
    } catch {
      continue;
    }
  }

  await logger.error('Failed to fetch models from all google endpoints', { projectId });
  return null;
};

const toWindow = (remainingFraction?: number, resetTime?: string): UsageWindow => {
  const remainingPercent =
    remainingFraction !== undefined ? Math.round(remainingFraction * 100) : null;
  const usedPercent = remainingPercent !== null ? Math.max(0, 100 - remainingPercent) : null;
  const resetAt = resetTime ? new Date(resetTime).getTime() : null;
  const resetAfterSeconds = calculateResetAfterSeconds(resetAt);

  return {
    usedPercent,
    remainingPercent,
    windowSeconds: WINDOW_SECONDS,
    resetAfterSeconds,
    resetAt,
    resetAtFormatted: resetAt ? formatResetAt(resetAt) : null,
    resetAfterFormatted: resetAfterSeconds !== null ? formatDuration(resetAfterSeconds) : null,
  };
};

const buildUsage = (data: ModelsResponse): ProviderUsage => {
  const models: Record<string, { windows: Record<string, UsageWindow> }> = {};

  for (const [modelName, modelData] of Object.entries(data.models ?? {})) {
    const window = toWindow(modelData.quotaInfo?.remainingFraction, modelData.quotaInfo?.resetTime);
    models[modelName] = {
      windows: {
        '5h': window,
      },
    };
  }

  return {
    windows: {},
    models: Object.keys(models).length ? models : undefined,
  };
};

const resolveAccessToken = async (
  refreshToken: string | undefined,
  accessToken: string | undefined,
  expires: number | undefined,
  logger: Logger
): Promise<string | null> => {
  const now = Date.now();

  if (accessToken && (!expires || expires > now)) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshAccessToken(refreshToken, logger);
  return refreshed?.access_token ?? null;
};

export const fetchGoogleUsage = async (logger: Logger = noopLogger): Promise<ProviderResult> => {
  const auth = await getGoogleAuth(logger);

  if (!auth) {
    await logger.warn('No auth configured for google');
    return {
      provider: 'google',
      ok: false,
      configured: false,
      error: 'Not configured - no accounts found',
      usage: null,
    };
  }

  const accessToken = await resolveAccessToken(
    auth.refreshToken,
    auth.accessToken,
    auth.expires,
    logger
  );

  if (!accessToken) {
    await logger.warn('Failed to refresh OAuth token for google', { email: auth.email });
    return {
      provider: 'google',
      ok: false,
      configured: true,
      error: 'Failed to refresh OAuth token',
      usage: null,
    };
  }

  const projectId = auth.projectId ?? DEFAULT_PROJECT_ID;
  const modelsData = await fetchModels(accessToken, projectId, logger);

  if (!modelsData) {
    await logger.error('Failed to fetch models from google API', { projectId });
    return {
      provider: 'google',
      ok: false,
      configured: true,
      error: 'Failed to fetch models from API',
      usage: null,
    };
  }

  await logger.info('google usage fetched successfully');

  return {
    provider: 'google',
    ok: true,
    configured: true,
    usage: buildUsage(modelsData),
  };
};
