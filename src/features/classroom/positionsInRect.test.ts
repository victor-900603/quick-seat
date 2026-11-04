import { describe, expect, it } from 'vitest'
import { createClassroom, positionsInRect } from './classroomOps'
import { seatId } from './numbering'

describe('positionsInRect', () => {
  it('回傳矩形內所有格子，順序為逐列由左至右', () => {
    const classroom = createClassroom({ cols: 4, rows: 3 })
    const positions = positionsInRect(
      classroom,
      { row: 0, col: 1 },
      { row: 1, col: 2 },
    )

    expect(positions.map((position) => seatId(position.row, position.col)))
      .toEqual(['r0c1', 'r0c2', 'r1c1', 'r1c2'])
  })

  it('支援反向拖曳並自動正規化', () => {
    const classroom = createClassroom({ cols: 4, rows: 4 })
    const positions = positionsInRect(
      classroom,
      { row: 3, col: 3 },
      { row: 2, col: 2 },
    )

    expect(positions).toHaveLength(4)
    expect(positions.map((position) => seatId(position.row, position.col)))
      .toEqual(['r2c2', 'r2c3', 'r3c2', 'r3c3'])
  })

  it('裁切超出教室範圍的座標', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    const positions = positionsInRect(
      classroom,
      { row: -2, col: -1 },
      { row: 10, col: 10 },
    )

    expect(positions).toHaveLength(6)
  })

  it('矩形完全在教室外時回傳空陣列', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })

    expect(
      positionsInRect(
        classroom,
        { row: 5, col: 0 },
        { row: 6, col: 2 },
      ),
    ).toEqual([])
  })

  it('單一格矩形只回傳一格', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    const positions = positionsInRect(
      classroom,
      { row: 1, col: 2 },
      { row: 1, col: 2 },
    )

    expect(positions).toEqual([{ row: 1, col: 2 }])
  })
})
