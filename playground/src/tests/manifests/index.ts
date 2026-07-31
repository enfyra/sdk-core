import type { TestDefinition } from '@/interfaces/TestDefinition'
import { authTests } from './auth.tests'
import { dataTests } from './data.tests'
import { errorTests } from './errors.tests'
import { integrationTests } from './integrations.tests'
import { storageTests } from './storage.tests'

export const testDefinitions: TestDefinition[] = [
  ...authTests,
  ...dataTests,
  ...storageTests,
  ...integrationTests,
  ...errorTests,
]
