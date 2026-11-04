import type {
  Cell,
  CellType,
  Classroom,
  NumberingOrder,
  SeatNumbering,
} from '../../types/domain'
import { seatId } from './numbering'

export interface CellPosition {
  row: number
  col: number
}

export const MIN_CLASSROOM_SIZE = 1
export const MAX_CLASSROOM_SIZE = 60
export const DEFAULT_CLASSROOM_COLS = 6
export const DEFAULT_CLASSROOM_ROWS = 5
export const MIN_CELL_SIZE = 40
export const MAX_CELL_SIZE = 64

export const DEFAULT_NUMBERING: SeatNumbering = {
  pattern: '{index}',
  order: 'row-major',
  startAt: 1,
  pad: 2,
}

const NUMBERING_ORDERS: NumberingOrder[] = ['row-major', 'snake', 'col-major']

export function clampDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CLASSROOM_SIZE
  }

  return Math.min(
    MAX_CLASSROOM_SIZE,
    Math.max(MIN_CLASSROOM_SIZE, Math.trunc(value)),
  )
}

export function clampCellSize(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CELL_SIZE
  }

  return Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, Math.trunc(value)))
}

export function isInsideClassroom(
  classroom: Pick<Classroom, 'cols' | 'rows'>,
  position: CellPosition,
): boolean {
  return (
    Number.isInteger(position.row) &&
    Number.isInteger(position.col) &&
    position.row >= 0 &&
    position.col >= 0 &&
    position.row < classroom.rows &&
    position.col < classroom.cols
  )
}

export function cellIndex(cols: number, position: CellPosition): number {
  return position.row * cols + position.col
}

export function createClassroom(
  options: {
    cols?: number
    rows?: number
    name?: string
    numbering?: Partial<SeatNumbering>
  } = {},
): Classroom {
  const cols = clampDimension(options.cols ?? DEFAULT_CLASSROOM_COLS)
  const rows = clampDimension(options.rows ?? DEFAULT_CLASSROOM_ROWS)

  return {
    id: crypto.randomUUID(),
    name: options.name ?? '教室',
    cols,
    rows,
    cells: Array.from({ length: cols * rows }, () => ({ type: 'seat' as const })),
    numbering: normalizeNumbering({
      ...DEFAULT_NUMBERING,
      ...options.numbering,
    }),
    codeOverrides: {},
  }
}

export function normalizeNumbering(numbering: SeatNumbering): SeatNumbering {
  const pattern = numbering.pattern.trim() || DEFAULT_NUMBERING.pattern
  const order = NUMBERING_ORDERS.includes(numbering.order)
    ? numbering.order
    : DEFAULT_NUMBERING.order
  const startAt = Number.isInteger(numbering.startAt)
    ? Math.min(9999, Math.max(0, numbering.startAt))
    : DEFAULT_NUMBERING.startAt
  const pad = Number.isInteger(numbering.pad)
    ? Math.min(6, Math.max(0, numbering.pad))
    : DEFAULT_NUMBERING.pad

  return { pattern, order, startAt, pad }
}

export function updateNumbering(
  classroom: Classroom,
  patch: Partial<SeatNumbering>,
): Classroom {
  const numbering = normalizeNumbering({ ...classroom.numbering, ...patch })

  if (
    numbering.pattern === classroom.numbering.pattern &&
    numbering.order === classroom.numbering.order &&
    numbering.startAt === classroom.numbering.startAt &&
    numbering.pad === classroom.numbering.pad
  ) {
    return classroom
  }

  return { ...classroom, numbering }
}

function pruneOverrides(
  classroom: Classroom,
  cols: number,
  rows: number,
  cells: Cell[],
): Record<string, string> {
  const next: Record<string, string> = {}

  for (const [id, code] of Object.entries(classroom.codeOverrides)) {
    const match = /^r(\d+)c(\d+)$/.exec(id)

    if (!match) {
      continue
    }

    const row = Number(match[1])
    const col = Number(match[2])

    if (row >= rows || col >= cols) {
      continue
    }

    if (cells[row * cols + col]?.type !== 'seat') {
      continue
    }

    next[id] = code
  }

  return next
}

