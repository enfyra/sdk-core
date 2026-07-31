import { EnfyraClient } from '@enfyra/sdk-core'
import type { TargetConfig } from '@/types/playground'

export function createPlaygroundClients(target: TargetConfig) {
  const client = new EnfyraClient({
    baseUrl: target.appUrl,
    retries: 1,
    timeout: 15_000,
  })
  const anonymousClient = new EnfyraClient({
    auth: { strategy: 'none' },
    baseUrl: target.appUrl,
    credentials: 'omit',
    timeout: 10_000,
  })

  return {
    anonymousClient,
    apiUrl: client.getHttpClient().baseUrl,
    client,
  }
}
