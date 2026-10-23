import { describe, expect, it, vi } from 'vitest';
import { EnfyraClient } from '../src/client/EnfyraClient';

describe('canonical credential scope across transports', () => {
  it.each(['https://app.invalid', '/enfyra', '/api/enfyra'])(
    'scopes typed and Fetch headers for base %s',
    async (baseUrl) => {
      const fetch = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response('{"data":[]}', {
            headers: { 'content-type': 'application/json' },
          }),
      );
      const getHeaders = vi.fn(() => ({ 'x-enfyra-pat': 'synthetic' }));
      const client = new EnfyraClient({
        baseUrl,
        auth: { strategy: 'none' },
        headers: { Authorization: 'Bearer synthetic' },
        getHeaders,
        fetch,
      });
      for (const endpoint of [
        '../collect',
        '%2e%2e/collect',
        'nested/../../collect',
      ]) {
        await client.get(endpoint);
        await client.fetch(endpoint);
      }
      for (const [, init] of fetch.mock.calls) {
        expect(new Headers(init?.headers).has('authorization')).toBe(false);
        expect(new Headers(init?.headers).has('x-enfyra-pat')).toBe(false);
      }
      expect(getHeaders).not.toHaveBeenCalled();
      await client.get('/records');
      expect(
        new Headers(fetch.mock.calls.at(-1)?.[1]?.headers).get('authorization'),
      ).toBe('Bearer synthetic');
      expect(getHeaders).toHaveBeenCalledTimes(1);
    },
  );
  it('never refreshes or processes upstream cookies for an out-of-scope typed request', async () => {
    const onRawResponse = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response('{"data":[]}', {
          headers: { 'content-type': 'application/json' },
        }),
    );
    const client = new EnfyraClient({
      baseUrl: '/enfyra',
      auth: {
        strategy: 'token',
        initialTokens: {
          accessToken: 'synthetic',
          refreshToken: 'synthetic-refresh',
          expTime: Date.now() + 1,
        },
      },
      onRawResponse,
      fetch,
    });
    await client.get('../collect');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onRawResponse).not.toHaveBeenCalled();
  });
  it.each(['https://app.invalid', '/enfyra', '/api/enfyra'])(
    'does not authorize escaped Axios paths for base %s',
    async (baseUrl) => {
      const client = new EnfyraClient({
        baseUrl,
        auth: {
          strategy: 'token',
          initialTokens: {
            accessToken: 'synthetic',
            expTime: Date.now() + 900000,
          },
        },
      });
      let authorize!: (config: any) => Promise<any>;
      const axios = {
        defaults: { baseURL: client.getHttpClient().baseUrl },
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
      for (const url of ['../collect', '%2e%2e/collect']) {
        const config = await authorize({ url, headers: {} });
        expect(new Headers(config.headers).has('authorization')).toBe(false);
      }
      expect(
        new Headers(
          (await authorize({ url: '/records', headers: {} })).headers,
        ).get('authorization'),
      ).toBe('Bearer synthetic');
      client.dispose();
    },
  );
});
