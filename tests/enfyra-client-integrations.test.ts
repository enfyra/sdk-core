import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { EnfyraClient } from '../src/client/EnfyraClient';
import type {
  AxiosInstanceLike,
  AxiosRequestConfigLike,
} from '../src/types/integrations';

function createTokenClient(fetch: typeof globalThis.fetch) {
  const client = new EnfyraClient({
    baseUrl: 'https://api.example.com',
    fetch,
    auth: { strategy: 'token' },
  });

  return client.auth
    .setTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expTime: Date.now() + 900_000,
    })
    .then(() => client);
}

function createAxios() {
  const requestHandlers: Array<
    (config: AxiosRequestConfigLike) =>
      | AxiosRequestConfigLike
      | Promise<AxiosRequestConfigLike>
  > = [];
  const responseRejectedHandlers: Array<(error: unknown) => unknown> = [];
  const request = vi.fn().mockResolvedValue({ status: 200 });
  const requestEject = vi.fn();
  const responseEject = vi.fn();

  const instance: AxiosInstanceLike = {
    defaults: { baseURL: 'https://api.example.com' },
    interceptors: {
      request: {
        use: (fulfilled) => {
          requestHandlers.push(fulfilled);
          return requestHandlers.length;
        },
        eject: requestEject,
      },
      response: {
        use: (_fulfilled, rejected) => {
          if (rejected) responseRejectedHandlers.push(rejected);
          return responseRejectedHandlers.length;
        },
        eject: responseEject,
      },
    },
    request,
  };

  return {
    instance,
    request,
    requestEject,
    requestHandlers,
    responseRejectedHandlers,
    responseEject,
  };
}

describe('EnfyraClient integrations', () => {
  it('provides a configured fetch for relative and absolute URLs', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('ok'));
    const client = await createTokenClient(fetch);

    await client.fetch('/users', { headers: { 'x-request-id': 'one' } });
    await client.fetch('https://api.example.com/api/orders');
    await client.fetch('https://other.example.com/public');

    expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/api/users');
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('authorization')).toBe(
      'Bearer access-token',
    );
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('x-request-id')).toBe(
      'one',
    );
    expect(fetch.mock.calls[1][0]).toBe(
      'https://api.example.com/api/orders',
    );
    expect(new Headers(fetch.mock.calls[1][1]?.headers).get('authorization')).toBe(
      'Bearer access-token',
    );
    expect(fetch.mock.calls[2][0]).toBe('https://other.example.com/public');
    expect(new Headers(fetch.mock.calls[2][1]?.headers).has('authorization')).toBe(
      false,
    );
  });

  it('refreshes and retries a configured Fetch request once after 401', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'next-access-token',
            refreshToken: 'next-refresh-token',
            expTime: Date.now() + 900_000,
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response('ok'));
    const client = await createTokenClient(fetch);

    const response = await client.fetch('/users');

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get('authorization')).toBe(
      'Bearer next-access-token',
    );
  });

  it('attaches auth to an existing Axios instance once', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = await createTokenClient(fetch);
    const axios = createAxios();

    expect(client.attachAxios(axios.instance)).toBe(axios.instance);
    expect(client.attachAxios(axios.instance)).toBe(axios.instance);
    expect(axios.instance.defaults.baseURL).toBe('https://api.example.com/api');
    expect(axios.requestHandlers).toHaveLength(1);

    const config = await axios.requestHandlers[0]({
      url: '/users',
      headers: { 'x-request-id': 'one' },
    });

    expect(new Headers(config.headers as HeadersInit).get('authorization')).toBe(
      'Bearer access-token',
    );
    expect(new Headers(config.headers as HeadersInit).get('x-request-id')).toBe(
      'one',
    );

    client.dispose();

    expect(axios.requestEject).toHaveBeenCalledWith(1);
    expect(axios.responseEject).toHaveBeenCalledWith(1);
  });

  it('supports a real Axios instance without a runtime Axios dependency', async () => {
    const client = await createTokenClient(vi.fn<typeof globalThis.fetch>());
    let authorization: string | undefined;
    const api = axios.create({
      baseURL: 'https://api.example.com',
      adapter: async (config) => {
        authorization = config.headers.get('Authorization') as string;
        return {
          config,
          data: { ok: true },
          headers: {},
          request: {},
          status: 200,
          statusText: 'OK',
        };
      },
    });

    expect(client.attachAxios(api)).toBe(api);
    await api.get('/users');

    expect(authorization).toBe('Bearer access-token');
  });

  it('does not attach auth to Axios requests outside the Enfyra API scope', async () => {
    const client = await createTokenClient(vi.fn<typeof globalThis.fetch>());
    const axios = createAxios();
    client.attachAxios(axios.instance);

    const config = await axios.requestHandlers[0]({
      url: 'https://other.example.com/public',
      headers: {},
    });

    expect(new Headers(config.headers as HeadersInit).has('authorization')).toBe(
      false,
    );
  });

  it('refreshes concurrent Axios 401 responses once and retries each request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'next-access-token',
          refreshToken: 'next-refresh-token',
          expTime: Date.now() + 900_000,
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = await createTokenClient(fetch);
    const axios = createAxios();
    client.attachAxios(axios.instance);
    const reject = axios.responseRejectedHandlers[0];
    const firstConfig: AxiosRequestConfigLike = { url: '/users', headers: {} };
    const secondConfig: AxiosRequestConfigLike = { url: '/orders', headers: {} };

    await Promise.all([
      reject({ response: { status: 401 }, config: firstConfig }),
      reject({ response: { status: 401 }, config: secondConfig }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(axios.request).toHaveBeenCalledTimes(2);
    expect(new Headers(firstConfig.headers as HeadersInit).get('authorization')).toBe(
      'Bearer next-access-token',
    );
    expect(new Headers(secondConfig.headers as HeadersInit).get('authorization')).toBe(
      'Bearer next-access-token',
    );
  });
});
