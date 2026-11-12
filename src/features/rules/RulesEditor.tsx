import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useReadOnlyMode } from '../../lib/useReadOnlyMode'
import type { Rule } from '../../types/domain'
import { getSeatRefs } from '../classroom/numbering'
import { useProjectStore } from '../project/projectStore'
import { evaluateAssignment } from './evaluateRules'
import { createRule, formatRuleSummary } from './ruleOps'
import { RuleCard } from './components/RuleCard'
import { RuleDialog } from './components/RuleDialog'

interface Notice {
  tone: 'success' | 'error'
  message: string
}

export function RulesEditor() {
  const project = useProjectStore((state) => state.project)
  const addRule = useProjectStore((state) => state.addRule)
  const updateRule = useProjectStore((state) => state.updateRule)
  const deleteRule = useProjectStore((state) => state.deleteRule)
  const toggleRule = useProjectStore((state) => state.toggleRule)
  const readOnly = useReadOnlyMode()

  const [dialogRule, setDialogRule] = useState<Rule | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const assignment = project.currentAssignment
  const seatRefs = useMemo(
    () => getSeatRefs(project.classroom),
    [project.classroom],
  )
  const evaluation = useMemo(
    () => (assignment ? evaluateAssignment(project, assignment) : null),
    [assignment, project],
  )
  const enabledRules = project.rules.filter((rule) => rule.enabled)
  const hardCount = enabledRules.filter(
    (rule) => rule.strength === 'hard',
  ).length
  const softCount = enabledRules.filter(
    (rule) => rule.strength === 'soft',
  ).length
  const violationCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const violation of evaluation?.violations ?? []) {
      counts.set(
        violation.ruleId,
        (counts.get(violation.ruleId) ?? 0) + 1,
      )
    }

    return counts
  }, [evaluation])
  const invalidRules = project.rules.filter((rule) => {
    const tagIds =
      rule.type === 'avoid'
        ? [rule.tagIdA, rule.tagIdB]
        : rule.type === 'pin'
          ? []
          : [rule.tagId]
    const personMissing =
      rule.type === 'pin' &&
      !project.roster.persons.some((person) => person.id === rule.personId)
    const seatMissing =
      rule.type === 'pin' &&
      !seatRefs.some((seat) => seat.id === rule.seatId)
    const tagMissing = tagIds.some(
      (tagId) =>
        tagId &&
        !project.roster.tags.some((tag) => tag.id === tagId),
    )

    return personMissing || seatMissing || tagMissing
  })

  const startCreate = () => {
    const defaultType =
      project.roster.tags.length > 0
        ? 'separate'
        : project.roster.persons.length > 0
          ? 'pin'
          : 'separate'
    setDialogRule(
      createRule(defaultType, {
        tagId: project.roster.tags[0]?.id ?? '',
        personId: project.roster.persons[0]?.id ?? '',
        seatId: seatRefs[0]?.id ?? '',
      }),
    )
    setDialogOpen(true)
  }

  const handleSave = (rule: Rule): boolean => {
    const existing = project.rules.some(
      (candidate) => candidate.id === rule.id,
    )
    const ok = existing ? updateRule(rule) : addRule(rule)

    if (ok) {
      setDialogOpen(false)
      setDialogRule(null)
      setNotice({
        tone: 'success',
        message: existing ? '規則已更新。' : '規則已新增。',
      })
    }

    return ok
  }

  const handleDelete = (rule: Rule) => {
    if (
      !window.confirm(
        `確定刪除「${formatRuleSummary(rule, project)}」嗎？此操作可以復原。`,
      )
    ) {
      return
    }

    deleteRule(rule.id)
    setNotice({ tone: 'success', message: '規則已刪除，可使用復原恢復。' })
  }

  const handleToggle = (ruleId: string) => {
    toggleRule(ruleId)
  }

  const stats = [
    { label: '規則', value: project.rules.length },
    { label: '硬約束', value: hardCount },
    { label: '軟約束', value: softCount },
    {
      label: '目前衝突',
      value: evaluation ? evaluation.violationCount : '—',
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        description="用規則卡描述分開、同組、位置、避開與固定座位，並即時檢查現有座位圖的衝突。"
        kicker="RULES"
        stats={stats}
        step="03"
        title="排座規則"
      />

      {readOnly ? (
        <p className="mb-4 border border-line bg-surface px-4 py-3 text-xs leading-5 text-muted">
          手機為唯讀檢視。請使用平板或電腦編輯排座規則。
        </p>
      ) : null}

      <p className="mb-4 border border-line bg-paper/65 px-4 py-3 text-xs leading-5 text-muted">
        目前規則會判定既有座位並列出衝突；自動排座的最佳化會在下一階段套用這些規則。
      </p>

      {notice ? (
        <div
          aria-live="polite"
          className={`mb-4 flex items-start justify-between gap-3 border px-4 py-3 text-xs leading-5 ${
            notice.tone === 'error'
              ? 'border-mark/40 bg-mark/5 text-mark'
              : 'border-accent/35 bg-accent-soft/60 text-accent'
          }`}
        >
          <span>{notice.message}</span>
          <button
            aria-label="關閉提示"
            className="shrink-0 text-base leading-none opacity-60 hover:opacity-100"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      {invalidRules.length > 0 ? (
        <div className="mb-4 border border-mark/40 bg-mark/5 px-4 py-3 text-xs leading-5 text-mark">
          有 {invalidRules.length} 條規則指向已刪除的標籤、人員或座位。編輯規則即可修正。
        </div>
      ) : null}

      {project.roster.tags.length === 0 && project.roster.persons.length > 0 ? (
        <div className="mb-4 border border-line bg-paper/70 px-4 py-3 text-xs leading-5 text-muted">
          目前尚未建立標籤，只能建立固定座位規則。若要使用分開、同組、位置或避開規則，請先到「名單」分頁建立標籤。
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
                RULE CARDS
              </p>
              <h3 className="mt-0.5 text-sm font-medium text-ink">
                規則清單
              </h3>
            </div>
            <button
              className="border border-board bg-board px-3 py-2 text-xs text-chalk transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
              disabled={readOnly}
              onClick={startCreate}
              type="button"
            >
              新增規則
            </button>
          </div>

          {project.rules.length === 0 ? (
            <div className="border border-dashed border-line bg-surface px-6 py-10 text-center">
              <p className="font-display text-lg text-ink">尚未建立規則</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
                從分開或固定座位開始。規則建立後，現有座位圖會立即顯示衝突數量。
              </p>
              <button
                className="mt-4 border border-board bg-board px-3 py-2 text-xs text-chalk transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
                disabled={readOnly}
                onClick={startCreate}
                type="button"
              >
                建立第一條規則
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {project.rules.map((rule) => (
                <RuleCard
                  hasAssignment={Boolean(assignment)}
                  key={rule.id}
                  onDelete={handleDelete}
                  onEdit={(target) => {
                    setDialogRule(target)
                    setDialogOpen(true)
                  }}
                  onToggle={handleToggle}
                  project={project}
                  readOnly={readOnly}
                  rule={rule}
                  violationCount={violationCounts.get(rule.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="border border-line bg-surface p-4">
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
              RULE STATUS
            </p>
            <h3 className="mt-0.5 text-sm font-medium text-ink">
              目前判定
            </h3>
            {!assignment ? (
              <p className="mt-2 text-xs leading-6 text-muted">
                尚未排座。完成排座後，這裡會顯示硬約束、軟成本與滿足的規則數。
              </p>
            ) : (
              <>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">滿足規則</dt>
                    <dd className="font-mono text-ink">
                      {evaluation?.satisfiedCount ?? 0} /{' '}
                      {evaluation?.ruleCount ?? 0}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">硬約束衝突</dt>
                    <dd className="font-mono text-mark">
                      {evaluation?.hardViolationCount ?? 0}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">軟約束成本</dt>
                    <dd className="font-mono text-ink">
                      {evaluation?.softCost ?? 0}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-muted">
                  {evaluation && evaluation.violationCount > 0
                    ? '到「排座」分頁可查看衝突細節並拖曳調整。'
                    : '目前座位安排符合所有啟用中的規則。'}
                </p>
              </>
            )}
          </section>

          <details className="group border border-line bg-paper/65">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-[9px] tracking-[0.2em]">
                HOW IT WORKS
              </span>
              <span
                aria-hidden="true"
                className="font-mono text-sm transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <ul className="space-y-2 border-t border-line px-4 py-3 text-[11px] leading-5 text-muted">
              <li>
                <span className="font-medium text-ink">硬約束</span>
                ：衝突會列為必須處理；下一階段最佳化會優先避免。
              </li>
              <li>
                <span className="font-medium text-ink">軟約束</span>
                ：依權重計算成本；下一階段最佳化會嘗試降低。
              </li>
              <li>
                <span className="font-medium text-ink">固定座位</span>
                ：已套用於自動排座，並優先於鎖定。
              </li>
              <li>
                規則變更後，既有結果會標記為過期；目前重新排座仍只套用固定座位與鎖定。
              </li>
            </ul>
          </details>
        </aside>
      </div>

      {dialogOpen && dialogRule ? (
        <RuleDialog
          initialRule={dialogRule}
          isNew={
            !project.rules.some((rule) => rule.id === dialogRule.id)
          }
          onClose={() => {
            setDialogOpen(false)
            setDialogRule(null)
          }}
          onSave={handleSave}
          project={project}
          seatRefs={seatRefs}
        />
      ) : null}
    </section>
  )
}
