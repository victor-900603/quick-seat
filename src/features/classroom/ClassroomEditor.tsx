import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { PageHeader } from '../../components/PageHeader'
import type { CellType } from '../../types/domain'
import { useProjectStore } from '../project/projectStore'
import { ClassroomGrid } from './components/ClassroomGrid'
import { EditorToolbar } from './components/EditorToolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
import {
  isInsideClassroom,
  positionsInColumn,
  positionsInRect,
  positionsInRow,
  type CellPosition,
} from './classroomOps'
import { CELL_TYPE_LABELS, TOOLS, type EditorTool } from './editorTypes'
import { getSeatRefs, seatId } from './numbering'
import { useReadOnlyMode } from '../../lib/useReadOnlyMode'
import { ShareClassroomDialog } from '../share/components/ShareClassroomDialog'
import { CLASSROOM_SHARE_HASH_PREFIX } from '../share/classroomShare'

const LEGEND: { type: CellType; className: string }[] = [
  { type: 'seat', className: 'border-accent/40 bg-accent-soft' },
  { type: 'aisle', className: 'border-dashed border-line bg-paper' },
  { type: 'blocked', className: 'border-ink bg-ink' },
  { type: 'empty', className: 'border-dotted border-line bg-paper' },
]

const ARROW_DELTAS: Record<string, CellPosition> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

interface RectPreview {
  start: CellPosition
  end: CellPosition
  type: CellType
}

