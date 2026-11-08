import { useState, type ReactNode } from 'react'
import type { CellType, Classroom, SeatRef } from '../../../types/domain'
import type { CellPosition } from '../classroomOps'
import { CELL_TYPE_LABELS } from '../editorTypes'
import { seatId } from '../numbering'

interface PropertiesPanelProps {
  classroom: Classroom
  selected: CellPosition | null
  refs: SeatRef[]
  cellSize: number
  disabled: boolean
  onApplyType: (type: CellType) => void
  onUpdateNumbering: (patch: {
    pattern?: string
    order?: 'row-major' | 'snake' | 'col-major'
    startAt?: number
    pad?: number
  }) => void
  onUpdateCode: (code: string) => void
  onResize: (cols: number, rows: number) => void
  onCellSizeChange: (size: number) => void
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  disabled: boolean
  onCommit: (value: number) => void
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const [lastValue, setLastValue] = useState(value)

  if (lastValue !== value) {
    setLastValue(value)
    setDraft(String(value))
  }

  const commit = () => {
    const parsed = Number(draft)

    if (!Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }

    const next = Math.min(max, Math.max(min, Math.trunc(parsed)))
    setDraft(String(next))

    if (next !== value) {
      onCommit(next)
    }
  }

  return (
    <div>
      <p className="mb-1 font-mono text-[9px] tracking-[0.14em] text-muted">
        {label}
      </p>
      <div className="flex border border-line bg-paper">
        <button
          aria-label={`減少${label}`}
          className="px-2 font-mono text-xs text-muted hover:text-ink disabled:opacity-35"
          disabled={disabled || value <= min}
          onClick={() => onCommit(Math.max(min, value - 1))}
          type="button"
        >
          −
        </button>
        <input
          aria-label={label}
          className="min-w-0 flex-1 border-x border-line bg-surface px-2 py-1.5 text-center font-mono text-xs text-ink outline-none focus:bg-accent-soft disabled:opacity-50"
          disabled={disabled}
          inputMode="numeric"
          onBlur={commit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit()
              event.currentTarget.blur()
            }
          }}
          value={draft}
        />
        <button
          aria-label={`增加${label}`}
          className="px-2 font-mono text-xs text-muted hover:text-ink disabled:opacity-35"
          disabled={disabled || value >= max}
          onClick={() => onCommit(Math.min(max, value + 1))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  hint?: string
  children: ReactNode
}

