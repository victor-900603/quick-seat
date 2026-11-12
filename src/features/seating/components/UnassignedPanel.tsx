import { useDraggable } from '@dnd-kit/core'
import type { Person, ProjectSettings } from '../../../types/domain'
import { formatPersonLabel } from '../seatingDisplay'

interface UnassignedPanelProps {
  persons: Person[]
  display: ProjectSettings['display']
  lockedPersonIds: Set<string>
  selectedPersonId: string | null
  readOnly: boolean
  dragEnabled: boolean
  onSelect: (personId: string) => void
}

interface UnassignedPersonProps {
  person: Person
  display: ProjectSettings['display']
  locked: boolean
  selected: boolean
  readOnly: boolean
  dragEnabled: boolean
  onSelect: (personId: string) => void
}

function UnassignedPerson({
  person,
  display,
  locked,
  selected,
  readOnly,
  dragEnabled,
  onSelect,
}: UnassignedPersonProps) {
  const label = formatPersonLabel(person, display)
  const draggable = useDraggable({
    id: `drag-person-${person.id}`,
    data: {
      type: 'person',
      personId: person.id,
      label: label || person.name,
    },
    disabled: readOnly || !dragEnabled,
  })

  const setNodeRef = (node: HTMLButtonElement | null) => {
    draggable.setNodeRef(node)
  }

  return (
    <button
      aria-label={`選取未分配人員 ${person.name}`}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between gap-2 border px-2.5 py-2 text-left text-xs transition-colors ${
        selected
          ? 'border-mark bg-mark/10 text-ink'
          : 'border-line bg-surface text-ink hover:border-accent/50'
      } ${
        readOnly || !dragEnabled
          ? 'cursor-default'
          : 'cursor-grab select-none active:cursor-grabbing'
      }`}
      onClick={() => onSelect(person.id)}
      ref={setNodeRef}
      type="button"
      {...(readOnly || !dragEnabled ? {} : draggable.listeners)}
    >
      <span className="min-w-0">
        <span className="block truncate">{person.name}</span>
        {display !== 'studentNo' && display !== 'none' ? (
          <span className="mt-0.5 block font-mono text-[9px] text-muted">
            {person.studentNo || '未填座號'}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {locked ? (
          <span className="font-mono text-[8px] tracking-[0.12em] text-mark">
            鎖定
          </span>
        ) : null}
        {readOnly ? null : (
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted/45"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <circle cx="6" cy="4" r="1" />
            <circle cx="10" cy="4" r="1" />
            <circle cx="6" cy="8" r="1" />
            <circle cx="10" cy="8" r="1" />
            <circle cx="6" cy="12" r="1" />
            <circle cx="10" cy="12" r="1" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function UnassignedPanel({
  persons,
  display,
  lockedPersonIds,
  selectedPersonId,
  readOnly,
  dragEnabled,
  onSelect,
}: UnassignedPanelProps) {
  return (
    <section className="border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
            UNASSIGNED
          </p>
          <h3 className="mt-0.5 text-sm font-medium text-ink">未分配人員</h3>
        </div>
        <span className="font-mono text-[10px] text-muted">
          {persons.length} 位
        </span>
      </header>

      {persons.length === 0 ? (
        <p className="px-4 py-5 text-xs leading-6 text-muted">
          目前沒有未分配人員。
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
          {persons.map((person) => (
            <UnassignedPerson
              display={display}
              dragEnabled={dragEnabled}
              key={person.id}
              locked={lockedPersonIds.has(person.id)}
              onSelect={onSelect}
              person={person}
              readOnly={readOnly}
              selected={selectedPersonId === person.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}
