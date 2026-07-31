export type TestRisk =
  | 'read-only'
  | 'session-change'
  | 'temporary-write'
  | 'destructive'

export type TestStatus =
  | 'idle'
  | 'running'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'skipped'
  | 'cancelled'

export interface TestAssertion {
  label: string
  passed: boolean
  actual?: unknown
  expected?: unknown
}

export interface TestRequestSummary {
  auth: 'anonymous' | 'cookie' | 'token'
  method: string
  path: string
  transport: 'axios' | 'sdk' | 'sdk-fetch' | 'socket.io'
}

export interface TestExecutionOutput {
  assertions: TestAssertion[]
  response?: unknown
}

export interface TestResult {
  assertions: TestAssertion[]
  durationMs: number
  error: unknown | null
  finishedAt: string | null
  id: string
  request: TestRequestSummary
  response?: unknown
  risk: TestRisk
  section: string
  startedAt: string | null
  status: TestStatus
}

export interface RunSummary {
  blocked: number
  cancelled: number
  cleanupFailed: number
  failed: number
  passed: number
  running: number
  skipped: number
  total: number
}

export interface PlaygroundReport {
  generatedAt: string
  results: TestResult[]
  runId: string
  schemaVersion: '1.0'
  summary: RunSummary
  target: {
    apiUrl: string
    appUrl: string
  }
}
