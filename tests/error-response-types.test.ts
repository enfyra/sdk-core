import { expect, it, vi } from 'vitest';
import { HttpClient } from '../src/client/HttpClient';

it.each(['blob', 'arrayBuffer', 'text', 'json'] as const)(
  'preserves JSON error envelopes for %s requests',
  async (responseType) => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'ASSET_DENIED',
              message: 'Denied asset',
              details: { field: 'file' },
            },
          }),
          { status: 403, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = new HttpClient({ baseUrl: 'https://app.invalid', fetch });
    await expect(
      client.get('/assets/file', { responseType }),
    ).rejects.toMatchObject({
      code: 'ASSET_DENIED',
      message: 'Denied asset',
      statusCode: 403,
      details: { field: 'file' },
    });
  },
);
