import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RuleViolationsPanel } from './RuleViolationsPanel'

const evaluation = {
  violations: [],
  hardViolationCount: 0,
  softCost: 0,
  satisfiedCount: 1,
  ruleCount: 1,
  violationCount: 0,
}

describe('RuleViolationsPanel', () => {
  it('最佳化逾時時顯示提示', () => {
    render(
      <RuleViolationsPanel
        evaluation={evaluation}
        onSelectSeat={vi.fn()}
        seatCodes={new Map()}
        timedOut
      />,
    )

    expect(
      screen.getByText(/最佳化已達時間上限/),
    ).toBeVisible()
    expect(
      screen.getByText('目前座位安排符合所有啟用中的規則。'),
    ).toBeVisible()
  })

  it('未逾時時不顯示提示', () => {
    render(
      <RuleViolationsPanel
        evaluation={evaluation}
        onSelectSeat={vi.fn()}
        seatCodes={new Map()}
      />,
    )

    expect(
      screen.queryByText(/最佳化已達時間上限/),
    ).not.toBeInTheDocument()
  })

  it('可依約束強度與規則篩選衝突', async () => {
    const user = userEvent.setup()
    const evaluationWithViolations = {
      ...evaluation,
      violations: [
        {
          ruleId: 'hard-rule',
          severity: 'hard' as const,
          message: '硬規則衝突',
          seatIds: ['r0c0'],
          personIds: ['p1'],
        },
        {
          ruleId: 'soft-rule',
          severity: 'soft' as const,
          message: '軟規則衝突',
          seatIds: ['r0c1'],
          personIds: ['p2'],
        },
      ],
      hardViolationCount: 1,
      softCost: 5,
      satisfiedCount: 0,
      ruleCount: 2,
      violationCount: 2,
    }

    render(
      <RuleViolationsPanel
        evaluation={evaluationWithViolations}
        onSelectSeat={vi.fn()}
        ruleLabels={{ 'hard-rule': '分開：硬規則', 'soft-rule': '同組：軟規則' }}
        seatCodes={new Map([
          ['r0c0', '01'],
          ['r0c1', '02'],
        ])}
      />,
    )

    expect(screen.getByText('硬規則衝突')).toBeVisible()
    expect(screen.getByText('軟規則衝突')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '軟約束 1' }))
    expect(screen.queryByText('硬規則衝突')).not.toBeInTheDocument()
    expect(screen.getByText('軟規則衝突')).toBeVisible()

    await user.selectOptions(
      screen.getByLabelText('依規則篩選'),
      'hard-rule',
    )
    expect(
      screen.getByText('目前篩選沒有衝突。'),
    ).toBeVisible()
  })
})
