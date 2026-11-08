import { describe, expect, it } from 'vitest'
import type { Cell } from 'write-excel-file/browser'
import { createExportFixture } from '../../test/projectFixtures'
import { DEFAULT_EXPORT_CONTENT_OPTIONS, buildExportSnapshot } from './exportData'
import { buildWorkbookSheets } from './workbook'

function value(cell: Cell): unknown {
  return cell && typeof cell === 'object' && 'value' in cell
    ? cell.value
    : cell
}

function values(sheet: { data: Cell[][] }): unknown[][] {
  return sheet.data.map((row) => row.map(value))
}

describe('workbook', () => {
  it('建立座位表與名單對照兩個工作表', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const sheets = buildWorkbookSheets(snapshot)

    expect(sheets).toHaveLength(2)
    expect(sheets[0].sheet).toBe('座位表')
    expect(sheets[1].sheet).toBe('名單對照')
    expect(values(sheets[0])[0][0]).toContain('三年甲班 座位表')
    expect(values(sheets[0])[2][0]).toBe('講 台')
    expect(values(sheets[0])[3][0]).toBe('01\n林品妤\n01')
    expect(values(sheets[0])[4][1]).toBe('走道')
    expect(sheets[0].data[4][1]).toMatchObject({
      backgroundColor: '#e7e4d7',
    })
    expect(sheets[0].data[5][2]).toMatchObject({
      backgroundColor: '#1f2a26',
    })
  })

  it('可隱藏走道文字但保留走道底色', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const sheet = buildWorkbookSheets(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showAisleLabel: false,
    })[0]

    expect(values(sheet)[4][1]).toBe('')
    expect(sheet.data[4][1]).toMatchObject({
      backgroundColor: '#e7e4d7',
    })
  })

  it('可依模板隱藏座位編號並靠左對齊', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const sheet = buildWorkbookSheets(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{studentNo}',
      align: 'left',
    })[0]

    expect(values(sheet)[3][0]).toBe('01')
    expect(sheet.data[3][0]).toMatchObject({ align: 'left' })
  })

  it('Excel 使用固定欄寬、列高、字級與自動換行', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const sheet = buildWorkbookSheets(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      htmlFontSize: 14,
    })[0]

    expect(sheet.columns?.[0]).toEqual({ width: 13 })
    expect(sheet.data[3][0]).toMatchObject({
      fontSize: 11,
      height: 42,
      wrap: true,
    })
  })

  it('無座位列與欄使用較小的 Excel 列高與欄寬', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const cols = snapshot.cols

    snapshot.grid[1] = Array.from({ length: cols }, () => ({
      type: 'aisle' as const,
      seat: null,
    }))
    snapshot.grid = snapshot.grid.map((row) => {
      const next = [...row]
      next[cols - 1] = { type: 'empty', seat: null }
      return next
    })

    const sheet = buildWorkbookSheets(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      unusedColumnWidth: 50,
      unusedRowHeight: 50,
    })[0]

    expect(sheet.data[3][0]).toMatchObject({ height: 42 })
    expect(sheet.data[4][0]).toMatchObject({ height: 21 })
    expect(sheet.columns?.[5]).toEqual({ width: 6.5 })
    expect(sheet.columns?.[0]).toEqual({ width: 13 })
  })

  it('名單對照包含標籤欄位、座位與未分配狀態', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const roster = values(buildWorkbookSheets(snapshot)[1])

    expect(roster[0]).toEqual(['座位', '姓名', '座號', '分組', '電話', '備註'])
    expect(roster[1]).toEqual(['01', '林品妤', '01', 'A', '0912', '班長'])
    expect(roster[2]).toEqual(['02', '陳柏宇', '02', 'B', '', ''])
    expect(roster[3]).toEqual(['未分配', '王小明', '03', 'A', '', '轉學生'])
  })

  it('座位表列出未分配人員與圖例', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const seatSheet = values(buildWorkbookSheets(snapshot)[0])
    const flat = seatSheet.flat()

    expect(flat).toContain('未分配人員')
    expect(flat).toContain('王小明')
    expect(flat).toContain('轉學生')
    expect(flat.some((item) => String(item).includes('綠色為已分配座位'))).toBe(
      true,
    )
  })
})
