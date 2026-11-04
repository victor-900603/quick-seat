import type { Person, TagDef } from '../../../types/domain'
import { TagChip } from './TagChip'

interface RosterTableProps {
  persons: Person[]
  tags: TagDef[]
  selectedId: string | null
  checkedIds: Set<string>
  readOnly: boolean
  emptyTitle: string
  emptyDescription: string
  onSelect: (personId: string) => void
  onToggleCheck: (personId: string) => void
  onToggleAll: () => void
}

function tagsForPerson(person: Person, tags: TagDef[]) {
  return tags.flatMap((tag) =>
    Object.prototype.hasOwnProperty.call(person.tags, tag.id)
      ? [{ tag, value: person.tags[tag.id] }]
      : [],
  )
}

export function RosterTable({
  persons,
  tags,
  selectedId,
  checkedIds,
  readOnly,
  emptyTitle,
  emptyDescription,
  onSelect,
  onToggleCheck,
  onToggleAll,
}: RosterTableProps) {
  const allChecked =
    persons.length > 0 && persons.every((person) => checkedIds.has(person.id))

  if (persons.length === 0) {
    return (
      <div className="border-y border-line bg-paper px-5 py-12 text-center">
        <p className="font-display text-base text-ink">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-paper font-mono text-[9px] tracking-[0.12em] text-muted">
            {readOnly ? null : (
              <th className="w-10 px-3 py-2">
                <input
                  aria-label="選取全部人員"
                  checked={allChecked}
                  className="accent-accent"
                  onChange={onToggleAll}
                  type="checkbox"
                />
              </th>
            )}
            <th className="px-3 py-2 font-normal">姓名 / 座號</th>
            <th className="px-3 py-2 font-normal">標籤</th>
            <th className="px-3 py-2 font-normal">備註</th>
          </tr>
        </thead>
        <tbody>
          {persons.map((person) => {
            const personTags = tagsForPerson(person, tags)
            const selected = person.id === selectedId

            return (
              <tr
                className={`cursor-pointer border-b border-line/70 transition-colors last:border-b-0 ${
                  selected ? 'bg-accent-soft/55' : 'hover:bg-paper/70'
                }`}
                key={person.id}
                onClick={(event) => {
                  if (!(event.target instanceof Element)) {
                    return
                  }

                  if (
                    event.target.closest('input, button, a, select, label')
                  ) {
                    return
                  }

                  onSelect(person.id)
                }}
              >
                {readOnly ? null : (
                  <td className="px-3 py-2.5 align-middle">
                    <input
                      aria-label={`選取 ${person.name}`}
                      checked={checkedIds.has(person.id)}
                      className="accent-accent"
                      onChange={() => onToggleCheck(person.id)}
                      type="checkbox"
                    />
                  </td>
                )}
                <td className="px-3 py-2.5 align-middle">
                  <button
                    aria-label={`開啟 ${person.name} 的人員資料`}
                    className="block max-w-full text-left"
                    onClick={() => onSelect(person.id)}
                    type="button"
                  >
                    <span className="block truncate text-sm font-medium text-ink">
                      {person.name}
                    </span>
                    <span className="block font-mono text-[9px] text-muted">
                      {person.studentNo || '未填座號'}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  {personTags.length === 0 ? (
                    <span className="text-[10px] text-muted">未設定</span>
                  ) : (
                    <div className="flex max-w-[230px] flex-wrap gap-1">
                      {personTags.slice(0, 2).map(({ tag, value }) => (
                        <TagChip key={tag.id} tag={tag} value={value} />
                      ))}
                      {personTags.length > 2 ? (
                        <span className="self-center font-mono text-[9px] text-muted">
                          +{personTags.length - 2}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="max-w-[160px] px-3 py-2.5 align-middle">
                  <span className="line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {person.note || '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
