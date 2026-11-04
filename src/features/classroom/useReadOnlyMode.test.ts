import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { READ_ONLY_QUERY, useReadOnlyMode } from './useReadOnlyMode'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReadOnlyMode', () => {
  it('依 media query 切換唯讀並在卸載時移除監聽', () => {
    let listener: (() => void) | undefined
    const media = {
      matches: false,
      media: READ_ONLY_QUERY,
      addEventListener: vi.fn(
        (_event: string, callback: () => void) => {
          listener = callback
        },
      ),
      removeEventListener: vi.fn(),
    }

    vi.stubGlobal('matchMedia', vi.fn(() => media))

    const { result, unmount } = renderHook(() => useReadOnlyMode())

    expect(result.current).toBe(false)
    expect(media.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )

    act(() => {
      media.matches = true
      listener?.()
    })

    expect(result.current).toBe(true)

    unmount()

    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('環境沒有 matchMedia 時維持可編輯', () => {
    vi.stubGlobal('matchMedia', undefined)

    const { result } = renderHook(() => useReadOnlyMode())

    expect(result.current).toBe(false)
  })
})
