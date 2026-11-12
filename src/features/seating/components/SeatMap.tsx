import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Classroom, Person, ProjectSettings, SeatRef } from '../../../types/domain'
import { seatId } from '../../classroom/numbering'
import { formatPersonLabel, formatSeatPosition } from '../seatingDisplay'

const GAP = 5
const AXIS_WIDTH = 18

interface SeatMapProps {
  classroom: Classroom
  refsById: Map<string, SeatRef>
  activeSeatIds: Set<string>
  assignments: Record<string, string>
  violationSeatIds: Set<string>
  neighborSeatIds: Set<string>
  personsById: Map<string, Person>
  lockedPersonIds: Set<string>
  display: ProjectSettings['display']
  selectedSeatId: string | null
  selectedPersonId: string | null
  readOnly: boolean
  dragEnabled: boolean
  cellSize: number
  hasAssignment: boolean
  onSeatClick: (seatIdValue: string) => void
}

interface SeatCellProps {
  id: string
  row: number
  col: number
  code: string
  person: Person | null
  active: boolean
  locked: boolean
  violating: boolean
  neighbor: boolean
  display: ProjectSettings['display']
  selected: boolean
  readOnly: boolean
  dragEnabled: boolean
  cellSize: number
  onSeatClick: (seatIdValue: string) => void
}

function SeatCell({
  id,
  row,
  col,
  code,
  person,
  active,
  locked,
  violating,
  neighbor,
  display,
  selected,
  readOnly,
  dragEnabled,
  cellSize,
  onSeatClick,
}: SeatCellProps) {
  const label = person ? formatPersonLabel(person, display) : ''
  const draggable = useDraggable({
    id: `drag-seat-${id}`,
    data: {
      type: 'seat',
      seatId: id,
      personId: person?.id,
      label: label || code,
    },
    disabled: readOnly || !dragEnabled || !person || locked,
  })
  const droppable = useDroppable({
    id: `drop-seat-${id}`,
    data: { type: 'drop-seat', seatId: id },
    disabled: readOnly || !dragEnabled || !active || Boolean(person && locked),
  })

  const setNodeRef = (node: HTMLButtonElement | null) => {
    draggable.setNodeRef(node)
    droppable.setNodeRef(node)
  }

  const className = active
    ? person
      ? 'border-accent/55 bg-accent-soft text-ink shadow-[inset_0_-2px_0_0_rgba(47,107,88,0.2)]'
      : 'border-accent/40 bg-surface text-ink hover:border-accent'
    : 'border-dashed border-line/80 bg-paper/60 text-muted/45'

  return (
    <button
      aria-label={`座位 ${code}，${person ? label || '已安排人員' : active ? '空位' : '未使用'}${
        locked ? '，已鎖定' : ''
      }${violating ? '，有規則衝突' : ''}${
        neighbor ? '，鄰居座位' : ''
      }`}
      aria-pressed={selected}
      className={`relative flex items-center justify-center overflow-hidden border px-1 text-center transition-[background-color,border-color,box-shadow] ${className} ${
        violating
          ? 'border-mark/70 shadow-[inset_0_0_0_1px_rgba(184,80,47,0.32)]'
          : ''
      } ${
        droppable.isOver
          ? 'z-10 border-accent bg-accent-soft ring-2 ring-accent ring-inset'
          : ''
      } ${
        neighbor
          ? 'shadow-[inset_0_0_0_2px_rgba(47,107,88,0.4)]'
          : ''
      } ${
        selected
          ? 'z-10 ring-2 ring-mark ring-offset-1 ring-offset-paper'
          : ''
      } ${
        person && !readOnly && dragEnabled && !locked
          ? 'cursor-grab active:cursor-grabbing'
          : readOnly
            ? 'cursor-default'
            : 'cursor-pointer'
      }`}
      data-active={active}
      data-neighbor={neighbor}
      data-over={droppable.isOver}
      data-seat={id}
      onClick={() => onSeatClick(id)}
      ref={setNodeRef}
      style={{ height: cellSize, width: cellSize }}
      type="button"
      {...(person && !readOnly && dragEnabled ? draggable.listeners : {})}
    >
      {active ? (
        <span className="absolute left-1 top-0.5 font-mono text-[7px] leading-none text-muted/70">
          {code}
        </span>
      ) : (
        <span className="font-mono text-[7px] leading-none text-muted/45">
          未使用
        </span>
      )}

      {person && label ? (
        <span className="mt-2 line-clamp-2 max-w-full break-words text-[9px] font-medium leading-[1.15]">
          {label}
        </span>
      ) : null}

      {locked ? (
        <span
          aria-label="已鎖定"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-mark"
          title="已鎖定"
        />
      ) : null}

      {violating ? (
        <span
          aria-hidden="true"
          className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-mark font-mono text-[7px] leading-none text-chalk"
          title="有規則衝突"
        >
          !
        </span>
      ) : null}

      <span className="sr-only">
        {formatSeatPosition(row, col)}
        {active ? '，可用座位' : '，未使用座位'}
      </span>
    </button>
  )
}

