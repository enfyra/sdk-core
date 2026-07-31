import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../src/client/HttpClient';
import { EnfyraError } from '../src/errors/EnfyraError';

describe('HttpClient', () => {
  it('uses request-scoped headers and preserves the real response', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: false }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'request-1',
        },
      }),
    );
    const client = new HttpClient({
      baseUrl: 'https://api.example/api',
      fetch,
      getHeaders: async () => ({ cookie: 'session=one' }),
    });

    await expect(client.get<boolean>('/feature', { query: { enabled: false } })).resolves.toMatchObject({
      data: false,
      status: 201,
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example/api/feature?enabled=false');
    expect(new Headers(init?.headers).get('cookie')).toBe('session=one');
    expect(new Headers(init?.headers).has('content-type')).toBe(false);
  });

  it('preserves Enfyra error codes and details', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'SCHEMA_INDEX_OVER_UNIQUE_FIELD',
            message: 'Index conflicts with a unique constraint',
            details: { fields: ['email'] },
          },
        }),
        {
          status: 409,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const client = new HttpClient({ baseUrl: 'https://api.example', fetch });

    const error = await client.get('/enfyra_table').catch((value) => value);

    expect(error).toBeInstanceOf(EnfyraError);
    expect(error).toMatchObject({
      code: 'SCHEMA_INDEX_OVER_UNIQUE_FIELD',
      message: 'Index conflicts with a unique constraint',
      statusCode: 409,
      details: { fields: ['email'] },
    });
  });

  it('supports a same-origin relative base URL', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new HttpClient({ baseUrl: '/enfyra', fetch });

    await client.get('/me');

    expect(fetch.mock.calls[0][0]).toBe('/enfyra/me');
  });

  it('adds the Enfyra API path to an absolute app URL', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new HttpClient({ baseUrl: 'http://localhost:3000', fetch });

    await client.get('/me');

    expect(client.baseUrl).toBe('http://localhost:3000/api');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/api/me');
  });

  it('does not duplicate an existing Enfyra API path', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new HttpClient({
      baseUrl: 'http://localhost:3000/api/',
      fetch,
    });

    await client.get('/me');

    expect(client.baseUrl).toBe('http://localhost:3000/api');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/api/me');
  });
});
