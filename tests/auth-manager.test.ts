import { describe, expect, it, vi } from 'vitest';
import { AuthManager } from '../src/auth/AuthManager';
import { EnfyraError } from '../src/errors/EnfyraError';
import type { AuthTokens } from '../src/types';

function createHttp() {
  return {
    baseUrl: 'https://app.example/enfyra',
    get: vi.fn(),
    post: vi.fn(),
    setHeader: vi.fn(),
    removeHeader: vi.fn(),
    resolveUrl: vi.fn((path: string) => `https://app.example/enfyra${path}`),
  };
}

describe('AuthManager', () => {
  it('keeps cookie sessions opaque and uses the bridge endpoints', async () => {
    const http = createHttp();
    const tokens: AuthTokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expTime: Date.now() + 60_000,
    };
    http.post.mockResolvedValueOnce({ data: tokens });
    http.get.mockResolvedValueOnce({
      data: [{ id: 'user-1', email: 'user@example.com', name: 'User' }],
    });
    http.post.mockResolvedValueOnce({ data: { success: true } });

    const auth = new AuthManager(http as never, {
      strategy: 'cookie',
      cookieBridgePrefix: '/enfyra',
    });

    await auth.login({
      email: 'user@example.com',
      password: 'secret',
      remember: true,
    });

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      '/login',
      {
        email: 'user@example.com',
        password: 'secret',
        remember: true,
      },
      { auth: false },
    );
    expect(auth.getTokens()).toBeNull();
    await expect(auth.getMe()).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
    });

    await auth.logout();

    expect(http.post).toHaveBeenNthCalledWith(2, '/logout', undefined, {
      auth: false,
    });
    expect(auth.getOAuthRedirectUrl('google', 'https://site.example/callback')).toBe(
      'https://app.example/enfyra/auth/google?redirect=https%3A%2F%2Fsite.example%2Fcallback&cookieBridgePrefix=%2Fenfyra',
    );
    expect(
      auth.getOAuthRedirectUrl('google', 'https://site.example/callback', {
        state: 'opaque-state+/=',
      }),
    ).toBe(
      'https://app.example/enfyra/auth/google?redirect=https%3A%2F%2Fsite.example%2Fcallback&state=opaque-state%2B%2F%3D&cookieBridgePrefix=%2Fenfyra',
    );
  });

  it('refreshes direct tokens once without re-entering auth', async () => {
    const http = createHttp();
    const auth = new AuthManager(http as never, {
      strategy: 'token',
      refreshThreshold: 120_000,
    });
    const nextTokens: AuthTokens = {
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
      expTime: Date.now() + 900_000,
    };
    http.post.mockResolvedValue({ data: nextTokens });

    await auth.setTokens({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expTime: Date.now() + 30_000,
    });

    await expect(Promise.all([auth.getToken(), auth.getToken()])).resolves.toEqual([
      'next-access',
      'next-access',
    ]);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(
      '/auth/refresh-token',
      { refreshToken: 'old-refresh' },
      { auth: false },
    );
  });

  it('supports short-lived API-token access without inventing a refresh token', async () => {
    const http = createHttp();
    const auth = new AuthManager(http as never, { strategy: 'token' });
    http.post.mockResolvedValue({
      data: {
        accessToken: 'api-access',
        expTime: Date.now() + 60_000,
        loginProvider: 'api_token',
      },
    });

    await expect(auth.exchangeApiToken('pat-secret')).resolves.toMatchObject({
      accessToken: 'api-access',
      loginProvider: 'api_token',
    });
    await expect(auth.getToken()).resolves.toBe('api-access');
    expect(http.post).toHaveBeenCalledWith(
      '/auth/token/exchange',
      { apiToken: 'pat-secret' },
      { auth: false },
    );
  });

  it('preserves transport errors from login', async () => {
    const http = createHttp();
    const error = new EnfyraError({
      code: 'NETWORK_ERROR',
      message: 'Network unavailable',
    });
    http.post.mockRejectedValue(error);
    const auth = new AuthManager(http as never, { strategy: 'token' });

    await expect(
      auth.login({ email: 'user@example.com', password: 'secret' }),
    ).rejects.toBe(error);
  });
});
