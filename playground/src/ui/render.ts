import type { TestDefinition } from '@/interfaces/TestDefinition'
import type {
  ConnectionStatus,
  PlaygroundLog,
  SessionSummary,
} from '@/types/playground'
import type { RunSummary, TestResult } from '@/types/result'
import type { PlaygroundElements } from '@/types/ui'

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function formatExpiry(value: number | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'The request failed.'
}

export function renderChrome(
  elements: PlaygroundElements,
  apiUrl: string,
  connectionStatus: ConnectionStatus,
  session: SessionSummary,
  summary: RunSummary,
  running: boolean,
): void {
  const labels: Record<ConnectionStatus, string> = {
    authenticated: 'Authenticated',
    anonymous: 'Connected',
    idle: 'Not connected',
    probing: 'Checking…',
    unreachable: 'Unavailable',
  }
  const label = elements.connectionStatus.querySelector<HTMLElement>(
    '[data-role="connection-label"]',
  )
  if (label) label.textContent = labels[connectionStatus]
  elements.connectionStatus.dataset.status = connectionStatus
  elements.apiUrl.textContent = apiUrl
  elements.apiUrl.title = apiUrl
  elements.passedCount.textContent = String(summary.passed)
  elements.failedCount.textContent = String(summary.failed)
  elements.blockedCount.textContent = String(summary.blocked)
  elements.runSafeSuite.textContent = running ? 'Stop suite' : 'Run safe suite'
  elements.runSafeSuite.dataset.action = running ? 'abort-suite' : 'run-safe-suite'
  elements.runSafeSuite.classList.toggle('danger-button', running)

  const showSession = connectionStatus === 'anonymous' || connectionStatus === 'authenticated'
  elements.sessionState.dataset.state = showSession ? session.state : 'unknown'
  elements.sessionEmail.textContent = showSession
    ? session.email || session.state
    : 'unknown'
  elements.sessionId.textContent = showSession ? session.id || '—' : '—'
  elements.sessionExpires.textContent = showSession
    ? formatExpiry(session.expiresAt)
    : '—'

  const disabled = running || connectionStatus === 'probing'
  elements.appUrl.disabled = disabled
  elements.checkConnection.disabled = disabled || !elements.appUrl.value.trim()
  elements.email.disabled = disabled
  elements.password.disabled = disabled
  elements.signIn.disabled = disabled
}

export function renderSectionTabs(
  elements: PlaygroundElements,
  sections: Array<{ id: string; label: string }>,
  activeSection: string,
  onSelect: (id: string) => void,
): void {
  const nodes = sections.map((section) => {
    const button = element('button', undefined, section.label)
    button.type = 'button'
    button.dataset.testid = `section-${section.id}`
    button.classList.toggle('active', section.id === activeSection)
    button.setAttribute('aria-selected', String(section.id === activeSection))
    button.addEventListener('click', () => onSelect(section.id))
    return button
  })
  elements.sectionTabs.replaceChildren(...nodes)
}

export function renderOperations(
  elements: PlaygroundElements,
  definitions: TestDefinition[],
  selectedId: string,
  results: Map<string, TestResult>,
  onSelect: (id: string) => void,
): void {
  const count = elements.operationList.parentElement?.querySelector<HTMLElement>(
    '[data-role="example-count"]',
  )
  if (count) count.textContent = String(definitions.length)

  const nodes = definitions.map((definition) => {
    const button = element('button', 'operation-item')
    button.type = 'button'
    button.classList.toggle('active', definition.id === selectedId)
    button.dataset.status = results.get(definition.id)?.status ?? 'idle'
    const state = element('span', 'operation-state')
    const copy = element('span')
    copy.append(
      element('strong', undefined, definition.title),
      element(
        'small',
        undefined,
        `${definition.request.method} ${definition.request.path}`,
      ),
    )
    button.append(state, copy)
    button.addEventListener('click', () => onSelect(definition.id))
    return button
  })
  elements.operationList.replaceChildren(...nodes)
}

