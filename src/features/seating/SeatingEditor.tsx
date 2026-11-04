import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react'
import { useReadOnlyMode } from '../../lib/useReadOnlyMode'
import type { AllocationMode, OccupancyMode } from '../../types/domain'
import { getSeatRefs } from '../classroom/numbering'
import { useProjectStore } from '../project/projectStore'
import { createSeed } from './allocation'
import {
  expandClassroomForCapacity,
  getCapacityReport,
} from './capacity'
import { buildOccupancySummary } from './occupancy'
import { isAssignmentStale } from './revision'
import { seatCollisionDetection, cursorOffsetModifier } from './seatingDnd'
import { SeatDetails } from './components/SeatDetails'
import { SeatMap } from './components/SeatMap'
import {
  SeatingControls,
  type SeatingMethod,
} from './components/SeatingControls'
import { UnassignedPanel } from './components/UnassignedPanel'

interface Notice {
  tone: 'success' | 'error'
  message: string
}

interface DragPreview {
  kind: 'seat' | 'person'
  label: string
  code?: string
}

const LEGEND = [
  { label: '可用空位', className: 'border-accent/40 bg-surface' },
  { label: '已安排', className: 'border-accent/55 bg-accent-soft' },
  { label: '未使用', className: 'border-dashed border-line bg-paper' },
  { label: '已鎖定', className: 'border-mark/50 bg-mark/10' },
]

function sameOccupancy(left: OccupancyMode, right: OccupancyMode): boolean {
  if (left.kind !== right.kind) {
    return false
  }

  if (left.kind === 'full') {
    return true
  }

  return left.phase === (right as { phase: 0 | 1 }).phase
}

function sameAllocation(
  left: AllocationMode,
  right: AllocationMode,
): boolean {
  if (left.kind !== right.kind) {
    return false
  }

  if (left.kind === 'random') {
    return true
  }

  return (
    left.orderBy === (right as { orderBy: string }).orderBy &&
    left.fill === (right as { fill: string }).fill
  )
}

