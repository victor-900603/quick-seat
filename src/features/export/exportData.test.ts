import { describe, expect, it } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import {
  buildExportSnapshot,
  createExportFileName,
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  getExportPageDimensions,
  getExportRowsPerPage,
  getExportSeatContent,
  sanitizeFileNamePart,
} from './exportData'

describe('exportData', () => {
  it('依紙張與方向計算預覽尺寸', () => {
    expect(
      getExportPageDimensions({
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        paperSize: 'A4',
        orientation: 'landscape',
      }),
    ).toMatchObject({
      widthMm: 297,
      heightMm: 210,
      widthPx: 1123,
      heightPx: 794,
      printHeightMm: 190,
      cssSize: 'A4 landscape',
      label: 'A4 橫向',
    })

    expect(
      getExportPageDimensions({
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        paperSize: 'A3',
        orientation: 'portrait',
        marginMm: 12,
      }),
    ).toMatchObject({
      widthMm: 297,
      heightMm: 420,
      printHeightMm: 396,
      cssSize: 'A3 portrait',
      label: 'A3 直向',
    })
  })

  it('依紙張容量限制每頁列數', () => {
    expect(getExportRowsPerPage(DEFAULT_EXPORT_CONTENT_OPTIONS)).toEqual({
      maxRows: 8,
      effectiveRows: 8,
    })

    expect(
      getExportRowsPerPage({
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        paperSize: 'A3',
        orientation: 'portrait',
      }),
    ).toEqual({
      maxRows: 22,
      effectiveRows: 12,
    })
  })

  it('建立座位、名單與未分配快照', () => {
    const snapshot = buildExportSnapshot(
      createExportFixture(),
      new Date('2026-01-02T07:08:00.000Z'),
    )

    expect(snapshot.projectName).toBe('三年甲班')
    expect(snapshot.totalSeats).toBe(28)
    expect(snapshot.assignedCount).toBe(2)
    expect(snapshot.unassignedCount).toBe(1)
    expect(snapshot.unassigned.map((person) => person.name)).toEqual([
      '王小明',
    ])
    expect(snapshot.persons).toHaveLength(3)
    expect(snapshot.persons[0]).toMatchObject({
      seatCode: '01',
      person: {
        name: '林品妤',
        studentNo: '01',
        tags: [
          {
            id: 'tag-group',
            name: '分組',
            value: 'A',
            color: '#2f6b58',
          },
        ],
      },
    })
    expect(snapshot.grid).toHaveLength(5)
    expect(snapshot.grid[0]).toHaveLength(6)
    expect(snapshot.grid[1][1]).toMatchObject({ type: 'aisle', seat: null })
    expect(snapshot.grid[2][2]).toMatchObject({ type: 'blocked', seat: null })
    expect(snapshot.seats.find((seat) => seat.id === 'r0c0')).toMatchObject({
      code: '01',
      person: { name: '林品妤' },
    })
    expect(snapshot.stale).toBe(false)
  })

  it('名單變更後標記結果過期', () => {
    const project = createExportFixture()
    project.roster.persons[0] = {
      ...project.roster.persons[0],
      name: '林品妤（改名）',
    }

    const snapshot = buildExportSnapshot(project)

    expect(snapshot.stale).toBe(true)
  })

  it('座位內容可用模板自由組合欄位與換行', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const seat = snapshot.seats.find((item) => item.id === 'r0c0')!

    expect(
      getExportSeatContent(seat, {
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        template: '{seatCode}\n{name}\n{studentNo}',
        align: 'center',
      }).text,
    ).toBe('01\n林品妤\n01')

    expect(
      getExportSeatContent(seat, {
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        template: '{seatCode}\n{name} · {studentNo}',
        align: 'center',
      }).text,
    ).toBe('01\n林品妤 · 01')

    expect(
      getExportSeatContent(seat, {
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        template: '{tags}\n{tag:分組}｜{extra:電話}',
        align: 'center',
      }).text,
    ).toBe('分組：A\nA｜0912')

    expect(
      getExportSeatContent(seat, {
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        template: '{name}\n{未知變數}',
        align: 'center',
      }).text,
    ).toBe('林品妤\n{未知變數}')

    const emptySeat = snapshot.seats.find((item) => item.id === 'r0c2')!

    expect(
      getExportSeatContent(emptySeat, {
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        template: '{seatCode}\n{name}\n{studentNo}',
        align: 'center',
      }).text,
    ).toBe('03')
  })

  it('清除檔名中的非法字元並保留 fallback', () => {
    expect(sanitizeFileNamePart('  A/B:C*?  ')).toBe('ABC')
    expect(sanitizeFileNamePart('A\u0000B\u007fC')).toBe('ABC')
    expect(sanitizeFileNamePart('   ')).toBe('未命名教室')
    expect(
      createExportFileName(
        '三年甲班',
        'xlsx',
        new Date(2026, 0, 2, 15, 4),
      ),
    ).toBe('QuickSeat-三年甲班-20260102-1504.xlsx')
  })
})
