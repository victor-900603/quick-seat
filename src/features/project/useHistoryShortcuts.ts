import { useEffect } from 'react'
import { useHistoryControls } from './projectStore'

interface HistoryShortcutOptions {
  disabled?: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable]') !== null
  )
}

export function useHistoryShortcuts({
  disabled = false,
}: HistoryShortcutOptions = {}) {
  const { undo, redo } = useHistoryControls()

  useEffect(() => {
    if (disabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey) ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }

        return
      }

      if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, redo, undo])
}
