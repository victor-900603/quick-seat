import type {
  CellType,
  Person,
  Project,
  TagDef,
} from '../../types/domain'
import { getSeatRefs } from '../classroom/numbering'
import { isAssignmentStale } from '../seating/revision'
import { formatTagValue } from '../roster/rosterOps'

export interface ExportTagValue {
  id: string
  name: string
  value: string
  color: string
}

export interface ExportPerson {
  id: string
  name: string
  studentNo: string
  note: string
  tags: ExportTagValue[]
  extra: Record<string, string>
}

export interface ExportSeat {
  id: string
  code: string
  row: number
  col: number
  type: 'seat'
  person: ExportPerson | null
}

export interface ExportGridCell {
  type: CellType
  seat: ExportSeat | null
}

export interface ExportRosterRow {
  person: ExportPerson
  seatCode: string | null
}

export type ExportTextAlign = 'left' | 'center'
export type ExportPaperSize = 'A4' | 'A3' | 'Letter'
export type ExportOrientation = 'landscape' | 'portrait'

export const EXPORT_PAPER_SPECS: Record<
  ExportPaperSize,
  { label: string; widthMm: number; heightMm: number }
> = {
  A4: { label: 'A4', widthMm: 210, heightMm: 297 },
  A3: { label: 'A3', widthMm: 297, heightMm: 420 },
  Letter: { label: 'Letter', widthMm: 215.9, heightMm: 279.4 },
}

export const EXPORT_LAYOUT_LIMITS = {
  htmlCellHeight: { min: 36, max: 120, step: 2 },
  htmlFontSize: { min: 8, max: 18, step: 1 },
  marginMm: { min: 0, max: 20, step: 1 },
  rowsPerPage: { min: 1, max: 30, step: 1 },
  cellGap: { min: 0, max: 8, step: 1 },
  borderWidth: { min: 0, max: 3, step: 1 },
  unusedColumnWidth: { min: 10, max: 100, step: 5 },
  unusedRowHeight: { min: 10, max: 100, step: 5 },
} as const

export interface ExportContentOptions {
  template: string
  align: ExportTextAlign
  htmlCellHeight: number
  htmlFontSize: number
  htmlWrap: boolean
  paperSize: ExportPaperSize
  orientation: ExportOrientation
  marginMm: number
  rowsPerPage: number
  showPageBorder: boolean
  showPageNumbers: boolean
  repeatHeader: boolean
  showTitle: boolean
  showStats: boolean
  showStage: boolean
  showUnassigned: boolean
  showFooter: boolean
  showGeneratedAt: boolean
  showNotes: boolean
  showTags: boolean
  showAisleLabel: boolean
  cellGap: number
  borderWidth: number
  unusedColumnWidth: number
  unusedRowHeight: number
  excelHiddenColumns: string[]
  includeRuleReport: boolean
  showRuleReportPage: boolean
  showRuleReportSeats: boolean
  showRuleReportPersons: boolean
  showRuleReportNotes: boolean
}

export interface ExportPageDimensions {
  widthMm: number
  heightMm: number
  widthPx: number
  heightPx: number
  printHeightMm: number
  cssSize: string
  label: string
}

export interface ExportRowsPerPage {
  maxRows: number
  effectiveRows: number
}

const MM_TO_PX = 96 / 25.4

// Conservative heights (mm) for page chrome, used to keep one paper page
// from being stretched by its content.
const PAGE_PADDING_MM = 12
const HEADER_MM = 17
const STAGE_MM = 9
const FOOTER_MM = 12
const SAFETY_MM = 4

export function getExportPageDimensions(
  options: Pick<
    ExportContentOptions,
    'paperSize' | 'orientation' | 'marginMm'
  >,
): ExportPageDimensions {
  const spec = EXPORT_PAPER_SPECS[options.paperSize]
  const widthMm =
    options.orientation === 'landscape' ? spec.heightMm : spec.widthMm
  const heightMm =
    options.orientation === 'landscape' ? spec.widthMm : spec.heightMm

  return {
    widthMm,
    heightMm,
    widthPx: Math.round(widthMm * MM_TO_PX),
    heightPx: Math.round(heightMm * MM_TO_PX),
    printHeightMm: Math.max(1, heightMm - options.marginMm * 2),
    cssSize: `${options.paperSize} ${options.orientation}`,
    label: `${spec.label} ${
      options.orientation === 'landscape' ? '橫向' : '直向'
    }`,
  }
}