export function SeatMap({
  classroom,
  refsById,
  activeSeatIds,
  assignments,
  violationSeatIds,
  neighborSeatIds,
  personsById,
  lockedPersonIds,
  display,
  selectedSeatId,
  selectedPersonId,
  readOnly,
  dragEnabled,
  cellSize,
  hasAssignment,
  onSeatClick,
}: SeatMapProps) {
  const stageWidth =
    AXIS_WIDTH + classroom.cols * cellSize + classroom.cols * GAP

  return (
    <div
      aria-label="排座座位圖"
      className="w-max outline-none"
      role="group"
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
            className="text-center font-mono text-[9px] text-muted/70"
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
              className="pr-1 text-right font-mono text-[9px] text-muted/70"
              style={{ height: cellSize }}
            >
              {row + 1}
            </div>
            {Array.from({ length: classroom.cols }, (_, col) => {
              const id = seatId(row, col)
              const cell = classroom.cells[row * classroom.cols + col]
              const ref = refsById.get(id)
              const personId = assignments[id]
              const person = personId ? personsById.get(personId) ?? null : null

              if (!cell || cell.type !== 'seat') {
                return (
                  <div
                    aria-hidden="true"
                    className={`flex items-center justify-center border text-[9px] ${
                      cell?.type === 'aisle'
                        ? 'aisle-hatch border-dashed border-line bg-paper/70 text-muted/50'
                        : cell?.type === 'blocked'
                          ? 'border-ink/80 bg-ink text-chalk/45'
                          : 'border-dotted border-line bg-paper text-muted/40'
                    }`}
                    key={id}
                    style={{ height: cellSize, width: cellSize }}
                  >
                    {cell?.type === 'blocked' ? '×' : null}
                  </div>
                )
              }

              return (
                <SeatCell
                  active={activeSeatIds.has(id)}
                  cellSize={cellSize}
                  code={ref?.code ?? id}
                  col={col}
                  display={display}
                  dragEnabled={dragEnabled}
                  id={id}
                  key={id}
                  locked={Boolean(personId && lockedPersonIds.has(personId))}
                  neighbor={neighborSeatIds.has(id)}
                  onSeatClick={onSeatClick}
                  person={person}
                  readOnly={readOnly}
                  row={row}
                  selected={selectedSeatId === id}
                  violating={violationSeatIds.has(id)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {selectedPersonId ? (
        <p className="mt-3 font-mono text-[9px] tracking-[0.08em] text-mark">
          已選取未分配人員，點選可用座位即可安排。
        </p>
      ) : selectedSeatId ? (
        <p className="mt-3 font-mono text-[9px] tracking-[0.08em] text-mark">
          已選取座位，點選未分配人員也可安排。
        </p>
      ) : !hasAssignment ? (
        <p className="mt-3 font-mono text-[9px] tracking-[0.08em] text-muted">
          顯示依目前設定計算的可用座位，尚未產生排座結果。
        </p>
      ) : null}
    </div>
  )
}
