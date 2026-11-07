import type { Cell, Sheet } from 'write-excel-file/browser'
import type {
  ExportContentOptions,
  ExportGridCell,
  ExportRosterRow,
  ExportSnapshot,
} from './exportData'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  formatGeneratedAt,
  getExportSeatContent,
} from './exportData'

const COLORS = {
  board: '#173b32',
  chalk: '#f2f0e3',
  paper: '#f6f4ec',
  surface: '#fffdf7',
  ink: '#1f2a26',
  muted: '#68736b',
  line: '#d8d5c7',
  accent: '#2f6b58',
  accentSoft: '#e2ebe5',
  aisle: '#e7e4d7',
  blocked: '#1f2a26',
} as const

const BORDER = {
  borderColor: COLORS.line,
  borderStyle: 'thin' as const,
}

const EXCEL_COLUMN_WIDTH = 13
const EXCEL_ROW_HEIGHT = 42
const EXCEL_FONT_SIZE = 11
const EXCEL_WRAP = true

function cell(
  value: string | number | boolean | null,
  style: Record<string, unknown> = {},
): Cell {
  return {
    value: value ?? '',
    ...style,
  }
}

function seatCell(
  entry: ExportGridCell,
  options: ExportContentOptions,
): Cell {
  if (entry.type === 'aisle') {
    return cell('走道', {
      ...BORDER,
      align: 'center',
      backgroundColor: COLORS.aisle,
      textColor: COLORS.muted,
      fontSize: EXCEL_FONT_SIZE,
      height: EXCEL_ROW_HEIGHT,
    })
  }

  if (entry.type === 'blocked') {
    return cell('', {
      ...BORDER,
      backgroundColor: COLORS.blocked,
      height: EXCEL_ROW_HEIGHT,
    })
  }

  if (entry.type === 'empty') {
    return cell('', {
      ...BORDER,
      backgroundColor: COLORS.paper,
      height: EXCEL_ROW_HEIGHT,
    })
  }

  const seat = entry.seat
  const content = seat ? getExportSeatContent(seat, options) : null

  return cell(content?.text ?? '', {
    ...BORDER,
    align: options.align,
    alignVertical: 'center',
    wrap: EXCEL_WRAP,
    backgroundColor: seat?.person ? COLORS.accentSoft : COLORS.surface,
    textColor: COLORS.ink,
    fontSize: EXCEL_FONT_SIZE,
    height: EXCEL_ROW_HEIGHT,
  })
}

function buildSeatSheet(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
): Sheet<Blob> {
  const data: Cell[][] = []
  const width = Math.max(snapshot.cols, 1)
  const stamp = formatGeneratedAt(snapshot.generatedAt)

  data.push([
    cell(`${snapshot.projectName} 座位表`, {
      columnSpan: width,
      align: 'center',
      backgroundColor: COLORS.board,
      textColor: COLORS.chalk,
      fontSize: 16,
      fontWeight: 'bold',
    }),
  ])
  data.push([
    cell(
      `${stamp}　座位 ${snapshot.totalSeats} 個　已分配 ${snapshot.assignedCount} 位　未分配 ${snapshot.unassignedCount} 位${
        snapshot.stale ? '　結果可能已過期' : ''
      }`,
      {
        columnSpan: width,
        align: 'left',
        textColor: COLORS.muted,
        fontSize: 10,
      },
    ),
  ])
  data.push([
    cell('講 台', {
      columnSpan: width,
      align: 'center',
      backgroundColor: COLORS.paper,
      textColor: COLORS.muted,
      fontWeight: 'bold',
      ...BORDER,
    }),
  ])

  for (const line of snapshot.grid) {
    data.push(line.map((entry) => seatCell(entry, options)))
  }

  data.push([])
  data.push([
    cell('未分配人員', {
      columnSpan: Math.min(width, 4),
      fontWeight: 'bold',
      backgroundColor: COLORS.paper,
      textColor: COLORS.ink,
    }),
  ])

  if (snapshot.unassigned.length === 0) {
    data.push([
      cell('無', {
        columnSpan: Math.min(width, 4),
        textColor: COLORS.muted,
      }),
    ])
  } else {
    for (const person of snapshot.unassigned) {
      data.push([
        cell(person.name, { fontWeight: 'bold' }),
        cell(person.studentNo || '未填座號'),
        cell(person.note),
      ])
    }
  }

  data.push([])
  data.push([
    cell('圖例：綠色為已分配座位，灰色為走道，深色為禁坐區。', {
      columnSpan: width,
      textColor: COLORS.muted,
      fontSize: 9,
    }),
  ])

  return {
    data,
    sheet: '座位表',
    showGridLines: false,
    columns: Array.from({ length: width }, () => ({
      width: EXCEL_COLUMN_WIDTH,
    })),
  }
}

