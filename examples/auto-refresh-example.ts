import {
  EnfyraClient,
  type AuthTokens,
  type AuthTokenStorage,
} from '../src';

let storedTokens: AuthTokens | null = null;
const storage: AuthTokenStorage = {
  get() {
    return storedTokens;
  },
  set(tokens) {
    storedTokens = tokens;
  },
  clear() {
    storedTokens = null;
  },
};

const client = new EnfyraClient({
  baseUrl: 'http://localhost:3000',
  auth: {
    strategy: 'token',
    storage,
    refreshThreshold: 120_000,
  },
});

async function example() {
  await client.auth.login({
    email: 'user@example.com',
    password: 'password123',
  });

  await client.from('enfyra_user').select('id,email,name').execute();
  await Promise.all([
    client.from('enfyra_user').limit(5).execute(),
    client.from('enfyra_role').limit(5).execute(),
  ]);
}

void example();
