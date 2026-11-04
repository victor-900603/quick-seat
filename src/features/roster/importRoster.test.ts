import { describe, expect, it, vi } from 'vitest'
import type { Roster, TagDef } from '../../types/domain'
import {
  applyImportPlan,
  buildImportPlan,
  detectFileKind,
  getMappingError,
  normalizeTable,
  parseTextTable,
  readRosterFile,
  suggestMappings,
  type ColumnMapping,
} from './importRoster'
import { createPerson, createTagDef } from './rosterOps'

vi.mock('read-excel-file/browser', () => ({
  readSheet: vi.fn(async () => [
    ['姓名', '座號'],
    ['林品妤', 'A01'],
  ]),
}))

function emptyRoster(tags: TagDef[] = []): Roster {
  return { persons: [], tags, extraColumns: [] }
}

const groupTag = createTagDef({
  name: '組別',
  type: 'enum',
  options: ['A', 'B'],
})
const scoreTag = createTagDef({ name: '分數', type: 'number' })

describe('importRoster', () => {
  it('辨識支援的副檔名', () => {
    expect(detectFileKind('名單.CSV')).toBe('csv')
    expect(detectFileKind('名單.tsv')).toBe('tsv')
    expect(detectFileKind('名單.xlsx')).toBe('xlsx')
    expect(detectFileKind('名單.xls')).toBeNull()
    expect(detectFileKind('名單.txt')).toBeNull()
  })

  it('解析 CSV、去除 BOM 與引號中的逗號', () => {
    const table = parseTextTable(
      '\uFEFF姓名,備註\n"林,品妤","需靠前"\n',
      'csv',
    )

    expect(table.headers).toEqual(['姓名', '備註'])
    expect(table.rows).toEqual([['林,品妤', '需靠前']])
  })

  it('解析 TSV 並略過空白列', () => {
    const table = parseTextTable('姓名\t座號\n\n甲\tA01\n乙\tA02\n', 'tsv')

    expect(table.rows).toEqual([
      ['甲', 'A01'],
      ['乙', 'A02'],
    ])
  })

  it('正規化表格標題，補齊空白欄名與重複欄名', () => {
    const table = normalizeTable([
      [],
      ['姓名', '', '姓名'],
      ['甲', '值', '第二個姓名'],
    ])

    expect(table.headers).toEqual(['姓名', '欄位 2', '姓名（2）'])
    expect(table.rows).toEqual([['甲', '值', '第二個姓名']])
  })

  it('依標題建議姓名、座號、備註與標籤映射', () => {
    const mapping = suggestMappings(
      ['姓名', '座號', '組別', '分數', '備註'],
      [groupTag, scoreTag],
    )

    expect(mapping[0]).toBe('name')
    expect(mapping[1]).toBe('studentNo')
    expect(mapping[2]).toBe(`tag:${groupTag.id}`)
    expect(mapping[3]).toBe(`tag:${scoreTag.id}`)
    expect(mapping[4]).toBe('note')
  })

  it('沒有姓名欄位時阻止匯入', () => {
    const table = parseTextTable('座號,備註\nA01,前排\n', 'csv')
    const mapping = suggestMappings(table.headers, [])

    expect(getMappingError(table, mapping, [])).toBe(
      '請指定一個姓名欄位。',
    )
  })

  it('姓名、座號與備註欄位各只能映射一個', () => {
    const table = parseTextTable(
      '姓名,座號,學號,備註,說明\n甲,A01,S01,前排,無\n',
      'csv',
    )

    expect(
      getMappingError(table, { 0: 'name', 4: 'name' }, []),
    ).toBe('姓名欄位只能指定一個。')
    expect(
      getMappingError(
        table,
        { 0: 'name', 1: 'studentNo', 2: 'studentNo' },
        [],
      ),
    ).toBe('座號欄位只能指定一個。')
    expect(
      getMappingError(table, { 0: 'name', 3: 'note', 4: 'note' }, []),
    ).toBe('備註欄位只能指定一個。')
  })

  it('建立匯入預覽，處理重複座號、空白姓名與無效值', () => {
    const table = parseTextTable(
      [
        '姓名,座號,組別,分數,備註',
        '林品妤,A01,A,90,前排',
        '陳柏宇,A02,C,85,',
        '王小明,A02,B,88,',
        ',A03,A,70,',
        '李美華,A04,B,數學,',
      ].join('\n'),
      'csv',
    )
    const mapping: ColumnMapping = suggestMappings(table.headers, [
      groupTag,
      scoreTag,
    ])
    const plan = buildImportPlan(table, mapping, [groupTag, scoreTag])

    expect(plan.persons).toHaveLength(3)
    expect(plan.persons.map((person) => person.name)).toEqual([
      '林品妤',
      '陳柏宇',
      '李美華',
    ])
    expect(plan.persons[0].tags[groupTag.id]).toBe('A')
    expect(plan.persons[0].tags[scoreTag.id]).toBe(90)
    expect(plan.persons[2].tags[scoreTag.id]).toBeUndefined()
    expect(plan.skippedCount).toBe(2)
    expect(plan.issues).toHaveLength(3)
    expect(plan.issues.map((issue) => issue.row)).toEqual([4, 5, 6])
    expect(plan.tags[0].options).toEqual(['A', 'B', 'C'])
  })

  it('未映射的欄位可保留為額外欄位，新標籤依欄名建立', () => {
    const table = parseTextTable(
      '姓名,英文名字,電話\n甲,Alice,0912\n',
      'csv',
    )
    const mapping: ColumnMapping = {
      0: 'name',
      1: `new:1`,
      2: 'extra',
    }
    const plan = buildImportPlan(table, mapping, [])

    expect(plan.persons[0].tags).toHaveProperty(
      plan.tags[0].id,
      'Alice',
    )
    expect(plan.persons[0].extra).toEqual({ 電話: '0912' })
    expect(plan.extraColumns).toEqual(['電話'])
  })

  it('合併名單時略過既有座號，覆蓋模式則取代所有人員', () => {
    const existing = emptyRoster([groupTag])
    existing.persons.push(
      createPerson({ name: '舊生', studentNo: 'A01' }),
    )
    const imported = buildImportPlan(
      parseTextTable('姓名,座號\n甲,A01\n乙,A02\n', 'csv'),
      { 0: 'name', 1: 'studentNo' },
      [],
    )

    const merged = applyImportPlan(existing, imported, 'merge')
    expect(merged.addedCount).toBe(1)
    expect(merged.skippedExistingCount).toBe(1)
    expect(merged.roster.persons.map((person) => person.name)).toEqual([
      '舊生',
      '乙',
    ])

    const replaced = applyImportPlan(existing, imported, 'replace')
    expect(replaced.addedCount).toBe(2)
    expect(replaced.roster.persons.map((person) => person.name)).toEqual([
      '甲',
      '乙',
    ])
    expect(replaced.roster.tags).toEqual([groupTag])
  })

  it('讀取 CSV 檔案內容', async () => {
    const file = new File(['姓名,座號\n甲,A01\n'], '名單.csv', {
      type: 'text/csv',
    })
    const table = await readRosterFile(file)

    expect(table.headers).toEqual(['姓名', '座號'])
    expect(table.rows).toEqual([['甲', 'A01']])
  })

  it('透過 XLSX 解析器讀取第一個工作表', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], '名單.xlsx')
    const table = await readRosterFile(file)

    expect(table.rows).toEqual([['林品妤', 'A01']])
  })

  it('拒絕不支援的檔案格式', async () => {
    const file = new File(['x'], '名單.xls')

    await expect(readRosterFile(file)).rejects.toThrow(
      '僅支援 CSV、TSV 或 XLSX 檔案。',
    )
  })
})
