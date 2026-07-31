import { EnfyraError } from '@enfyra/sdk-core'
import { createPlaygroundClients } from '@/services/clientFactory'
import type {
  ConnectionStatus,
  PlaygroundContext,
  SessionSummary,
  TargetConfig,
} from '@/types/playground'

function emptySession(target: TargetConfig): SessionSummary {
  return {
    email: null,
    expiresAt: null,
    id: null,
    lastVerifiedAt: null,
    provider: null,
    state: 'unknown',
  }
}

export class PlaygroundClientSession {
  private clients
  private target: TargetConfig
  public connectionStatus: ConnectionStatus = 'idle'
  public session: SessionSummary

  constructor(target: TargetConfig) {
    this.target = { ...target }
    this.clients = createPlaygroundClients(this.target)
    this.session = emptySession(this.target)
  }

  get apiUrl(): string {
    return this.clients.apiUrl
  }

  get activeTarget(): TargetConfig {
    return { ...this.target }
  }

  needsReconnect(target: TargetConfig): boolean {
    return (
      this.target.appUrl !== target.appUrl.trim().replace(/\/$/, '') ||
      this.connectionStatus === 'idle' ||
      this.connectionStatus === 'unreachable'
    )
  }

  markDirty(): void {
    this.connectionStatus = 'idle'
  }

  async connect(target: TargetConfig): Promise<number | null> {
    this.connectionStatus = 'probing'
    this.clients.client.dispose()
    this.target = {
      ...target,
      appUrl: target.appUrl.trim().replace(/\/$/, ''),
    }
    this.clients = createPlaygroundClients(this.target)
    this.session = emptySession(this.target)

    try {
      const response = await this.clients.anonymousClient.get('/me')
      this.connectionStatus = 'anonymous'
      this.session.state = 'anonymous'
      return response.status
    } catch (error) {
      if (error instanceof EnfyraError && error.statusCode === 401) {
        this.connectionStatus = 'anonymous'
        this.session.state = 'anonymous'
        return error.statusCode
      }
      this.connectionStatus = 'unreachable'
      throw error
    }
  }

  async login(credentials: { email: string; password: string }): Promise<void> {
    await this.clients.client.auth.login({ ...credentials, remember: true })
    await this.updateSession()
  }

  async updateSession(): Promise<void> {
    if (!this.clients.client.auth.getTokens()) {
      this.session = { ...emptySession(this.target), state: 'anonymous' }
      this.connectionStatus = 'anonymous'
      return
    }

    try {
      const user = await this.clients.client.auth.getMe()
      const tokens = this.clients.client.auth.getTokens()
      this.session = {
        email: user?.email ?? null,
        expiresAt: tokens?.expTime ?? null,
        id: user?.id ?? null,
        lastVerifiedAt: new Date().toISOString(),
        provider: tokens?.loginProvider ?? null,
        state: user ? 'authenticated' : 'anonymous',
      }
      this.connectionStatus = user ? 'authenticated' : 'anonymous'
    } catch (error) {
      if (error instanceof EnfyraError && error.statusCode === 401) {
        this.session = { ...emptySession(this.target), state: 'anonymous' }
        this.connectionStatus = 'anonymous'
        return
      }
      throw error
    }
  }

  context(signal: AbortSignal, collection: string): PlaygroundContext {
    return {
      anonymousClient: this.clients.anonymousClient,
      client: this.clients.client,
      session: this.session,
      signal,
      target: { ...this.target, collection },
      updateSession: () => this.updateSession(),
    }
  }

  dispose(): void {
    this.clients.client.dispose()
  }
}
