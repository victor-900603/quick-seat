import { describe, expect, it } from 'vitest'
import type { Classroom } from '../../types/domain'
import {
  DEFAULT_NUMBERING,
  MAX_CLASSROOM_SIZE,
  MAX_CELL_SIZE,
  MIN_CLASSROOM_SIZE,
  cellIndex,
  clampCellSize,
  clampDimension,
  clearCodeOverride,
  createClassroom,
  fillRect,
  isInsideClassroom,
  normalizeNumbering,
  positionsInColumn,
  positionsInRow,
  resizeClassroom,
  setCellTypes,
  setCodeOverride,
  setColumnType,
  setRowType,
  updateNumbering,
} from './classroomOps'

function classroomOf(cols: number, rows: number): Classroom {
  return createClassroom({ cols, rows })
}

describe('createClassroom', () => {
  it('建立預設 6 欄 5 列且全部可坐的教室', () => {
    const classroom = createClassroom()

    expect(classroom.cols).toBe(6)
    expect(classroom.rows).toBe(5)
    expect(classroom.cells).toHaveLength(30)
    expect(classroom.cells.every((cell) => cell.type === 'seat')).toBe(true)
    expect(classroom.numbering).toEqual(DEFAULT_NUMBERING)
    expect(classroom.codeOverrides).toEqual({})
    expect(classroom.id).toBeTruthy()
  })

  it('限制尺寸並正規化編號', () => {
    const classroom = createClassroom({
      cols: 0,
      rows: 999,
      numbering: { pattern: '  ', order: 'col-major', startAt: -3, pad: 99 },
    })

    expect(classroom.cols).toBe(MIN_CLASSROOM_SIZE)
    expect(classroom.rows).toBe(MAX_CLASSROOM_SIZE)
    expect(classroom.numbering).toEqual({
      pattern: '{index}',
      order: 'col-major',
      startAt: 0,
      pad: 6,
    })
  })
})

describe('clampDimension', () => {
  it('將非有限數與小數轉為合法整數', () => {
    expect(clampDimension(Number.NaN)).toBe(1)
    expect(clampDimension(Number.POSITIVE_INFINITY)).toBe(1)
    expect(clampDimension(3.9)).toBe(3)
    expect(clampDimension(-4)).toBe(1)
    expect(clampDimension(61)).toBe(60)
  })
})

describe('clampCellSize', () => {
  it('限制格子大小在 40 至 64 之間', () => {
    expect(clampCellSize(39)).toBe(40)
    expect(clampCellSize(64)).toBe(MAX_CELL_SIZE)
    expect(clampCellSize(100)).toBe(MAX_CELL_SIZE)
    expect(clampCellSize(Number.NaN)).toBe(40)
  })
})

describe('isInsideClassroom / cellIndex', () => {
  it('判斷座標是否在教室內', () => {
    const classroom = classroomOf(3, 2)

    expect(isInsideClassroom(classroom, { row: 0, col: 0 })).toBe(true)
    expect(isInsideClassroom(classroom, { row: 1, col: 2 })).toBe(true)
    expect(isInsideClassroom(classroom, { row: 2, col: 0 })).toBe(false)
    expect(isInsideClassroom(classroom, { row: 0, col: 3 })).toBe(false)
    expect(isInsideClassroom(classroom, { row: -1, col: 0 })).toBe(false)
    expect(isInsideClassroom(classroom, { row: 0.5, col: 0 })).toBe(false)
    expect(cellIndex(3, { row: 1, col: 2 })).toBe(5)
  })
})

describe('resizeClassroom', () => {
  it('擴大時保留原格子並以座位補滿', () => {
    const classroom = classroomOf(2, 2)
    classroom.cells[3] = { type: 'blocked' }

    const resized = resizeClassroom(classroom, 3, 3)

    expect(resized.cols).toBe(3)
    expect(resized.rows).toBe(3)
    expect(resized.cells).toHaveLength(9)
    expect(resized.cells[0]).toEqual({ type: 'seat' })
    expect(resized.cells[4]).toEqual({ type: 'blocked' })
    expect(resized.cells[6]).toEqual({ type: 'seat' })
  })

  it('縮小時保留左上角並移除超出範圍的編號覆寫', () => {
    const classroom = setCodeOverride(classroomOf(3, 3), { row: 2, col: 2 }, 'A')
    const resized = resizeClassroom(classroom, 2, 2)

    expect(resized.cells).toHaveLength(4)
    expect(resized.codeOverrides).toEqual({})
  })

  it('尺寸未變時回傳同一個物件', () => {
    const classroom = classroomOf(3, 3)

    expect(resizeClassroom(classroom, 3, 3)).toBe(classroom)
    expect(resizeClassroom(classroom, 0, 0).cols).toBe(1)
  })
})

