import { describe, expect, it } from 'vitest'
import type { TagDef } from '../../types/domain'
import { createRulesFromTemplate, templateValues } from './ruleTemplates'

const GROUP: TagDef = {
  id: 'group',
  name: '分組',
  type: 'enum',
  options: ['A', 'B'],
  color: '#2f6b58',
}

const NEED: TagDef = {
  id: 'need',
  name: '需求',
  type: 'enum',
  options: ['前排', '安靜'],
  color: '#b8502f',
}

describe('rule templates', () => {
  it('建立考試分開規則', () => {
    const result = createRulesFromTemplate('separate-all', {
      tagId: GROUP.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rules).toHaveLength(1)
    expect(result.rules[0]).toMatchObject({
      type: 'separate',
      tagId: GROUP.id,
      values: [],
      strength: 'hard',
    })
  })

  it('建立分組群聚規則', () => {
    const result = createRulesFromTemplate(
      'together-cluster',
      { tagId: GROUP.id, values: ['A'] },
      'orthogonal',
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rules[0]).toMatchObject({
      type: 'together',
      mode: 'cluster',
      adjacency: 'orthogonal',
      strength: 'soft',
      weight: 4,
    })
  })

  it('分組群聚必須選擇套用值', () => {
    const result = createRulesFromTemplate('together-cluster', {
      tagId: GROUP.id,
    })

    expect(result).toEqual({
      ok: false,
      rules: [],
      message: '請至少選擇一個套用值。',
    })
  })

  it('建立前排位置規則並限制範圍', () => {
    const result = createRulesFromTemplate('front-band', {
      tagId: NEED.id,
      values: ['前排'],
      band: 99,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rules[0]).toMatchObject({
      type: 'position',
      tagId: NEED.id,
      value: '前排',
      position: 'front',
      band: 60,
    })
  })

  it('建立兩組避開規則並拒絕相同標籤', () => {
    const result = createRulesFromTemplate('avoid-tags', {
      tagId: GROUP.id,
      values: ['A'],
      secondTagId: NEED.id,
      secondTagValues: ['前排'],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rules[0]).toMatchObject({
      type: 'avoid',
      tagIdA: GROUP.id,
      valueA: 'A',
      tagIdB: NEED.id,
      valueB: '前排',
    })

    expect(
      createRulesFromTemplate('avoid-tags', {
        tagId: GROUP.id,
        secondTagId: GROUP.id,
      }).ok,
    ).toBe(false)
  })

  it('缺少必要參數時回傳錯誤', () => {
    const result = createRulesFromTemplate('front-band', {
      tagId: GROUP.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('套用值')
  })

  it('布林標籤提供是與否選項', () => {
    expect(
      templateValues({
        ...GROUP,
        type: 'boolean',
        options: [],
      }),
    ).toEqual(['是', '否'])
  })
})
