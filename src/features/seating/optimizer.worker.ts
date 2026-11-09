import { buildSeatingResult } from './engine'
import type {
  SeatingWorkerResponse,
  SeatingWorkerRunRequest,
} from './seatingWorkerProtocol'

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<SeatingWorkerRunRequest>) => void,
  ): void
  postMessage(message: SeatingWorkerResponse): void
}

const scope = self as unknown as WorkerScope

scope.addEventListener('message', (event) => {
  const request = event.data

  if (!request || request.type !== 'run') {
    return
  }

  try {
    const outcome = buildSeatingResult(
      request.project,
      request.config,
      (progress) => {
        scope.postMessage({ type: 'progress', progress })
      },
    )

    scope.postMessage({ type: 'result', outcome })
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : '背景排座發生未知錯誤。',
    })
  }
})