describe('setCellTypes', () => {
  it('批次設定格子型別並移除不再是座位的覆寫', () => {
    const classroom = setCodeOverride(classroomOf(3, 2), { row: 0, col: 1 }, 'A1')
    const next = setCellTypes(
      classroom,
      [
        { row: 0, col: 1 },
        { row: 1, col: 2 },
      ],
      'aisle',
    )

    expect(next.cells[1].type).toBe('aisle')
    expect(next.cells[5].type).toBe('aisle')
    expect(next.codeOverrides).toEqual({})
    expect(next.cells[0].type).toBe('seat')
  })

  it('忽略越界與相同型別，無變更時回傳同一物件', () => {
    const classroom = classroomOf(2, 2)

    expect(
      setCellTypes(classroom, [{ row: 5, col: 5 }], 'blocked'),
    ).toBe(classroom)
    expect(
      setCellTypes(classroom, [{ row: 0, col: 0 }], 'seat'),
    ).toBe(classroom)
  })
})

describe('fillRect', () => {
  it('支援反向拖曳並裁切到教室範圍', () => {
    const classroom = classroomOf(3, 3)
    const next = fillRect(
      classroom,
      { row: 2, col: 2 },
      { row: 1, col: 3 },
      'blocked',
    )

    expect(next.cells.filter((cell) => cell.type === 'blocked')).toHaveLength(2)
    expect(next.cells[cellIndex(3, { row: 1, col: 2 })].type).toBe('blocked')
    expect(next.cells[cellIndex(3, { row: 2, col: 2 })].type).toBe('blocked')
  })

  it('完全在範圍外時回傳同一物件', () => {
    const classroom = classroomOf(2, 2)

    expect(fillRect(classroom, { row: 5, col: 0 }, { row: 6, col: 1 }, 'seat')).toBe(
      classroom,
    )
  })
})

describe('positionsInRow / positionsInColumn', () => {
  it('列出完整橫列與直欄的格子座標', () => {
    const classroom = classroomOf(3, 2)

    expect(positionsInRow(classroom, 1)).toEqual([
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ])
    expect(positionsInColumn(classroom, 2)).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 2 },
    ])
  })
})

describe('setRowType / setColumnType', () => {
  it('整列與整欄批次設定型別', () => {
    const classroom = classroomOf(3, 3)
    const row = setRowType(classroom, 1, 'aisle')
    const column = setColumnType(row, 2, 'blocked')

    expect(column.cells.filter((cell) => cell.type === 'aisle')).toHaveLength(2)
    expect(column.cells.filter((cell) => cell.type === 'blocked')).toHaveLength(3)
    expect(column.cells[0].type).toBe('seat')
  })

  it('越界時回傳同一物件', () => {
    const classroom = classroomOf(3, 3)

    expect(setRowType(classroom, 3, 'aisle')).toBe(classroom)
    expect(setColumnType(classroom, -1, 'aisle')).toBe(classroom)
  })
})

describe('setCodeOverride / clearCodeOverride', () => {
  it('設定與清除座位編號覆寫', () => {
    const classroom = classroomOf(2, 2)
    const overridden = setCodeOverride(classroom, { row: 0, col: 0 }, '  7A  ')

    expect(overridden.codeOverrides['r0c0']).toBe('7A')
    expect(clearCodeOverride(overridden, { row: 0, col: 0 }).codeOverrides).toEqual(
      {},
    )
  })

  it('非座位、越界與相同值不變更', () => {
    const aisle = setCellTypes(classroomOf(2, 2), [{ row: 0, col: 0 }], 'aisle')

    expect(setCodeOverride(aisle, { row: 0, col: 0 }, 'X')).toBe(aisle)
    expect(setCodeOverride(aisle, { row: 5, col: 5 }, 'X')).toBe(aisle)
    expect(setCodeOverride(aisle, { row: 1, col: 1 }, '')).toBe(aisle)
  })
})

describe('updateNumbering', () => {
  it('合併並正規化編號設定', () => {
    const classroom = classroomOf(2, 2)
    const next = updateNumbering(classroom, {
      pattern: ' {row}-{col} ',
      order: 'snake',
      startAt: 3.7,
      pad: -1,
    })

    expect(next.numbering).toEqual({
      pattern: '{row}-{col}',
      order: 'snake',
      startAt: DEFAULT_NUMBERING.startAt,
      pad: 0,
    })
  })

  it('設定相同時回傳同一物件', () => {
    const classroom = classroomOf(2, 2)

    expect(updateNumbering(classroom, { pattern: '{index}' })).toBe(classroom)
  })
})

describe('normalizeNumbering', () => {
  it('保留合法順序並拒絕未知順序', () => {
    expect(
      normalizeNumbering({
        pattern: '{index}',
        order: 'col-major',
        startAt: 0,
        pad: 0,
      }).order,
    ).toBe('col-major')
    expect(
      normalizeNumbering({
        pattern: '{index}',
        // @ts-expect-error 測試外部資料
        order: 'diagonal',
        startAt: 0,
        pad: 0,
      }).order,
    ).toBe(DEFAULT_NUMBERING.order)
  })
})
