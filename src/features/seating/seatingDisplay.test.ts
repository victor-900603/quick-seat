import { describe, expect, it } from 'vitest'
import type { Person } from '../../types/domain'
import { formatPersonLabel, formatSeatPosition } from './seatingDisplay'

const person: Person = {
  id: 'person-1',
  name: '林品妤',
  studentNo: 'A01',
  tags: {},
  extra: {},
  note: '',
}

describe('seatingDisplay', () => {
  it('依座位標示模式輸出姓名、座號或兩者', () => {
    expect(formatPersonLabel(person, 'name')).toBe('林品妤')
    expect(formatPersonLabel(person, 'studentNo')).toBe('A01')
    expect(formatPersonLabel(person, 'both')).toBe('林品妤 · A01')
    expect(formatPersonLabel(person, 'none')).toBe('')
  })

  it('沒有座號時顯示替代文字', () => {
    expect(
      formatPersonLabel({ ...person, studentNo: '' }, 'studentNo'),
    ).toBe('未填座號')
    expect(formatPersonLabel({ ...person, studentNo: '' }, 'both')).toBe(
      '林品妤 · 未填座號',
    )
  })

  it('以 1 為起始顯示列欄位置', () => {
    expect(formatSeatPosition(0, 0)).toBe('第 1 列第 1 欄')
    expect(formatSeatPosition(4, 5)).toBe('第 5 列第 6 欄')
  })
})