function buildRosterSheet(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
): Sheet<Blob> {
  const hidden = new Set(options.excelHiddenColumns)
  const columns: Array<{
    key: string
    header: Cell
    width: number
    value: (row: ExportRosterRow) => string
  }> = []

  if (!hidden.has('seat')) {
    columns.push({
      key: 'seat',
      header: cell('座位', {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 12,
      value: (row) => row.seatCode ?? '未分配',
    })
  }

  if (!hidden.has('name')) {
    columns.push({
      key: 'name',
      header: cell('姓名', {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 16,
      value: (row) => row.person.name,
    })
  }

  if (!hidden.has('studentNo')) {
    columns.push({
      key: 'studentNo',
      header: cell('座號', {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 14,
      value: (row) => row.person.studentNo || '未填座號',
    })
  }

  for (const tag of snapshot.tags) {
    if (hidden.has(`tag:${tag.id}`)) {
      continue
    }

    columns.push({
      key: `tag:${tag.id}`,
      header: cell(tag.name, {
        fontWeight: 'bold',
        backgroundColor: tag.color,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 14,
      value: (row) =>
        row.person.tags.find((item) => item.id === tag.id)?.value ?? '',
    })
  }

  for (const column of snapshot.extraColumns) {
    if (hidden.has(`extra:${column}`)) {
      continue
    }

    columns.push({
      key: `extra:${column}`,
      header: cell(column, {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 16,
      value: (row) => row.person.extra[column] ?? '',
    })
  }

  if (!hidden.has('note')) {
    columns.push({
      key: 'note',
      header: cell('備註', {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 32,
      value: (row) => row.person.note,
    })
  }

  if (columns.length === 0) {
    columns.push({
      key: 'name',
      header: cell('姓名', {
        fontWeight: 'bold',
        backgroundColor: COLORS.board,
        textColor: COLORS.chalk,
        ...BORDER,
      }),
      width: 16,
      value: (row) => row.person.name,
    })
  }

  const data: Cell[][] = [columns.map((column) => column.header)]

  if (snapshot.persons.length === 0) {
    data.push([
      cell('尚無人員', {
        columnSpan: columns.length,
        textColor: COLORS.muted,
      }),
    ])
  } else {
    for (const row of snapshot.persons) {
      data.push(
        columns.map((column) =>
          cell(column.value(row), {
            align: column.key === 'seat' ? 'center' : undefined,
            fontWeight: column.key === 'name' ? 'bold' : undefined,
            textColor:
              column.key === 'seat'
                ? row.seatCode
                  ? COLORS.accent
                  : COLORS.muted
                : undefined,
            wrap: column.key === 'note' || undefined,
            ...BORDER,
          }),
        ),
      )
    }
  }

  return {
    data,
    sheet: '名單對照',
    showGridLines: false,
    columns: columns.map((column) => ({ width: column.width })),
  }
}

export function buildWorkbookSheets(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): Sheet<Blob>[] {
  return [buildSeatSheet(snapshot, options), buildRosterSheet(snapshot, options)]
}

export async function createWorkbookBlob(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const file = writeXlsxFile(buildWorkbookSheets(snapshot, options))

  return file.toBlob()
}
