import type { PlaygroundContext } from '@/types/playground'
import type {
  TestExecutionOutput,
  TestRequestSummary,
  TestRisk,
} from '@/types/result'

export interface TestDefinition {
  code: string
  description: string
  expected: string[]
  id: string
  prerequisite?: (context: PlaygroundContext) => string | null
  request: TestRequestSummary
  risk: TestRisk
  run: (context: PlaygroundContext) => Promise<TestExecutionOutput>
  section: string
  title: string
}
