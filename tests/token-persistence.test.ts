import { expect, it, vi } from 'vitest';
import { createTokenPersistence } from '../src/auth/token-persistence';
import { EnfyraClient } from '../src/client/EnfyraClient';

it('ignores malformed persisted credentials and never touches storage for cookie auth', () => {
  const getItem = vi.fn(() =>
    JSON.stringify({
      scopes: {
        'https://app.invalid/api': {
          accessToken: 'synthetic',
          refreshToken: {},
          expTime: Date.now() + 900000,
        },
      },
    }),
  );
  const storage = { getItem, setItem: vi.fn(), removeItem: vi.fn() };
  const client = new EnfyraClient({
    baseUrl: 'https://app.invalid',
    auth: { strategy: 'token' },
  });
  createTokenPersistence(client, storage);
  expect(client.auth.getTokens()).toBeNull();
  getItem.mockClear();
  createTokenPersistence(
    new EnfyraClient({ baseUrl: '/enfyra', auth: { strategy: 'cookie' } }),
    storage,
  ).sync();
  expect(getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('keeps memory auth usable when browser persistence is unavailable', async () => {
  const storage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('full');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  const client = new EnfyraClient({
    baseUrl: '/enfyra',
    auth: {
      strategy: 'token',
      initialTokens: { accessToken: 'synthetic', expTime: Date.now() + 900000 },
    },
  });
  const persistence = createTokenPersistence(client, storage);
  expect(() => persistence.sync()).not.toThrow();
  expect(client.auth.getTokens()?.accessToken).toBe('synthetic');
});
