import type { ReactNode } from 'react'
import type {
  AllocationMode,
  OccupancyMode,
  ProjectSettings,
} from '../../../types/domain'
import type { CapacityReport } from '../capacity'

export type SeatingMethod = 'auto' | 'manual'

interface SeatingControlsProps {
  method: SeatingMethod
  onMethodChange: (method: SeatingMethod) => void
  occupancy: OccupancyMode
  onOccupancyChange: (occupancy: OccupancyMode) => void
  allocation: AllocationMode
  onAllocationChange: (allocation: AllocationMode) => void
  seed: string
  onSeedChange: (seed: string) => void
  onGenerateSeed: () => void
  capacityReport: CapacityReport
  display: ProjectSettings['display']
  onDisplayChange: (display: ProjectSettings['display']) => void
  readOnly: boolean
  canRun: boolean
  hasAssignment: boolean
  canExpand: boolean
  optimize: boolean
  onOptimizeChange: (optimize: boolean) => void
  activeRuleCount: number
  onRun: () => void
  onPartialRun: () => void
  onExpand: () => void
  onClear: () => void
}

const fieldClass =
  'mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-55'

function SegmentedButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean
  children: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`border px-2.5 py-2 text-xs transition-colors ${
        active
          ? 'border-accent bg-accent text-chalk'
          : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink'
      } disabled:cursor-not-allowed disabled:opacity-55`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

