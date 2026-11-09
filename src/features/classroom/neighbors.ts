import type { Adjacency, Classroom } from '../../types/domain'
import { parseSeatId, seatId } from '../classroom/numbering'

interface Direction {
  row: number
  col: number
}

const ORTHOGONAL_DIRECTIONS: Direction[] = [
  { row: -1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
]

const DIAGONAL_DIRECTIONS: Direction[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
]

/**
 * 回傳指定座位周圍實際存在的座位格子。
 * 走道、禁坐與空白格不算鄰居；邊界不環繞。
 */
export function getNeighborSeatIds(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  sourceSeatId: string,
  adjacency: Adjacency = 'all8',
): string[] {
  const source = parseSeatId(sourceSeatId)

  if (!source || !isSeat(classroom, source.row, source.col)) {
    return []
  }

  const directions =
    adjacency === 'orthogonal'
      ? ORTHOGONAL_DIRECTIONS
      : [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
  const neighbors: string[] = []

  for (const direction of directions) {
    const row = source.row + direction.row
    const col = source.col + direction.col

    if (!isInside(classroom, row, col) || !isSeat(classroom, row, col)) {
      continue
    }

    neighbors.push(seatId(row, col))
  }

  return neighbors
}

function isInside(
  classroom: Pick<Classroom, 'cols' | 'rows'>,
  row: number,
  col: number,
): boolean {
  return row >= 0 && row < classroom.rows && col >= 0 && col < classroom.cols
}

function isSeat(
  classroom: Pick<Classroom, 'cols' | 'cells'>,
  row: number,
  col: number,
): boolean {
  return classroom.cells[row * classroom.cols + col]?.type === 'seat'
}
