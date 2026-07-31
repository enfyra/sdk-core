import { EnfyraClient } from '../src';

const browserClient = new EnfyraClient({
  baseUrl: '/enfyra',
  auth: {
    strategy: 'cookie',
    cookieBridgePrefix: '/enfyra',
  },
});

async function cookieSessionExample() {
  await browserClient.auth.login({
    email: 'user@example.com',
    password: 'password123',
    remember: true,
  });

  const user = await browserClient.auth.getMe();
  console.log('Current user:', user);

  await browserClient.auth.logout();
}

const serverClient = new EnfyraClient({
  baseUrl: 'http://localhost:3000',
  auth: { strategy: 'token' },
});

async function directTokenExample() {
  const result = await serverClient.auth.login({
    email: 'user@example.com',
    password: 'password123',
  });

  if (result.strategy === 'token') {
    console.log('Access expires at:', new Date(result.tokens.expTime));
  }

  await serverClient.auth.logout();
}

void cookieSessionExample();
void directTokenExample();
