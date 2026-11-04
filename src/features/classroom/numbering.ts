import type {
  Classroom,
  NumberingOrder,
  SeatNumbering,
  SeatRef,
} from '../../types/domain'

export interface OrderedSeat {
  row: number
  col: number
}

export function seatId(row: number, col: number): string {
  return `r${row}c${col}`
}

export function parseSeatId(id: string): OrderedSeat | null {
  const match = /^r(\d+)c(\d+)$/.exec(id)

  if (!match) {
    return null
  }

  return { row: Number(match[1]), col: Number(match[2]) }
}

export function orderSeats(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  order: NumberingOrder,
): OrderedSeat[] {
  if (order === 'col-major') {
    const seats: OrderedSeat[] = []

    for (let col = 0; col < classroom.cols; col += 1) {
      for (let row = 0; row < classroom.rows; row += 1) {
        if (classroom.cells[row * classroom.cols + col]?.type === 'seat') {
          seats.push({ row, col })
        }
      }
    }

    return seats
  }

  const seats: OrderedSeat[] = []

  for (let row = 0; row < classroom.rows; row += 1) {
    if (order === 'snake' && row % 2 === 1) {
      for (let col = classroom.cols - 1; col >= 0; col -= 1) {
        if (classroom.cells[row * classroom.cols + col]?.type === 'seat') {
          seats.push({ row, col })
        }
      }
    } else {
      for (let col = 0; col < classroom.cols; col += 1) {
        if (classroom.cells[row * classroom.cols + col]?.type === 'seat') {
          seats.push({ row, col })
        }
      }
    }
  }

  return seats
}

export function formatSeatCode(
  numbering: SeatNumbering,
  values: { row: number; col: number; index: number },
): string {
  const index = String(values.index).padStart(numbering.pad, '0')

  return numbering.pattern
    .replaceAll('{row}', String(values.row + 1))
    .replaceAll('{col}', String(values.col + 1))
    .replaceAll('{index}', index)
}

export function getSeatRefs(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells' | 'numbering' | 'codeOverrides'>,
): SeatRef[] {
  return orderSeats(classroom, classroom.numbering.order).map(
    (seat, ordinal) => {
      const id = seatId(seat.row, seat.col)
      const code = formatSeatCode(classroom.numbering, {
        row: seat.row,
        col: seat.col,
        index: classroom.numbering.startAt + ordinal,
      })

      return {
        id,
        row: seat.row,
        col: seat.col,
        code: classroom.codeOverrides[id]?.trim() || code,
      }
    },
  )
}

export function countSeatCells(
  classroom: Pick<Classroom, 'cells'>,
): number {
  return classroom.cells.filter((cell) => cell.type === 'seat').length
}
