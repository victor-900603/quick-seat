import type { Project, Rule } from '../../../types/domain'
import {
  ADJACENCY_LABELS,
  POSITION_LABELS,
  RULE_TYPE_LABELS,
  formatRuleSummary,
} from '../ruleOps'

interface RuleCardProps {
  project: Project
  rule: Rule
  violationCount: number
  hasAssignment: boolean
  readOnly: boolean
  onDelete: (rule: Rule) => void
  onEdit: (rule: Rule) => void
  onToggle: (ruleId: string) => void
}

export function RuleCard({
  project,
  rule,
  violationCount,
  hasAssignment,
  readOnly,
  onDelete,
  onEdit,
  onToggle,
}: RuleCardProps) {
  const strengthLabel = rule.strength === 'hard' ? '硬約束' : '軟約束'
  const strengthClass =
    rule.strength === 'hard'
      ? 'border-mark/30 bg-mark/5 text-mark'
      : 'border-accent/30 bg-accent-soft text-accent'
  const detail =
    rule.type === 'separate' || rule.type === 'together' || rule.type === 'avoid'
      ? ADJACENCY_LABELS[rule.adjacency]
      : rule.type === 'position'
        ? POSITION_LABELS[rule.position]
        : '固定座位'

  return (
    <article
      className={`border bg-surface p-4 transition-colors ${
        rule.enabled ? 'border-line' : 'border-line/60 bg-paper/45 opacity-65'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-board/20 bg-board px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-chalk">
              {RULE_TYPE_LABELS[rule.type]}
            </span>
            <span className={`border px-1.5 py-0.5 text-[9px] ${strengthClass}`}>
              {strengthLabel}
            </span>
            {rule.enabled && violationCount > 0 ? (
              <span className="border border-mark/40 bg-mark/10 px-1.5 py-0.5 font-mono text-[9px] text-mark">
                {violationCount} 個衝突
              </span>
            ) : null}
            {rule.enabled && hasAssignment && violationCount === 0 ? (
              <span className="border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] text-accent">
                已滿足
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-ink">
            {formatRuleSummary(rule, project)}
          </p>
          {rule.note ? (
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {rule.note}
            </p>
          ) : null}
        </div>
        {rule.type !== 'pin' && rule.strength === 'soft' ? (
          <span className="shrink-0 font-mono text-[9px] text-muted">
            權重 {rule.weight}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input
            aria-label={`啟用規則：${RULE_TYPE_LABELS[rule.type]}`}
            checked={rule.enabled}
            disabled={readOnly}
            onChange={() => onToggle(rule.id)}
            type="checkbox"
          />
          {rule.enabled ? '啟用中' : '已停用'}
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-muted/70">{detail}</span>
          <button
            className="border border-line bg-paper px-2 py-1 text-[10px] text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
            disabled={readOnly}
            onClick={() => onEdit(rule)}
            type="button"
          >
            編輯
          </button>
          <button
            className="border border-line bg-paper px-2 py-1 text-[10px] text-muted transition-colors hover:border-mark/50 hover:text-mark disabled:cursor-not-allowed disabled:opacity-55"
            disabled={readOnly}
            onClick={() => onDelete(rule)}
            type="button"
          >
            刪除
          </button>
        </div>
      </div>
    </article>
  )
}
