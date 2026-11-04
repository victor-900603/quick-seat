import { useState } from 'react'
import type { TagDef, TagValueType } from '../../../types/domain'
import {
  DEFAULT_TAG_COLOR,
  TAG_COLORS,
  TAG_TYPE_LABELS,
  normalizeTagOptions,
  type TagInput,
  type TagPatch,
} from '../rosterOps'

interface TagPanelProps {
  tags: TagDef[]
  personCounts: Map<string, number>
  disabled: boolean
  onAdd: (input: TagInput) => string | null
  onUpdate: (tagId: string, patch: TagPatch) => boolean
  onDelete: (tagId: string) => void
}

type EditorState =
  | { kind: 'new' }
  | { kind: 'edit'; tagId: string }
  | null

const inputClass =
  'w-full border border-line bg-paper px-2.5 py-1.5 text-xs text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-50'

export function TagPanel({
  tags,
  personCounts,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
}: TagPanelProps) {
  const [editor, setEditor] = useState<EditorState>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TagValueType>('enum')
  const [options, setOptions] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_TAG_COLOR)
  const [error, setError] = useState<string | null>(null)

  const openNew = () => {
    setEditor({ kind: 'new' })
    setName('')
    setType('enum')
    setOptions('')
    setColor(DEFAULT_TAG_COLOR)
    setError(null)
  }

  const openEdit = (tag: TagDef) => {
    setEditor({ kind: 'edit', tagId: tag.id })
    setName(tag.name)
    setType(tag.type)
    setOptions(tag.options.join('、'))
    setColor(tag.color)
    setError(null)
  }

  const save = () => {
    const nextName = name.trim()

    if (!nextName) {
      setError('請輸入標籤名稱。')
      return
    }

    const nextOptions = normalizeTagOptions(
      options.split(/[,，、\n]/).map((option) => option.trim()),
    )
    const input: TagInput = {
      name: nextName,
      type,
      options: nextOptions,
      color,
    }

    const ok =
      editor?.kind === 'edit'
        ? onUpdate(editor.tagId, input)
        : onAdd(input) !== null

    if (!ok) {
      setError('標籤名稱重複或無效，請換一個名稱。')
      return
    }

    setEditor(null)
    setError(null)
  }

  return (
    <aside className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3">
        <div>
          <p className="font-mono text-[8px] tracking-[0.24em] text-muted">
            TAGS
          </p>
          <p className="font-display text-base text-ink">標籤管理</p>
        </div>
        <button
          className="border border-line bg-surface px-2.5 py-1 font-mono text-[9px] text-muted transition-colors hover:border-accent/50 hover:text-ink disabled:opacity-40"
          disabled={disabled || editor !== null}
          onClick={openNew}
          type="button"
        >
          新增標籤
        </button>
      </div>

      {editor ? (
        <div className="space-y-3 border-b border-line px-4 py-4">
          <div>
            <label
              className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
              htmlFor="tag-name"
            >
              名稱
            </label>
            <input
              className={inputClass}
              disabled={disabled}
              id="tag-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：組別、需求"
              value={name}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
              htmlFor="tag-type"
            >
              型別
            </label>
            <select
              className={inputClass}
              disabled={disabled}
              id="tag-type"
              onChange={(event) =>
                setType(event.target.value as TagValueType)
              }
              value={type}
            >
              {(
                Object.keys(TAG_TYPE_LABELS) as TagValueType[]
              ).map((item) => (
                <option key={item} value={item}>
                  {TAG_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          {type === 'enum' ? (
            <div>
              <label
                className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted"
                htmlFor="tag-options"
              >
                選項
              </label>
              <textarea
                className={`${inputClass} min-h-16 resize-y`}
                disabled={disabled}
                id="tag-options"
                onChange={(event) => setOptions(event.target.value)}
                placeholder="以逗號或換行分隔，例如：A、B、C"
                value={options}
              />
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 font-mono text-[9px] tracking-[0.12em] text-muted">
              色票
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((item) => (
                <button
                  aria-label={`顏色 ${item}`}
                  aria-pressed={color === item}
                  className={`h-6 w-6 border-2 transition-transform ${
                    color === item
                      ? 'scale-110 border-ink'
                      : 'border-transparent'
                  }`}
                  key={item}
                  onClick={() => setColor(item)}
                  style={{ backgroundColor: item }}
                  type="button"
                />
              ))}
            </div>
          </div>

          {editor.kind === 'edit' ? (
            <p className="text-[10px] leading-relaxed text-muted">
              變更型別或縮減選項時，不符合新設定的既有值會一併清除。
            </p>
          ) : null}

          {error ? (
            <p className="text-[11px] text-mark" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              className="flex-1 border border-board bg-board px-3 py-1.5 text-[11px] text-chalk hover:bg-ink disabled:opacity-40"
              disabled={disabled}
              onClick={save}
              type="button"
            >
              儲存標籤
            </button>
            <button
              className="border border-line bg-paper px-3 py-1.5 text-[11px] text-muted hover:text-ink"
              onClick={() => {
                setEditor(null)
                setError(null)
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {tags.length === 0 ? (
        <p className="px-4 py-5 text-[11px] leading-relaxed text-muted">
          尚無標籤。建立標籤後，即可在人員資料與批次工具中套用。
        </p>
      ) : (
        <div className="divide-y divide-line">
          {tags.map((tag) => {
            const count = personCounts.get(tag.id) ?? 0

            return (
              <div className="px-4 py-3" key={tag.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate text-xs font-medium text-ink">
                      {tag.name}
                    </span>
                    <span className="shrink-0 font-mono text-[8px] text-muted">
                      {TAG_TYPE_LABELS[tag.type]}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] text-muted">
                    {count} 人
                  </span>
                </div>
                {tag.type === 'enum' && tag.options.length > 0 ? (
                  <p className="mt-1 truncate text-[10px] text-muted">
                    {tag.options.slice(0, 5).join('、')}
                    {tag.options.length > 5 ? '…' : ''}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button
                    aria-label={`編輯標籤 ${tag.name}`}
                    className="font-mono text-[9px] text-muted hover:text-ink disabled:opacity-40"
                    disabled={disabled || editor !== null}
                    onClick={() => openEdit(tag)}
                    type="button"
                  >
                    編輯
                  </button>
                  <button
                    aria-label={`刪除標籤 ${tag.name}`}
                    className="font-mono text-[9px] text-mark/80 hover:text-mark disabled:opacity-40"
                    disabled={disabled || editor !== null}
                    onClick={() => {
                      if (
                        window.confirm(
                          `確定刪除標籤「${tag.name}」嗎？相關規則與人員值會一併移除。`,
                        )
                      ) {
                        onDelete(tag.id)
                      }
                    }}
                    type="button"
                  >
                    刪除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
