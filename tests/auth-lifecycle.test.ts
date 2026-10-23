import { expect, it, vi } from 'vitest';
import { EnfyraClient } from '../src/client/EnfyraClient';

it('logs out the current near-expiry session without rotating its refresh body', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    if (String(input).endsWith('/auth/logout')) {
      expect(JSON.parse(String(init?.body)).refreshToken).toBe(
        'current-refresh',
      );
      return new Response('{"data":true}', {
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        data: {
          accessToken: 'rotated',
          refreshToken: 'rotated-refresh',
          expTime: Date.now() + 900000,
        },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  });
  const client = new EnfyraClient({
    baseUrl: 'https://app.invalid',
    fetch,
    auth: {
      strategy: 'token',
      initialTokens: {
        accessToken: 'current',
        refreshToken: 'current-refresh',
        expTime: Date.now() + 1,
      },
    },
  });
  await client.auth.logout();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(client.auth.getTokens()).toBeNull();
});

it('does not let a superseded refresh clear explicitly replaced tokens', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const client = new EnfyraClient({
    baseUrl: 'https://app.invalid',
    fetch,
    auth: {
      strategy: 'token',
      initialTokens: {
        accessToken: 'old',
        refreshToken: 'old-refresh',
        expTime: Date.now() + 900000,
      },
    },
  });
  const pending = client.auth.refreshToken().catch((error) => error);
  await Promise.resolve();
  await Promise.resolve();
  await client.auth.setTokens({
    accessToken: 'new',
    expTime: Date.now() + 900000,
  });
  resolve(
    new Response('{"error":{"message":"old session revoked"}}', {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  );
  await pending;
  expect(client.auth.getTokens()?.accessToken).toBe('new');
});

it('does not resurrect tokens when refresh finishes after logout', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
    String(input).endsWith('/auth/refresh-token')
      ? new Promise((done) => {
          resolve = done;
        })
      : new Response('{"data":true}', {
          headers: { 'content-type': 'application/json' },
        }),
  );
  const client = new EnfyraClient({
    baseUrl: 'https://app.invalid',
    fetch,
    auth: {
      strategy: 'token',
      initialTokens: {
        accessToken: 'current',
        refreshToken: 'current-refresh',
        expTime: Date.now() + 900000,
      },
    },
  });
  const refresh = client.auth.refreshToken().catch((error) => error);
  await Promise.resolve();
  await Promise.resolve();
  await client.auth.logout();
  resolve(
    new Response(
      JSON.stringify({
        data: {
          accessToken: 'old',
          refreshToken: 'old-refresh',
          expTime: Date.now() + 900000,
        },
      }),
      { headers: { 'content-type': 'application/json' } },
    ),
  );
  await refresh;
  expect(client.auth.getTokens()).toBeNull();
});
