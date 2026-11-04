import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type {
  CellType,
  Classroom,
  SeatRef,
} from '../../../types/domain'
import type { CellPosition } from '../classroomOps'
import { seatId } from '../numbering'

interface ClassroomGridProps {
  classroom: Classroom
  refsById: Map<string, SeatRef>
  previewTypes: Map<string, CellType>
  selected: CellPosition | null
  hover: CellPosition | null
  cellSize: number
  readOnly: boolean
  onCellPointerDown: (
    position: CellPosition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onCellPointerEnter: (position: CellPosition) => void
  onHover: (position: CellPosition | null) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

const GAP = 6
const AXIS_WIDTH = 18

const cellBase: Record<CellType, string> = {
  seat: 'border-accent/40 bg-surface text-accent shadow-[inset_0_-2px_0_0_rgba(47,107,88,0.16)] hover:border-accent',
  aisle:
    'aisle-hatch border-dashed border-line bg-paper/70 text-muted hover:border-muted',
  blocked: 'border-ink/80 bg-ink text-chalk/55 hover:border-ink',
  empty:
    'border-dotted border-line bg-paper text-muted/60 hover:border-muted/70',
}

export function ClassroomGrid({
  classroom,
  refsById,
  previewTypes,
  selected,
  hover,
  cellSize,
  readOnly,
  onCellPointerDown,
  onCellPointerEnter,
  onHover,
  onKeyDown,
}: ClassroomGridProps) {
  const stageWidth =
    AXIS_WIDTH + classroom.cols * cellSize + classroom.cols * GAP
  const fontSize = Math.max(8, Math.round(cellSize * 0.19))

  return (
    <div
      aria-label="教室座位配置"
      className="w-max outline-none focus-visible:ring-2 focus-visible:ring-mark focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      onKeyDown={onKeyDown}
      onPointerLeave={() => onHover(null)}
      role="group"
      tabIndex={readOnly ? -1 : 0}
    >
      <div
        className="mb-3 flex items-center justify-between border border-board bg-board px-3 py-1.5 font-mono text-[9px] tracking-[0.35em] text-chalk"
        style={{ width: stageWidth }}
      >
        <span>講台</span>
        <span className="text-chalk/45">FRONT</span>
      </div>

      <div
        className="grid items-center"
        style={{
          gap: GAP,
          gridTemplateColumns: `${AXIS_WIDTH}px repeat(${classroom.cols}, ${cellSize}px)`,
        }}
      >
        <div aria-hidden="true" style={{ height: 14 }} />
        {Array.from({ length: classroom.cols }, (_, col) => (
          <div
            aria-hidden="true"
            className={`text-center font-mono text-[9px] ${
              hover?.col === col ? 'text-mark' : 'text-muted/70'
            }`}
            key={`col-${col}`}
            style={{ height: 14 }}
          >
            {col + 1}
          </div>
        ))}

        {Array.from({ length: classroom.rows }, (_, row) => (
          <div className="contents" key={`row-${row}`}>
            <div
              aria-hidden="true"
              className={`pr-1 text-right font-mono text-[9px] ${
                hover?.row === row ? 'text-mark' : 'text-muted/70'
              }`}
              style={{ height: cellSize }}
            >
              {row + 1}
            </div>
            {Array.from({ length: classroom.cols }, (_, col) => {
              const id = seatId(row, col)
              const base = classroom.cells[row * classroom.cols + col]
              const type = previewTypes.get(id) ?? base?.type ?? 'empty'
              const isSelected = selected?.row === row && selected?.col === col
              const isHovered = hover?.row === row && hover?.col === col
              const isPreview = previewTypes.has(id)
              const ref = type === 'seat' ? refsById.get(id) : undefined

              return (
                <button
                  aria-label={`第 ${row + 1} 列第 ${col + 1} 欄，${
                    type === 'seat' ? '座位' : type === 'aisle' ? '走道' : type === 'blocked' ? '禁坐' : '空白'
                  }${ref ? ` ${ref.code}` : ''}`}
                  aria-pressed={isSelected}
                  className={`relative flex items-center justify-center overflow-hidden border transition-colors disabled:cursor-default ${
                    cellBase[type]
                  } ${isSelected ? 'z-10 ring-2 ring-mark ring-offset-1 ring-offset-paper' : ''} ${
                    isPreview ? 'outline outline-1 outline-offset-[-3px] outline-mark/70' : ''
                  } ${isHovered && !isSelected ? 'brightness-[0.98]' : ''}`}
                  disabled={readOnly}
                  key={id}
                  data-seat={id}
                  onFocus={() => onHover({ row, col })}
                  onPointerDown={(event) =>
                    onCellPointerDown({ row, col }, event)
                  }
                  onPointerEnter={() => onCellPointerEnter({ row, col })}
                  style={{
                    fontSize,
                    height: cellSize,
                    width: cellSize,
                  }}
                  tabIndex={-1}
                  type="button"
                >
                  {type === 'seat' && ref ? (
                    <span className="max-w-full truncate px-1 font-mono leading-none">
                      {ref.code}
                    </span>
                  ) : null}
                  {type === 'blocked' ? (
                    <span aria-hidden="true" className="text-base leading-none">
                      ×
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
