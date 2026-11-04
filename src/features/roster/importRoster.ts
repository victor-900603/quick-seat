import Papa from 'papaparse'
import type { Person, Roster, TagDef } from '../../types/domain'
import {
  TAG_COLORS,
  createPerson,
  createTagDef,
  extendTagOptions,
  normalizeTagOptions,
  parseTagValue,
} from './rosterOps'

export type RosterFileKind = 'csv' | 'tsv' | 'xlsx'
export type ImportMode = 'merge' | 'replace'
export type ColumnMapping = Record<number, string>

export const IGNORE_COLUMN = 'ignore'
export const NAME_COLUMN = 'name'
export const STUDENT_NO_COLUMN = 'studentNo'
export const NOTE_COLUMN = 'note'
export const EXTRA_COLUMN = 'extra'

export interface RosterTable {
  headers: string[]
  rows: string[][]
}

export interface ImportIssue {
  row: number | null
  message: string
}

export interface ImportPlan {
  persons: Person[]
  tags: TagDef[]
  extraColumns: string[]
  issues: ImportIssue[]
  skippedCount: number
}

export interface ImportOutcome {
  roster: Roster
  addedCount: number
  skippedExistingCount: number
}

const NAME_PATTERN = /姓名|名字|學生|name/i
const STUDENT_NO_PATTERN = /座號|學號|編號|student\s*(no|id)|(^|\W)no($|\W)/i
const NOTE_PATTERN = /備註|備注|note|memo/i

export function detectFileKind(fileName: string): RosterFileKind | null {
  const extension = fileName.split('.').pop()?.toLocaleLowerCase('en-US')

  if (extension === 'csv') return 'csv'
  if (extension === 'tsv') return 'tsv'
  if (extension === 'xlsx') return 'xlsx'

  return null
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

export function normalizeTable(matrix: unknown[][]): RosterTable {
  const rows = matrix.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) {
        return ''
      }

      if (cell instanceof Date) {
        return cell.toISOString().slice(0, 10)
      }

      return String(cell).trim()
    }),
  )

  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => cell.length > 0),
  )

  if (headerIndex < 0) {
    return { headers: [], rows: [] }
  }

  const rawHeaders = rows[headerIndex]
  const seen = new Map<string, number>()
  const headers = rawHeaders.map((header, index) => {
    const base = header || `欄位 ${index + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}（${count}）`
  })

  const body = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.length > 0))
    .map((row) => headers.map((_, index) => row[index] ?? ''))

  return { headers, rows: body }
}

export function parseTextTable(
  text: string,
  kind: 'csv' | 'tsv',
): RosterTable {
  const result = Papa.parse<string[]>(stripBom(text), {
    delimiter: kind === 'tsv' ? '\t' : '',
    skipEmptyLines: 'greedy',
  })

  if (result.errors.some((error) => error.type === 'Quotes')) {
    throw new Error('CSV 引號格式不正確，請檢查檔案內容。')
  }

  return normalizeTable(result.data)
}

function decodeText(buffer: ArrayBuffer): string {
  try {
    return stripBom(
      new TextDecoder('utf-8', { fatal: true }).decode(buffer),
    )
  } catch {
    return stripBom(new TextDecoder('big5').decode(buffer))
  }
}

export async function readRosterFile(file: File): Promise<RosterTable> {
  const kind = detectFileKind(file.name)

  if (!kind) {
    throw new Error('僅支援 CSV、TSV 或 XLSX 檔案。')
  }

  if (kind === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser')
    return normalizeTable(await readSheet(file))
  }

  return parseTextTable(decodeText(await file.arrayBuffer()), kind)
}

function isExistingTagName(headers: string[], tags: TagDef[]): TagDef | null {
  const name = headers[0]?.trim().toLocaleLowerCase('zh-Hant')
  return tags.find((tag) => tag.name.toLocaleLowerCase('zh-Hant') === name) ?? null
}

