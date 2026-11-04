import { act, fireEvent, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { useProjectStore } from './projectStore'
import { useHistoryShortcuts } from './useHistoryShortcuts'

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function renameProject(name: string) {
  act(() => {
    useProjectStore.getState().renameProject(name)
  })
}

describe('useHistoryShortcuts', () => {
  beforeEach(resetStore)

  it('contenteditable 內不攔截，Meta+Z 可復原', () => {
    renderHook(() => useHistoryShortcuts())
    renameProject('復原測試')

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(editable)

    fireEvent.keyDown(editable, { key: 'z', metaKey: true })

    expect(useProjectStore.getState().project.name).toBe('復原測試')

    editable.remove()
    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    expect(useProjectStore.getState().project.name).toBe('未命名教室')
  })

  it('停用時不處理快捷鍵', () => {
    renderHook(() => useHistoryShortcuts({ disabled: true }))
    renameProject('停用測試')

    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' })

    expect(useProjectStore.getState().project.name).toBe('停用測試')
  })

  it('忽略 Alt 組合鍵與已取消的事件', () => {
    renderHook(() => useHistoryShortcuts())
    renameProject('忽略測試')

    fireEvent.keyDown(window, { altKey: true, ctrlKey: true, key: 'z' })
    expect(useProjectStore.getState().project.name).toBe('忽略測試')

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'z',
    })

    event.preventDefault()
    window.dispatchEvent(event)

    expect(useProjectStore.getState().project.name).toBe('忽略測試')
  })

  it('卸載後移除鍵盤監聽', () => {
    const { unmount } = renderHook(() => useHistoryShortcuts())
    renameProject('卸載測試')

    unmount()
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' })

    expect(useProjectStore.getState().project.name).toBe('卸載測試')
  })
})
