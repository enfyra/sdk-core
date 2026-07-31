import type { TestDefinition } from '@/interfaces/TestDefinition'

export const dataTests: TestDefinition[] = [
  {
    code: `await client.from(collection).limit(5).meta(['filterCount']).execute()`,
    description:
      'Runs a bounded collection query without changing records or assuming a system schema.',
    expected: ['At most five rows', 'A valid SDK response shape'],
    id: 'data.bounded-read',
    prerequisite: ({ session, target }) => {
      if (session.state !== 'authenticated') return 'Login is required.'
      return target.collection.trim() ? null : 'Enter a collection name first.'
    },
    request: {
      auth: 'token',
      method: 'GET',
      path: '/:collection?limit=5',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ client, target }) => {
      const result = await client
        .from(target.collection.trim())
        .limit(5)
        .meta(['filterCount'])
        .execute()
      const rows = Array.isArray(result.data) ? result.data : [result.data]
      return {
        assertions: [
          {
            actual: rows.length,
            expected: '<= 5',
            label: 'Result stays bounded',
            passed: rows.length <= 5,
          },
          {
            actual: Array.isArray(result.data),
            expected: true,
            label: 'Collection response is an array',
            passed: Array.isArray(result.data),
          },
        ],
        response: result,
      }
    },
    section: 'data',
    title: 'Bounded collection read',
  },
]