export function suggestMappings(
  headers: string[],
  tags: TagDef[],
): ColumnMapping {
  const mapping: ColumnMapping = {}
  let hasName = false
  let hasStudentNo = false
  let hasNote = false

  headers.forEach((header, index) => {
    const existing = isExistingTagName([header], tags)

    if (!hasName && NAME_PATTERN.test(header)) {
      mapping[index] = NAME_COLUMN
      hasName = true
      return
    }

    if (!hasStudentNo && STUDENT_NO_PATTERN.test(header)) {
      mapping[index] = STUDENT_NO_COLUMN
      hasStudentNo = true
      return
    }

    if (!hasNote && NOTE_PATTERN.test(header)) {
      mapping[index] = NOTE_COLUMN
      hasNote = true
      return
    }

    mapping[index] = existing ? `tag:${existing.id}` : `new:${index}`
  })

  return mapping
}

export function getMappingError(
  table: RosterTable,
  mapping: ColumnMapping,
  tags: TagDef[],
): string | null {
  if (table.headers.length === 0) {
    return '檔案沒有可辨識的欄位。'
  }

  if (table.rows.length === 0) {
    return '檔案只有標題列，沒有可匯入的資料。'
  }

  const nameCount = Object.values(mapping).filter(
    (target) => target === NAME_COLUMN,
  ).length

  if (nameCount === 0) {
    return '請指定一個姓名欄位。'
  }

  if (nameCount > 1) {
    return '姓名欄位只能指定一個。'
  }

  const studentNoCount = Object.values(mapping).filter(
    (target) => target === STUDENT_NO_COLUMN,
  ).length

  if (studentNoCount > 1) {
    return '座號欄位只能指定一個。'
  }

  const noteCount = Object.values(mapping).filter(
    (target) => target === NOTE_COLUMN,
  ).length

  if (noteCount > 1) {
    return '備註欄位只能指定一個。'
  }

  const knownTagIds = new Set(tags.map((tag) => tag.id))
  const missingTag = Object.values(mapping).find(
    (target) =>
      target.startsWith('tag:') && !knownTagIds.has(target.slice(4)),
  )

  return missingTag ? '欄位映射的標籤已不存在，請重新選擇。' : null
}

function tagForColumn(
  table: RosterTable,
  mapping: ColumnMapping,
  column: number,
  tags: TagDef[],
  drafts: Map<string, TagDef>,
  draftOrder: string[],
): TagDef | null {
  const target = mapping[column] ?? IGNORE_COLUMN

  if (target.startsWith('tag:')) {
    return tags.find((tag) => tag.id === target.slice(4)) ?? null
  }

  if (!target.startsWith('new:')) {
    return null
  }

  const header = table.headers[column] ?? `欄位 ${column + 1}`
  const existing = isExistingTagName([header], tags)

  if (existing) {
    return existing
  }

  const created = createTagDef({
    name: header,
    type: 'enum',
    options: [],
    color: TAG_COLORS[(tags.length + draftOrder.length) % TAG_COLORS.length],
  })

  drafts.set(created.id, created)
  draftOrder.push(created.id)

  return created
}

