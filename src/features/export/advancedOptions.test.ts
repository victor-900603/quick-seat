import { describe, expect, it } from 'vitest'
import type { Cell } from 'write-excel-file/browser'
import { createExportFixture } from '../../test/projectFixtures'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  buildExportSnapshot,
} from './exportData'
import { buildHtmlDocument } from './html'
import { buildWorkbookSheets } from './workbook'
import {
  EXPORT_OPTIONS_KEY,
  loadExportOptions,
} from './exportPreferences'

function value(cell: Cell): unknown {
  return cell && typeof cell === 'object' && 'value' in cell
    ? cell.value
    : cell
}

function createStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key) {
      return data.get(key) ?? null
    },
    key(index) {
      return [...data.keys()][index] ?? null
    },
    removeItem(key) {
      data.delete(key)
    },
    setItem(key, value) {
      data.set(key, value)
    },
  }
}

describe('advanced export options', () => {
  it('依每頁列數分頁並套用紙張與顯示選項', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const html = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      paperSize: 'A3',
      orientation: 'portrait',
      marginMm: 12,
      rowsPerPage: 2,
      cellGap: 2,
      borderWidth: 2,
      showTitle: false,
      showUnassigned: false,
    })

    expect(html.match(/<section class="page/g)).toHaveLength(3)
    expect(html).toContain('@page { size: A3 portrait; margin: 12mm; }')
    expect(html).toContain('--cell-gap:2px')
    expect(html).toContain('--border-width:2px')
    expect(html).not.toContain('<h1>')
    expect(html).toContain('class="header-stats"')
    expect(html).not.toContain('未分配人員')
    expect(html).toContain('第 1 / 3 頁')
  })

  it('可選擇只在第一頁顯示表頭', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const html = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      rowsPerPage: 2,
      repeatHeader: false,
      showUnassigned: false,
    })

    expect(html.match(/<header>/g)).toHaveLength(1)
    expect(html.match(/<section class="page/g)).toHaveLength(3)
  })

  it('Excel 名單可隱藏欄位', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const hidden = [
      'seat',
      'note',
      ...snapshot.tags.map((tag) => `tag:${tag.id}`),
      ...snapshot.extraColumns.map((column) => `extra:${column}`),
    ]
    const sheets = buildWorkbookSheets(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      excelHiddenColumns: hidden,
    })
    const header = sheets[1].data[0].map(value)

    expect(header).toEqual(['姓名', '座號'])
  })

  it('偏好設定會夾限數值並忽略無效欄位', () => {
    const storage = createStorage({
      [EXPORT_OPTIONS_KEY]: JSON.stringify({
        marginMm: 99,
        rowsPerPage: 2,
        cellGap: 99,
        borderWidth: -1,
        paperSize: 'B5',
        orientation: 'diagonal',
        excelHiddenColumns: ['seat', 2, 'extra:電話'],
      }),
    })
    const loaded = loadExportOptions(storage)

    expect(loaded.marginMm).toBe(20)
    expect(loaded.rowsPerPage).toBe(2)
    expect(loaded.cellGap).toBe(8)
    expect(loaded.borderWidth).toBe(0)
    expect(loaded.paperSize).toBe('A4')
    expect(loaded.orientation).toBe('landscape')
    expect(loaded.excelHiddenColumns).toEqual(['seat', 'extra:電話'])
  })

  it('允許 0 邊界與每頁 1 列', () => {
    const storage = createStorage({
      [EXPORT_OPTIONS_KEY]: JSON.stringify({
        marginMm: 0,
        rowsPerPage: 1,
      }),
    })
    const loaded = loadExportOptions(storage)

    expect(loaded.marginMm).toBe(0)
    expect(loaded.rowsPerPage).toBe(1)
  })
})