export function SeatingControls({
  method,
  onMethodChange,
  occupancy,
  onOccupancyChange,
  allocation,
  onAllocationChange,
  seed,
  onSeedChange,
  onGenerateSeed,
  capacityReport,
  display,
  onDisplayChange,
  readOnly,
  canRun,
  hasAssignment,
  canExpand,
  optimize,
  onOptimizeChange,
  activeRuleCount,
  onRun,
  onPartialRun,
  onExpand,
  onClear,
}: SeatingControlsProps) {
  const checkerboard = occupancy.kind === 'checkerboard'
  const ordered = allocation.kind === 'ordered'

  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
          SETTINGS
        </p>
        <h3 className="mt-0.5 text-sm font-medium text-ink">排座設定</h3>
      </header>

      <div className="space-y-5 p-4">
        <fieldset disabled={readOnly}>
          <legend className="text-xs font-medium text-ink">排座方式</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SegmentedButton
              active={method === 'auto'}
              disabled={readOnly}
              onClick={() => onMethodChange('auto')}
            >
              自動排座
            </SegmentedButton>
            <SegmentedButton
              active={method === 'manual'}
              disabled={readOnly}
              onClick={() => onMethodChange('manual')}
            >
              手動排座
            </SegmentedButton>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {method === 'auto'
              ? '依設定自動分配所有人員，產生結果後仍可拖曳調整。'
              : '不自動分配，直接選取或拖曳人員入座即可開始。'}
          </p>
        </fieldset>

        <fieldset disabled={readOnly}>
          <legend className="text-xs font-medium text-ink">座位使用模式</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SegmentedButton
              active={!checkerboard}
              disabled={readOnly}
              onClick={() => onOccupancyChange({ kind: 'full' })}
            >
              連續座位
            </SegmentedButton>
            <SegmentedButton
              active={checkerboard}
              disabled={readOnly}
              onClick={() =>
                onOccupancyChange({ kind: 'checkerboard', phase: 'auto' })
              }
            >
              梅花座
            </SegmentedButton>
          </div>

          {checkerboard ? (
            <div className="mt-3">
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                相位
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <SegmentedButton
                  active={occupancy.phase === 'auto'}
                  disabled={readOnly}
                  onClick={() =>
                    onOccupancyChange({ kind: 'checkerboard', phase: 'auto' })
                  }
                >
                  自動
                </SegmentedButton>
                <SegmentedButton
                  active={occupancy.phase === 0}
                  disabled={readOnly}
                  onClick={() =>
                    onOccupancyChange({ kind: 'checkerboard', phase: 0 })
                  }
                >
                  相位 0
                </SegmentedButton>
                <SegmentedButton
                  active={occupancy.phase === 1}
                  disabled={readOnly}
                  onClick={() =>
                    onOccupancyChange({ kind: 'checkerboard', phase: 1 })
                  }
                >
                  相位 1
                </SegmentedButton>
              </div>
              <p className="mt-2 font-mono text-[9px] leading-5 text-muted">
                相位 0：{capacityReport.phaseCounts[0]} 個座位，相位 1：
                {capacityReport.phaseCounts[1]} 個座位
                {capacityReport.resolvedPhase !== null
                  ? `。目前使用相位 ${capacityReport.resolvedPhase}`
                  : ''}
              </p>
            </div>
          ) : null}
        </fieldset>

        {method === 'auto' ? (
          <fieldset disabled={readOnly}>
            <legend className="text-xs font-medium text-ink">人員分配方式</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SegmentedButton
              active={ordered}
              disabled={readOnly}
              onClick={() =>
                onAllocationChange({
                  kind: 'ordered',
                  orderBy:
                    allocation.kind === 'ordered'
                      ? allocation.orderBy
                      : 'studentNo',
                  fill:
                    allocation.kind === 'ordered'
                      ? allocation.fill
                      : 'row-major',
                })
              }
            >
              依序分配
            </SegmentedButton>
            <SegmentedButton
              active={!ordered}
              disabled={readOnly}
              onClick={() => onAllocationChange({ kind: 'random' })}
            >
              隨機分配
            </SegmentedButton>
          </div>

          {ordered ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-muted">
                排序依據
                <select
                  className={fieldClass}
                  disabled={readOnly}
                  onChange={(event) =>
                    onAllocationChange({
                      ...allocation,
                      orderBy: event.target.value as
                        | 'studentNo'
                        | 'name'
                        | 'import',
                    })
                  }
                  value={allocation.orderBy}
                >
                  <option value="studentNo">座號</option>
                  <option value="name">姓名</option>
                  <option value="import">匯入順序</option>
                </select>
              </label>
              <label className="block text-[11px] text-muted">
                填座順序
                <select
                  className={fieldClass}
                  disabled={readOnly}
                  onChange={(event) =>
                    onAllocationChange({
                      ...allocation,
                      fill: event.target.value as
                        | 'row-major'
                        | 'snake'
                        | 'col-major',
                    })
                  }
                  value={allocation.fill}
                >
                  <option value="row-major">橫向列優先</option>
                  <option value="snake">蛇行</option>
                  <option value="col-major">直向欄優先</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="mt-3">
              <label className="block text-[11px] text-muted">
                隨機種子
                <input
                  className={fieldClass}
                  disabled={readOnly}
                  onChange={(event) => onSeedChange(event.target.value)}
                  spellCheck={false}
                  value={seed}
                />
              </label>
              <button
                className="mt-1.5 w-full border border-line bg-paper px-2.5 py-2 text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-55"
                disabled={readOnly}
                onClick={onGenerateSeed}
                type="button"
              >
                產生新種子
              </button>
            </div>
          )}
          </fieldset>
        ) : (
          <div className="border border-line bg-paper px-3 py-2.5 text-[11px] leading-5 text-muted">
            手動排座不需要排序或隨機設定。從未分配人員選取學生，再點選座位即可開始；也可以直接拖曳名牌。
          </div>
        )}

        {method === 'auto' && activeRuleCount > 0 ? (
          <fieldset disabled={readOnly}>
            <legend className="text-xs font-medium text-ink">規則最佳化</legend>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-muted">
              <input
                checked={optimize}
                className="mt-0.5 accent-[#2f6b58]"
                disabled={readOnly}
                onChange={(event) => onOptimizeChange(event.target.checked)}
                type="checkbox"
              />
              <span>
                依 {activeRuleCount} 條可調整規則最佳化
                <span className="mt-0.5 block text-[10px] leading-4 text-muted/80">
                  重新排座時會嘗試降低衝突；規則越多，計算時間越長。
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}

        <fieldset disabled={readOnly}>
          <legend className="text-xs font-medium text-ink">座位標示</legend>
          <select
            aria-label="座位標示"
            className={fieldClass}
            onChange={(event) =>
              onDisplayChange(
                event.target.value as ProjectSettings['display'],
              )
            }
            value={display}
          >
            <option value="name">姓名</option>
            <option value="studentNo">座號</option>
            <option value="both">姓名與座號</option>
            <option value="none">不顯示</option>
          </select>
        </fieldset>

        <div className="border-t border-line pt-4">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted">
            <span>需求 {capacityReport.personCount} 位</span>
            <span>可用 {capacityReport.capacity} 個</span>
          </div>

          {capacityReport.shortage ? (
            <div className="mt-2 border border-mark/35 bg-mark/5 p-2.5 text-xs leading-5 text-ink">
              <p className="font-medium text-mark">
                座位不足，還缺 {capacityReport.missing} 個
              </p>
              <div className="mt-2 grid gap-1.5">
                {checkerboard ? (
                  <button
                    className="border border-line bg-surface px-2 py-1.5 text-left text-[11px] hover:border-accent disabled:opacity-55"
                    disabled={readOnly}
                    onClick={() => onOccupancyChange({ kind: 'full' })}
                    type="button"
                  >
                    改用連續座位
                  </button>
                ) : null}
                <button
                  className="border border-line bg-surface px-2 py-1.5 text-left text-[11px] hover:border-accent disabled:opacity-55"
                  disabled={readOnly || !canExpand}
                  onClick={onExpand}
                  type="button"
                >
                  自動擴充教室
                </button>
                {method === 'auto' ? (
                  <button
                    className="border border-mark/40 bg-surface px-2 py-1.5 text-left text-[11px] text-mark hover:border-mark disabled:opacity-55"
                    disabled={readOnly}
                    onClick={onPartialRun}
                    type="button"
                  >
                    只排部分人員
                  </button>
                ) : (
                  <p className="text-[11px] leading-5 text-muted">
                    手動排座可先安排部分人員，其餘留在未分配區。
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {method === 'auto' ? (
            <button
              className="mt-3 w-full border border-accent bg-accent px-3 py-2.5 text-sm text-chalk transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted"
              disabled={readOnly || !canRun}
              onClick={onRun}
              type="button"
            >
              {hasAssignment ? '重新排座' : '開始排座'}
            </button>
          ) : null}

          {hasAssignment ? (
            <button
              className="mt-1.5 w-full border border-line bg-surface px-3 py-2 text-xs text-muted transition-colors hover:border-mark/40 hover:text-mark disabled:opacity-55"
              disabled={readOnly}
              onClick={onClear}
              type="button"
            >
              清除排座結果
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
