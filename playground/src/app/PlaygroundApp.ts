import { TestRunner } from '@/runner/TestRunner'
import { PlaygroundClientSession } from '@/services/PlaygroundClientSession'
import { testDefinitions } from '@/tests/manifests'
import type { PlaygroundLog, TargetConfig } from '@/types/playground'
import type { PlaygroundReport, RunSummary, TestResult } from '@/types/result'
import { createShell } from '@/ui/createShell'
import {
  renderActivity,
  renderChrome,
  renderOperationDetail,
  renderOperations,
  renderSectionTabs,
} from '@/ui/render'

const sections = [
  { id: 'authentication', label: 'Authentication' },
  { id: 'data', label: 'Data' },
  { id: 'storage', label: 'Storage' },
  { id: 'integrations', label: 'Fetch & Axios' },
  { id: 'errors', label: 'Errors' },
]

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown request failure'
}

export class PlaygroundApp {
  private readonly elements
  private readonly results = new Map<string, TestResult>()
  private readonly runId = crypto.randomUUID()
  private readonly runner
  private readonly session
  private activeSection = sections[0].id
  private logs: PlaygroundLog[] = []
  private running = false
  private selectedId = testDefinitions[0].id
  private target: TargetConfig = {
    appUrl: import.meta.env.VITE_ENFYRA_URL || 'http://localhost:3000',
    collection: '',
  }

  constructor(private readonly root: HTMLElement) {
    this.elements = createShell(root)
    this.session = new PlaygroundClientSession(this.target)
    this.runner = new TestRunner({
      context: (signal) => this.session.context(signal, this.target.collection),
      definitions: testDefinitions,
      onLog: (log) => {
        this.logs = [log, ...this.logs].slice(0, 80)
        this.render()
      },
      onResult: (result) => {
        this.results.set(result.id, result)
        if (result.status === 'passed') this.addLog('success', `${result.id} passed`, result.id)
        if (result.status === 'failed') this.addLog('error', `${result.id} failed`, result.id)
        if (result.status === 'blocked') this.addLog('warning', `${result.id} blocked`, result.id)
        if (result.status === 'cancelled') this.addLog('warning', `${result.id} cancelled`, result.id)
        this.render()
      },
      onRunningChange: (running) => {
        this.running = running
        this.render()
      },
    })
  }

  mount(): void {
    this.elements.appUrl.value = this.target.appUrl
    this.bindEvents()
    this.createReportElement()
    this.exposeAutomationApi()
    window.addEventListener('beforeunload', this.dispose)
    this.render()
  }

