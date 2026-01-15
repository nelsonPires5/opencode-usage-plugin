import type { ProviderResult, ProviderUsage, QuotaWindow } from '../../types.ts';
import { calculateResetAfterSeconds } from '../common/time.ts';
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

interface ModelQuotaInfoResponse {
  displayName?: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
}

interface ModelsResponse {
  models?: Record<string, ModelQuotaInfoResponse>;
}

const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse | null> => {
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
      return null;
    }

    return (await response.json()) as TokenResponse;
  } catch {
    return null;
  }
};

const fetchModels = async (
  accessToken: string,
  projectId?: string
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
        return (await response.json()) as ModelsResponse;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const toWindow = (remainingFraction?: number, resetTime?: string): QuotaWindow => {
  const remainingPercent =
    remainingFraction !== undefined ? Math.round(remainingFraction * 100) : null;
  const usedPercent = remainingPercent !== null ? Math.max(0, 100 - remainingPercent) : null;
  const resetAt = resetTime ? new Date(resetTime).getTime() : null;

  return {
    usedPercent,
    remainingPercent,
    windowSeconds: WINDOW_SECONDS,
    resetAfterSeconds: calculateResetAfterSeconds(resetAt),
    resetAt,
  };
};

const buildUsage = (data: ModelsResponse): ProviderUsage => {
  const models: Record<string, { windows: Record<string, QuotaWindow> }> = {};

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
  refreshToken?: string,
  accessToken?: string,
  expires?: number
): Promise<string | null> => {
  const now = Date.now();

  if (accessToken && (!expires || expires > now)) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshAccessToken(refreshToken);
  return refreshed?.access_token ?? null;
};

export const fetchGoogleQuota = async (): Promise<ProviderResult> => {
  const auth = await getGoogleAuth();

  if (!auth) {
    return {
      provider: 'google',
      ok: false,
      configured: false,
      error: 'Not configured - no accounts found',
      usage: null,
    };
  }

  const accessToken = await resolveAccessToken(auth.refreshToken, auth.accessToken, auth.expires);

  if (!accessToken) {
    return {
      provider: 'google',
      ok: false,
      configured: true,
      error: 'Failed to refresh OAuth token',
      usage: null,
    };
  }

  const projectId = auth.projectId ?? DEFAULT_PROJECT_ID;
  const modelsData = await fetchModels(accessToken, projectId);

  if (!modelsData) {
    return {
      provider: 'google',
      ok: false,
      configured: true,
      error: 'Failed to fetch models from API',
      usage: null,
    };
  }

  return {
    provider: 'google',
    ok: true,
    configured: true,
    usage: buildUsage(modelsData),
  };
};
