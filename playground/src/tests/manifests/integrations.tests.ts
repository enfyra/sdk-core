import axios from 'axios'
import type { TestDefinition } from '@/interfaces/TestDefinition'

export const integrationTests: TestDefinition[] = [
  {
    code: `const response = await client.fetch('/me')`,
    description:
      'Uses the configured native Fetch function and confirms scoped Bearer auth reaches Enfyra.',
    expected: ['Native Response', 'HTTP 200', 'JSON body'],
    id: 'integrations.fetch',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/me',
      transport: 'sdk-fetch',
    },
    risk: 'read-only',
    run: async ({ client, signal }) => {
      const response = await client.fetch('/me', { signal })
      const body = await response.json()
      return {
        assertions: [
          {
            actual: response.status,
            expected: 200,
            label: 'Fetch status is 200',
            passed: response.status === 200,
          },
          {
            actual: body !== null,
            expected: true,
            label: 'Response contains JSON',
            passed: body !== null,
          },
        ],
        response: body,
      }
    },
    section: 'integrations',
    title: 'Configured native Fetch',
  },
  {
    code: `const api = client.attachAxios(axios.create())\nawait api.get('/me')`,
    description:
      'Attaches Enfyra auth to a real Axios instance without exposing or copying tokens.',
    expected: ['Axios receives HTTP 200', 'Existing instance remains usable'],
    id: 'integrations.axios',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/me',
      transport: 'axios',
    },
    risk: 'read-only',
    run: async ({ client, signal, target }) => {
      const api = client.attachAxios(axios.create({ baseURL: target.appUrl }))
      try {
        const response = await api.get('/me', { signal })
        return {
          assertions: [
            {
              actual: response.status,
              expected: 200,
              label: 'Axios status is 200',
              passed: response.status === 200,
            },
          ],
          response: response.data,
        }
      } finally {
        client.dispose()
      }
    },
    section: 'integrations',
    title: 'Existing Axios instance',
  },
]
