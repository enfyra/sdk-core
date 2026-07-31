import type { PlaygroundReport } from './result'

declare global {
  interface Window {
    enfyraPlayground?: {
      abort: () => void
      getResults: () => PlaygroundReport
      runSafeSuite: () => Promise<void>
      runSection: (section: string) => Promise<void>
      runTest: (id: string) => Promise<void>
    }
  }
}

export {}
