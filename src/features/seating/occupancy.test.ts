import { describe, expect, it } from 'vitest'
import { createClassroom, setCellTypes } from '../classroom/classroomOps'
import {
  buildOccupancySummary,
  getPhaseCounts,
  isActiveSeat,
  resolvePhase,
} from './occupancy'

describe('occupancy', () => {
  it('連續模式使用所有座位並依填座順序排列', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    const summary = buildOccupancySummary(
      classroom,
      { kind: 'full' },
      { personCount: 6, fill: 'row-major' },
    )

    expect(summary.capacity).toBe(6)
    expect(summary.activeSeats.map((seat) => seat.id)).toEqual([
      'r0c0',
      'r0c1',
      'r0c2',
      'r1c0',
      'r1c1',
      'r1c2',
    ])
    expect(summary.resolvedPhase).toBeNull()
  })

  it('梅花模式只取符合相位的座位', () => {
    const classroom = createClassroom({ cols: 6, rows: 5 })
    const phaseZero = buildOccupancySummary(
      classroom,
      { kind: 'checkerboard', phase: 0 },
      { personCount: 15, fill: 'row-major' },
    )
    const phaseOne = buildOccupancySummary(
      classroom,
      { kind: 'checkerboard', phase: 1 },
      { personCount: 15, fill: 'row-major' },
    )

    expect(phaseZero.capacity).toBe(15)
    expect(phaseOne.capacity).toBe(15)
    expect(phaseZero.activeSeats.every((seat) => (seat.row + seat.col) % 2 === 0)).toBe(true)
    expect(phaseOne.activeSeats.every((seat) => (seat.row + seat.col) % 2 === 1)).toBe(true)
  })

  it('自動相位優先選擇能容納人數的相位', () => {
    const counts = { 0: 11, 1: 12 }

    expect(resolvePhase('auto', counts, 12)).toBe(1)
    expect(resolvePhase('auto', counts, 13)).toBe(1)
    expect(resolvePhase(0, counts, 13)).toBe(0)
  })

  it('兩相位都容納得下時選座位較多者，平手選相位 0', () => {
    expect(resolvePhase('auto', { 0: 14, 1: 12 }, 10)).toBe(0)
    expect(resolvePhase('auto', { 0: 12, 1: 14 }, 10)).toBe(1)
    expect(resolvePhase('auto', { 0: 12, 1: 12 }, 10)).toBe(0)
  })

  it('走道與禁坐不計入相位座位數', () => {
    const classroom = setCellTypes(
      createClassroom({ cols: 4, rows: 4 }),
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ],
      'aisle',
    )

    expect(getPhaseCounts(classroom)).toEqual({ 0: 7, 1: 6 })
  })

  it('pin 座位不符合相位時仍納入可用座位', () => {
    const classroom = createClassroom({ cols: 5, rows: 5 })
    const summary = buildOccupancySummary(
      classroom,
      { kind: 'checkerboard', phase: 0 },
      {
        personCount: 10,
        fill: 'row-major',
        extraSeatIds: ['r0c1', 'r0c1', 'not-a-seat'],
      },
    )

    expect(summary.capacity).toBe(14)
    expect(isActiveSeat(summary.activeSeats, 'r0c1')).toBe(true)
    expect(summary.activeSeats.filter((seat) => seat.id === 'r0c1')).toHaveLength(1)
  })

  it('蛇行填座順序只包含座位格', () => {
    const classroom = setCellTypes(
      createClassroom({ cols: 3, rows: 3 }),
      [{ row: 1, col: 1 }],
      'aisle',
    )
    const summary = buildOccupancySummary(
      classroom,
      { kind: 'full' },
      { personCount: 8, fill: 'snake' },
    )

    expect(summary.activeSeats.map((seat) => seat.id)).toEqual([
      'r0c0',
      'r0c1',
      'r0c2',
      'r1c2',
      'r1c0',
      'r2c0',
      'r2c1',
      'r2c2',
    ])
  })
})
