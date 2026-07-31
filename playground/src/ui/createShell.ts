import type { PlaygroundElements } from '@/types/ui'

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing playground element: ${selector}`)
  return element
}

export function createShell(root: HTMLElement): PlaygroundElements {
  root.innerHTML = `
    <div class="app-shell">
      <a class="skip-link" href="#sdk-explorer">Skip to examples</a>
      <header class="topbar">
        <div class="product">
          <span class="product-mark">E</span>
          <div><strong>Enfyra SDK Playground</strong><span>@enfyra/sdk-core</span></div>
        </div>
        <div class="connection-status" data-testid="connection-status">
          <span class="status-dot"></span><span data-role="connection-label">Not connected</span>
        </div>
        <div class="summary" aria-label="Test summary">
          <span><b data-role="passed-count">0</b> passed</span>
          <span><b data-role="failed-count">0</b> failed</span>
          <span><b data-role="blocked-count">0</b> blocked</span>
        </div>
        <div class="topbar-actions">
          <button class="button quiet" data-action="export-report" type="button">Export JSON</button>
          <button class="button primary" data-action="run-safe-suite" data-testid="run-safe-suite" type="button">Run safe suite</button>
        </div>
      </header>

      <main class="page">
        <section class="connection-panel" aria-labelledby="connection-title">
          <div class="panel-heading">
            <div><h1 id="connection-title">Connection</h1><p>Use the Enfyra App origin. <code>/api</code> is resolved automatically.</p></div>
            <code class="api-url" data-role="api-url"></code>
          </div>
          <div class="connection-fields">
            <label class="field endpoint-field"><span>App URL</span><input data-field="app-url" data-testid="app-url" type="url" spellcheck="false"></label>
            <button class="button secondary" data-action="check-connection" data-testid="probe-target" type="button">Check connection</button>
          </div>

          <form class="auth-form" data-role="auth-form">
            <div class="session-identity"><span class="status-dot" data-role="session-state-dot"></span><span><small>Session</small><strong data-role="session-email">unknown</strong></span></div>
            <label class="field"><span>Email</span><input data-field="email" data-testid="login-email" type="email" autocomplete="username" placeholder="you@example.com" required></label>
            <label class="field"><span>Password</span><input data-field="password" data-testid="login-password" type="password" autocomplete="current-password" placeholder="Password" required></label>
            <button class="button primary" data-action="sign-in" data-testid="login-submit" type="submit">Sign in</button>
            <dl class="session-meta"><div><dt>User ID</dt><dd data-role="session-id">—</dd></div><div><dt>Expires</dt><dd data-role="session-expires">—</dd></div></dl>
          </form>
        </section>

        <section class="explorer" id="sdk-explorer" aria-labelledby="examples-title">
          <nav class="section-tabs" data-role="section-tabs" aria-label="SDK areas"></nav>
          <div class="collection-field" data-role="collection-field" hidden>
            <label class="field"><span>Collection used by data examples</span><input data-field="collection" placeholder="articles" spellcheck="false"></label>
          </div>
          <div class="explorer-grid">
            <aside class="operation-list"><div class="list-heading"><h2 id="examples-title">Examples</h2><span data-role="example-count">0</span></div><div data-role="operation-list"></div></aside>
            <article class="operation-detail" data-role="operation-detail"></article>
          </div>
        </section>

        <details class="activity">
          <summary><span>Activity</span><span data-role="activity-count">0 events</span></summary>
          <div class="activity-toolbar"><span>Credentials, tokens, and cookies are not recorded.</span><button data-action="clear-activity" type="button">Clear</button></div>
          <div class="activity-rows" data-role="activity-rows" data-testid="activity-feed" role="log" aria-live="polite"></div>
        </details>
      </main>
    </div>
  `

  return {
    activityCount: requireElement(root, '[data-role="activity-count"]'),
    activityRows: requireElement(root, '[data-role="activity-rows"]'),
    apiUrl: requireElement(root, '[data-role="api-url"]'),
    appUrl: requireElement(root, '[data-field="app-url"]'),
    authForm: requireElement(root, '[data-role="auth-form"]'),
    blockedCount: requireElement(root, '[data-role="blocked-count"]'),
    checkConnection: requireElement(root, '[data-action="check-connection"]'),
    clearActivity: requireElement(root, '[data-action="clear-activity"]'),
    collectionField: requireElement(root, '[data-role="collection-field"]'),
    collectionInput: requireElement(root, '[data-field="collection"]'),
    connectionStatus: requireElement(root, '.connection-status'),
    email: requireElement(root, '[data-field="email"]'),
    exportReport: requireElement(root, '[data-action="export-report"]'),
    failedCount: requireElement(root, '[data-role="failed-count"]'),
    operationDetail: requireElement(root, '[data-role="operation-detail"]'),
    operationList: requireElement(root, '[data-role="operation-list"]'),
    passedCount: requireElement(root, '[data-role="passed-count"]'),
    password: requireElement(root, '[data-field="password"]'),
    runSafeSuite: requireElement(root, '[data-action="run-safe-suite"]'),
    sectionTabs: requireElement(root, '[data-role="section-tabs"]'),
    sessionEmail: requireElement(root, '[data-role="session-email"]'),
    sessionExpires: requireElement(root, '[data-role="session-expires"]'),
    sessionId: requireElement(root, '[data-role="session-id"]'),
    sessionState: requireElement(root, '[data-role="session-state-dot"]'),
    signIn: requireElement(root, '[data-action="sign-in"]'),
  }
}
