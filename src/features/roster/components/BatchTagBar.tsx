import { useState } from 'react'
import type { TagDef } from '../../../types/domain'
import type { TagValue } from '../rosterOps'
import { TagValueField } from './TagValueField'

interface BatchTagBarProps {
  tags: TagDef[]
  selectedCount: number
  disabled: boolean
  onApply: (tagId: string, value: TagValue) => void
  onClearTag: (tagId: string) => void
  onClearSelection: () => void
}

export function BatchTagBar({
  tags,
  selectedCount,
  disabled,
  onApply,
  onClearTag,
  onClearSelection,
}: BatchTagBarProps) {
  const [tagId, setTagId] = useState(tags[0]?.id ?? '')
  const [value, setValue] = useState<TagValue | null>(null)
  const activeTag = tags.find((tag) => tag.id === tagId) ?? tags[0]

  if (tagId && !tags.some((tag) => tag.id === tagId)) {
    setTagId(tags[0]?.id ?? '')
    setValue(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/60 px-4 py-2.5">
      <span className="font-mono text-[9px] tracking-[0.1em] text-accent">
        已選 {selectedCount} 位
      </span>

      {activeTag ? (
        <>
          <select
            aria-label="批次標籤"
            className="border border-line bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-accent disabled:opacity-50"
            disabled={disabled}
            onChange={(event) => {
              setTagId(event.target.value)
              setValue(null)
            }}
            value={activeTag.id}
          >
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <div className="w-36">
            <TagValueField
              disabled={disabled}
              onChange={setValue}
              tag={activeTag}
              value={value ?? undefined}
            />
          </div>
          <button
            className="border border-board bg-board px-2.5 py-1 text-[10px] text-chalk hover:bg-ink disabled:opacity-40"
            disabled={disabled || value === null}
            onClick={() => {
              if (value !== null) {
                onApply(activeTag.id, value)
                setValue(null)
              }
            }}
            type="button"
          >
            套用
          </button>
          <button
            className="border border-line bg-surface px-2.5 py-1 text-[10px] text-muted hover:text-ink disabled:opacity-40"
            disabled={disabled}
            onClick={() => onClearTag(activeTag.id)}
            type="button"
          >
            清除此標籤
          </button>
        </>
      ) : (
        <span className="text-[10px] text-muted">
          先建立標籤才能批次套用。
        </span>
      )}

      <button
        className="ml-auto font-mono text-[9px] text-muted underline-offset-2 hover:text-ink hover:underline"
        onClick={onClearSelection}
        type="button"
      >
        取消選取
      </button>
    </div>
  )
}
