import { render, screen } from '@testing-library/react'
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
})
