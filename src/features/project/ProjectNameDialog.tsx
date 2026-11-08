import { useEffect, useRef, useState } from 'react'

interface ProjectNameDialogProps {
  name: string
  onClose: () => void
  onSave: (name: string) => void
}

export function ProjectNameDialog({
  name,
  onClose,
  onSave,
}: ProjectNameDialogProps) {
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    inputRef.current?.focus()
    inputRef.current?.select()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        aria-labelledby="project-name-title"
        aria-modal="true"
        className="w-full max-w-sm border border-line bg-surface p-6 shadow-xl"
        role="dialog"
      >
        <p className="font-mono text-[9px] tracking-[0.22em] text-muted">
          PROJECT NAME
        </p>
        <h2
          className="mt-1 font-display text-xl text-ink"
          id="project-name-title"
        >
          重新命名專案
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted">
          名稱會顯示在頁首，也會用於匯出檔名。
        </p>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(draft)
          }}
        >
          <label
            className="block text-xs font-medium text-ink"
            htmlFor="project-name-input"
          >
            專案名稱
          </label>
          <input
            className="mt-1.5 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
            id="project-name-input"
            maxLength={64}
            onChange={(event) => setDraft(event.target.value)}
            ref={inputRef}
            type="text"
            value={draft}
          />
          <p className="mt-1 text-[10px] text-muted">留空會使用「未命名教室」。</p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              className="border border-line bg-surface px-4 py-2 text-xs text-muted transition-colors hover:border-ink/30 hover:text-ink"
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="border border-board bg-board px-4 py-2 text-xs text-chalk transition-colors hover:bg-accent"
              type="submit"
            >
              儲存名稱
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