export function ClassroomEditor() {
  const classroom = useProjectStore((state) => state.project.classroom)
  const cellSize = useProjectStore((state) => state.project.settings.cellSize)
  const applyCellTypes = useProjectStore((state) => state.applyCellTypes)
  const resizeRoom = useProjectStore((state) => state.resizeRoom)
  const updateSeatNumbering = useProjectStore(
    (state) => state.updateSeatNumbering,
  )
  const updateSeatCode = useProjectStore((state) => state.updateSeatCode)
  const updateCellSize = useProjectStore((state) => state.updateCellSize)
  const readOnly = useReadOnlyMode()

  const [tool, setTool] = useState<EditorTool>('select')
  const [rectType, setRectType] = useState<CellType>('seat')
  const [zoom, setZoom] = useState(100)
  const [selected, setSelected] = useState<CellPosition | null>({
    row: 0,
    col: 0,
  })
  const [hover, setHover] = useState<CellPosition | null>(null)
  const [rectPreview, setRectPreview] = useState<RectPreview | null>(null)
  const [draft, setDraft] = useState<Map<string, CellPosition>>(
    () => new Map(),
  )
  const [paintType, setPaintType] = useState<CellType | null>(null)
  const [sharing, setSharing] = useState(false)

  const refs = useMemo(() => getSeatRefs(classroom), [classroom])
  const refsById = useMemo(
    () => new Map(refs.map((ref) => [ref.id, ref])),
    [refs],
  )

  const counts = useMemo(
    () =>
      classroom.cells.reduce<Record<CellType, number>>(
        (result, cell) => {
          result[cell.type] += 1
          return result
        },
        { seat: 0, aisle: 0, blocked: 0, empty: 0 },
      ),
    [classroom.cells],
  )

  const previewTypes = useMemo(() => {
    const previews = new Map<string, CellType>()

    draft.forEach((position) => {
      previews.set(seatId(position.row, position.col), paintType ?? 'empty')
    })

    if (rectPreview) {
      for (const position of positionsInRect(
        classroom,
        rectPreview.start,
        rectPreview.end,
      )) {
        previews.set(seatId(position.row, position.col), rectPreview.type)
      }
    }

    if (
      hover &&
      isInsideClassroom(classroom, hover) &&
      (tool === 'aisle-row' || tool === 'aisle-col')
    ) {
      const positions =
        tool === 'aisle-row'
          ? positionsInRow(classroom, hover.row)
          : positionsInColumn(classroom, hover.col)

      for (const position of positions) {
        previews.set(seatId(position.row, position.col), 'aisle')
      }
    }

    return previews
  }, [classroom, draft, hover, paintType, rectPreview, tool])

  const finishInteraction = useCallback(() => {
    if (paintType) {
      const positions = [...draft.values()]

      setPaintType(null)
      setDraft(new Map())

      if (positions.length > 0) {
        applyCellTypes(positions, paintType)
      }
    }

    if (rectPreview) {
      setRectPreview(null)

      const positions = positionsInRect(
        classroom,
        rectPreview.start,
        rectPreview.end,
      )

      if (positions.length > 0) {
        applyCellTypes(positions, rectPreview.type)
      }
    }
  }, [applyCellTypes, classroom, draft, paintType, rectPreview])

  useEffect(() => {
    window.addEventListener('pointerup', finishInteraction)
    return () => window.removeEventListener('pointerup', finishInteraction)
  }, [finishInteraction])

  useEffect(() => {
    const closeShareForPreview = () => {
      if (window.location.hash.startsWith(CLASSROOM_SHARE_HASH_PREFIX)) {
        setSharing(false)
      }
    }

    closeShareForPreview()
    window.addEventListener('hashchange', closeShareForPreview)
    return () =>
      window.removeEventListener('hashchange', closeShareForPreview)
  }, [])

  const handleCellPointerDown = (
    position: CellPosition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (readOnly || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }

    setSelected(position)

    if (tool === 'select') {
      return
    }

    event.preventDefault()

    if (tool === 'rect') {
      setRectPreview({ start: position, end: position, type: rectType })
      return
    }

    if (tool === 'aisle-row' || tool === 'aisle-col') {
      applyCellTypes(
        tool === 'aisle-row'
          ? positionsInRow(classroom, position.row)
          : positionsInColumn(classroom, position.col),
        'aisle',
      )
      return
    }

    setPaintType(tool)
    setDraft(
      new Map([[seatId(position.row, position.col), position]]),
    )
  }

  const handleCellPointerEnter = (position: CellPosition) => {
    setHover(position)

    if (paintType) {
      const id = seatId(position.row, position.col)

      setDraft((current) => {
        if (current.has(id)) {
          return current
        }

        const next = new Map(current)
        next.set(id, position)
        return next
      })

      return
    }

    if (rectPreview) {
      setRectPreview((current) =>
        current ? { ...current, end: position } : current,
      )
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) {
      return
    }

    const shortcut = TOOLS.find((item) => item.shortcut === event.key)

    if (shortcut) {
      event.preventDefault()
      setTool(shortcut.id)
      return
    }

    const delta = ARROW_DELTAS[event.key]

    if (!delta) {
      return
    }

    event.preventDefault()

    setSelected((current) => {
      const base = current ?? { row: 0, col: 0 }

      return {
        row: Math.min(
          classroom.rows - 1,
          Math.max(0, base.row + delta.row),
        ),
        col: Math.min(
          classroom.cols - 1,
          Math.max(0, base.col + delta.col),
        ),
      }
    })
  }

  const handleResize = (cols: number, rows: number) => {
    resizeRoom(cols, rows)
  }

  const closeShare = useCallback(() => setSharing(false), [])

  const visibleSelected =
    selected && isInsideClassroom(classroom, selected) ? selected : null
  const visibleHover =
    hover && isInsideClassroom(classroom, hover) ? hover : null
  const hoveredType = visibleHover
    ? previewTypes.get(seatId(visibleHover.row, visibleHover.col)) ??
      classroom.cells[
        visibleHover.row * classroom.cols + visibleHover.col
      ]?.type
    : undefined
  const hoveredRef = visibleHover
    ? refsById.get(seatId(visibleHover.row, visibleHover.col))
    : undefined
  const effectiveCellSize = Math.round((cellSize * zoom) / 100)

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <PageHeader
        actions={
          <button
            aria-haspopup="dialog"
            className="border border-line bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={() => setSharing(true)}
            type="button"
          >
            分享教室
          </button>
        }
        description="在方格紙上決定座位、走道與禁坐區。走道以整列或整欄建立，筆刷拖曳與矩形填入都會合併為單一步復原。"
        kicker="CLASSROOM"
        stats={[
          { label: '座位', value: counts.seat },
          { label: '走道', value: counts.aisle },
          { label: '禁坐', value: counts.blocked },
        ]}
        step="01"
        title="教室配置"
      />

      {readOnly ? (
        <div
          className="mt-4 border border-mark/30 bg-mark/5 px-3 py-2 font-mono text-[10px] tracking-[0.08em] text-mark"
          role="status"
        >
          手機為唯讀檢視。請使用平板或電腦編輯教室配置。
        </div>
      ) : null}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 border border-line bg-surface">
          <EditorToolbar
            disabled={readOnly}
            onRectTypeChange={setRectType}
            onToolChange={setTool}
            onZoomChange={setZoom}
            rectType={rectType}
            tool={tool}
            zoom={zoom}
          />

          <div
            className="overflow-auto bg-paper p-4 sm:p-6"
            style={{ maxHeight: 'min(68vh, 760px)' }}
          >
            <ClassroomGrid
              cellSize={effectiveCellSize}
              classroom={classroom}
              hover={visibleHover}
              onCellPointerDown={handleCellPointerDown}
              onCellPointerEnter={handleCellPointerEnter}
              onHover={setHover}
              onKeyDown={handleKeyDown}
              previewTypes={previewTypes}
              readOnly={readOnly}
              refsById={refsById}
              selected={visibleSelected}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
            <p className="font-mono text-[9px] tracking-[0.08em] text-muted">
              {visibleHover ? (
                <>
                  第 {visibleHover.row + 1} 列 · 第 {visibleHover.col + 1} 欄 ·{' '}
                  {hoveredType ? CELL_TYPE_LABELS[hoveredType] : '空白'}
                  {hoveredRef ? ` ${hoveredRef.code}` : ''}
                </>
              ) : (
                '將游標移到格子上查看座標'
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              {LEGEND.map((item) => (
                <span
                  className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.08em] text-muted"
                  key={item.type}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 border ${item.className}`}
                  />
                  {CELL_TYPE_LABELS[item.type]}
                </span>
              ))}
            </div>
          </div>
        </section>

        <PropertiesPanel
          cellSize={cellSize}
          classroom={classroom}
          disabled={readOnly}
          onApplyType={(type) => {
            if (visibleSelected) {
              applyCellTypes([visibleSelected], type)
            }
          }}
          onCellSizeChange={updateCellSize}
          onResize={handleResize}
          onUpdateCode={(code) => {
            if (visibleSelected) {
              updateSeatCode(visibleSelected, code)
            }
          }}
          onUpdateNumbering={updateSeatNumbering}
          refs={refs}
          selected={visibleSelected}
        />
      </div>

      {sharing ? (
        <ShareClassroomDialog classroom={classroom} onClose={closeShare} />
      ) : null}
    </div>
  )
}