export function getExportRowsPerPage(
  options: Pick<
    ExportContentOptions,
    | 'paperSize'
    | 'orientation'
    | 'marginMm'
    | 'htmlCellHeight'
    | 'cellGap'
    | 'rowsPerPage'
    | 'showTitle'
    | 'showStats'
    | 'showStage'
    | 'showFooter'
    | 'showGeneratedAt'
    | 'showPageNumbers'
  >,
): ExportRowsPerPage {
  const paper = getExportPageDimensions(options)
  let availableMm = paper.printHeightMm - PAGE_PADDING_MM - SAFETY_MM

  if (options.showTitle || options.showStats) {
    availableMm -= HEADER_MM
  }

  if (options.showStage) {
    availableMm -= STAGE_MM
  }

  if (
    options.showFooter ||
    options.showGeneratedAt ||
    options.showPageNumbers
  ) {
    availableMm -= FOOTER_MM
  }

  const rowMm = ((options.htmlCellHeight + options.cellGap) * 25.4) / 96
  const maxRows = Math.max(1, Math.floor(availableMm / rowMm))

  return {
    maxRows,
    effectiveRows: Math.min(Math.max(1, options.rowsPerPage), maxRows),
  }
}

export interface ExportTrackLayout {
  unusedRows: boolean[]
  unusedColumns: boolean[]
  rowHeights: number[]
  columnWeights: number[]
  unusedRowCount: number
  unusedColumnCount: number
}

export function getExportTrackLayout(
  snapshot: Pick<ExportSnapshot, 'grid' | 'cols'>,
  options: Pick<
    ExportContentOptions,
    'htmlCellHeight' | 'unusedColumnWidth' | 'unusedRowHeight'
  >,
): ExportTrackLayout {
  const columnCount = Math.max(snapshot.cols, 1)
  const unusedRows = snapshot.grid.map(
    (row) => row.length > 0 && row.every((cell) => cell.type !== 'seat'),
  )
  const unusedColumns = Array.from({ length: columnCount }, (_, col) => {
    const cells = snapshot.grid.map((row) => row[col])

    return (
      cells.length > 0 &&
      cells.every((cell) => cell !== undefined && cell.type !== 'seat')
    )
  })
  const rowHeights = unusedRows.map((unused) =>
    Math.round(
      (options.htmlCellHeight * (unused ? options.unusedRowHeight : 100)) /
        100,
    ),
  )
  const columnWeights = unusedColumns.map((unused) =>
    Math.round(
      ((unused ? options.unusedColumnWidth : 100) / 100) * 100,
    ) / 100,
  )

  return {
    unusedRows,
    unusedColumns,
    rowHeights,
    columnWeights,
    unusedRowCount: unusedRows.filter(Boolean).length,
    unusedColumnCount: unusedColumns.filter(Boolean).length,
  }
}

export const DEFAULT_EXPORT_TEMPLATE = '{seatCode}\n{name}\n{studentNo}'
export const DEFAULT_EXPORT_CONTENT_OPTIONS: ExportContentOptions = {
  template: DEFAULT_EXPORT_TEMPLATE,
  align: 'center',
  htmlCellHeight: 54,
  htmlFontSize: 11,
  htmlWrap: true,
  paperSize: 'A4',
  orientation: 'landscape',
  marginMm: 10,
  rowsPerPage: 12,
  showPageBorder: true,
  showPageNumbers: true,
  repeatHeader: true,
  showTitle: true,
  showStats: true,
  showStage: true,
  showUnassigned: true,
  showFooter: true,
  showGeneratedAt: false,
  showNotes: true,
  showTags: true,
  showAisleLabel: true,
  cellGap: 5,
  borderWidth: 1,
  unusedColumnWidth: 100,
  unusedRowHeight: 100,
  excelHiddenColumns: [],
  includeRuleReport: false,
  showRuleReportPage: false,
  showRuleReportSeats: false,
  showRuleReportPersons: false,
  showRuleReportNotes: false,
}

export interface ExportTemplateField {
  token: string
  label: string
  sample: string
}

export const EXPORT_TEMPLATE_FIELDS: ExportTemplateField[] = [
  { token: '{seatCode}', label: '座位編號', sample: '01' },
  { token: '{name}', label: '姓名', sample: '林品妤' },
  { token: '{studentNo}', label: '座號', sample: '01' },
  { token: '{note}', label: '備註', sample: '班長' },
  { token: '{row}', label: '列號', sample: '1' },
  { token: '{col}', label: '欄號', sample: '1' },
  { token: '{tags}', label: '全部標籤', sample: '分組：A' },
]

export interface ExportSeatContent {
  text: string
}

function findExtra(person: ExportPerson, name: string): string | undefined {
  const target = name.trim().toLocaleLowerCase()

  for (const [key, value] of Object.entries(person.extra)) {
    if (key.toLocaleLowerCase() === target) {
      return value
    }
  }

  return undefined
}