function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-sm tracking-wide text-ink">{title}</h3>
        {hint ? (
          <span className="font-mono text-[8px] tracking-[0.12em] text-muted">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function PropertiesPanel({
  classroom,
  selected,
  refs,
  cellSize,
  disabled,
  onApplyType,
  onUpdateNumbering,
  onUpdateCode,
  onResize,
  onCellSizeChange,
}: PropertiesPanelProps) {
  const numbering = classroom.numbering
  const [patternDraft, setPatternDraft] = useState(numbering.pattern)
  const [lastPattern, setLastPattern] = useState(numbering.pattern)
  const [codeDraft, setCodeDraft] = useState('')
  const [lastCodeKey, setLastCodeKey] = useState('')

  if (lastPattern !== numbering.pattern) {
    setLastPattern(numbering.pattern)
    setPatternDraft(numbering.pattern)
  }

  const selectedId = selected ? seatId(selected.row, selected.col) : null
  const selectedRef = selectedId
    ? refs.find((ref) => ref.id === selectedId)
    : undefined
  const selectedType = selected
    ? classroom.cells[selected.row * classroom.cols + selected.col]?.type
    : undefined
  const override = selectedId ? classroom.codeOverrides[selectedId] : undefined
  const codeValue = override ?? selectedRef?.code ?? ''
  const codeKey = `${selectedId ?? ''}:${codeValue}`

  if (lastCodeKey !== codeKey) {
    setLastCodeKey(codeKey)
    setCodeDraft(codeValue)
  }

  const commitPattern = () => {
    if (patternDraft !== numbering.pattern) {
      onUpdateNumbering({ pattern: patternDraft })
    }
  }

  return (
    <aside className="border border-line bg-surface">
      <div className="border-b border-line bg-paper px-4 py-3">
        <p className="font-mono text-[8px] tracking-[0.24em] text-muted">
          INSPECTOR
        </p>
        <p className="font-display text-base text-ink">教室屬性</p>
      </div>

      <Section
        hint={selected ? `R${selected.row + 1} C${selected.col + 1}` : '未選取'}
        title="選取的格子"
      >
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between border border-line bg-paper px-3 py-2">
              <span className="font-mono text-[10px] text-muted">
                第 {selected.row + 1} 列 · 第 {selected.col + 1} 欄
              </span>
              <span className="text-xs text-ink">
                {selectedType ? CELL_TYPE_LABELS[selectedType] : '空白'}
              </span>
            </div>

            <div>
              <p className="mb-1.5 font-mono text-[9px] tracking-[0.14em] text-muted">
                格子型別
              </p>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(CELL_TYPE_LABELS) as CellType[]).map((type) => (
                  <button
                    aria-pressed={selectedType === type}
                    className={`border px-1 py-1.5 text-[11px] transition-colors ${
                      selectedType === type
                        ? 'border-board bg-board text-chalk'
                        : 'border-line bg-paper text-muted hover:border-accent/40 hover:text-ink'
                    } disabled:opacity-40`}
                    disabled={disabled}
                    key={type}
                    onClick={() => onApplyType(type)}
                    type="button"
                  >
                    {CELL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-muted"
                htmlFor="seat-code"
              >
                座位編號覆寫
              </label>
              <div className="flex gap-1.5">
                <input
                  className="min-w-0 flex-1 border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                  disabled={disabled || selectedType !== 'seat'}
                  id="seat-code"
                  maxLength={8}
                  onChange={(event) => setCodeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      onUpdateCode(codeDraft)
                    }
                  }}
                  placeholder={
                    selectedType === 'seat' ? '自動編號' : '僅座位可設定'
                  }
                  value={codeDraft}
                />
                <button
                  className="border border-board bg-board px-2.5 py-1.5 text-[11px] text-chalk hover:bg-ink disabled:opacity-40"
                  disabled={disabled || selectedType !== 'seat'}
                  onClick={() => onUpdateCode(codeDraft)}
                  type="button"
                >
                  套用
                </button>
                <button
                  className="border border-line bg-paper px-2.5 py-1.5 text-[11px] text-muted hover:text-ink disabled:opacity-40"
                  disabled={disabled || !override}
                  onClick={() => onUpdateCode('')}
                  type="button"
                >
                  清除
                </button>
              </div>
            </div>

          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            在畫布上點選格子，即可調整型別與座位編號。
          </p>
        )}
      </Section>

      <Section hint="只計座位" title="座位編號">
        <div className="space-y-3">
          <div>
            <label
              className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-muted"
              htmlFor="numbering-pattern"
            >
              編號樣式
            </label>
            <input
              className="w-full border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
              disabled={disabled}
              id="numbering-pattern"
              onBlur={commitPattern}
              onChange={(event) => setPatternDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitPattern()
                  event.currentTarget.blur()
                }
              }}
              value={patternDraft}
            />
            <p className="mt-1.5 font-mono text-[8px] leading-relaxed text-muted">
              可用 {'{row}'} {'{col}'} {'{index}'}
            </p>
          </div>

          <div>
            <label
              className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-muted"
              htmlFor="numbering-order"
            >
              遍歷順序
            </label>
            <select
              className="w-full border border-line bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
              disabled={disabled}
              id="numbering-order"
              onChange={(event) =>
                onUpdateNumbering({
                  order: event.target.value as
                    | 'row-major'
                    | 'snake'
                    | 'col-major',
                })
              }
              value={numbering.order}
            >
              <option value="row-major">由左至右，逐列</option>
              <option value="snake">蛇行，逐列</option>
              <option value="col-major">由前至後，逐欄</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumberField
              disabled={disabled}
              label="起始序號"
              max={9999}
              min={0}
              onCommit={(value) => onUpdateNumbering({ startAt: value })}
              value={numbering.startAt}
            />
            <NumberField
              disabled={disabled}
              label="補零位數"
              max={6}
              min={0}
              onCommit={(value) => onUpdateNumbering({ pad: value })}
              value={numbering.pad}
            />
          </div>

          <div className="border border-line bg-paper px-2.5 py-2">
            <p className="mb-1 font-mono text-[8px] tracking-[0.12em] text-muted">
              預覽
            </p>
            <div className="flex flex-wrap gap-1">
              {refs.slice(0, 6).map((ref) => (
                <span
                  className="border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] text-accent"
                  key={ref.id}
                >
                  {ref.code}
                </span>
              ))}
              {refs.length > 6 ? (
                <span className="px-1 py-0.5 font-mono text-[9px] text-muted">
                  +{refs.length - 6}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      <Section hint="上限 60 × 60" title="教室尺寸">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            disabled={disabled}
            label="欄數"
            max={60}
            min={1}
            onCommit={(value) => onResize(value, classroom.rows)}
            value={classroom.cols}
          />
          <NumberField
            disabled={disabled}
            label="列數"
            max={60}
            min={1}
            onCommit={(value) => onResize(classroom.cols, value)}
            value={classroom.rows}
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          縮小時會保留左上角格子，並移除超出範圍的座位編號覆寫。
        </p>
      </Section>

      <Section hint={`${cellSize} px`} title="格子大小">
        <input
          aria-label="格子大小"
          className="w-full accent-accent disabled:opacity-40"
          disabled={disabled}
          max={64}
          min={40}
          onChange={(event) => onCellSizeChange(Number(event.target.value))}
          type="range"
          value={cellSize}
        />
        <div className="mt-1 flex justify-between font-mono text-[8px] text-muted">
          <span>40</span>
          <span>64</span>
        </div>
      </Section>
    </aside>
  )
}
