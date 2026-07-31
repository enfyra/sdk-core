import type { TestDefinition } from '@/interfaces/TestDefinition'
import type { PlaygroundContext, PlaygroundLog } from '@/types/playground'
import type { TestResult } from '@/types/result'
import { redact } from './redactor'

interface TestRunnerOptions {
  context: (signal: AbortSignal) => PlaygroundContext
  definitions: TestDefinition[]
  onLog: (log: PlaygroundLog) => void
  onResult: (result: TestResult) => void
  onRunningChange: (running: boolean) => void
}

export class TestRunner {
  private controller: AbortController | null = null
  private readonly definitions: Map<string, TestDefinition>

  constructor(private readonly options: TestRunnerOptions) {
    this.definitions = new Map(
      options.definitions.map((definition) => [definition.id, definition]),
    )
  }

  abort(): void {
    this.controller?.abort()
  }

  runSafeSuite(): Promise<void> {
    return this.run(
      [...this.definitions.values()]
        .filter((definition) => definition.risk === 'read-only')
        .map((definition) => definition.id),
    )
  }

  runSection(section: string): Promise<void> {
    return this.run(
      [...this.definitions.values()]
        .filter(
          (definition) =>
            definition.section === section && definition.risk === 'read-only',
        )
        .map((definition) => definition.id),
    )
  }

  runTest(id: string): Promise<void> {
    return this.run([id])
  }

  private async run(ids: string[]): Promise<void> {
    if (this.controller) return
    this.controller = new AbortController()
    this.options.onRunningChange(true)

    try {
      for (const id of ids) {
        const definition = this.definitions.get(id)
        if (!definition) continue
        if (this.controller.signal.aborted) break
        await this.execute(definition, this.controller.signal)
      }
    } finally {
      this.controller = null
      this.options.onRunningChange(false)
    }
  }

  private async execute(
    definition: TestDefinition,
    signal: AbortSignal,
  ): Promise<void> {
    const context = this.options.context(signal)
    const blockedReason = definition.prerequisite?.(context)
    if (blockedReason) {
      this.emitResult(definition, {
        assertions: [],
        durationMs: 0,
        error: { message: blockedReason },
        finishedAt: new Date().toISOString(),
        startedAt: null,
        status: 'blocked',
      })
      return
    }

    const startedAt = new Date().toISOString()
    const startedMs = Date.now()
    this.emitResult(definition, {
      assertions: [],
      durationMs: 0,
      error: null,
      finishedAt: null,
      startedAt,
      status: 'running',
    })
    this.options.onLog({
      id: crypto.randomUUID(),
      level: 'info',
      message: `Running ${definition.title}`,
      testId: definition.id,
      timestamp: startedAt,
    })

    try {
      const output = await definition.run(context)
      const passed = output.assertions.every((assertion) => assertion.passed)
      this.emitResult(definition, {
        assertions: output.assertions,
        durationMs: Date.now() - startedMs,
        error: null,
        finishedAt: new Date().toISOString(),
        response: redact(output.response),
        startedAt,
        status: passed ? 'passed' : 'failed',
      })
    } catch (error) {
      this.emitResult(definition, {
        assertions: [],
        durationMs: Date.now() - startedMs,
        error: redact(error),
        finishedAt: new Date().toISOString(),
        startedAt,
        status: signal.aborted ? 'cancelled' : 'failed',
      })
    }
  }

  private emitResult(
    definition: TestDefinition,
    result: Omit<TestResult, 'id' | 'request' | 'risk' | 'section'>,
  ): void {
    const completeResult: TestResult = {
      ...result,
      id: definition.id,
      request: definition.request,
      risk: definition.risk,
      section: definition.section,
    }
    this.options.onResult(completeResult)
    window.dispatchEvent(
      new CustomEvent('playground:test-result', { detail: completeResult }),
    )
  }
}
