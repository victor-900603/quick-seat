import type { CellType, NumberingOrder, Project } from '../types/domain'

export const ACTIVE_PROJECT_KEY = 'quick-seat:v1:active'

export type SaveResult =
  | { ok: true }
  | { ok: false; message: string }

const CELL_TYPES: CellType[] = ['seat', 'aisle', 'blocked', 'empty']
const NUMBERING_ORDERS: NumberingOrder[] = ['row-major', 'snake', 'col-major']
const DISPLAY_MODES = ['name', 'studentNo', 'both', 'none']
const ADJACENCIES = ['orthogonal', 'all8']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isClassroom(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  const { cols, rows, cells, numbering, codeOverrides } = value

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    (cols as number) < 1 ||
    (rows as number) < 1 ||
    (cols as number) > 60 ||
    (rows as number) > 60
  ) {
    return false
  }

  if (
    !Array.isArray(cells) ||
    cells.length !== (cols as number) * (rows as number) ||
    !cells.every(
      (cell) => isRecord(cell) && CELL_TYPES.includes(cell.type as CellType),
    )
  ) {
    return false
  }

  if (
    !isRecord(numbering) ||
    typeof numbering.pattern !== 'string' ||
    !NUMBERING_ORDERS.includes(numbering.order as NumberingOrder) ||
    !Number.isInteger(numbering.startAt) ||
    !Number.isInteger(numbering.pad)
  ) {
    return false
  }

  return (
    isRecord(codeOverrides) &&
    Object.values(codeOverrides).every((code) => typeof code === 'string')
  )
}

function isRoster(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    Array.isArray(value.persons) &&
    value.persons.every(
      (person) =>
        isRecord(person) &&
        typeof person.id === 'string' &&
        typeof person.name === 'string' &&
        typeof person.studentNo === 'string',
    ) &&
    Array.isArray(value.tags) &&
    isStringArray(value.extraColumns)
  )
}

function isSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    DISPLAY_MODES.includes(value.display as string) &&
    ADJACENCIES.includes(value.adjacencyDefault as string) &&
    typeof value.cellSize === 'number' &&
    typeof value.printShowTagColors === 'boolean'
  )
}

export function isProject(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isClassroom(value.classroom) &&
    isRoster(value.roster) &&
    Array.isArray(value.rules) &&
    isStringArray(value.lockedPersonIds) &&
    (value.currentAssignment === null || isRecord(value.currentAssignment)) &&
    isSettings(value.settings)
  )
}

export function loadProject(storage?: Storage): Project | null {
  try {
    const target = storage ?? globalThis.localStorage
    const raw = target.getItem(ACTIVE_PROJECT_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    return isProject(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProject(project: Project, storage?: Storage): SaveResult {
  try {
    const target = storage ?? globalThis.localStorage
    target.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : '無法寫入瀏覽器本機儲存空間',
    }
  }
}
