import { describe, expect, it } from 'vitest'
import type { Person } from '../../types/domain'
import {
  allocatePersons,
  createSeed,
  hashSeed,
  mulberry32,
  orderPersons,
  shuffleWithSeed,
  sortPersons,
} from './allocation'
import type { SeatSlot } from './occupancy'

function person(id: string, name: string, studentNo: string): Person {
  return {
    id,
    name,
    studentNo,
    tags: {},
    extra: {},
    note: '',
  }
}

const people = [
  person('p1', '王小明', '10'),
  person('p2', '陳小美', '2'),
  person('p3', '林大華', 'A01'),
  person('p4', '張小安', '2'),
]

describe('allocation', () => {
  it('座號以數值排序，非數值退回字串比較', () => {
    expect(
      sortPersons(people, 'studentNo').map((item) => item.studentNo),
    ).toEqual(['2', '2', '10', 'A01'])
  })

  it('同座號維持匯入順序', () => {
    expect(
      sortPersons(people, 'studentNo').map((item) => item.id),
    ).toEqual(['p2', 'p4', 'p1', 'p3'])
  })

  it('姓名使用 zh-Hant 排序', () => {
    expect(
      sortPersons(people, 'name').map((item) => item.name),
    ).toEqual(['王小明', '林大華', '張小安', '陳小美'])
  })

  it('相同種子與輸入產生相同洗牌結果', () => {
    const first = shuffleWithSeed(people, 'seed-1')
    const second = shuffleWithSeed(people, 'seed-1')

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
    expect(first.map((item) => item.id)).not.toEqual(
      shuffleWithSeed(people, 'seed-2').map((item) => item.id),
    )
  })

  it('mulberry32 對相同種子產生相同序列', () => {
    const first = mulberry32(hashSeed('42'))
    const second = mulberry32(hashSeed('42'))

    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })

  it('排序模式依指定順序填入座位，超出容量列為未分配', () => {
    const seats: SeatSlot[] = [
      { id: 'r0c0', row: 0, col: 0 },
      { id: 'r0c1', row: 0, col: 1 },
    ]
    const outcome = allocatePersons(
      people,
      seats,
      { kind: 'ordered', orderBy: 'studentNo', fill: 'row-major' },
      'seed',
    )

    expect(outcome.assignments).toEqual({
      r0c0: 'p2',
      r0c1: 'p4',
    })
    expect(outcome.unassignedPersonIds).toEqual(['p1', 'p3'])
  })

  it('隨機模式可重現且使用所有座位', () => {
    const seats: SeatSlot[] = [
      { id: 'r0c0', row: 0, col: 0 },
      { id: 'r0c1', row: 0, col: 1 },
      { id: 'r0c2', row: 0, col: 2 },
      { id: 'r0c3', row: 0, col: 3 },
    ]
    const allocation = { kind: 'random' as const }
    const first = allocatePersons(people, seats, allocation, 'repeat')
    const second = allocatePersons(people, seats, allocation, 'repeat')

    expect(first.assignments).toEqual(second.assignments)
    expect(Object.keys(first.assignments)).toHaveLength(4)
  })

  it('orderPersons 不修改原始陣列', () => {
    const original = [...people]
    orderPersons(
      people,
      { kind: 'ordered', orderBy: 'name', fill: 'row-major' },
      'seed',
    )

    expect(people).toEqual(original)
  })

  it('建立的種子可作為字串使用', () => {
    expect(typeof createSeed()).toBe('string')
    expect(createSeed().length).toBeGreaterThan(0)
  })
})
