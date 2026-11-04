import type { Person, SeatRef } from '../../../types/domain'

interface SeatDetailsProps {
  selectedSeatId: string | null
  selectedPerson: Person | null
  refsById: Map<string, SeatRef>
  assignments: Record<string, string>
  personsById: Map<string, Person>
  lockedPersonIds: Set<string>
  activeSeatIds: Set<string>
  readOnly: boolean
  onToggleLock: (personId: string) => void
  onUnassign: (personId: string) => void
  onClearSelection: () => void
}

const actionClass =
  'border border-line bg-surface px-2.5 py-2 text-xs text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-55'

export function SeatDetails({
  selectedSeatId,
  selectedPerson,
  refsById,
  assignments,
  personsById,
  lockedPersonIds,
  activeSeatIds,
  readOnly,
  onToggleLock,
  onUnassign,
  onClearSelection,
}: SeatDetailsProps) {
  if (selectedPerson) {
    return (
      <section className="border border-line bg-surface">
        <header className="border-b border-line px-4 py-3">
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
            SELECTED PERSON
          </p>
          <h3 className="mt-0.5 text-sm font-medium text-ink">未分配人員</h3>
        </header>
        <div className="p-4">
          <p className="text-sm font-medium text-ink">{selectedPerson.name}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {selectedPerson.studentNo || '未填座號'}
          </p>
          <p className="mt-3 text-xs leading-5 text-muted">
            點選座位圖上的可用座位，即可安排此人員。
          </p>
          <button
            className={`${actionClass} mt-3 w-full`}
            onClick={onClearSelection}
            type="button"
          >
            取消選取
          </button>
        </div>
      </section>
    )
  }

  if (!selectedSeatId) {
    return (
      <section className="border border-line bg-surface p-4">
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
          SEAT DETAIL
        </p>
        <p className="mt-2 text-xs leading-6 text-muted">
          點選座位查看人員。拖曳座位上的名牌可移動或交換座位。
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted/75">
          再點一次已選取的座位或人員、按 Esc，或點擊座位圖空白處，即可取消選取。
        </p>
      </section>
    )
  }

  const ref = refsById.get(selectedSeatId)
  const personId = assignments[selectedSeatId]
  const person = personId ? personsById.get(personId) ?? null : null
  const active = activeSeatIds.has(selectedSeatId)
  const locked = Boolean(personId && lockedPersonIds.has(personId))

  return (
    <section className="border border-line bg-surface">
      <header className="flex items-start justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
            SEAT DETAIL
          </p>
          <h3 className="mt-0.5 text-sm font-medium text-ink">
            {ref?.code ?? selectedSeatId}
          </h3>
        </div>
        <button
          aria-label="關閉座位詳情"
          className="px-1 text-lg leading-none text-muted hover:text-ink"
          onClick={onClearSelection}
          type="button"
        >
          ×
        </button>
      </header>

      <div className="p-4">
        {ref ? (
          <p className="font-mono text-[10px] text-muted">
            第 {ref.row + 1} 列第 {ref.col + 1} 欄
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted">
          {active ? '本次排座範圍內' : '不在本次排座範圍內'}
        </p>

        {person ? (
          <>
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-sm font-medium text-ink">{person.name}</p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                {person.studentNo || '未填座號'}
              </p>
              {locked ? (
                <p className="mt-2 font-mono text-[9px] tracking-[0.12em] text-mark">
                  已鎖定，重排時保留此座位
                </p>
              ) : null}
            </div>
            <div className="mt-3 grid gap-1.5">
              <button
                className={actionClass}
                disabled={readOnly}
                onClick={() => onToggleLock(person.id)}
                type="button"
              >
                {locked ? '解除鎖定' : '鎖定人員'}
              </button>
              <button
                className={`${actionClass} hover:border-mark/50 hover:text-mark`}
                disabled={readOnly}
                onClick={() => onUnassign(person.id)}
                type="button"
              >
                移回未分配
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
              {active
                ? '這個座位目前是空位。'
                : '這個座位目前未使用，重新排座後可能不會分配人員。'}
            </p>
            {active ? (
              <p className="mt-1 text-[11px] leading-5 text-muted/75">
                點選未分配人員即可安排到這個座位。
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