export function renderOperationDetail(
  elements: PlaygroundElements,
  definition: TestDefinition,
  result: TestResult | undefined,
  running: boolean,
  onRun: (id: string) => void,
): void {
  const header = element('header', 'operation-header')
  const headingCopy = element('div')
  const labels = element('div', 'operation-labels')
  labels.append(
    element('span', 'method', definition.request.method),
    element('span', undefined, definition.request.transport),
    element('span', undefined, definition.risk),
  )
  headingCopy.append(
    labels,
    element('h2', undefined, definition.title),
    element('p', undefined, definition.description),
  )
  const status = result?.status ?? 'idle'
  const statusBadge = element(
    'span',
    'result-status',
    status === 'idle' ? 'Not run' : status,
  )
  statusBadge.dataset.status = status
  header.append(headingCopy, statusBadge)

  const request = element('div', 'request-line')
  request.append(
    element('span', undefined, 'Request'),
    element('code', undefined, definition.request.path),
    element('span', undefined, `${definition.request.auth} auth`),
  )

  const detailGrid = element('div', 'detail-grid')
  const codePanel = element('section', 'code-panel')
  const code = element('code', undefined, definition.code)
  const pre = element('pre')
  pre.append(code)
  codePanel.append(element('div', 'subheading', 'Code'), pre)
  const expectedPanel = element('section', 'expected-panel')
  const expected = element('ul')
  for (const item of definition.expected) {
    const row = element('li')
    row.append(element('span', undefined, '✓'), document.createTextNode(item))
    expected.append(row)
  }
  expectedPanel.append(element('div', 'subheading', 'Expected'), expected)
  detailGrid.append(codePanel, expectedPanel)

  const runRow = element('div', 'run-row')
  const runButton = element(
    'button',
    'button primary',
    status === 'running' ? 'Running…' : 'Run example',
  )
  runButton.type = 'button'
  runButton.disabled = running
  runButton.dataset.testid = `run-test-${definition.id}`
  runButton.addEventListener('click', () => onRun(definition.id))
  runRow.append(
    runButton,
    element('span', undefined, 'Runs against the configured target.'),
  )

  const output = element('section', 'output-panel')
  output.dataset.status = status
  output.dataset.testid = `test-result-${definition.id}`
  const outputHeading = element('div', 'output-heading')
  outputHeading.append(
    element('span', undefined, 'Result'),
    element('span', undefined, result?.durationMs ? `${result.durationMs} ms` : ''),
  )
  output.append(outputHeading)

  if (!result) {
    output.append(
      element(
        'div',
        'empty-output',
        'Run the example to inspect assertions and response data.',
      ),
    )
  } else if (result.status === 'running') {
    const runningOutput = element('div', 'running-output')
    runningOutput.append(element('span', 'spinner'), 'Sending request…')
    output.append(runningOutput)
  } else if (result.status === 'blocked' || result.error) {
    output.append(
      element(
        'div',
        `message-output ${result.status === 'blocked' ? 'warning' : 'error'}`,
        errorMessage(result.error),
      ),
    )
  } else {
    const content = element('div', 'result-content')
    const assertions = element('ul', 'assertions')
    for (const assertion of result.assertions) {
      const row = element('li')
      row.dataset.passed = String(assertion.passed)
      row.append(
        element('span', undefined, assertion.passed ? '✓' : '×'),
        document.createTextNode(assertion.label),
      )
      assertions.append(row)
    }
    content.append(assertions)
    if (result.response !== undefined) {
      const details = element('details')
      details.append(element('summary', undefined, 'Response data'))
      const responsePre = element('pre')
      responsePre.append(
        element('code', undefined, JSON.stringify(result.response, null, 2)),
      )
      details.append(responsePre)
      content.append(details)
    }
    output.append(content)
  }

  elements.operationDetail.dataset.testid = 'test-card'
  elements.operationDetail.dataset.testId = definition.id
  elements.operationDetail.replaceChildren(
    header,
    request,
    detailGrid,
    runRow,
    output,
  )
}

export function renderActivity(
  elements: PlaygroundElements,
  logs: PlaygroundLog[],
): void {
  elements.activityCount.textContent = `${logs.length} events`
  if (logs.length === 0) {
    elements.activityRows.replaceChildren(
      element('p', 'empty-log', 'No activity yet.'),
    )
    return
  }
  const rows = logs.map((log) => {
    const row = element('div', 'activity-row')
    row.dataset.level = log.level
    row.append(
      element('time', undefined, new Date(log.timestamp).toLocaleTimeString()),
      element('span', 'log-level', log.level),
      element('p', undefined, log.message),
    )
    return row
  })
  elements.activityRows.replaceChildren(...rows)
}
