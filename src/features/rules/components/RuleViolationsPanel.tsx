import { useState } from 'react'
import type { RuleEvaluation } from '../evaluateRules'
import type { Strength } from '../../../types/domain'

interface RuleViolationsPanelProps {
  evaluation: RuleEvaluation | null
  seatCodes: Map<string, string>
  ruleLabels?: Record<string, string>
  timedOut?: boolean
  onSelectSeat: (seatId: string) => void
}

type SeverityFilter = 'all' | Strength

export function RuleViolationsPanel({
  evaluation,
  seatCodes,
  ruleLabels = {},
  timedOut = false,
  onSelectSeat,
}: RuleViolationsPanelProps) {
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [ruleFilter, setRuleFilter] = useState('all')
  const availableRuleIds = [
    ...new Set(evaluation?.violations.map((violation) => violation.ruleId) ?? []),
  ]
  const activeRuleFilter = availableRuleIds.includes(ruleFilter)
    ? ruleFilter
    : 'all'
  const filteredViolations =
    evaluation?.violations.filter((violation) => {
      if (severity !== 'all' && violation.severity !== severity) {
        return false
      }

      return activeRuleFilter === 'all' || violation.ruleId === activeRuleFilter
    }) ?? []
  const filterActive = severity !== 'all' || activeRuleFilter !== 'all'

  return (
    <section className="border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
            RULE CHECK
          </p>
          <h3 className="mt-0.5 text-sm font-medium text-ink">規則衝突</h3>
        </div>
        {evaluation ? (
          <span className="font-mono text-[10px] text-muted">
            {evaluation.satisfiedCount} / {evaluation.ruleCount} 規則滿足
          </span>
        ) : null}
      </header>

      <div className="p-4">
        {timedOut ? (
          <p className="mb-3 border border-mark/35 bg-mark/5 px-3 py-2 text-[11px] leading-5 text-ink">
            最佳化已達時間上限，結果可能仍含衝突。可再次排座，或減少規則後重試。
          </p>
        ) : null}
        {!evaluation ? (
          <p className="text-xs leading-6 text-muted">
            排座後會在這裡顯示硬約束、軟約束與座位衝突。
          </p>
        ) : evaluation.ruleCount === 0 ? (
          <p className="text-xs leading-6 text-muted">
            尚未啟用排座規則。可到「規則」分頁建立條件。
          </p>
        ) : evaluation.violationCount === 0 ? (
          <p className="border border-accent/30 bg-accent-soft/55 px-3 py-2 text-xs leading-5 text-accent">
            目前座位安排符合所有啟用中的規則。
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] text-muted">
              <span>硬約束 {evaluation.hardViolationCount}</span>
              <span>軟成本 {evaluation.softCost}</span>
              <span>衝突 {evaluation.violationCount}</span>
            </div>

            <div className="mb-3 space-y-2 border border-line bg-paper/45 p-2">
              <div
                aria-label="依約束強度篩選"
                className="flex flex-wrap gap-1"
                role="group"
              >
                {(
                  [
                    ['all', `全部 ${evaluation.violationCount}`],
                    ['hard', `硬約束 ${evaluation.hardViolationCount}`],
                    [
                      'soft',
                      `軟約束 ${evaluation.violationCount - evaluation.hardViolationCount}`,
                    ],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-pressed={severity === value}
                    className={`border px-2 py-1 font-mono text-[9px] transition-colors ${
                      severity === value
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-muted hover:border-accent/50'
                    }`}
                    key={value}
                    onClick={() => setSeverity(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {availableRuleIds.length > 1 ? (
                <select
                  aria-label="依規則篩選"
                  className="w-full border border-line bg-surface px-2 py-1.5 text-[11px] text-ink"
                  onChange={(event) => setRuleFilter(event.target.value)}
                  value={activeRuleFilter}
                >
                  <option value="all">所有規則</option>
                  {availableRuleIds.map((ruleId) => (
                    <option key={ruleId} value={ruleId}>
                      {ruleLabels[ruleId] ?? '未命名規則'}
                    </option>
                  ))}
                </select>
              ) : null}
              {filterActive ? (
                <p className="font-mono text-[9px] text-muted">
                  顯示 {filteredViolations.length} / {evaluation.violationCount} 個衝突
                </p>
              ) : null}
            </div>

            {filteredViolations.length === 0 ? (
              <p className="border border-line bg-paper/55 px-3 py-2 text-xs leading-5 text-muted">
                目前篩選沒有衝突。
              </p>
            ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredViolations.map((violation, index) => {
                const seatId = violation.seatIds[0]
                const content = (
                  <>
                    <span
                      className={`shrink-0 border px-1 py-0.5 font-mono text-[8px] ${
                        violation.severity === 'hard'
                          ? 'border-mark/40 bg-mark/5 text-mark'
                          : 'border-accent/30 bg-accent-soft text-accent'
                      }`}
                    >
                      {violation.severity === 'hard' ? '硬' : '軟'}
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] leading-5 text-ink">
                      {violation.message}
                    </span>
                    {violation.seatIds.length > 0 ? (
                      <span className="shrink-0 font-mono text-[9px] text-muted">
                        {violation.seatIds
                          .map((id) => seatCodes.get(id) ?? id)
                          .join(' / ')}
                      </span>
                    ) : null}
                  </>
                )

                return (
                  <li key={`${violation.ruleId}-${index}`}>
                    {seatId ? (
                      <button
                        className="flex w-full items-start gap-2 border border-line bg-paper/55 px-2.5 py-2 text-left transition-colors hover:border-mark/45 hover:bg-mark/5"
                        onClick={() => onSelectSeat(seatId)}
                        type="button"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-start gap-2 border border-line bg-paper/55 px-2.5 py-2">
                        {content}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