export function resizeClassroom(
  classroom: Classroom,
  cols: number,
  rows: number,
): Classroom {
  const nextCols = clampDimension(cols)
  const nextRows = clampDimension(rows)

  if (nextCols === classroom.cols && nextRows === classroom.rows) {
    return classroom
  }

  const cells: Cell[] = Array.from(
    { length: nextCols * nextRows },
    (_, index) => {
      const row = Math.floor(index / nextCols)
      const col = index % nextCols

      if (row < classroom.rows && col < classroom.cols) {
        return classroom.cells[row * classroom.cols + col] ?? { type: 'empty' }
      }

      return { type: 'seat' }
    },
  )

  return {
    ...classroom,
    cols: nextCols,
    rows: nextRows,
    cells,
    codeOverrides: pruneOverrides(classroom, nextCols, nextRows, cells),
  }
}

export function setCellTypes(
  classroom: Classroom,
  positions: CellPosition[],
  type: CellType,
): Classroom {
  let cells: Cell[] | null = null

  for (const position of positions) {
    if (!isInsideClassroom(classroom, position)) {
      continue
    }

    const index = cellIndex(classroom.cols, position)
    const current = classroom.cells[index]

    if (!current || current.type === type) {
      continue
    }

    if (!cells) {
      cells = classroom.cells.slice()
    }

    cells[index] = { type }
  }

  if (!cells) {
    return classroom
  }

  return {
    ...classroom,
    cells,
    codeOverrides: pruneOverrides(
      classroom,
      classroom.cols,
      classroom.rows,
      cells,
    ),
  }
}

export function fillRect(
  classroom: Classroom,
  from: CellPosition,
  to: CellPosition,
  type: CellType,
): Classroom {
  const startRow = Math.max(0, Math.min(from.row, to.row))
  const endRow = Math.min(classroom.rows - 1, Math.max(from.row, to.row))
  const startCol = Math.max(0, Math.min(from.col, to.col))
  const endCol = Math.min(classroom.cols - 1, Math.max(from.col, to.col))

  if (startRow > endRow || startCol > endCol) {
    return classroom
  }

  const positions: CellPosition[] = []

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      positions.push({ row, col })
    }
  }

  return setCellTypes(classroom, positions, type)
}

export function setRowType(
  classroom: Classroom,
  row: number,
  type: CellType,
): Classroom {
  if (row < 0 || row >= classroom.rows) {
    return classroom
  }

  return setCellTypes(
    classroom,
    Array.from({ length: classroom.cols }, (_, col) => ({ row, col })),
    type,
  )
}

export function setColumnType(
  classroom: Classroom,
  col: number,
  type: CellType,
): Classroom {
  if (col < 0 || col >= classroom.cols) {
    return classroom
  }

  return setCellTypes(
    classroom,
    Array.from({ length: classroom.rows }, (_, row) => ({ row, col })),
    type,
  )
}

export function setCodeOverride(
  classroom: Classroom,
  seat: CellPosition,
  code: string,
): Classroom {
  if (!isInsideClassroom(classroom, seat)) {
    return classroom
  }

  const index = cellIndex(classroom.cols, seat)

  if (classroom.cells[index]?.type !== 'seat') {
    return classroom
  }

  const id = seatId(seat.row, seat.col)
  const nextCode = code.trim()
  const currentCode = classroom.codeOverrides[id] ?? ''

  if (nextCode === currentCode) {
    return classroom
  }

  const codeOverrides = { ...classroom.codeOverrides }

  if (nextCode) {
    codeOverrides[id] = nextCode
  } else {
    delete codeOverrides[id]
  }

  return { ...classroom, codeOverrides }
}

export function clearCodeOverride(
  classroom: Classroom,
  seat: CellPosition,
): Classroom {
  return setCodeOverride(classroom, seat, '')
}
