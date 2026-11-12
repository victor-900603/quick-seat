import { useEffect, useState } from 'react'
import { CELL_TYPE_LABELS } from '../classroom/editorTypes'
import {
  CLASSROOM_TEMPLATES,
  countTemplateCells,
  type ClassroomTemplate,
} from './classroomTemplates'

interface ClassroomTemplateDialogProps {
  readOnly: boolean
  onApply: (template: ClassroomTemplate) => void
  onClose: () => void
}

const CELL_STYLES = {
  seat: 'border-accent/30 bg-accent-soft',
  aisle: 'border-line bg-paper aisle-hatch',
  blocked: 'border-board bg-board',
  empty: 'border-line/70 bg-surface',
} as const

export function ClassroomTemplateDialog({
  readOnly,
  onApply,
  onClose,
}: ClassroomTemplateDialogProps) {
  const [selectedId, setSelectedId] = useState(CLASSROOM_TEMPLATES[0].id)
  const selected =
    CLASSROOM_TEMPLATES.find((template) => template.id === selectedId) ??
    CLASSROOM_TEMPLATES[0]
  const counts = countTemplateCells(selected)

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

  const apply = () => {
    if (readOnly) return
    if (
      !window.confirm(
        '套用後會取代目前的教室配置，名單、規則與排座結果可能受影響。確定套用嗎？',
      )
    ) {
      return
    }
    onApply(selected)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/80 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section
        aria-labelledby="classroom-template-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-line bg-surface shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-accent">
              CLASSROOM TEMPLATES
            </p>
            <h2
              className="mt-1 font-display text-xl text-ink"
              id="classroom-template-title"
            >
              教室範本
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              選擇配置後先預覽，再套用到目前教室。
            </p>
          </div>
          <button
            aria-label="關閉教室範本"
            className="px-1 text-lg leading-none text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid gap-4 p-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            {CLASSROOM_TEMPLATES.map((template) => {
              const active = template.id === selected.id
              return (
                <button
                  aria-label={template.name}
                  aria-pressed={active}
                  className={`w-full border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft/60'
                      : 'border-line bg-surface hover:border-accent/50'
                  }`}
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink">
                      {template.name}
                    </span>
                    <span className="font-mono text-[8px] text-muted">
                      {template.category}
                    </span>
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-muted">
                    {template.cols} × {template.rows}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-ink">{selected.name}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {selected.description}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-right">
                {[
                  ['座位', counts.seats],
                  ['走道', counts.aisles],
                  ['空白', counts.empty],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[8px] text-muted">{label}</dt>
                    <dd className="font-display text-lg text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-3 overflow-auto border border-line bg-paper p-3">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${selected.cols}, 16px)`,
                }}
              >
                {selected.cells.map((type, index) => (
                  <span
                    aria-label={CELL_TYPE_LABELS[type]}
                    className={`h-4 w-4 border ${CELL_STYLES[type]}`}
                    key={`${selected.id}-${index}`}
                    title={CELL_TYPE_LABELS[type]}
                  />
                ))}
              </div>
            </div>

            {readOnly ? (
              <p className="mt-3 text-xs leading-5 text-mark">
                手機為唯讀檢視，只能預覽範本。請使用平板或電腦套用。
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="border border-line bg-paper px-3 py-2 text-xs text-muted hover:text-ink"
                onClick={onClose}
                type="button"
              >
                取消
              </button>
              <button
                className="border border-board bg-board px-3 py-2 text-xs text-chalk transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
                disabled={readOnly}
                onClick={apply}
                type="button"
              >
                套用此範本
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
