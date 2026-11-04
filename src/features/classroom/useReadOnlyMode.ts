import { useEffect, useState } from 'react'

export const READ_ONLY_QUERY = '(max-width: 767px)'

/**
 * 手機版（< 768 px）為唯讀檢視。首次渲染先假設可編輯，掛載後再依
 * matchMedia 結果切換，避免在沒有 matchMedia 的環境出錯。
 */
export function useReadOnlyMode(): boolean {
  const [readOnly, setReadOnly] = useState(false)

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
