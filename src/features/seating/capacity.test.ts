import { describe, expect, it } from 'vitest'
import { createClassroom, setCellTypes } from '../classroom/classroomOps'
import {
  capacityAtSize,
  expandClassroomForCapacity,
  getCapacityReport,
} from './capacity'
import { buildOccupancySummary } from './occupancy'

describe('capacity', () => {
  it('回報人數、容量與缺少數量', () => {
    const classroom = createClassroom({ cols: 3, rows: 3 })
    const summary = buildOccupancySummary(
      classroom,
      { kind: 'full' },
      { personCount: 10, fill: 'row-major' },
    )

    expect(getCapacityReport(summary, 10)).toEqual({
      personCount: 10,
      capacity: 9,
      shortage: true,
      missing: 1,
      phaseCounts: { 0: 5, 1: 4 },
      resolvedPhase: null,
    })
  })

  it('連續模式優先增加列直到容量足夠', () => {
    const classroom = createClassroom({ cols: 3, rows: 3 })

    expect(
      expandClassroomForCapacity(classroom, { kind: 'full' }, 10),
    ).toEqual({ cols: 3, rows: 4 })
    expect(capacityAtSize(classroom, { kind: 'full' }, 10, 3, 4)).toBe(12)
  })

  it('梅花模式擴充後重新計算可用相位座位', () => {
    const classroom = createClassroom({ cols: 5, rows: 5 })

    expect(
      expandClassroomForCapacity(
        classroom,
        { kind: 'checkerboard', phase: 0 },
        14,
      ),
    ).toEqual({ cols: 5, rows: 6 })
  })

  it('容量已足夠時不擴充', () => {
    const classroom = createClassroom({ cols: 3, rows: 3 })

    expect(
      expandClassroomForCapacity(classroom, { kind: 'full' }, 9),
    ).toBeNull()
  })

  it('達到 60×60 仍不足時回傳 null', () => {
    const classroom = createClassroom({ cols: 60, rows: 60 })

    expect(
      expandClassroomForCapacity(classroom, { kind: 'full' }, 3601),
    ).toBeNull()
  })

  it('擴充時保留既有格子與走道', () => {
    const classroom = setCellTypes(
      createClassroom({ cols: 2, rows: 2 }),
      [{ row: 1, col: 1 }],
      'aisle',
    )
    const capacity = capacityAtSize(classroom, { kind: 'full' }, 5, 3, 2)

    expect(capacity).toBe(5)
  })
})
