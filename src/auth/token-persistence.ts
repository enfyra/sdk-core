import type { EnfyraClient } from '../client/EnfyraClient';
import type { AuthTokens, TokenPersistence } from '../types/auth';

const STORAGE_KEY = '__enfyra_tokens';

function readScopes(
  storage: Pick<Storage, 'getItem'>,
): Record<string, unknown> {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (
      !value?.scopes ||
      typeof value.scopes !== 'object' ||
      Array.isArray(value.scopes)
    )
      return Object.create(null);
    return Object.assign(Object.create(null), value.scopes);
  } catch {
    return Object.create(null);
  }
}

function isTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== 'object') return false;
  const tokens = value as AuthTokens;
  return (
    typeof tokens.accessToken === 'string' &&
    tokens.accessToken.length > 0 &&
    Number.isFinite(tokens.expTime) &&
    (tokens.refreshToken === undefined ||
      typeof tokens.refreshToken === 'string')
  );
}

export function createTokenPersistence(
  client: EnfyraClient,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): TokenPersistence {
  if (client.auth.strategy !== 'token') return { sync() {} };
  const owner = new URL(
    client.getHttpClient().baseUrl,
    'https://enfyra.invalid',
  ).href;
  const saved = readScopes(storage)[owner];
  if (!client.auth.getTokens() && isTokens(saved))
    void client.auth.setTokens(saved);
  let previous: string | undefined;
  return {
    sync() {
      const tokens = client.auth.getTokens();
      const serialized = JSON.stringify(tokens);
      if (serialized === previous) return;
      const scopes = readScopes(storage);
      if (tokens) scopes[owner] = tokens;
      else delete scopes[owner];
      try {
        if (Object.keys(scopes).length > 0)
          storage.setItem(STORAGE_KEY, JSON.stringify({ scopes }));
        else storage.removeItem(STORAGE_KEY);
        previous = serialized;
      } catch {
        return;
      }
    },
  };
}
