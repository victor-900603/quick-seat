import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import type {
  CellType,
  Classroom,
  NumberingOrder,
  SeatNumbering,
} from '../../types/domain'
import {
  MAX_CLASSROOM_SIZE,
  MIN_CLASSROOM_SIZE,
  normalizeNumbering,
} from '../classroom/classroomOps'
import { parseSeatId } from '../classroom/numbering'

export const CLASSROOM_SHARE_HASH_PREFIX = '#classroom='
export const MAX_CLASSROOM_SHARE_URL_LENGTH = 16000

const CELL_CODES: Record<CellType, string> = {
  seat: 's',
  aisle: 'a',
  blocked: 'b',
  empty: 'e',
}

const CODE_CELLS: Record<string, CellType> = {
  s: 'seat',
  a: 'aisle',
  b: 'blocked',
  e: 'empty',
}

const NUMBERING_ORDERS: NumberingOrder[] = [
  'row-major',
  'snake',
  'col-major',
]

export interface SharedClassroomV1 {
  version: 1
  cols: number
  rows: number
  cells: string
  numbering: SeatNumbering
  codeOverrides: Record<string, string>
}

export type ClassroomShareState =
  | { status: 'ready'; classroom: Classroom }
  | { status: 'error'; message: string }

export interface ClassroomShareStats {
  seats: number
  aisles: number
  blocked: number
  empty: number
}

export class ClassroomShareError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key]

  if (typeof value !== 'string') {
    throw new ClassroomShareError(`缺少或無效的欄位：${key}。`)
  }

  return value
}

function readInteger(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const value = record[key]

  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new ClassroomShareError(`欄位 ${key} 必須介於 ${min} 到 ${max}。`)
  }

  return value as number
}

function readNumbering(value: unknown): SeatNumbering {
  if (!isRecord(value)) {
    throw new ClassroomShareError('座位編號規則格式不正確。')
  }

  const pattern = readString(value, 'pattern').trim()
  const order = readString(value, 'order')
  const startAt = readInteger(value, 'startAt', 0, 9999)
  const pad = readInteger(value, 'pad', 0, 6)

  if (!pattern) {
    throw new ClassroomShareError('座位編號格式不可空白。')
  }

  if (!NUMBERING_ORDERS.includes(order as NumberingOrder)) {
    throw new ClassroomShareError('座位編號順序不正確。')
  }

  return normalizeNumbering({
    pattern,
    order: order as NumberingOrder,
    startAt,
    pad,
  })
}

function readOverrides(
  value: unknown,
  cols: number,
  rows: number,
  cells: string,
): Record<string, string> {
  if (!isRecord(value)) {
    throw new ClassroomShareError('自訂座位編號格式不正確。')
  }

  const overrides: Record<string, string> = {}

  for (const [key, code] of Object.entries(value)) {
    const position = parseSeatId(key)

    if (!position) {
      throw new ClassroomShareError(`自訂座位編號的座位格式不正確：${key}。`)
    }

    const { row, col } = position

    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      throw new ClassroomShareError(`自訂座位編號超出教室範圍：${key}。`)
    }

    if (cells[row * cols + col] !== CELL_CODES.seat) {
      throw new ClassroomShareError(`自訂座位編號只能套用到座位：${key}。`)
    }

    if (typeof code !== 'string') {
      throw new ClassroomShareError(`自訂座位編號的內容不正確：${key}。`)
    }

    const next = code.trim()

    if (!next) {
      throw new ClassroomShareError(`自訂座位編號不可空白：${key}。`)
    }

    overrides[key] = next
  }

  return overrides
}

