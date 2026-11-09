import type { RuleEvaluation } from '../evaluateRules'

interface RuleViolationsPanelProps {
  evaluation: RuleEvaluation | null
  seatCodes: Map<string, string>
  onSelectSeat: (seatId: string) => void
}

export function RuleViolationsPanel({
  evaluation,
  seatCodes,
  onSelectSeat,
}: RuleViolationsPanelProps) {
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
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {evaluation.violations.map((violation, index) => {
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
          </>
        )}
      </div>
    </section>
  )
}
