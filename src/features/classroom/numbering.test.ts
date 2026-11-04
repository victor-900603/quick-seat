import { describe, expect, it } from 'vitest'
import { createClassroom, setCellTypes, setCodeOverride } from './classroomOps'
import {
  countSeatCells,
  formatSeatCode,
  getSeatRefs,
  orderSeats,
  parseSeatId,
  seatId,
} from './numbering'

describe('seatId / parseSeatId', () => {
  it('產生與解析座位識別碼', () => {
    expect(seatId(1, 3)).toBe('r1c3')
    expect(parseSeatId('r1c3')).toEqual({ row: 1, col: 3 })
    expect(parseSeatId('r1c3x')).toBeNull()
    expect(parseSeatId('seat-1')).toBeNull()
  })
})

describe('orderSeats', () => {
  function classroomWithAisle() {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    return setCellTypes(classroom, [{ row: 0, col: 1 }], 'aisle')
  }

  it('row-major 由前到後、由左到右且只含座位', () => {
    expect(orderSeats(classroomWithAisle(), 'row-major')).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ])
  })

  it('col-major 由左到右、由前到後', () => {
    expect(orderSeats(classroomWithAisle(), 'col-major')).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
    ])
  })

  it('snake 逐排蛇行', () => {
    expect(orderSeats(classroomWithAisle(), 'snake')).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
    ])
  })
})

describe('formatSeatCode', () => {
  const numbering = {
    pattern: '{row}排{col}號-{index}',
    order: 'row-major' as const,
    startAt: 7,
    pad: 3,
  }

  it('替換所有佔位符並補零', () => {
    expect(formatSeatCode(numbering, { row: 0, col: 2, index: 7 })).toBe(
      '1排3號-007',
    )
  })

  it('沒有佔位符時保留原字串', () => {
    expect(
      formatSeatCode(
        { ...numbering, pattern: '固定' },
        { row: 0, col: 0, index: 0 },
      ),
    ).toBe('固定')
  })
})

describe('getSeatRefs', () => {
  it('只遞增座位序號並套用覆寫', () => {
    const classroom = setCellTypes(
      createClassroom({ cols: 2, rows: 2 }),
      [{ row: 0, col: 0 }],
      'aisle',
    )
    const overridden = setCodeOverride(classroom, { row: 1, col: 0 }, '特1')

    const refs = getSeatRefs(overridden)

    expect(refs).toEqual([
      { id: 'r0c1', row: 0, col: 1, code: '01' },
      { id: 'r1c0', row: 1, col: 0, code: '特1' },
      { id: 'r1c1', row: 1, col: 1, code: '03' },
    ])
  })

  it('空白覆寫退回自動編號', () => {
    const classroom = createClassroom({
      cols: 1,
      rows: 1,
      numbering: { pattern: 'S{index}', startAt: 5, pad: 2 },
    })
    const overridden = {
      ...classroom,
      codeOverrides: { r0c0: '   ' },
    }

    expect(getSeatRefs(overridden)[0].code).toBe('S05')
  })
})

describe('countSeatCells', () => {
  it('只計算座位格', () => {
    const classroom = setCellTypes(
      createClassroom({ cols: 2, rows: 2 }),
      [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ],
      'blocked',
    )

    expect(countSeatCells(classroom)).toBe(2)
  })
})