export function buildImportPlan(
  table: RosterTable,
  mapping: ColumnMapping,
  existingTags: TagDef[],
): ImportPlan {
  const mappingError = getMappingError(table, mapping, existingTags)

  if (mappingError) {
    return {
      persons: [],
      tags: [],
      extraColumns: [],
      issues: [{ row: null, message: mappingError }],
      skippedCount: table.rows.length,
    }
  }

  const issues: ImportIssue[] = []
  const drafts = new Map<string, TagDef>()
  const draftOrder: string[] = []
  const columnTags = new Map<number, TagDef>()
  const extraColumns = new Set<string>()

  table.headers.forEach((header, column) => {
    const target = mapping[column] ?? IGNORE_COLUMN

    if (target === EXTRA_COLUMN) {
      extraColumns.add(header)
      return
    }

    const tag = tagForColumn(
      table,
      mapping,
      column,
      existingTags,
      drafts,
      draftOrder,
    )

    if (tag) {
      const draft = drafts.get(tag.id) ?? { ...tag, options: [...tag.options] }
      drafts.set(tag.id, draft)
      columnTags.set(column, draft)
    }
  })

  const nameColumn = Number(
    Object.entries(mapping).find(
      ([, target]) => target === NAME_COLUMN,
    )?.[0],
  )
  const studentNoColumn = Number(
    Object.entries(mapping).find(
      ([, target]) => target === STUDENT_NO_COLUMN,
    )?.[0],
  )
  const noteColumn = Number(
    Object.entries(mapping).find(
      ([, target]) => target === NOTE_COLUMN,
    )?.[0],
  )
  const persons: Person[] = []
  const seenStudentNos = new Set<string>()
  let skippedCount = 0

  table.rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2
    const name = row[nameColumn]?.trim() ?? ''

    if (!name) {
      issues.push({ row: rowNumber, message: '姓名為空，已略過。' })
      skippedCount += 1
      return
    }

    const studentNo =
      Number.isInteger(studentNoColumn) && studentNoColumn >= 0
        ? (row[studentNoColumn]?.trim() ?? '')
        : ''

    if (studentNo && seenStudentNos.has(studentNo)) {
      issues.push({
        row: rowNumber,
        message: `座號 ${studentNo} 在檔案中重複，已略過。`,
      })
      skippedCount += 1
      return
    }

    if (studentNo) {
      seenStudentNos.add(studentNo)
    }

    const tags: Person['tags'] = {}

    for (const [column, tag] of columnTags) {
      const raw = row[column] ?? ''

      if (!raw.trim()) {
        continue
      }

      const parsed = parseTagValue(tag, raw)

      if (!parsed) {
        continue
      }

      if (!parsed.ok) {
        issues.push({
          row: rowNumber,
          message: `${tag.name}「${raw}」${parsed.message}，已忽略此值。`,
        })
        continue
      }

      tags[tag.id] = parsed.value

      if (tag.type === 'enum' && typeof parsed.value === 'string') {
        tag.options = normalizeTagOptions([...tag.options, parsed.value])
      }
    }

    const extra: Person['extra'] = {}

    for (const [column, header] of table.headers.entries()) {
      if (mapping[column] !== EXTRA_COLUMN) {
        continue
      }

      const value = row[column]?.trim() ?? ''

      if (value) {
        extra[header] = value
      }
    }

    persons.push(
      createPerson({
        name,
        studentNo,
        note:
          Number.isInteger(noteColumn) && noteColumn >= 0
            ? row[noteColumn]
            : '',
        tags,
        extra,
      }),
    )
  })

  return {
    persons,
    tags: [...drafts.values()],
    extraColumns: [...extraColumns],
    issues,
    skippedCount,
  }
}

function mergeTags(existing: TagDef[], updates: TagDef[]): TagDef[] {
  if (updates.length === 0) {
    return existing
  }

  const byId = new Map(existing.map((tag) => [tag.id, tag]))
  const byName = new Map(
    existing.map((tag) => [tag.name.toLocaleLowerCase('zh-Hant'), tag]),
  )
  let changed = false
  const tags = [...existing]

  for (const update of updates) {
    const current =
      byId.get(update.id) ??
      byName.get(update.name.toLocaleLowerCase('zh-Hant'))

    if (!current) {
      tags.push(update)
      byId.set(update.id, update)
      byName.set(update.name.toLocaleLowerCase('zh-Hant'), update)
      changed = true
      continue
    }

    const options =
      current.type === 'enum'
        ? normalizeTagOptions([...current.options, ...update.options])
        : current.options

    if (
      options.length === current.options.length &&
      options.every((option, index) => option === current.options[index])
    ) {
      continue
    }

    const index = tags.findIndex((tag) => tag.id === current.id)
    tags[index] = { ...current, options }
    byId.set(current.id, tags[index])
    changed = true
  }

  return changed ? tags : existing
}

export function applyImportPlan(
  roster: Roster,
  plan: ImportPlan,
  mode: ImportMode,
): ImportOutcome {
  const existingNos = new Set(
    roster.persons
      .map((person) => person.studentNo.trim())
      .filter((studentNo) => studentNo.length > 0),
  )
  const persons: Person[] = []
  let skippedExistingCount = 0

  for (const person of plan.persons) {
    if (
      mode === 'merge' &&
      person.studentNo &&
      existingNos.has(person.studentNo)
    ) {
      skippedExistingCount += 1
      continue
    }

    persons.push(person)
  }

  const nextPersons =
    mode === 'replace' ? persons : [...roster.persons, ...persons]
  const nextRoster: Roster = {
    persons: nextPersons,
    tags: mergeTags(roster.tags, plan.tags),
    extraColumns:
      mode === 'replace'
        ? plan.extraColumns
        : [...new Set([...roster.extraColumns, ...plan.extraColumns])],
  }

  return {
    roster: extendTagOptions(nextRoster, plan.tags),
    addedCount: persons.length,
    skippedExistingCount,
  }
}
