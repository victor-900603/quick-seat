import { useEffect, useState } from 'react'
import type {
  Adjacency,
  Person,
  PositionKind,
  Project,
  Rule,
  SeatRef,
  TagDef,
} from '../../../types/domain'
import {
  ADJACENCY_LABELS,
  POSITION_LABELS,
  RULE_TYPE_LABELS,
  createRule,
  normalizeRule,
  validateRule,
  type RuleType,
} from '../ruleOps'

interface RuleDialogProps {
  initialRule: Rule | null
  isNew: boolean
  project: Project
  seatRefs: SeatRef[]
  onClose: () => void
  onSave: (rule: Rule) => boolean
}

const fieldClass =
  'mt-1.5 w-full border border-line bg-paper px-2.5 py-2 text-xs text-ink outline-none transition-colors focus:border-accent'
const labelClass = 'block text-[11px] font-medium text-ink'

function optionsFor(tag: TagDef | undefined): string[] {
  if (!tag) {
    return []
  }

  if (tag.type === 'boolean') {
    return ['是', '否']
  }

  return tag.options
}

function TagSelect({
  id,
  label,
  tags,
  value,
  onChange,
}: {
  id: string
  label: string
  tags: TagDef[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <select
        className={fieldClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">請選擇標籤</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function SingleValueField({
  id,
  label,
  tag,
  value,
  onChange,
}: {
  id: string
  label: string
  tag: TagDef | undefined
  value: string
  onChange: (value: string) => void
}) {
  const options = optionsFor(tag)

  if (tag?.type === 'number' || options.length === 0) {
    return (
      <div>
        <label className={labelClass} htmlFor={id}>
          {label}
        </label>
        <input
          className={fieldClass}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={tag?.type === 'number' ? '輸入數值' : '輸入標籤值'}
          type="text"
          value={value}
        />
      </div>
    )
  }

  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <select
        className={fieldClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">請選擇值</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function MultiValueField({
  tag,
  values,
  onChange,
}: {
  tag: TagDef | undefined
  values: string[]
  onChange: (values: string[]) => void
}) {
  const options = optionsFor(tag)
  const [draft, setDraft] = useState(values.join('、'))
  const [lastValues, setLastValues] = useState(values)

  if (values !== lastValues) {
    setLastValues(values)
    setDraft(values.join('、'))
  }

  if (tag?.type === 'number' || options.length === 0) {
    return (
      <div>
        <label className={labelClass} htmlFor="rule-values">
          套用值
        </label>
        <input
          className={fieldClass}
          id="rule-values"
          onBlur={() =>
            onChange(
              draft
                .split(/[,，、\n]/)
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
          onChange={(event) => setDraft(event.target.value)}
          placeholder="以逗號分隔多個值"
          type="text"
          value={draft}
        />
        <p className="mt-1 text-[10px] leading-4 text-muted">
          留空代表這個標籤的所有值。
        </p>
      </div>
    )
  }

  return (
    <fieldset>
      <legend className={labelClass}>套用值</legend>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((option) => (
          <label
            className="flex items-center gap-1.5 text-[11px] text-muted"
            key={option}
          >
            <input
              checked={values.includes(option)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...values, option]
                  : values.filter((value) => value !== option)
                onChange(next)
              }}
              type="checkbox"
            />
            {option}
          </label>
        ))}
      </div>
      <p className="mt-1 text-[10px] leading-4 text-muted">
        不選任何值代表這個標籤的所有值。
      </p>
    </fieldset>
  )
}

export function RuleDialog({
  initialRule,
  isNew,
  project,
  seatRefs,
  onClose,
  onSave,
}: RuleDialogProps) {
  const firstTagId = project.roster.tags[0]?.id ?? ''
  const firstPersonId = project.roster.persons[0]?.id ?? ''
  const firstSeatId = seatRefs[0]?.id ?? ''
  const [draft, setDraft] = useState<Rule>(
    initialRule ??
      createRule('separate', {
        tagId: firstTagId,
        personId: firstPersonId,
        seatId: firstSeatId,
      }),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const updateBase = (
    patch: Partial<Pick<Rule, 'enabled' | 'strength' | 'weight' | 'note'>>,
  ) => {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }

  const changeType = (type: RuleType) => {
    setDraft({
      ...createRule(type, {
        tagId: firstTagId,
        personId: firstPersonId,
        seatId: firstSeatId,
      }),
      id: draft.id,
    })
    setError(null)
  }

  const tagsById = new Map(
    project.roster.tags.map((tag) => [tag.id, tag]),
  )
  const tagA =
    draft.type === 'avoid'
      ? tagsById.get(draft.tagIdA)
      : draft.type === 'pin'
        ? undefined
        : tagsById.get(draft.tagId)
  const tagB =
    draft.type === 'avoid' ? tagsById.get(draft.tagIdB) : undefined
  const persons: Person[] = project.roster.persons

  const handleSubmit = () => {
    const normalized = normalizeRule(draft)
    const validation = validateRule(normalized, project, normalized.id)

    if (!validation.valid) {
      setError(validation.message)
      return
    }

    if (!onSave(normalized)) {
      setError('規則儲存失敗，請確認設定後再試一次。')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        aria-labelledby="rule-dialog-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-line bg-surface p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <p className="font-mono text-[9px] tracking-[0.22em] text-muted">
          RULE CARD
        </p>
        <h2
          className="mt-1 font-display text-xl text-ink"
          id="rule-dialog-title"
        >
          {isNew ? '新增規則' : '編輯規則'}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted">
          儲存後會立即重新判定既有座位圖；自動最佳化會在後續階段套用這些規則。
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="rule-type">
                規則類型
              </label>
              <select
                className={fieldClass}
                id="rule-type"
                onChange={(event) => changeType(event.target.value as RuleType)}
                value={draft.type}
              >
                {Object.entries(RULE_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-strength">
                約束強度
              </label>
              <select
                className={fieldClass}
                disabled={draft.type === 'pin'}
                id="rule-strength"
                onChange={(event) =>
                  updateBase({
                    strength: event.target.value as Rule['strength'],
                  })
                }
                value={draft.type === 'pin' ? 'hard' : draft.strength}
              >
                <option value="hard">硬約束</option>
                <option value="soft">軟約束</option>
              </select>
            </div>
          </div>

          {draft.type === 'separate' || draft.type === 'together' ? (
            <>
              <TagSelect
                id="rule-tag"
                label="標籤"
                onChange={(tagId) =>
                  setDraft({ ...draft, tagId, values: [] })
                }
                tags={project.roster.tags}
                value={draft.tagId}
              />
              <MultiValueField
                onChange={(values) => setDraft({ ...draft, values })}
                tag={tagA}
                values={draft.values}
              />
              <div>
                <label className={labelClass} htmlFor="rule-adjacency">
                  相鄰方式
                </label>
                <select
                  className={fieldClass}
                  id="rule-adjacency"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      adjacency: event.target.value as Adjacency,
                    })
                  }
                  value={draft.adjacency}
                >
                  {Object.entries(ADJACENCY_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {draft.type === 'together' ? (
                <div>
                  <label className={labelClass} htmlFor="rule-together-mode">
                    同組方式
                  </label>
                  <select
                    className={fieldClass}
                    id="rule-together-mode"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        mode:
                          event.target.value === 'cluster'
                            ? 'cluster'
                            : 'neighbor',
                      })
                    }
                    value={draft.mode ?? 'neighbor'}
                  >
                    <option value="neighbor">至少一位同值鄰居</option>
                    <option value="cluster">形成單一群聚</option>
                  </select>
                </div>
              ) : null}
            </>
          ) : draft.type === 'position' ? (
            <>
              <TagSelect
                id="rule-tag"
                label="標籤"
                onChange={(tagId) =>
                  setDraft({ ...draft, tagId, value: '' })
                }
                tags={project.roster.tags}
                value={draft.tagId}
              />
              <SingleValueField
                id="rule-value"
                label="套用值"
                onChange={(value) => setDraft({ ...draft, value })}
                tag={tagA}
                value={draft.value}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="rule-position">
                    位置
                  </label>
                  <select
                    className={fieldClass}
                    id="rule-position"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        position: event.target.value as PositionKind,
                      })
                    }
                    value={draft.position}
                  >
                    {Object.entries(POSITION_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="rule-band">
                    範圍
                  </label>
                  <input
                    className={fieldClass}
                    disabled={draft.position === 'aisle'}
                    id="rule-band"
                    max={60}
                    min={1}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        band: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={draft.band}
                  />
                </div>
              </div>
            </>
          ) : draft.type === 'avoid' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TagSelect
                  id="rule-tag-a"
                  label="第一個標籤"
                  onChange={(tagIdA) =>
                    setDraft({ ...draft, tagIdA, valueA: '' })
                  }
                  tags={project.roster.tags}
                  value={draft.tagIdA}
                />
                <SingleValueField
                  id="rule-value-a"
                  label="第一個值"
                  onChange={(valueA) => setDraft({ ...draft, valueA })}
                  tag={tagA}
                  value={draft.valueA}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TagSelect
                  id="rule-tag-b"
                  label="第二個標籤"
                  onChange={(tagIdB) =>
                    setDraft({ ...draft, tagIdB, valueB: '' })
                  }
                  tags={project.roster.tags}
                  value={draft.tagIdB}
                />
                <SingleValueField
                  id="rule-value-b"
                  label="第二個值"
                  onChange={(valueB) => setDraft({ ...draft, valueB })}
                  tag={tagB}
                  value={draft.valueB}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rule-adjacency">
                  相鄰方式
                </label>
                <select
                  className={fieldClass}
                  id="rule-adjacency"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      adjacency: event.target.value as Adjacency,
                    })
                  }
                  value={draft.adjacency}
                >
                  {Object.entries(ADJACENCY_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="rule-person">
                  人員
                </label>
                <select
                  className={fieldClass}
                  id="rule-person"
                  onChange={(event) =>
                    setDraft({ ...draft, personId: event.target.value })
                  }
                  value={draft.personId}
                >
                  <option value="">請選擇人員</option>
                  {persons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                      {person.studentNo ? `（${person.studentNo}）` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rule-seat">
                  固定座位
                </label>
                <select
                  className={fieldClass}
                  id="rule-seat"
                  onChange={(event) =>
                    setDraft({ ...draft, seatId: event.target.value })
                  }
                  value={draft.seatId}
                >
                  <option value="">請選擇座位</option>
                  {seatRefs.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div>
              <label className={labelClass} htmlFor="rule-weight">
                軟約束權重
              </label>
              <input
                className={fieldClass}
                disabled={draft.type === 'pin' || draft.strength === 'hard'}
                id="rule-weight"
                max={10}
                min={1}
                onChange={(event) =>
                  setDraft({ ...draft, weight: Number(event.target.value) })
                }
                type="number"
                value={draft.type === 'pin' ? 1 : draft.weight}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-note">
                備註
              </label>
              <input
                className={fieldClass}
                id="rule-note"
                maxLength={120}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
                placeholder="選填"
                type="text"
                value={draft.note}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted">
            <input
              checked={draft.enabled}
              onChange={(event) =>
                setDraft({ ...draft, enabled: event.target.checked })
              }
              type="checkbox"
            />
            啟用這條規則
          </label>

          {error ? (
            <p
              className="border border-mark/40 bg-mark/5 px-3 py-2 text-xs leading-5 text-mark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              className="border border-line bg-surface px-4 py-2 text-xs text-muted transition-colors hover:border-ink/30 hover:text-ink"
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="border border-board bg-board px-4 py-2 text-xs text-chalk transition-colors hover:bg-accent"
              type="submit"
            >
              儲存規則
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
