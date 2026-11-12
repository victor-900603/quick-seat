import { useEffect, useMemo, useState } from 'react'
import type { Project, Rule } from '../../types/domain'
import { formatRuleSummary, RULE_TYPE_LABELS } from '../rules/ruleOps'
import {
  createRulesFromTemplate,
  RULE_TEMPLATES,
  templateValues,
  type RuleTemplateId,
} from './ruleTemplates'

interface RuleTemplateDialogProps {
  project: Project
  readOnly: boolean
  onApply: (rules: Rule[]) => boolean
  onClose: () => void
}

export function RuleTemplateDialog({
  project,
  readOnly,
  onApply,
  onClose,
}: RuleTemplateDialogProps) {
  const tags = project.roster.tags
  const [templateId, setTemplateId] = useState<RuleTemplateId>(
    RULE_TEMPLATES[0].id,
  )
  const [tagId, setTagId] = useState(tags[0]?.id ?? '')
  const [values, setValues] = useState<string[]>([])
  const [secondTagId, setSecondTagId] = useState(
    tags.find((tag) => tag.id !== tags[0]?.id)?.id ?? '',
  )
  const [secondValues, setSecondValues] = useState<string[]>([])
  const [band, setBand] = useState(2)
  const [error, setError] = useState('')

  const template = RULE_TEMPLATES.find((item) => item.id === templateId)!
  const tag = tags.find((item) => item.id === tagId)
  const secondTag = tags.find((item) => item.id === secondTagId)
  const valueOptions = templateValues(tag)
  const secondValueOptions = templateValues(secondTag)

  const result = useMemo(
    () =>
      createRulesFromTemplate(templateId, {
        tagId,
        values,
        secondTagId,
        secondTagValues: secondValues,
        band,
      }),
    [band, secondTagId, secondValues, tagId, templateId, values],
  )

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const toggleValue = (
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void,
  ) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  const apply = () => {
    if (!result.ok) {
      setError(result.message ?? '規則範本設定不完整。')
      return
    }
    if (!window.confirm('套用後會新增這些規則，確定要繼續嗎？')) return
    if (!onApply(result.rules)) {
      setError('規則無法套用，請確認目前專案設定。')
      return
    }
    onClose()
  }

  return (
    <div
      aria-labelledby="rule-template-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <div className="flex max-h-[min(88vh,760px)] w-full max-w-3xl flex-col border border-line bg-surface shadow-2xl">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-accent">
              RULE TEMPLATES
            </p>
            <h3 className="mt-0.5 font-display text-xl text-ink" id="rule-template-title">
              規則範本
            </h3>
            <p className="mt-1 text-xs text-muted">
              選擇常用規則組合，確認參數後一次加入。
            </p>
          </div>
          <button
            aria-label="關閉規則範本"
            className="px-1 text-xl leading-none text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden sm:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-b border-line bg-paper/40 p-3 sm:border-b-0 sm:border-r">
            <div className="space-y-1.5">
              {RULE_TEMPLATES.map((item) => (
                <button
                  aria-pressed={item.id === templateId}
                  className="w-full border border-transparent px-3 py-2 text-left text-xs text-ink hover:border-line data-[active=true]:border-accent/40 data-[active=true]:bg-surface"
                  data-active={item.id === templateId}
                  key={item.id}
                  onClick={() => {
                    setTemplateId(item.id)
                    setValues([])
                    setSecondValues([])
                    setError('')
                  }}
                  type="button"
                >
                  <span className="block font-medium">{item.name}</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="min-h-0 overflow-y-auto p-5">
            <p className="text-sm leading-6 text-ink">{template.description}</p>

            {tags.length === 0 ? (
              <p className="mt-4 border border-mark/30 bg-mark/5 p-3 text-xs text-mark">
                目前沒有標籤，請先到名單頁建立標籤。
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-ink">
                標籤
                <select
                  className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs"
                  onChange={(event) => {
                    setTagId(event.target.value)
                    setValues([])
                  }}
                  value={tagId}
                >
                  {tags.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              {template.needsSecondTag ? (
                <label className="block text-xs text-ink">
                  第二個標籤
                  <select
                    className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs"
                    onChange={(event) => {
                      setSecondTagId(event.target.value)
                      setSecondValues([])
                    }}
                    value={secondTagId}
                  >
                    {tags.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {template.needsValue || template.needsSecondTag ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {template.needsValue ? (
                  <ValueOptions
                    label="套用值"
                    options={valueOptions}
                    selected={values}
                    onToggle={(value) => toggleValue(value, values, setValues)}
                  />
                ) : null}
                {template.needsSecondTag ? (
                  <ValueOptions
                    label="第二標籤值"
                    options={secondValueOptions}
                    selected={secondValues}
                    onToggle={(value) =>
                      toggleValue(value, secondValues, setSecondValues)
                    }
                  />
                ) : null}
              </div>
            ) : null}

            {template.id === 'front-band' ? (
              <label className="mt-4 block max-w-40 text-xs text-ink">
                前排範圍
                <input
                  className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs"
                  max={60}
                  min={1}
                  onChange={(event) => setBand(Number(event.target.value))}
                  type="number"
                  value={band}
                />
              </label>
            ) : null}

            <div className="mt-5 border border-line bg-paper/55 p-3">
              <p className="font-mono text-[9px] tracking-[0.14em] text-muted">
                PREVIEW
              </p>
              {result.ok ? (
                <ul className="mt-2 space-y-1.5 text-xs text-ink">
                  {result.rules.map((rule) => (
                    <li key={rule.id}>
                      {RULE_TYPE_LABELS[rule.type]}：{formatRuleSummary(rule, project)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">{result.message}</p>
              )}
            </div>

            {error ? (
              <p className="mt-3 text-xs text-mark" role="alert">
                {error}
              </p>
            ) : null}
            {readOnly ? (
              <p className="mt-3 text-xs text-muted">
                手機為唯讀檢視，只能預覽規則範本。
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            className="border border-line bg-surface px-3 py-2 text-xs text-muted"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="border border-board bg-board px-3 py-2 text-xs text-chalk disabled:opacity-40"
            disabled={readOnly || !result.ok}
            onClick={apply}
            type="button"
          >
            套用範本
          </button>
        </footer>
      </div>
    </div>
  )
}

function ValueOptions({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <p className="text-xs text-ink">{label}</p>
      {options.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted">此標籤沒有可選值。</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-2">
          {options.map((option) => (
            <label className="flex items-center gap-1 text-[11px] text-muted" key={option}>
              <input
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                type="checkbox"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