function parseSharedClassroom(value: unknown): SharedClassroomV1 {
  if (!isRecord(value)) {
    throw new ClassroomShareError('分享資料格式不正確。')
  }

  if (value.version !== 1) {
    throw new ClassroomShareError('不支援的分享連結版本。')
  }

  const cols = readInteger(value, 'cols', MIN_CLASSROOM_SIZE, MAX_CLASSROOM_SIZE)
  const rows = readInteger(value, 'rows', MIN_CLASSROOM_SIZE, MAX_CLASSROOM_SIZE)
  const cells = readString(value, 'cells')

  if (cells.length !== cols * rows) {
    throw new ClassroomShareError('教室格子數量與尺寸不一致。')
  }

  if ([...cells].some((code) => !hasOwn(CODE_CELLS, code))) {
    throw new ClassroomShareError('教室格子包含不支援的型別。')
  }

  return {
    version: 1,
    cols,
    rows,
    cells,
    numbering: readNumbering(value.numbering),
    codeOverrides: readOverrides(value.codeOverrides, cols, rows, cells),
  }
}

export function toSharedClassroom(classroom: Classroom): SharedClassroomV1 {
  return {
    version: 1,
    cols: classroom.cols,
    rows: classroom.rows,
    cells: classroom.cells
      .map((cell) => CELL_CODES[cell.type])
      .join(''),
    numbering: { ...classroom.numbering },
    codeOverrides: { ...classroom.codeOverrides },
  }
}

export function serializeClassroomShare(classroom: Classroom): string {
  return compressToEncodedURIComponent(
    JSON.stringify(toSharedClassroom(classroom)),
  )
}

function restoreClassroom(shared: SharedClassroomV1): Classroom {
  return {
    id: crypto.randomUUID(),
    name: '分享的教室',
    cols: shared.cols,
    rows: shared.rows,
    cells: [...shared.cells].map((code) => ({
      type: CODE_CELLS[code],
    })),
    numbering: { ...shared.numbering },
    codeOverrides: { ...shared.codeOverrides },
  }
}

export function decodeClassroomShare(value: string): ClassroomShareState {
  if (!value) {
    return { status: 'error', message: '分享連結沒有教室資料。' }
  }

  try {
    const decompressed = decompressFromEncodedURIComponent(value)

    if (!decompressed) {
      return { status: 'error', message: '無法解開分享連結，資料可能已損毀。' }
    }

    const shared = parseSharedClassroom(JSON.parse(decompressed))

    return { status: 'ready', classroom: restoreClassroom(shared) }
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof ClassroomShareError
          ? error.message
          : '分享連結格式不正確。',
    }
  }
}

export function createClassroomShareUrl(
  classroom: Classroom,
  baseUrl: string,
): string {
  const url = new URL(baseUrl)
  url.hash = `classroom=${serializeClassroomShare(classroom)}`

  return url.toString()
}

export function isClassroomShareUrlTooLong(url: string): boolean {
  return url.length > MAX_CLASSROOM_SHARE_URL_LENGTH
}

export function readClassroomShareHash(hash: string): ClassroomShareState | null {
  if (!hash.startsWith(CLASSROOM_SHARE_HASH_PREFIX)) {
    return null
  }

  const value = hash.slice(CLASSROOM_SHARE_HASH_PREFIX.length)

  try {
    return decodeClassroomShare(decodeURIComponent(value))
  } catch {
    return { status: 'error', message: '分享連結格式不正確。' }
  }
}

export function clearClassroomShareHash(): void {
  if (typeof window === 'undefined') {
    return
  }

  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}`)
}

export function getClassroomShareStats(
  classroom: Pick<Classroom, 'cells'>,
): ClassroomShareStats {
  const stats: ClassroomShareStats = {
    seats: 0,
    aisles: 0,
    blocked: 0,
    empty: 0,
  }

  for (const cell of classroom.cells) {
    if (cell.type === 'seat') {
      stats.seats += 1
    } else if (cell.type === 'aisle') {
      stats.aisles += 1
    } else if (cell.type === 'blocked') {
      stats.blocked += 1
    } else {
      stats.empty += 1
    }
  }

  return stats
}

export function serializeClassroomShareJson(classroom: Classroom): string {
  return JSON.stringify(toSharedClassroom(classroom), null, 2)
}
