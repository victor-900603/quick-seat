import { describe, expect, it } from 'vitest'
import type { PinRule, SeparateRule } from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import {
  addRule,
  createRule,
  formatRuleSummary,
  normalizeRule,
  pruneInvalidPinRules,
  removeRule,
  replaceRule,
  toggleRule,
  validateRule,
} from './ruleOps'

function projectWithData() {
  const project = createDefaultProject()
  project.roster.tags = [
    {
      id: 'tag-group',
      name: '分組',
      type: 'enum',
      options: ['A', 'B'],
      color: '#2f6b58',
    },
  ]
  project.roster.persons = [
    {
      id: 'person-1',
      name: '林品妤',
      studentNo: '01',
      tags: { 'tag-group': 'A' },
      extra: {},
      note: '',
    },
    {
      id: 'person-2',
      name: '陳柏宇',
      studentNo: '02',
      tags: { 'tag-group': 'B' },
      extra: {},
      note: '',
    },
  ]
  return project
}

describe('ruleOps', () => {
  it('建立並正規化不同型別的規則', () => {
    const separate = createRule('separate', { tagId: 'tag-group' })
    expect(separate).toMatchObject({
      type: 'separate',
      tagId: 'tag-group',
      values: [],
      adjacency: 'all8',
      strength: 'hard',
      enabled: true,
    })

    const pin = normalizeRule({
      ...createRule('pin', {
        personId: 'person-1',
        seatId: 'r0c0',
      }),
      strength: 'soft',
      weight: 9,
    })
    expect(pin).toMatchObject({
      type: 'pin',
      strength: 'hard',
      weight: 1,
    })

    const separateRule = normalizeRule({
      ...(separate as SeparateRule),
      weight: 99,
      values: [' A ', 'A', ' B ', ''],
    })
    expect(separateRule.weight).toBe(10)
    expect((separateRule as SeparateRule).values).toEqual(['A', 'B'])
  })

  it('驗證標籤、值與固定座位', () => {
    const project = projectWithData()
    const separate = createRule('separate', { tagId: 'tag-group' })
    expect(validateRule(separate, project).valid).toBe(true)

    expect(
      validateRule({ ...separate, tagId: 'missing' }, project),
    ).toMatchObject({
      valid: false,
      message: '請選擇有效的標籤。',
    })

    expect(
      validateRule({ ...separate, values: ['C'] }, project),
    ).toMatchObject({
      valid: false,
      message: '標籤「分組」沒有「C」這個值。',
    })

    const pin = createRule('pin', {
      personId: 'person-1',
      seatId: 'r0c0',
    }) as PinRule
    expect(validateRule(pin, project).valid).toBe(true)

    expect(
      validateRule({ ...pin, seatId: 'r9c9' }, project),
    ).toMatchObject({
      valid: false,
      message: '請選擇有效的固定座位。',
    })

    project.rules = [pin]
    expect(
      validateRule(
        { ...pin, id: 'pin-2' },
        project,
      ),
    ).toMatchObject({
      valid: false,
      message: '這位人員已有其他固定座位規則。',
    })
  })

  it('新增、取代、切換與刪除規則', () => {
    const project = projectWithData()
    const rule = createRule('separate', { tagId: 'tag-group' })
    const rules = addRule(project.rules, rule)

    expect(addRule(rules, rule)).toBe(rules)
    expect(toggleRule(rules, rule.id)[0].enabled).toBe(false)
    expect(toggleRule(rules, 'missing')).toBe(rules)
    expect(removeRule(rules, 'missing')).toBe(rules)
    expect(removeRule(rules, rule.id)).toEqual([])

    const next = { ...rule, note: '備註' }
    expect(replaceRule(rules, next)[0].note).toBe('備註')
    expect(replaceRule(rules, rule)).toBe(rules)
    expect(replaceRule(rules, { ...rule, id: 'missing' })).toBe(rules)
  })

  it('產生規則摘要並移除失效的固定座位', () => {
    const project = projectWithData()
    const separate = createRule('separate', { tagId: 'tag-group' })
    const pin = createRule('pin', {
      personId: 'person-1',
      seatId: 'r0c0',
    })
    expect(formatRuleSummary(separate, project)).toContain(
      '「分組」的 所有值 彼此分開',
    )
    expect(formatRuleSummary(pin, project)).toBe('林品妤 固定在 01')

    project.classroom.cells[0] = { type: 'aisle' }
    expect(
      pruneInvalidPinRules([separate, pin], project.classroom, project.roster.persons),
    ).toEqual([separate])
  })
})