export function SeatingEditor() {
  const project = useProjectStore((state) => state.project)
  const runSeating = useProjectStore((state) => state.runSeating)
  const clearAssignment = useProjectStore((state) => state.clearAssignment)
  const togglePersonLock = useProjectStore((state) => state.togglePersonLock)
  const unassignPerson = useProjectStore((state) => state.unassignPerson)
  const moveSeatOccupant = useProjectStore(
    (state) => state.moveSeatOccupant,
  )
  const assignUnassigned = useProjectStore(
    (state) => state.assignUnassigned,
  )
  const resizeRoom = useProjectStore((state) => state.resizeRoom)
  const setDisplay = useProjectStore((state) => state.setDisplay)
  const readOnly = useReadOnlyMode()

  const assignment = project.currentAssignment
  const [method, setMethod] = useState<SeatingMethod>(
    () => assignment?.source ?? 'auto',
  )
  const [occupancy, setOccupancy] = useState<OccupancyMode>(
    () => assignment?.occupancy ?? { kind: 'full' },
  )
  const [allocation, setAllocation] = useState<AllocationMode>(
    () =>
      assignment?.allocation ?? {
        kind: 'ordered',
        orderBy: 'studentNo',
        fill: 'row-major',
      },
  )
  const [seed, setSeed] = useState(() => assignment?.seed ?? createSeed())
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    null,
  )
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const persons = project.roster.persons
  const personCount = persons.length
  const display = project.settings.display
  const classroom = project.classroom

  const refs = useMemo(() => getSeatRefs(classroom), [classroom])
  const refsById = useMemo(
    () => new Map(refs.map((ref) => [ref.id, ref])),
    [refs],
  )
  const personsById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  )
  const pinSeatIds = useMemo(
    () =>
      project.rules.flatMap((rule) =>
        rule.type === 'pin' && rule.enabled ? [rule.seatId] : [],
      ),
    [project.rules],
  )
  const fill = allocation.kind === 'ordered' ? allocation.fill : 'row-major'
  const previewSummary = useMemo(
    () =>
      buildOccupancySummary(classroom, occupancy, {
        personCount,
        fill,
        extraSeatIds: pinSeatIds,
      }),
    [classroom, fill, occupancy, personCount, pinSeatIds],
  )
  const capacityReport = useMemo(
    () => getCapacityReport(previewSummary, personCount),
    [personCount, previewSummary],
  )
  const resultSummary = useMemo(
    () =>
      assignment
        ? buildOccupancySummary(classroom, assignment.occupancy, {
            personCount,
            fill:
              assignment.allocation.kind === 'ordered'
                ? assignment.allocation.fill
                : 'row-major',
            extraSeatIds: pinSeatIds,
          })
        : null,
    [assignment, classroom, personCount, pinSeatIds],
  )
  const activeSeatIds = useMemo(() => {
    const active = new Set(
      (resultSummary ?? previewSummary).activeSeats.map((seat) => seat.id),
    )

    if (assignment) {
      Object.keys(assignment.assignments).forEach((seatId) =>
        active.add(seatId),
      )
    }

    return active
  }, [assignment, previewSummary, resultSummary])

  const assignments = useMemo(
    () => assignment?.assignments ?? {},
    [assignment],
  )
  const assignedPersonIds = useMemo(
    () => new Set(Object.values(assignments)),
    [assignments],
  )
  const unassignedPersons = useMemo(
    () => persons.filter((person) => !assignedPersonIds.has(person.id)),
    [assignedPersonIds, persons],
  )
  const lockedPersonIds = useMemo(
    () => new Set(project.lockedPersonIds),
    [project.lockedPersonIds],
  )
  const stale = isAssignmentStale(project)
  const settingsDirty = Boolean(
    assignment &&
      (!sameOccupancy(assignment.occupancy, previewSummary.mode) ||
        !sameAllocation(assignment.allocation, allocation) ||
        (allocation.kind === 'random' && seed !== assignment.seed)),
  )
  const selectedPerson = selectedPersonId
    ? personsById.get(selectedPersonId) ?? null
    : null
  const assignedCount = Object.keys(assignments).length
  const canRun =
    personCount > 0 && capacityReport.capacity > 0 && !capacityReport.shortage
  const expandedSize = useMemo(
    () =>
      capacityReport.shortage
        ? expandClassroomForCapacity(classroom, occupancy, personCount)
        : null,
    [capacityReport.shortage, classroom, occupancy, personCount],
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const modeLabel =
    occupancy.kind === 'full'
      ? '連續座位'
      : `梅花座 · 相位 ${
          previewSummary.resolvedPhase ?? '自動'
        }`

  const handleRun = (partial = false) => {
    const outcome = runSeating({ occupancy, allocation, seed, partial })

    if (!outcome.ok) {
      setNotice({ tone: 'error', message: outcome.message })
      return
    }

    setSelectedSeatId(null)
    setSelectedPersonId(null)
    setNotice({
      tone: 'success',
      message: `已安排 ${outcome.assignedCount} 位，未分配 ${outcome.unassignedCount} 位。`,
    })
  }

  const handleExpand = () => {
    if (!expandedSize) {
      setNotice({
        tone: 'error',
        message: '已達 60×60 上限，無法再自動擴充教室。',
      })
      return
    }

    resizeRoom(expandedSize.cols, expandedSize.rows)
    setNotice({
      tone: 'success',
      message: `教室已擴充為 ${expandedSize.cols} 欄 × ${expandedSize.rows} 列。`,
    })
  }

  const handleToggleLock = (personId: string) => {
    togglePersonLock(personId)
    setNotice({
      tone: 'success',
      message: lockedPersonIds.has(personId)
        ? '已解除鎖定。'
        : '已鎖定，重新排座時會保留目前座位。',
    })
  }

  const handleUnassign = (personId: string) => {
    unassignPerson(personId)
    setSelectedSeatId(null)
    setSelectedPersonId(null)
    setNotice({ tone: 'success', message: '已移回未分配人員。' })
  }

  const assignPersonToSeat = (personId: string, seatId: string) => {
    const targetPersonId = assignments[seatId]
    const person = personsById.get(personId)
    const target = targetPersonId
      ? personsById.get(targetPersonId)
      : undefined

    if (
      target &&
      targetPersonId !== personId &&
      !window.confirm(
        `座位目前是「${target.name}」，確定改排「${person?.name ?? '此人'}」嗎？`,
      )
    ) {
      return
    }

    const startsManual = method === 'manual' && !assignment
    const outcome = assignUnassigned(
      personId,
      seatId,
      startsManual
        ? {
            manualConfig: {
              occupancy,
              allocation,
              seed,
              partial: false,
            },
          }
        : undefined,
    )

    if (!outcome.ok) {
      setNotice({ tone: 'error', message: outcome.message ?? '無法安排座位。' })
      return
    }

    setSelectedPersonId(null)
    setSelectedSeatId(seatId)
    setNotice({
      tone: 'success',
      message: startsManual
        ? '已建立手動座位表並安排座位。'
        : '已安排座位。',
    })
  }

  const moveSeat = (fromSeatId: string, toSeatId: string) => {
    const outcome = moveSeatOccupant(fromSeatId, toSeatId)

    if (!outcome.ok) {
      setNotice({ tone: 'error', message: outcome.message ?? '無法移動座位。' })
      return
    }

    setSelectedSeatId(toSeatId)
    setNotice({ tone: 'success', message: '座位已更新。' })
  }

  const clearSelection = useCallback(() => {
    setSelectedSeatId(null)
    setSelectedPersonId(null)
  }, [])

  const handleMapBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target

    if (
      target instanceof Element &&
      target.closest(
        'button, a, input, select, textarea, [contenteditable], [data-seat]',
      )
    ) {
      return
    }

    clearSelection()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }

      const target = event.target

      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable]')
      ) {
        return
      }

      clearSelection()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection])

  const handleSeatClick = (seatId: string) => {
    if (readOnly) {
      setSelectedSeatId((current) => (current === seatId ? null : seatId))
      setSelectedPersonId(null)
      return
    }

    if (selectedSeatId === seatId) {
      clearSelection()
      return
    }

    if (selectedPersonId) {
      assignPersonToSeat(selectedPersonId, seatId)
      return
    }

    setSelectedSeatId(seatId)
  }

  const handleUnassignedSelect = (personId: string) => {
    if (
      !readOnly &&
      selectedSeatId &&
      activeSeatIds.has(selectedSeatId) &&
      (assignment || method === 'manual')
    ) {
      assignPersonToSeat(personId, selectedSeatId)
      return
    }

    setSelectedPersonId((current) => (current === personId ? null : personId))
    setSelectedSeatId(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; label?: string; seatId?: string }
      | undefined

    if (data?.type === 'seat') {
      setDragPreview({
        kind: 'seat',
        label: data.label ?? '移動中',
        code: data.seatId
          ? refsById.get(data.seatId)?.code ?? data.seatId
          : undefined,
      })
      return
    }

    setDragPreview({ kind: 'person', label: data?.label ?? '移動中' })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDragPreview(null)

    const over = event.over?.data.current as
      | { type?: string; seatId?: string }
      | undefined
    const active = event.active.data.current as
      | { type?: string; seatId?: string; personId?: string }
      | undefined

    if (over?.type !== 'drop-seat' || !over.seatId || !active) {
      return
    }

    if (active.type === 'seat' && active.seatId) {
      moveSeat(active.seatId, over.seatId)
      return
    }

    if (active.type === 'person' && active.personId) {
      assignPersonToSeat(active.personId, over.seatId)
    }
  }

  const handleClear = () => {
    clearAssignment()
    setSelectedSeatId(null)
    setSelectedPersonId(null)
    setNotice({ tone: 'success', message: '已清除排座結果，鎖定名單保留。' })
  }

  const stats = [
    { label: '人數', value: personCount },
    { label: '可用座位', value: capacityReport.capacity },
    { label: '已分配', value: assignedCount },
    { label: '未分配', value: unassignedPersons.length },
  ]

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.25em] text-mark">
            STEP 04 / SEATING
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide text-ink">
            安排座位
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            自動分配或直接手動安排，再拖曳微調、鎖定人員，或將未分配人員補進空位。
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-right sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-[9px] tracking-[0.12em] text-muted">
                {stat.label}
              </dt>
              <dd className="font-display text-xl leading-tight text-ink">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {readOnly ? (
        <p className="mb-4 border border-line bg-surface px-4 py-3 text-xs leading-5 text-muted">
          手機為唯讀檢視。請使用平板或電腦編輯排座設定與座位。
        </p>
      ) : null}

      {notice ? (
        <div
          aria-live="polite"
          className={`mb-4 flex items-start justify-between gap-3 border px-4 py-3 text-xs leading-5 ${
            notice.tone === 'error'
              ? 'border-mark/40 bg-mark/5 text-mark'
              : 'border-accent/35 bg-accent-soft/60 text-accent'
          }`}
        >
          <span>{notice.message}</span>
          <button
            aria-label="關閉提示"
            className="shrink-0 text-base leading-none opacity-60 hover:opacity-100"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      {stale || settingsDirty ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-mark/40 bg-mark/5 px-4 py-3 text-xs leading-5 text-ink">
          <span>
            {stale
              ? '名單、教室或規則已變更，目前座位圖可能不是最新結果。'
              : '排座設定已變更，座位圖仍顯示上一次的結果。'}
          </span>
          <button
            className="border border-mark/50 bg-surface px-2.5 py-1.5 text-[11px] text-mark hover:bg-mark/10 disabled:opacity-55"
            disabled={readOnly || !canRun}
            onClick={() => handleRun()}
            type="button"
          >
            重新排座
          </button>
        </div>
      ) : null}

      <DndContext
        collisionDetection={seatCollisionDetection}
        onDragCancel={() => setDragPreview(null)}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <section className="border border-line bg-surface">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
                    SEAT MAP
                  </p>
                  <h3 className="mt-0.5 text-sm font-medium text-ink">
                    座位圖
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {selectedSeatId || selectedPersonId ? (
                    <button
                      aria-label="取消目前選取"
                      className="border border-line bg-paper px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-muted transition-colors hover:border-mark/50 hover:text-mark"
                      onClick={clearSelection}
                      type="button"
                    >
                      取消選取
                    </button>
                  ) : null}
                  <div>
                    <p className="font-mono text-[10px] text-muted">
                      {modeLabel}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-muted/75">
                      {assignment
                        ? `已安排 ${assignedCount} / ${personCount} 位`
                        : method === 'manual'
                          ? '直接選取人員與座位即可開始'
                          : '尚未產生排座結果'}
                    </p>
                  </div>
                </div>
              </header>

              {personCount === 0 ? (
                <div className="border-b border-line bg-paper/60 px-4 py-3 text-xs leading-5 text-muted">
                  名單尚無人員。請先到「名單」分頁新增或匯入學生。
                </div>
              ) : capacityReport.capacity === 0 ? (
                <div className="border-b border-line bg-mark/5 px-4 py-3 text-xs leading-5 text-mark">
                  目前設定沒有可用座位。請調整教室配置或座位使用模式。
                </div>
              ) : null}

              <div
                className="overflow-x-auto p-4"
                onClick={handleMapBackgroundClick}
              >
                <SeatMap
                  activeSeatIds={activeSeatIds}
                  assignments={assignments}
                  cellSize={project.settings.cellSize}
                  classroom={classroom}
                  display={display}
                  hasAssignment={Boolean(assignment)}
                  lockedPersonIds={lockedPersonIds}
                  onSeatClick={handleSeatClick}
                  personsById={personsById}
                  readOnly={readOnly}
                  refsById={refsById}
                  selectedPersonId={selectedPersonId}
                  selectedSeatId={selectedSeatId}
                />
              </div>

              <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-4 py-3">
                {LEGEND.map((item) => (
                  <span
                    className="flex items-center gap-1.5 font-mono text-[9px] text-muted"
                    key={item.label}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 border ${item.className}`}
                    />
                    {item.label}
                  </span>
                ))}
              </footer>
            </section>

            <UnassignedPanel
              display={display}
              lockedPersonIds={lockedPersonIds}
              onSelect={handleUnassignedSelect}
              persons={unassignedPersons}
              readOnly={readOnly}
              selectedPersonId={selectedPersonId}
            />
          </div>

          <aside className="space-y-5">
            <SeatingControls
              allocation={allocation}
              canExpand={Boolean(expandedSize)}
              canRun={canRun}
              capacityReport={capacityReport}
              display={display}
              hasAssignment={Boolean(assignment)}
              method={method}
              occupancy={occupancy}
              onAllocationChange={setAllocation}
              onClear={handleClear}
              onDisplayChange={setDisplay}
              onExpand={handleExpand}
              onGenerateSeed={() => setSeed(createSeed())}
              onMethodChange={setMethod}
              onOccupancyChange={setOccupancy}
              onPartialRun={() => handleRun(true)}
              onRun={() => handleRun()}
              onSeedChange={setSeed}
              readOnly={readOnly}
              seed={seed}
            />

            <SeatDetails
              activeSeatIds={activeSeatIds}
              assignments={assignments}
              lockedPersonIds={lockedPersonIds}
              onClearSelection={clearSelection}
              onToggleLock={handleToggleLock}
              onUnassign={handleUnassign}
              personsById={personsById}
              readOnly={readOnly}
              refsById={refsById}
              selectedPerson={selectedPerson}
              selectedSeatId={selectedSeatId}
            />
          </aside>
        </div>

        <DragOverlay
          dropAnimation={null}
          modifiers={[cursorOffsetModifier]}
          style={{
            width: dragPreview?.kind === 'seat' ? 108 : 188,
            height: 'auto',
          }}
        >
          {dragPreview ? (
            dragPreview.kind === 'seat' ? (
              <div className="pointer-events-none flex w-full flex-col items-center justify-center border-2 border-accent bg-accent-soft px-1 py-1 text-center text-ink shadow-[0_16px_32px_rgba(23,59,50,0.22)]">
                <span className="font-mono text-[8px] text-muted">
                  {dragPreview.code}
                </span>
                <span className="line-clamp-2 max-w-full break-words text-[9px] font-medium leading-tight">
                  {dragPreview.label}
                </span>
              </div>
            ) : (
              <div className="pointer-events-none flex w-full items-center justify-between gap-2 border-2 border-mark bg-surface px-3 py-2 text-xs font-medium text-ink shadow-[0_16px_32px_rgba(23,59,50,0.22)]">
                <span className="truncate">{dragPreview.label}</span>
                <span className="shrink-0 font-mono text-[8px] tracking-[0.12em] text-mark">
                  放開安排
                </span>
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
