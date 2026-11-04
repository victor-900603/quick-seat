import type { Cell, Classroom, OccupancyMode } from '../../types/domain'
import { MAX_CLASSROOM_SIZE } from '../classroom/classroomOps'
import {
  buildOccupancySummary,
  type OccupancySummary,
} from './occupancy'

export interface CapacityReport {
  personCount: number
  capacity: number
  shortage: boolean
  missing: number
  phaseCounts: OccupancySummary['phaseCounts']
  resolvedPhase: 0 | 1 | null
}

export function getCapacityReport(
  summary: OccupancySummary,
  personCount: number,
): CapacityReport {
  return {
    personCount,
    capacity: summary.capacity,
    shortage: personCount > summary.capacity,
    missing: Math.max(0, personCount - summary.capacity),
    phaseCounts: summary.phaseCounts,
    resolvedPhase: summary.resolvedPhase,
  }
}

function classroomAtSize(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  cols: number,
  rows: number,
): Pick<Classroom, 'cols' | 'rows' | 'cells'> {
  const cells: Cell[] = Array.from({ length: cols * rows }, () => ({
    type: 'seat',
  }))

  for (let row = 0; row < classroom.rows; row += 1) {
    for (let col = 0; col < classroom.cols; col += 1) {
      cells[row * cols + col] = classroom.cells[row * classroom.cols + col]
    }
  }

  return { cols, rows, cells }
}

export function capacityAtSize(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  occupancy: OccupancyMode,
  personCount: number,
  cols: number,
  rows: number,
): number {
  return buildOccupancySummary(
    classroomAtSize(classroom, cols, rows),
    occupancy,
    { personCount, fill: 'row-major' },
  ).capacity
}

export interface ClassroomSize {
  cols: number
  rows: number
}

/**
 * 優先增加列，列數達上限後再增加欄，直到容量足夠或達 60×60。
 */
export function expandClassroomForCapacity(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  occupancy: OccupancyMode,
  personCount: number,
): ClassroomSize | null {
  let cols = classroom.cols
  let rows = classroom.rows

  if (
    capacityAtSize(classroom, occupancy, personCount, cols, rows) >= personCount
  ) {
    return null
  }

  while (rows < MAX_CLASSROOM_SIZE || cols < MAX_CLASSROOM_SIZE) {
    if (rows < MAX_CLASSROOM_SIZE) {
      rows += 1
    } else {
      cols += 1
    }

    if (
      capacityAtSize(classroom, occupancy, personCount, cols, rows) >=
      personCount
    ) {
      return { cols, rows }
    }
  }

  return null
}
