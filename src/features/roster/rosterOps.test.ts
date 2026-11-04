import { describe, expect, it } from 'vitest'
import type { Roster } from '../../types/domain'
import {
  addPerson,
  addTag,
  createPerson,
  createTagDef,
  extendTagOptions,
  isTagNameTaken,
  normalizeTagOptions,
  parseTagValue,
  removePerson,
  removeTag,
  setTagValue,
  updatePerson,
  updateTag,
} from './rosterOps'

function emptyRoster(): Roster {
  return { persons: [], tags: [], extraColumns: [] }
}

describe('rosterOps', () => {
  it('建立人員時去除欄位空白並保留標籤與額外欄位', () => {
    const person = createPerson({
      name: '  林品妤 ',
      studentNo: ' A01 ',
      note: ' 需靠近前方 ',
      tags: { math: 'A' },
      extra: { email: 'a@example.com' },
    })

    expect(person.name).toBe('林品妤')
    expect(person.studentNo).toBe('A01')
    expect(person.note).toBe('需靠近前方')
    expect(person.tags).toEqual({ math: 'A' })
    expect(person.extra).toEqual({ email: 'a@example.com' })
  })

  it('新增、更新與刪除人員，無變更時回傳同一物件', () => {
    const person = createPerson({ name: '陳柏宇', studentNo: 'A02' })
    const roster = addPerson(emptyRoster(), person)

    expect(roster.persons).toHaveLength(1)
    expect(addPerson(roster, person)).toBe(roster)

    const updated = updatePerson(roster, person.id, {
      studentNo: ' A03 ',
      note: '幹部',
    })

    expect(updated.persons[0].studentNo).toBe('A03')
    expect(updated.persons[0].note).toBe('幹部')
    expect(updatePerson(updated, person.id, { name: '陳柏宇' })).toBe(
      updated,
    )

    const removed = removePerson(updated, person.id)
    expect(removed.persons).toHaveLength(0)
    expect(removePerson(removed, person.id)).toBe(removed)
  })

  it('拒絕重複的標籤名稱，且名稱比對不分大小寫', () => {
    const tag = createTagDef({
      name: 'Math',
      type: 'enum',
      options: ['A', 'B'],
    })
    const roster = addTag(emptyRoster(), tag)

    expect(roster.tags).toHaveLength(1)
    expect(isTagNameTaken(roster, ' math ')).toBe(true)
    expect(addTag(roster, createTagDef({ name: 'math', type: 'enum' }))).toBe(
      roster,
    )
  })

  it('正規化標籤選項並去除重複與空白', () => {
    expect(normalizeTagOptions([' A ', '', 'B', 'A', '  '])).toEqual([
      'A',
      'B',
    ])
  })

  it('依標籤型別解析值並拒絕無效輸入', () => {
    const enumTag = createTagDef({ name: '組別', type: 'enum' })
    const numberTag = createTagDef({ name: '分數', type: 'number' })
    const booleanTag = createTagDef({ name: '幹部', type: 'boolean' })

    expect(parseTagValue(enumTag, ' A ')).toEqual({
      ok: true,
      value: 'A',
    })
    expect(parseTagValue(numberTag, '92')).toEqual({
      ok: true,
      value: 92,
    })
    expect(parseTagValue(numberTag, '數學')).toEqual({
      ok: false,
      message: '請輸入有效數值',
    })
    expect(parseTagValue(booleanTag, '是')).toEqual({
      ok: true,
      value: true,
    })
    expect(parseTagValue(booleanTag, '否')).toEqual({
      ok: true,
      value: false,
    })
    expect(parseTagValue(booleanTag, '也許')).toEqual({
      ok: false,
      message: '請輸入是或否',
    })
    expect(parseTagValue(enumTag, '   ')).toBeNull()
  })

  it('批次設定與清除標籤值，只影響指定人員', () => {
    const tag = createTagDef({
      name: '組別',
      type: 'enum',
      options: ['A', 'B'],
    })
    const first = createPerson({ name: '甲' })
    const second = createPerson({ name: '乙' })
    const roster = addTag(
      addPerson(addPerson(emptyRoster(), first), second),
      tag,
    )

    const applied = setTagValue(roster, [first.id], tag.id, 'A')
    expect(applied.persons[0].tags[tag.id]).toBe('A')
    expect(applied.persons[1].tags[tag.id]).toBeUndefined()

    const cleared = setTagValue(applied, [first.id], tag.id, null)
    expect(cleared.persons[0].tags[tag.id]).toBeUndefined()
    expect(setTagValue(cleared, [first.id], tag.id, null)).toBe(cleared)
  })

  it('變更標籤型別時清除不相容的人員值', () => {
    const tag = createTagDef({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })
    const person = createPerson({ name: '甲', tags: { [tag.id]: 'A' } })
    const roster = addTag(addPerson(emptyRoster(), person), tag)

    const updated = updateTag(roster, tag.id, {
      type: 'number',
      options: ['A'],
    })

    expect(updated.tags[0].type).toBe('number')
    expect(updated.tags[0].options).toEqual([])
    expect(updated.persons[0].tags[tag.id]).toBeUndefined()
  })

  it('縮減枚舉選項時移除失效值，刪除標籤時同步清除所有人員值', () => {
    const tag = createTagDef({
      name: '組別',
      type: 'enum',
      options: ['A', 'B'],
    })
    const person = createPerson({ name: '甲', tags: { [tag.id]: 'B' } })
    const roster = addTag(addPerson(emptyRoster(), person), tag)

    const updated = updateTag(roster, tag.id, { options: ['A'] })
    expect(updated.persons[0].tags[tag.id]).toBeUndefined()

    const removed = removeTag(roster, tag.id)
    expect(removed.tags).toHaveLength(0)
    expect(removed.persons[0].tags[tag.id]).toBeUndefined()
  })

  it('延伸既有標籤選項並加入新標籤', () => {
    const existing = createTagDef({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })
    const roster = addTag(emptyRoster(), existing)
    const extended = extendTagOptions(roster, [
      { ...existing, options: ['A', 'B'] },
      createTagDef({ name: '需求', type: 'enum', options: ['前排'] }),
    ])

    expect(extended.tags).toHaveLength(2)
    expect(extended.tags[0].options).toEqual(['A', 'B'])
  })
})
