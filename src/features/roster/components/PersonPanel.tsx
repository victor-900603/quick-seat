import { useState } from 'react'
import type { Person, TagDef } from '../../../types/domain'
import type { PersonInput, PersonPatch, TagValue } from '../rosterOps'
import { TagValueField } from './TagValueField'

interface PersonPanelProps {
  person: Person | null
  creating: boolean
  tags: TagDef[]
  extraColumns: string[]
  disabled: boolean
  onCreate: (input: PersonInput) => boolean
  onUpdate: (personId: string, patch: PersonPatch) => boolean
  onDelete: (personId: string) => void
  onDirtyChange: (dirty: boolean) => void
}

const inputClass =
  'w-full border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-50'

export function PersonPanel({
  person,
  creating,
  tags,
  extraColumns,
  disabled,
  onCreate,
  onUpdate,
  onDelete,
  onDirtyChange,
}: PersonPanelProps) {
  const [name, setName] = useState(person?.name ?? '')
  const [studentNo, setStudentNo] = useState(person?.studentNo ?? '')
  const [note, setNote] = useState(person?.note ?? '')
  const [draftTags, setDraftTags] = useState<Person['tags']>(
    () => ({ ...(person?.tags ?? {}) }),
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const markDirty = () => {
    setDirty(true)
    setSaved(false)
    onDirtyChange(true)
  }

  if (!creating && !person) {
    return (
      <aside className="border border-line bg-surface">
        <div className="border-b border-line bg-paper px-4 py-3">
          <p className="font-mono text-[8px] tracking-[0.24em] text-muted">
            PERSON
          </p>
          <p className="font-display text-base text-ink">人員資料</p>
        </div>
        <p className="px-4 py-6 text-xs leading-relaxed text-muted">
          從左側名單選取一位學生，或新增人員後在這裡填寫姓名、座號、備註與標籤。
        </p>
      </aside>
    )
  }

  const handleSave = () => {
    const nextName = name.trim()

    if (!nextName) {
      setError('請輸入姓名。')
      setSaved(false)
      return
    }

    const validTagIds = new Set(tags.map((tag) => tag.id))
    const nextTags = Object.fromEntries(
      Object.entries(draftTags).filter(([tagId]) => validTagIds.has(tagId)),
    )
    const input: PersonInput = {
      name: nextName,
      studentNo,
      note,
      tags: nextTags,
    }

    const ok = creating
      ? onCreate(input)
      : person
        ? onUpdate(person.id, input as PersonPatch)
        : false

    setError(ok ? null : '無法儲存人員資料，請確認姓名是否空白。')
    setSaved(ok)

    if (ok) {
      setDirty(false)
      onDirtyChange(false)
    }
  }

  const setTagValue = (tagId: string, value: TagValue | null) => {
    setDraftTags((current) => {
      const next = { ...current }

      if (value === null) {
        delete next[tagId]
      } else {
        next[tagId] = value
      }

      return next
    })
    markDirty()
  }

  return (
    <aside className="border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-paper px-4 py-3">
        <div>
          <p className="font-mono text-[8px] tracking-[0.24em] text-muted">
            {creating ? 'NEW PERSON' : 'PERSON'}
          </p>
          <p className="font-display text-base text-ink">
            {creating ? '新增人員' : '人員資料'}
          </p>
        </div>
        {dirty ? (
          <span className="mt-1 font-mono text-[8px] tracking-[0.12em] text-mark">
            未儲存
          </span>
        ) : saved ? (
          <span className="mt-1 font-mono text-[8px] tracking-[0.12em] text-accent">
            已儲存
          </span>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <label
            className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
            htmlFor="person-name"
          >
            姓名
          </label>
          <input
            className={inputClass}
            disabled={disabled}
            id="person-name"
            onChange={(event) => {
              setName(event.target.value)
              markDirty()
            }}
            placeholder="學生姓名"
            value={name}
          />
        </div>

        <div>
          <label
            className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
            htmlFor="person-number"
          >
            座號
          </label>
          <input
            className={inputClass}
            disabled={disabled}
            id="person-number"
            onChange={(event) => {
              setStudentNo(event.target.value)
              markDirty()
            }}
            placeholder="可留空"
            value={studentNo}
          />
        </div>

        <div>
          <label
            className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
            htmlFor="person-note"
          >
            備註
          </label>
          <textarea
            className={`${inputClass} min-h-16 resize-y`}
            disabled={disabled}
            id="person-note"
            onChange={(event) => {
              setNote(event.target.value)
              markDirty()
            }}
            placeholder="視力、特殊需求等自由備註"
            value={note}
          />
        </div>
      </div>

      <div className="border-t border-line px-4 py-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm text-ink">標籤</h3>
          <span className="font-mono text-[8px] tracking-[0.12em] text-muted">
            {tags.length} 種
          </span>
        </div>

        {tags.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-muted">
            尚未建立標籤。可在下方標籤管理新增組別、需求或幹部等分類。
          </p>
        ) : (
          <div className="space-y-2.5">
            {tags.map((tag) => (
              <div key={tag.id}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-[11px] text-ink">{tag.name}</span>
                </div>
                <TagValueField
                  disabled={disabled}
                  onChange={(value) => setTagValue(tag.id, value)}
                  tag={tag}
                  value={draftTags[tag.id]}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {!creating && person && extraColumns.length > 0 ? (
        <div className="border-t border-line px-4 py-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="font-display text-sm text-ink">其他欄位</h3>
            <span className="font-mono text-[8px] tracking-[0.12em] text-muted">
              {extraColumns.length} 欄
            </span>
          </div>
          <dl className="space-y-1.5">
            {extraColumns.map((column) => (
              <div className="flex gap-2" key={column}>
                <dt className="w-20 shrink-0 truncate text-[10px] text-muted">
                  {column}
                </dt>
                <dd className="min-w-0 flex-1 break-words text-[11px] text-ink">
                  {person.extra[column] || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {error ? (
        <p
          className="border-t border-mark/30 bg-mark/5 px-4 py-2 text-[11px] text-mark"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-line bg-paper px-4 py-3">
        <button
          className="flex-1 border border-board bg-board px-3 py-1.5 text-xs text-chalk transition-colors hover:bg-ink disabled:opacity-40"
          disabled={disabled}
          onClick={handleSave}
          type="button"
        >
          {creating ? '新增至名單' : '儲存變更'}
        </button>
        {!creating && person ? (
          <button
            className="border border-mark/35 bg-surface px-3 py-1.5 text-xs text-mark transition-colors hover:border-mark disabled:opacity-40"
            disabled={disabled}
            onClick={() => {
              if (
                window.confirm(`確定刪除「${person.name}」嗎？此操作可以復原。`)
              ) {
                onDelete(person.id)
              }
            }}
            type="button"
          >
            刪除
          </button>
        ) : null}
      </div>
    </aside>
  )
}