  private bindEvents(): void {
    this.elements.appUrl.addEventListener('input', () => {
      this.target.appUrl = this.elements.appUrl.value
      this.session.markDirty()
      this.render()
    })
    this.elements.collectionInput.addEventListener('input', () => {
      this.target.collection = this.elements.collectionInput.value
    })
    this.elements.checkConnection.addEventListener('click', () => {
      void this.connect()
    })
    this.elements.authForm.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.login()
    })
    this.elements.runSafeSuite.addEventListener('click', () => {
      if (this.running) this.runner.abort()
      else void this.runSafeSuite()
    })
    this.elements.exportReport.addEventListener('click', () => this.exportReport())
    this.elements.clearActivity.addEventListener('click', () => {
      this.logs = []
      this.render()
    })
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.session.needsReconnect(this.target)) return true
    return this.connect()
  }

  private async connect(): Promise<boolean> {
    if (!this.target.appUrl.trim()) return false
    try {
      const probe = this.session.connect(this.target)
      this.render()
      const status = await probe
      this.addLog('success', `Connected to ${this.session.apiUrl} (HTTP ${status})`)
      return true
    } catch (error) {
      this.addLog('error', `Connection failed: ${messageFrom(error)}`)
      return false
    } finally {
      this.render()
    }
  }

  private async login(): Promise<void> {
    if (!(await this.ensureConnected())) return
    const email = this.elements.email.value.trim()
    const password = this.elements.password.value
    this.elements.password.value = ''
    try {
      await this.session.login({ email, password })
      this.addLog('success', `Authenticated as ${this.session.session.email ?? email}`)
    } catch (error) {
      this.addLog('error', `Login failed: ${messageFrom(error)}`)
    } finally {
      this.render()
    }
  }

  private async runTest(id: string): Promise<void> {
    if (!(await this.ensureConnected())) return
    this.selectedId = id
    await this.runner.runTest(id)
  }

  private async runSafeSuite(): Promise<void> {
    if (!(await this.ensureConnected())) return
    this.addLog('info', 'Starting read-only safe suite')
    await this.runner.runSafeSuite()
  }

  private selectSection(id: string): void {
    this.activeSection = id
    this.selectedId =
      testDefinitions.find((definition) => definition.section === id)?.id ?? ''
    this.render()
  }

  private addLog(
    level: PlaygroundLog['level'],
    message: string,
    testId?: string,
  ): void {
    this.logs = [
      {
        id: crypto.randomUUID(),
        level,
        message,
        testId,
        timestamp: new Date().toISOString(),
      },
      ...this.logs,
    ].slice(0, 80)
  }

  private summary(): RunSummary {
    const values = [...this.results.values()]
    return {
      blocked: values.filter((result) => result.status === 'blocked').length,
      cancelled: values.filter((result) => result.status === 'cancelled').length,
      cleanupFailed: 0,
      failed: values.filter((result) => result.status === 'failed').length,
      passed: values.filter((result) => result.status === 'passed').length,
      running: values.filter((result) => result.status === 'running').length,
      skipped: values.filter((result) => result.status === 'skipped').length,
      total: values.length,
    }
  }

  private report(): PlaygroundReport {
    return {
      generatedAt: new Date().toISOString(),
      results: [...this.results.values()],
      runId: this.runId,
      schemaVersion: '1.0',
      summary: this.summary(),
      target: {
        apiUrl: this.session.apiUrl,
        appUrl: this.session.activeTarget.appUrl,
      },
    }
  }

  private render(): void {
    const definitions = testDefinitions.filter(
      (definition) => definition.section === this.activeSection,
    )
    const selected =
      definitions.find((definition) => definition.id === this.selectedId) ??
      definitions[0]
    renderChrome(
      this.elements,
      this.session.apiUrl,
      this.session.connectionStatus,
      this.session.session,
      this.summary(),
      this.running,
    )
    renderSectionTabs(
      this.elements,
      sections,
      this.activeSection,
      (id) => this.selectSection(id),
    )
    renderOperations(
      this.elements,
      definitions,
      selected?.id ?? '',
      this.results,
      (id) => {
        this.selectedId = id
        this.render()
      },
    )
    if (selected) {
      renderOperationDetail(
        this.elements,
        selected,
        this.results.get(selected.id),
        this.running,
        (id) => void this.runTest(id),
      )
    }
    this.elements.collectionField.hidden = this.activeSection !== 'data'
    renderActivity(this.elements, this.logs)
    const reportElement = document.getElementById('enfyra-playground-results')
    if (reportElement) reportElement.textContent = JSON.stringify(this.report())
  }

  private createReportElement(): void {
    document.getElementById('enfyra-playground-results')?.remove()
    const reportElement = document.createElement('script')
    reportElement.id = 'enfyra-playground-results'
    reportElement.type = 'application/json'
    document.body.append(reportElement)
  }

  private exposeAutomationApi(): void {
    window.enfyraPlayground = {
      abort: () => this.runner.abort(),
      getResults: () => this.report(),
      runSafeSuite: () => this.runSafeSuite(),
      runSection: async (section) => {
        if (!(await this.ensureConnected())) return
        await this.runner.runSection(section)
      },
      runTest: (id) => this.runTest(id),
    }
  }

  private exportReport(): void {
    const blob = new Blob([JSON.stringify(this.report(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `enfyra-core-playground-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  private readonly dispose = (): void => {
    this.runner.abort()
    this.session.dispose()
    document.getElementById('enfyra-playground-results')?.remove()
    delete window.enfyraPlayground
  }
}
