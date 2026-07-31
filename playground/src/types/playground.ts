import type { EnfyraClient } from '@enfyra/sdk-core'

export type ConnectionStatus =
  | 'idle'
  | 'probing'
  | 'anonymous'
  | 'authenticated'
  | 'unreachable'

export interface TargetConfig {
  appUrl: string
  collection: string
}

export interface SessionSummary {
  email: string | null
  expiresAt: number | null
  id: string | null
  lastVerifiedAt: string | null
  provider: string | null
  state: 'unknown' | 'anonymous' | 'authenticated'
}

export interface PlaygroundContext {
  anonymousClient: EnfyraClient
  client: EnfyraClient
  session: SessionSummary
  signal: AbortSignal
  target: TargetConfig
  updateSession: () => Promise<void>
}

export interface PlaygroundLog {
  id: string
  level: 'error' | 'info' | 'success' | 'warning'
  message: string
  testId?: string
  timestamp: string
}
