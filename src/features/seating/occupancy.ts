import type {
  Classroom,
  NumberingOrder,
  OccupancyMode,
} from '../../types/domain'
import { orderSeats, parseSeatId, seatId } from '../classroom/numbering'

export interface SeatSlot {
  id: string
  row: number
  col: number
}

export interface PhaseCounts {
  0: number
  1: number
}

export interface OccupancySummary {
  requested: OccupancyMode
  /** 已解析相位的模式；auto 會轉為 0 或 1。 */
  mode: OccupancyMode
  resolvedPhase: 0 | 1 | null
  phaseCounts: PhaseCounts
  activeSeats: SeatSlot[]
  capacity: number
}

export interface OccupancyOptions {
  personCount: number
  fill: NumberingOrder
  /** pin 座位一律納入可用座位，即使不符合梅花相位。 */
  extraSeatIds?: Iterable<string>
}

export function isSeatCell(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  row: number,
  col: number,
): boolean {
  return (
    row >= 0 &&
    col >= 0 &&
    row < classroom.rows &&
    col < classroom.cols &&
    classroom.cells[row * classroom.cols + col]?.type === 'seat'
  )
}

export function getPhaseCounts(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
): PhaseCounts {
  const counts: PhaseCounts = { 0: 0, 1: 0 }

  for (let row = 0; row < classroom.rows; row += 1) {
    for (let col = 0; col < classroom.cols; col += 1) {
      if (!isSeatCell(classroom, row, col)) {
        continue
      }

      counts[(row + col) % 2 as 0 | 1] += 1
    }
  }

  return counts
}

export function resolvePhase(
  phase: 0 | 1 | 'auto',
  counts: PhaseCounts,
  personCount: number,
): 0 | 1 {
  if (phase !== 'auto') {
    return phase
  }

  const canUseZero = counts[0] >= personCount
  const canUseOne = counts[1] >= personCount

  if (canUseZero !== canUseOne) {
    return canUseZero ? 0 : 1
  }

  if (counts[0] !== counts[1]) {
    return counts[0] > counts[1] ? 0 : 1
  }

  return 0
}

export function buildOccupancySummary(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  occupancy: OccupancyMode,
  options: OccupancyOptions,
): OccupancySummary {
  const phaseCounts = getPhaseCounts(classroom)
  const resolvedPhase =
    occupancy.kind === 'checkerboard'
      ? resolvePhase(occupancy.phase, phaseCounts, options.personCount)
      : null
  const activeSeats: SeatSlot[] = []
  const seen = new Set<string>()

  for (const seat of orderSeats(classroom, options.fill)) {
    if (
      occupancy.kind === 'checkerboard' &&
      (seat.row + seat.col) % 2 !== resolvedPhase
    ) {
      continue
    }

    const id = seatId(seat.row, seat.col)
    seen.add(id)
    activeSeats.push({ id, row: seat.row, col: seat.col })
  }

  for (const extraId of options.extraSeatIds ?? []) {
    if (seen.has(extraId)) {
      continue
    }

    const position = parseSeatId(extraId)

    if (
      !position ||
      !isSeatCell(classroom, position.row, position.col)
    ) {
      continue
    }

    seen.add(extraId)
    activeSeats.push({ id: extraId, ...position })
  }

  return {
    requested: occupancy,
    mode:
      occupancy.kind === 'checkerboard'
        ? { kind: 'checkerboard', phase: resolvedPhase as 0 | 1 }
        : { kind: 'full' },
    resolvedPhase,
    phaseCounts,
    activeSeats,
    capacity: activeSeats.length,
  }
}

export function isActiveSeat(
  activeSeats: Iterable<SeatSlot>,
  targetSeatId: string,
): boolean {
  for (const seat of activeSeats) {
    if (seat.id === targetSeatId) {
      return true
    }
  }

  return false
}

export function activeSeatIds(summary: OccupancySummary): Set<string> {
  return new Set(summary.activeSeats.map((seat) => seat.id))
}
