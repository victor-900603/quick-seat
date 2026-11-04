import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave'
import { ACTIVE_PROJECT_KEY } from '../../lib/storage'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useAutosave', () => {
  it('首次載入不寫入，變更後防抖儲存', () => {
    const first = createDefaultProject()
    const second = { ...first, name: '三年甲班' }
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result, rerender } = renderHook(
      ({ project }) => useAutosave(project),
      { initialProps: { project: first } },
    )

    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS))
    expect(setItem).not.toHaveBeenCalled()
    expect(result.current).toBe('saved')

    rerender({ project: second })
    expect(result.current).toBe('saving')

    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1))
    expect(setItem).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('saved')
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(ACTIVE_PROJECT_KEY)).toContain('三年甲班')
  })

  it('寫入失敗後標記錯誤並停止自動儲存', () => {
    const first = createDefaultProject()
    const second = { ...first, name: '三年甲班' }
    const third = { ...first, name: '三年乙班' }
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded')
      })
    const { result, rerender } = renderHook(
      ({ project }) => useAutosave(project),
      { initialProps: { project: first } },
    )

    rerender({ project: second })
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS))

    expect(result.current).toBe('error')
    expect(setItem).toHaveBeenCalledTimes(1)

    rerender({ project: third })
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2))

    expect(setItem).toHaveBeenCalledTimes(1)
  })
})