function resolveTemplateToken(
  token: string,
  seat: ExportSeat,
): string | null {
  const name = token.trim()
  const person = seat.person

  if (name === 'seatCode') return seat.code
  if (name === 'row') return String(seat.row + 1)
  if (name === 'col') return String(seat.col + 1)
  if (name === 'name') return person?.name ?? ''
  if (name === 'studentNo') {
    return person ? person.studentNo || '未填座號' : ''
  }
  if (name === 'note') return person?.note ?? ''

  if (name === 'tags') {
    return (
      person?.tags.map((tag) => `${tag.name}：${tag.value}`).join('、') ?? ''
    )
  }

  if (name.startsWith('tag:')) {
    const tagName = name.slice(4).trim().toLocaleLowerCase()
    const tag = person?.tags.find(
      (item) => item.name.toLocaleLowerCase() === tagName,
    )

    return tag?.value ?? ''
  }

  if (name.startsWith('extra:')) {
    if (!person) return ''

    const extraName = name.slice(6).trim()
    return findExtra(person, extraName) ?? ''
  }

  return null
}

function normalizeSeatText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}

export function getExportSeatContent(
  seat: ExportSeat,
  options: ExportContentOptions,
): ExportSeatContent {
  const text = options.template.replace(/\{([^{}]+)\}/g, (token, name) => {
    const value = resolveTemplateToken(name, seat)
    return value ?? token
  })

  return { text: normalizeSeatText(text) }
}

export interface ExportSnapshot {
  projectName: string
  generatedAt: string
  stale: boolean
  cols: number
  rows: number
  grid: ExportGridCell[][]
  seats: ExportSeat[]
  unassigned: ExportPerson[]
  persons: ExportRosterRow[]
  tags: TagDef[]
  extraColumns: string[]
  totalSeats: number
  assignedCount: number
  unassignedCount: number
}

function toExportPerson(
  person: Person,
  tags: TagDef[],
): ExportPerson {
  const values: ExportTagValue[] = []

  for (const tag of tags) {
    const value = person.tags[tag.id]

    if (value === undefined) {
      continue
    }

    values.push({
      id: tag.id,
      name: tag.name,
      value: formatTagValue(value),
      color: tag.color,
    })
  }

  return {
    id: person.id,
    name: person.name,
    studentNo: person.studentNo,
    note: person.note,
    tags: values,
    extra: { ...person.extra },
  }
}

export function buildExportSnapshot(
  project: Project,
  generatedAt = new Date(),
): ExportSnapshot {
  const tags = project.roster.tags
  const exportPersons = new Map(
    project.roster.persons.map((person) => [
      person.id,
      toExportPerson(person, tags),
    ]),
  )
  const assignment = project.currentAssignment
  const assignmentBySeat = assignment?.assignments ?? {}
  const refs = getSeatRefs(project.classroom)
  const seats: ExportSeat[] = refs.map((ref) => {
    const personId = assignmentBySeat[ref.id]
    const person = personId ? exportPersons.get(personId) ?? null : null

    return {
      id: ref.id,
      code: ref.code,
      row: ref.row,
      col: ref.col,
      type: 'seat',
      person,
    }
  })
  const seatById = new Map(seats.map((seat) => [seat.id, seat]))
  const grid: ExportGridCell[][] = []

  for (let row = 0; row < project.classroom.rows; row += 1) {
    const line: ExportGridCell[] = []

    for (let col = 0; col < project.classroom.cols; col += 1) {
      const type =
        project.classroom.cells[row * project.classroom.cols + col]?.type ??
        'empty'
      const id = `r${row}c${col}`

      line.push({
        type,
        seat: type === 'seat' ? seatById.get(id) ?? null : null,
      })
    }

    grid.push(line)
  }

  const seatCodeByPerson = new Map<string, string>()

  for (const seat of seats) {
    if (seat.person) {
      seatCodeByPerson.set(seat.person.id, seat.code)
    }
  }

  const unassignedIds = assignment
    ? assignment.unassignedPersonIds
    : project.roster.persons.map((person) => person.id)
  const unassigned = unassignedIds.flatMap((personId) => {
    const person = exportPersons.get(personId)
    return person ? [person] : []
  })

  return {
    projectName: project.name,
    generatedAt: generatedAt.toISOString(),
    stale: isAssignmentStale(project),
    cols: project.classroom.cols,
    rows: project.classroom.rows,
    grid,
    seats,
    unassigned,
    persons: project.roster.persons.flatMap((person) => {
      const exported = exportPersons.get(person.id)

      return exported
        ? [
            {
              person: exported,
              seatCode: seatCodeByPerson.get(person.id) ?? null,
            },
          ]
        : []
    }),
    tags,
    extraColumns: project.roster.extraColumns,
    totalSeats: seats.length,
    assignedCount: seats.filter((seat) => seat.person).length,
    unassignedCount: unassigned.length,
  }
}

export function sanitizeFileNamePart(name: string): string {
  const cleaned = Array.from(name)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      const forbidden = '<>:"/\\|?*'

      return code >= 32 && code !== 127 && !forbidden.includes(char)
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')

  return cleaned.slice(0, 48) || '未命名教室'
}

export function createExportFileName(
  projectName: string,
  extension: 'xlsx' | 'html' | 'json' | 'png',
  date = new Date(),
): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}`

  return `QuickSeat-${sanitizeFileNamePart(projectName)}-${stamp}.${extension}`
}

export function formatGeneratedAt(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
