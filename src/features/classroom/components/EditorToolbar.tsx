import type { CellType } from '../../../types/domain'
import { CELL_TYPE_LABELS } from '../editorTypes'
import { TOOLS, type EditorTool } from '../editorTypes'
import { ToolIcon } from './ToolIcon'

interface EditorToolbarProps {
  tool: EditorTool
  onToolChange: (tool: EditorTool) => void
  rectType: CellType
  onRectTypeChange: (type: CellType) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  disabled: boolean
}

const MIN_ZOOM = 50
const MAX_ZOOM = 200
const ZOOM_STEP = 25

export function EditorToolbar({
  tool,
  onToolChange,
  rectType,
  onRectTypeChange,
  zoom,
  onZoomChange,
  disabled,
}: EditorToolbarProps) {
  const changeZoom = (next: number) => {
    onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3">
      <div
        aria-label="教室編輯工具"
        className="flex flex-wrap gap-1 border border-line bg-paper p-1"
        role="group"
      >
        {TOOLS.map((item) => {
          const active = item.id === tool

          return (
            <button
              aria-label={`${item.label}（${item.shortcut}）`}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'bg-board text-chalk'
                  : 'text-muted hover:bg-accent-soft hover:text-ink'
              } disabled:cursor-not-allowed disabled:opacity-40`}
              disabled={disabled}
              key={item.id}
              onClick={() => onToolChange(item.id)}
              title={item.description}
              type="button"
            >
              <ToolIcon tool={item.id} />
              <span>{item.label}</span>
              <span
                className={`font-mono text-[8px] ${
                  active ? 'text-chalk/55' : 'text-muted/60'
                }`}
              >
                {item.shortcut}
              </span>
            </button>
          )
        })}
      </div>

      {tool === 'rect' ? (
        <label className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-muted">
          矩形填入
          <select
            aria-label="矩形填入型別"
            className="border border-line bg-surface px-2 py-1.5 text-xs text-ink disabled:opacity-50"
            disabled={disabled}
            onChange={(event) =>
              onRectTypeChange(event.target.value as CellType)
            }
            value={rectType}
          >
            {(Object.keys(CELL_TYPE_LABELS) as CellType[]).map((type) => (
              <option key={type} value={type}>
                {CELL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center border border-line bg-paper">
          <button
            aria-label="縮小"
            className="px-2 py-1.5 font-mono text-xs text-muted hover:text-ink disabled:opacity-35"
            disabled={disabled || zoom <= MIN_ZOOM}
            onClick={() => changeZoom(zoom - ZOOM_STEP)}
            type="button"
          >
            −
          </button>
          <button
            aria-label="重設縮放"
            className="min-w-14 border-x border-line px-2 py-1.5 font-mono text-[10px] text-ink"
            disabled={disabled}
            onClick={() => onZoomChange(100)}
            title="重設為 100%"
            type="button"
          >
            {zoom}%
          </button>
          <button
            aria-label="放大"
            className="px-2 py-1.5 font-mono text-xs text-muted hover:text-ink disabled:opacity-35"
            disabled={disabled || zoom >= MAX_ZOOM}
            onClick={() => changeZoom(zoom + ZOOM_STEP)}
            type="button"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
