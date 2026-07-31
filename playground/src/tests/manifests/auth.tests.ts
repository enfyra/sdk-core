import { EnfyraError } from '@enfyra/sdk-core'
import type { TestDefinition } from '@/interfaces/TestDefinition'

export const authTests: TestDefinition[] = [
  {
    code: `await anonymousClient.get('/me')`,
    description:
      'Confirms the target is reachable and rejects a request that has no session.',
    expected: ['HTTP 401', 'Enfyra error code UNAUTHORIZED'],
    id: 'auth.anonymous-me',
    request: {
      auth: 'anonymous',
      method: 'GET',
      path: '/me',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ anonymousClient, signal }) => {
      try {
        await anonymousClient.get('/me', { signal })
        return {
          assertions: [
            {
              actual: 200,
              expected: 401,
              label: 'Anonymous request is rejected',
              passed: false,
            },
          ],
        }
      } catch (error) {
        const current = error as EnfyraError
        return {
          assertions: [
            {
              actual: current.statusCode,
              expected: 401,
              label: 'Status is 401',
              passed: current.statusCode === 401,
            },
            {
              actual: current.code,
              expected: 'UNAUTHORIZED',
              label: 'Error code is preserved',
              passed: current.code === 'UNAUTHORIZED',
            },
          ],
          response: current,
        }
      }
    },
    section: 'authentication',
    title: 'Anonymous session boundary',
  },
  {
    code: `const user = await client.auth.getMe()`,
    description:
      'Verifies that the active access token resolves to a real Enfyra user.',
    expected: ['A user object', 'Stable user ID and email'],
    id: 'auth.current-user',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/me',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ client }) => {
      const user = await client.auth.getMe()
      return {
        assertions: [
          {
            actual: Boolean(user?.id),
            expected: true,
            label: 'User ID is present',
            passed: Boolean(user?.id),
          },
          {
            actual: Boolean(user?.email),
            expected: true,
            label: 'Email is present',
            passed: Boolean(user?.email),
          },
        ],
        response: user,
      }
    },
    section: 'authentication',
    title: 'Resolve current user',
  },
  {
    code: `await client.auth.refreshToken()`,
    description:
      'Forces token rotation and confirms a new access-token expiry is available.',
    expected: ['Refresh succeeds', 'New expiry is in the future'],
    id: 'auth.refresh',
    prerequisite: ({ client, target }) => {
      return client.auth.getTokens()?.refreshToken
        ? null
        : 'Login with a refresh-capable session first.'
    },
    request: {
      auth: 'token',
      method: 'POST',
      path: '/auth/refresh-token',
      transport: 'sdk',
    },
    risk: 'session-change',
    run: async ({ client, updateSession }) => {
      const tokens = await client.auth.refreshToken()
      await updateSession()
      return {
        assertions: [
          {
            actual: tokens.expTime,
            expected: `>${Date.now()}`,
            label: 'Expiry is in the future',
            passed: tokens.expTime > Date.now(),
          },
        ],
        response: {
          expiresAt: tokens.expTime,
          loginProvider: tokens.loginProvider ?? null,
        },
      }
    },
    section: 'authentication',
    title: 'Rotate token session',
  },
  {
    code: `await client.auth.logout()`,
    description:
      'Revokes the refresh session, clears local tokens, and verifies local auth state.',
    expected: ['Server logout succeeds', 'Local token state is cleared'],
    id: 'auth.logout',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'POST',
      path: '/auth/logout',
      transport: 'sdk',
    },
    risk: 'session-change',
    run: async ({ client, updateSession }) => {
      try {
        await client.auth.logout()
      } finally {
        await updateSession()
      }
      return {
        assertions: [
          {
            actual: client.auth.getTokens(),
            expected: null,
            label: 'Local tokens are cleared',
            passed: client.auth.getTokens() === null,
          },
        ],
      }
    },
    section: 'authentication',
    title: 'End current session',
  },
]
