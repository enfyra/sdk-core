import type { TestDefinition } from '@/interfaces/TestDefinition'

export const storageTests: TestDefinition[] = [
  {
    code: `await client.storage.getStorageConfigs()`,
    description:
      'Checks which enabled storage adapters are visible to the current user.',
    expected: ['Request succeeds', 'Response is an array'],
    id: 'storage.configs',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/enfyra_storage_config',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ client }) => {
      const configs = await client.storage.getStorageConfigs()
      return {
        assertions: [
          {
            actual: Array.isArray(configs),
            expected: true,
            label: 'Storage configs are returned as a list',
            passed: Array.isArray(configs),
          },
        ],
        response: configs,
      }
    },
    section: 'storage',
    title: 'List enabled storage adapters',
  },
  {
    code: `await client.storage.getFolderTree()`,
    description:
      'Reads the current folder hierarchy without uploading or mutating any asset.',
    expected: ['Request succeeds', 'Folder data is returned'],
    id: 'storage.folder-tree',
    prerequisite: ({ session }) =>
      session.state === 'authenticated' ? null : 'Login is required.',
    request: {
      auth: 'token',
      method: 'GET',
      path: '/enfyra_folder/tree',
      transport: 'sdk',
    },
    risk: 'read-only',
    run: async ({ client }) => {
      const tree = await client.storage.getFolderTree()
      return {
        assertions: [
          {
            actual: tree !== undefined,
            expected: true,
            label: 'Folder response is present',
            passed: tree !== undefined,
          },
        ],
        response: tree,
      }
    },
    section: 'storage',
    title: 'Read folder tree',
  },
]
