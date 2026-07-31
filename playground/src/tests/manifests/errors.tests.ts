import { EnfyraError } from '@enfyra/sdk-core'
import type { TestDefinition } from '@/interfaces/TestDefinition'

export const errorTests: TestDefinition[] = [
  {
    code: `await client.get('/sdk-lab-missing-route')`,
    description:
      'Confirms missing routes preserve a structured Enfyra error instead of collapsing into a generic network failure.',
    expected: ['HTTP 404', 'Error code NOT_FOUND'],
    id: 'errors.not-found',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/sdk-lab-missing-route',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ client, signal }) => {
      try {
        await client.get('/sdk-lab-missing-route', { signal })
        return {
          assertions: [
            {
              actual: 200,
              expected: 404,
              label: 'Missing route is rejected',
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
              expected: 404,
              label: 'Status is 404',
              passed: current.statusCode === 404,
            },
            {
              actual: current.code,
              expected: 'NOT_FOUND',
              label: 'Error code is preserved',
              passed: current.code === 'NOT_FOUND',
            },
          ],
          response: current,
        }
      }
    },
    section: 'errors',
    title: 'Structured 404 error',
  },
]
