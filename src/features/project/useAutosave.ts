import { useEffect, useRef, useState } from 'react'
import type { Project } from '../../types/domain'
import { saveProject } from '../../lib/storage'

export type SaveStatus = 'saved' | 'saving' | 'error'

export const AUTOSAVE_DELAY_MS = 500

/**
 * 專案變更後以 500 ms 防抖寫入 localStorage。寫入失敗後停止自動儲存，
 * 避免在配額不足時反覆重試。
 */
export function useAutosave(
  project: Project,
  delay = AUTOSAVE_DELAY_MS,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const mounted = useRef(false)
  const stopped = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }

    if (stopped.current) {
      return
    }

    setStatus('saving')

    const timer = window.setTimeout(() => {
      const result = saveProject(project)

      if (result.ok) {
        setStatus('saved')
      } else {
        stopped.current = true
        setStatus('error')
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [project, delay])

  return status
}
