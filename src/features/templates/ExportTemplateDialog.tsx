import { useEffect } from 'react'
import {
  EXPORT_TEMPLATES,
  type ExportTemplate,
} from '../templates/exportTemplates'

interface ExportTemplateDialogProps {
  readOnly: boolean
  onApply: (template: ExportTemplate) => void
  onClose: () => void
}

export function ExportTemplateDialog({
  readOnly,
  onApply,
  onClose,
}: ExportTemplateDialogProps) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const apply = (template: ExportTemplate) => {
    if (readOnly) {
      return
    }

    if (
      window.confirm(
        '套用後會覆蓋目前的匯出設定，確定要套用這個範本嗎？',
      )
    ) {
      onApply(template)
    }
  }

  return (
    <div
      aria-labelledby="export-template-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/85 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <section className="w-full max-w-lg border border-line bg-surface shadow-2xl">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-accent">
              EXPORT TEMPLATES
            </p>
            <h3
              className="mt-0.5 font-display text-xl text-ink"
              id="export-template-title"
            >
              匯出範本
            </h3>
          </div>
          <button
            aria-label="關閉匯出範本"
            className="px-1 text-lg leading-none text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="space-y-2 p-5">
          {readOnly ? (
            <p className="mb-3 border border-line bg-paper px-3 py-2 text-xs text-muted">
              手機為唯讀檢視，只能預覽匯出範本。
            </p>
          ) : null}

          {EXPORT_TEMPLATES.map((template) => (
            <button
              className="flex w-full items-start justify-between gap-4 border border-line bg-paper/60 px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={readOnly}
              key={template.id}
              onClick={() => apply(template)}
              type="button"
            >
              <span>
                <span className="block text-sm font-medium text-ink">
                  {template.name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-5 text-muted">
                  {template.description}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-accent">
                套用
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
