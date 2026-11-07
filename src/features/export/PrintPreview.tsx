import { useEffect, useRef } from 'react'

export function PrintPreview({
  html,
  paperLabel,
  onClose,
}: {
  html: string
  paperLabel: string
  onClose: () => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handlePrint = () => {
    const frame = frameRef.current

    if (!frame?.contentWindow) {
      return
    }

    frame.contentWindow.focus()
    frame.contentWindow.print()
  }

  return (
    <div
      aria-labelledby="print-preview-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/80 p-3 sm:p-6"
      role="dialog"
    >
      <div className="flex h-[92vh] w-full max-w-6xl flex-col border border-line bg-surface shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-mark">
              PDF PRINT
            </p>
            <h2
              className="mt-0.5 font-display text-lg text-ink"
              id="print-preview-title"
            >
              列印預覽
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {paperLabel}。按「列印 / 儲存 PDF」後，於瀏覽器列印對話框選擇儲存為 PDF。
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              autoFocus
              className="border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={onClose}
              type="button"
            >
              關閉
            </button>
            <button
              className="border border-accent/40 bg-accent px-3 py-2 text-xs font-medium text-chalk transition-colors hover:bg-board"
              onClick={handlePrint}
              type="button"
            >
              列印 / 儲存 PDF
            </button>
          </div>
        </div>
        <iframe
          className="min-h-0 w-full flex-1 bg-white"
          ref={frameRef}
          srcDoc={html}
          title="座位表列印預覽"
        />
      </div>
    </div>
  )
}
