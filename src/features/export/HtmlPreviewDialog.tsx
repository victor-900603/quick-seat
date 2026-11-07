import { useEffect } from 'react'

export function HtmlPreviewDialog({
  html,
  paperLabel,
  onClose,
}: {
  html: string
  paperLabel: string
  onClose: () => void
}) {
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

  return (
    <div
      aria-labelledby="html-preview-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-board p-3 sm:p-6"
      role="dialog"
    >
      <div className="flex h-[94vh] w-full max-w-[1500px] flex-col border border-line bg-surface shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-mark">
              FULL PREVIEW
            </p>
            <h2
              className="mt-0.5 font-display text-lg text-ink"
              id="html-preview-title"
            >
              放大預覽
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {paperLabel}，依紙張比例顯示。列印與下載使用相同頁面。
            </p>
          </div>
          <button
            autoFocus
            className="border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={onClose}
            type="button"
          >
            關閉
          </button>
        </div>
        <iframe
          className="min-h-0 w-full flex-1 bg-white"
          srcDoc={html}
          title="放大頁面預覽"
        />
      </div>
    </div>
  )
}
