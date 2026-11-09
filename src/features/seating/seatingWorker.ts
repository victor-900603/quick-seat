import type { Project } from '../../types/domain'
import type { SeatingConfig, SeatingOutcome } from './engine'
import type { SeatingOptimizationProgress } from './optimizer'
import type {
  SeatingWorkerResponse,
  SeatingWorkerRunRequest,
} from './seatingWorkerProtocol'

export class SeatingWorkerCancelledError extends Error {
  constructor() {
    super('已取消排座最佳化。')
    this.name = 'SeatingWorkerCancelledError'
  }
}

export interface SeatingWorkerCallbacks {
  onProgress?: (progress: SeatingOptimizationProgress) => void
}

export interface SeatingWorkerRun {
  result: Promise<SeatingOutcome>
  cancel: () => void
}

export interface SeatingWorkerOptions {
  /** 測試或替代執行環境可注入 Worker 工廠。 */
  createWorker?: () => Worker
}

export function canUseSeatingWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof URL !== 'undefined'
}

function createDefaultWorker(): Worker {
  return new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
    type: 'module',
  })
}

export function runSeatingInWorker(
  project: Project,
  config: SeatingConfig,
  callbacks: SeatingWorkerCallbacks = {},
  options: SeatingWorkerOptions = {},
): SeatingWorkerRun | null {
  if (!options.createWorker && !canUseSeatingWorker()) {
    return null
  }

  let worker: Worker

  try {
    worker = (options.createWorker ?? createDefaultWorker)()
  } catch {
    return null
  }

  let settled = false
  let resolveResult: (outcome: SeatingOutcome) => void = () => {}
  let rejectResult: (reason?: unknown) => void = () => {}

  const result = new Promise<SeatingOutcome>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })

  const cleanup = () => {
    worker.removeEventListener('message', handleMessage)
    worker.removeEventListener('error', handleError)
  }

  const finish = (callback: () => void) => {
    if (settled) {
      return
    }

    settled = true
    cleanup()
    worker.terminate()
    callback()
  }

  function handleMessage(event: MessageEvent<SeatingWorkerResponse>) {
    const message = event.data

    if (!message) {
      return
    }

    if (message.type === 'progress') {
      callbacks.onProgress?.(message.progress)
      return
    }

    if (message.type === 'result') {
      finish(() => resolveResult(message.outcome))
      return
    }

    finish(() => rejectResult(new Error(message.message)))
  }

  function handleError(event: ErrorEvent) {
    finish(() =>
      rejectResult(
        new Error(event.message || '背景排座 Worker 發生錯誤。'),
      ),
    )
  }

  const request: SeatingWorkerRunRequest = {
    type: 'run',
    project,
    config,
  }

  worker.addEventListener('message', handleMessage)
  worker.addEventListener('error', handleError)

  try {
    worker.postMessage(request)
  } catch (error) {
    finish(() => rejectResult(error))
  }

  return {
    result,
    cancel: () => {
      finish(() => rejectResult(new SeatingWorkerCancelledError()))
    },
  }
}
