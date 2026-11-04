import { useState } from 'react'
import type { TagDef } from '../../../types/domain'
import type { TagValue } from '../rosterOps'

interface TagValueFieldProps {
  tag: TagDef
  value: TagValue | undefined
  disabled?: boolean
  onChange: (value: TagValue | null) => void
}

function NumberField({
  tag,
  value,
  disabled,
  onChange,
}: TagValueFieldProps) {
  const initial = typeof value === 'number' ? String(value) : ''
  const [draft, setDraft] = useState(initial)
  const [lastValue, setLastValue] = useState(value)

  if (lastValue !== value) {
    setLastValue(value)
    setDraft(typeof value === 'number' ? String(value) : '')
  }

  const commitInvalid = () => {
    if (draft.trim() && !Number.isFinite(Number(draft))) {
      setDraft(typeof value === 'number' ? String(value) : '')
    }
  }

  return (
    <input
      aria-label={tag.name}
      className="w-full border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
      disabled={disabled}
      inputMode="decimal"
      onBlur={commitInvalid}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)

        if (!next.trim()) {
          onChange(null)
          return
        }

        const parsed = Number(next)

        if (Number.isFinite(parsed)) {
          onChange(parsed)
        }
      }}
      placeholder="未設定"
      type="number"
      value={draft}
    />
  )
}

export function TagValueField({
  tag,
  value,
  disabled = false,
  onChange,
}: TagValueFieldProps) {
  if (tag.type === 'number') {
    return (
      <NumberField
        disabled={disabled}
        onChange={onChange}
        tag={tag}
        value={value}
      />
    )
  }

  if (tag.type === 'boolean') {
    return (
      <select
        aria-label={tag.name}
        className="w-full border border-line bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value
          onChange(next === '' ? null : next === 'true')
        }}
        value={value === true ? 'true' : value === false ? 'false' : ''}
      >
        <option value="">未設定</option>
        <option value="true">是</option>
        <option value="false">否</option>
      </select>
    )
  }

  const current = typeof value === 'string' ? value : ''
  const options =
    current && !tag.options.includes(current)
      ? [...tag.options, current]
      : tag.options

  return (
    <select
      aria-label={tag.name}
      className="w-full border border-line bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value ? event.target.value : null)
      }
      value={current}
    >
      <option value="">未設定</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}
