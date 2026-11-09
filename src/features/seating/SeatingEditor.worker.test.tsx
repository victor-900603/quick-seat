import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { createRule } from '../rules/ruleOps'
import type { SeatingConfig } from './engine'
import { buildSeatingResult } from './engine'
import { SeatingEditor } from './SeatingEditor'

const workerMock = vi.hoisted(() => ({
  onProgress: null as ((progress: unknown) => void) | null,
  resolve: null as ((outcome: unknown) => void) | null,
  reject: null as ((reason?: unknown) => void) | null,
}))

vi.mock('./seatingWorker', () => {
  class SeatingWorkerCancelledError extends Error {
    constructor() {
      super('已取消排座最佳化。')
      this.name = 'SeatingWorkerCancelledError'
    }
  }

  return {
    SeatingWorkerCancelledError,
    runSeatingInWorker: vi.fn(
      (
        _project: unknown,
        _config: unknown,
        callbacks: { onProgress?: (progress: unknown) => void },
      ) => {
        workerMock.onProgress = callbacks.onProgress ?? null

        return {
          result: new Promise((resolve, reject) => {
            workerMock.resolve = resolve
            workerMock.reject = reject
          }),
          cancel: () => {
            workerMock.reject?.(new SeatingWorkerCancelledError())
          },
        }
      },
    ),
  }
})

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function config(): SeatingConfig {
  return {
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
}

describe('SeatingEditor worker flow', () => {
  beforeEach(() => {
    resetStore()
    workerMock.onProgress = null
    workerMock.resolve = null
    workerMock.reject = null
    useProjectStore.getState().addPerson({ name: '林品妤', studentNo: '1' })
    const project = useProjectStore.getState().project
    useProjectStore.setState({
      project: {
        ...project,
        rules: [createRule('separate', { tagId: 'tag-missing' })],
      },
    })
  })

  it('顯示背景最佳化進度並在完成後套用結果', async () => {
    const user = userEvent.setup()
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))

    expect(await screen.findByText('背景最佳化中')).toBeVisible()
    expect(screen.getByRole('button', { name: '取消' })).toBeVisible()

    act(() => {
      workerMock.onProgress?.({
        iteration: 128,
        maxIterations: 1000,
        restart: 1,
        restarts: 3,
      })
    })

    expect(screen.getByText(/128 \/ 1000 次迭代/)).toBeVisible()

    const outcome = buildSeatingResult(
      useProjectStore.getState().project,
      config(),
    )

    await act(async () => {
      workerMock.resolve?.(outcome)
    })

    await waitFor(() => {
      expect(
        useProjectStore.getState().project.currentAssignment,
      ).not.toBeNull()
    })
    expect(screen.queryByText('背景最佳化中')).not.toBeInTheDocument()
  })

  it('排座期間專案變更時捨棄背景結果', async () => {
    const user = userEvent.setup()
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    expect(await screen.findByText('背景最佳化中')).toBeVisible()

    const outcome = buildSeatingResult(
      useProjectStore.getState().project,
      config(),
    )

    act(() => {
      useProjectStore.getState().addPerson({ name: '陳柏宇', studentNo: '2' })
    })

    await act(async () => {
      workerMock.resolve?.(outcome)
    })

    await waitFor(() => {
      expect(
        screen.getByText('排座期間專案已變更，本次結果已捨棄。請重新排座。'),
      ).toBeVisible()
    })
    expect(
      useProjectStore.getState().project.currentAssignment,
    ).toBeNull()
  })

  it('可取消背景最佳化且不寫入座位結果', async () => {
    const user = userEvent.setup()
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    await waitFor(() => {
      expect(screen.queryByText('背景最佳化中')).not.toBeInTheDocument()
    })
    expect(
      useProjectStore.getState().project.currentAssignment,
    ).toBeNull()
    expect(screen.getByText('已取消排座最佳化。')).toBeVisible()
  })
})
