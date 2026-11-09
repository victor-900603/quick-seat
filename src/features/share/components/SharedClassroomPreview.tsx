import { useEffect, useMemo } from 'react'
import type { CellType, Classroom } from '../../../types/domain'
import { ClassroomGrid } from '../../classroom/components/ClassroomGrid'
import { getSeatRefs } from '../../classroom/numbering'
import {
  getClassroomShareStats,
  type ClassroomShareState,
} from '../classroomShare'

interface SharedClassroomPreviewProps {
  state: ClassroomShareState
  readOnly: boolean
  onApply: (classroom: Classroom) => void
  onClose: () => void
}

const EMPTY_PREVIEWS = new Map<string, CellType>()

export function SharedClassroomPreview({
  state,
  readOnly,
  onApply,
  onClose,
}: SharedClassroomPreviewProps) {
  const classroom = state.status === 'ready' ? state.classroom : null
  const refs = useMemo(
    () => (classroom ? getSeatRefs(classroom) : []),
    [classroom],
  )
  const refsById = useMemo(
    () => new Map(refs.map((ref) => [ref.id, ref])),
    [refs],
  )
  const stats = useMemo(
    () => (classroom ? getClassroomShareStats(classroom) : null),
    [classroom],
  )

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
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/90 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="shared-classroom-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col border border-line bg-surface shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
              SHARED CLASSROOM / READ ONLY
            </p>
            <h3
              className="mt-0.5 font-display text-xl text-ink"
              id="shared-classroom-title"
            >
              {state.status === 'ready' ? '分享的教室' : '無法開啟分享連結'}
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              {state.status === 'ready'
                ? '這是唯讀預覽。套用後會取代目前的教室配置，名單、規則與排座結果可能受影響。'
                : state.message}
            </p>
          </div>
          <button
            aria-label="關閉分享教室預覽"
            className="px-1 text-xl leading-none text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        {state.status === 'ready' && classroom && stats ? (
          <>
            <div className="flex flex-wrap gap-px border-b border-line bg-line">
              {[
                { label: '欄 × 列', value: `${classroom.cols} × ${classroom.rows}` },
                { label: '座位', value: stats.seats },
                { label: '走道', value: stats.aisles },
                { label: '禁坐', value: stats.blocked },
                { label: '空白', value: stats.empty },
              ].map((item) => (
                <div
                  className="min-w-24 flex-1 bg-paper px-4 py-2"
                  key={item.label}
                >
                  <p className="font-mono text-[8px] tracking-[0.14em] text-muted">
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-display text-lg text-ink">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-paper p-4 sm:p-6">
              <ClassroomGrid
                cellSize={44}
                classroom={classroom}
                hover={null}
                onCellPointerDown={() => undefined}
                onCellPointerEnter={() => undefined}
                onHover={() => undefined}
                onKeyDown={() => undefined}
                previewTypes={EMPTY_PREVIEWS}
                readOnly
                refsById={refsById}
                selected={null}
              />
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
              <p className="text-[10px] leading-4 text-muted">
                分享連結只包含教室配置，不包含名單、規則或排座結果。
              </p>
              <div className="flex gap-2">
                <button
                  className="border border-line bg-paper px-3 py-2 text-xs text-muted transition-colors hover:border-ink/40 hover:text-ink"
                  onClick={onClose}
                  type="button"
                >
                  關閉
                </button>
                <button
                  className="border border-accent bg-accent px-3 py-2 text-xs text-chalk transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={readOnly}
                  onClick={() => onApply(classroom)}
                  title={
                    readOnly
                      ? '手機為唯讀模式，請使用平板或電腦套用教室配置。'
                      : undefined
                  }
                  type="button"
                >
                  套用到目前教室
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="p-5">
            <p className="border border-mark/30 bg-mark/5 px-3 py-2 text-xs leading-5 text-mark">
              請確認連結是否完整，或請分享者重新產生連結。
            </p>
            <div className="mt-4 flex justify-end">
              <button
                className="border border-line bg-paper px-3 py-2 text-xs text-muted transition-colors hover:border-ink/40 hover:text-ink"
                onClick={onClose}
                type="button"
              >
                關閉
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
