import { useEffect, useState } from 'react'

export const READ_ONLY_QUERY = '(max-width: 767px)'

function getInitialReadOnly(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }

  return window.matchMedia(READ_ONLY_QUERY).matches
}

/**
 * 手機版（< 768 px）為唯讀檢視。首次渲染即依 matchMedia 結果決定，
 * 掛載後繼續監聽視窗尺寸變化。
 */
export function useReadOnlyMode(): boolean {
  const [readOnly, setReadOnly] = useState(getInitialReadOnly)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(READ_ONLY_QUERY)
    const update = () => setReadOnly(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  return readOnly
}
