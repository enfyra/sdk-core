import { describe, expect, it, vi } from 'vitest';
import { EnfyraClient } from '../src/client/EnfyraClient';

it('does not authenticate a foreign resolved relative Axios base', async () => {
  const client = new EnfyraClient({
    baseUrl: '/api/enfyra',
    auth: {
      strategy: 'token',
      initialTokens: { accessToken: 'synthetic', expTime: Date.now() + 900000 },
    },
  });
  let authorize!: (config: any) => Promise<any>;
  const axios = {
    defaults: { baseURL: '/other' },
    interceptors: {
      request: {
        use: (fn: typeof authorize) => {
          authorize = fn;
          return 1;
        },
        eject: vi.fn(),
      },
      response: { use: vi.fn(() => 1), eject: vi.fn() },
    },
    request: vi.fn(),
  };
  client.attachAxios(axios);
  expect(
    new Headers((await authorize({ url: '/records' })).headers).has(
      'authorization',
    ),
  ).toBe(false);
  client.dispose();
});

describe('canonical destination boundaries', () => {
  it.each(['https://app.invalid', '/api/enfyra'])(
    'rejects escaped and prefix-collision URLs at %s',
    async (baseUrl) => {
      const fetch = vi.fn<typeof globalThis.fetch>(
        async () => new Response(null, { status: 204 }),
      );
      const client = new EnfyraClient({
        baseUrl,
        auth: { strategy: 'none' },
        headers: { 'x-enfyra-pat': 'synthetic' },
        fetch,
      });
      for (const path of [
        '..\\collect',
        '%2E./collect',
        '.%2e/collect',
        '../api-other/records',
      ])
        await client.fetch(path);
      await client.fetch('//foreign.invalid/collect');
      for (const [, init] of fetch.mock.calls)
        expect(new Headers(init?.headers).has('x-enfyra-pat')).toBe(false);
    },
  );
});
