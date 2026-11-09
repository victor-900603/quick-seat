import { describe, expect, it } from 'vitest'
import type { CellType } from '../../types/domain'
import { getNeighborSeatIds } from './neighbors'

function classroom(rows: number, cols: number, types?: CellType[][]) {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols

      return { type: types?.[row]?.[col] ?? ('seat' as const) }
    }),
  }
}

describe('getNeighborSeatIds', () => {
  it('回傳中心座位的八個鄰居，順序為上下左右再斜角', () => {
    expect(getNeighborSeatIds(classroom(3, 3), 'r1c1')).toEqual([
      'r0c1',
      'r1c0',
      'r1c2',
      'r2c1',
      'r0c0',
      'r0c2',
      'r2c0',
      'r2c2',
    ])
  })

  it('正交模式只回傳上下左右', () => {
    expect(getNeighborSeatIds(classroom(3, 3), 'r1c1', 'orthogonal')).toEqual([
      'r0c1',
      'r1c0',
      'r1c2',
      'r2c1',
    ])
  })

  it('角落與邊界不會環繞', () => {
    expect(getNeighborSeatIds(classroom(3, 3), 'r0c0')).toEqual([
      'r0c1',
      'r1c0',
      'r1c1',
    ])
    expect(getNeighborSeatIds(classroom(3, 3), 'r0c1', 'orthogonal')).toEqual([
      'r0c0',
      'r0c2',
      'r1c1',
    ])
  })

  it('走道、禁坐與空白格不算鄰居', () => {
    const room = classroom(3, 3, [
      ['seat', 'aisle', 'seat'],
      ['blocked', 'seat', 'empty'],
      ['seat', 'seat', 'seat'],
    ])

    expect(getNeighborSeatIds(room, 'r1c1')).toEqual([
      'r2c1',
      'r0c0',
      'r0c2',
      'r2c0',
      'r2c2',
    ])
  })

  it('非座位或無效座標回傳空陣列', () => {
    const room = classroom(2, 2, [
      ['aisle', 'seat'],
      ['seat', 'seat'],
    ])

    expect(getNeighborSeatIds(room, 'r0c0')).toEqual([])
    expect(getNeighborSeatIds(room, 'r9c9')).toEqual([])
    expect(getNeighborSeatIds(room, 'invalid')).toEqual([])
  })
})
