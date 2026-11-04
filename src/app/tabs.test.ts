import { describe, expect, it } from 'vitest'
import { getTab, type TabId } from './tabs'

describe('getTab', () => {
  it('回傳指定的分頁', () => {
    expect(getTab('roster').label).toBe('名單')
  })

  it('未知分頁拋出錯誤', () => {
    expect(() => getTab('unknown' as TabId)).toThrow('未知的分頁：unknown')
  })
})
