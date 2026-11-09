import { describe, expect, it, vi } from 'vitest'
import type { SeatingConfig } from './engine'
import { buildSeatingResult } from './engine'
import { createDefaultProject } from '../project/defaultProject'
import {
  SeatingWorkerCancelledError,
  runSeatingInWorker,
} from './seatingWorker'
import type { SeatingWorkerResponse } from './seatingWorkerProtocol'

class FakeWorker {
  messages: unknown[] = []
  terminated = false
  listeners = new Map<string, Set<(event: Event) => void>>()

  addEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener)
  }

  postMessage(message: unknown) {
    this.messages.push(message)
  }

  terminate() {
    this.terminated = true
  }

  emit(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

function setup() {
  const project = createDefaultProject()
  project.roster.persons = [
    {
      id: 'person-1',
      name: '林品妤',
      studentNo: '1',
      tags: {},
      extra: {},
      note: '',
    },
  ]
  const config: SeatingConfig = {
    occupancy: { kind: 'full' },
    allocation: {
      kind: 'ordered',
      orderBy: 'studentNo',
      fill: 'row-major',
    },
    seed: 'seed',
    partial: false,
    optimize: false,
  }
  const worker = new FakeWorker()
  const outcome = buildSeatingResult(project, config)

  return { project, config, worker, outcome }
}

describe('seating worker client', () => {
  it('傳送排座請求並回傳進度與結果', async () => {
    const { project, config, worker, outcome } = setup()
    const onProgress = vi.fn()
    const run = runSeatingInWorker(
      project,
      config,
      { onProgress },
      { createWorker: () => worker as unknown as Worker },
    )

    expect(run).not.toBeNull()
    expect(worker.messages).toEqual([{ type: 'run', project, config }])

    const progress = {
      iteration: 128,
      maxIterations: 1000,
      restart: 1,
      restarts: 3,
    }

    worker.emit(
      'message',
      new MessageEvent('message', {
        data: { type: 'progress', progress } satisfies SeatingWorkerResponse,
      }),
    )
    expect(onProgress).toHaveBeenCalledWith(progress)

    worker.emit(
      'message',
      new MessageEvent('message', {
        data: { type: 'result', outcome } satisfies SeatingWorkerResponse,
      }),
    )

    await expect(run?.result).resolves.toEqual(outcome)
    expect(worker.terminated).toBe(true)
  })

  it('取消時終止 Worker 並回傳取消錯誤', async () => {
    const { project, config, worker } = setup()
    const run = runSeatingInWorker(
      project,
      config,
      {},
      { createWorker: () => worker as unknown as Worker },
    )

    run?.cancel()

    await expect(run?.result).rejects.toBeInstanceOf(
      SeatingWorkerCancelledError,
    )
    expect(worker.terminated).toBe(true)
  })

  it('Worker 回傳錯誤訊息時拒絕結果', async () => {
    const { project, config, worker } = setup()
    const run = runSeatingInWorker(
      project,
      config,
      {},
      { createWorker: () => worker as unknown as Worker },
    )

    worker.emit(
      'message',
      new MessageEvent('message', {
        data: { type: 'error', message: '背景失敗' } satisfies SeatingWorkerResponse,
      }),
    )

    await expect(run?.result).rejects.toThrow('背景失敗')
  })
})
