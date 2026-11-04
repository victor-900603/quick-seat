import { beforeEach, describe, expect, it } from 'vitest'
import type { PinRule, SeparateRule } from '../../types/domain'
import {
  buildImportPlan,
  parseTextTable,
} from '../roster/importRoster'
import { createTagDef } from '../roster/rosterOps'
import { createDefaultProject } from './defaultProject'
import { useProjectStore } from './projectStore'

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function history() {
  return useProjectStore.temporal.getState()
}

beforeEach(resetStore)

describe('projectStore', () => {
  it('重新命名專案並忽略空白名稱', () => {
    useProjectStore.getState().renameProject('  三年甲班  ')
    expect(useProjectStore.getState().project.name).toBe('三年甲班')

    useProjectStore.getState().renameProject('   ')
    expect(useProjectStore.getState().project.name).toBe('未命名教室')
  })

  it('批次修改格子型別並可復原與重做', () => {
    const before = useProjectStore.getState().project.classroom.cells[0]

    useProjectStore
      .getState()
      .applyCellTypes([{ row: 0, col: 0 }], 'aisle')

    expect(useProjectStore.getState().project.classroom.cells[0].type).toBe(
      'aisle',
    )
    expect(history().pastStates).toHaveLength(1)

    history().undo()
    expect(useProjectStore.getState().project.classroom.cells[0]).toEqual(before)

    history().redo()
    expect(useProjectStore.getState().project.classroom.cells[0].type).toBe(
      'aisle',
    )
  })

  it('無變更的操作不寫入歷史', () => {
    useProjectStore
      .getState()
      .applyCellTypes([{ row: 0, col: 0 }], 'seat')

    expect(history().pastStates).toHaveLength(0)
  })

  it('調整教室尺寸', () => {
    useProjectStore.getState().resizeRoom(8, 7)

    const classroom = useProjectStore.getState().project.classroom
    expect(classroom.cols).toBe(8)
    expect(classroom.rows).toBe(7)
    expect(classroom.cells).toHaveLength(56)
  })

  it('更新座位編號與單一覆寫', () => {
    useProjectStore.getState().updateSeatNumbering({
      pattern: '{row}-{col}',
      order: 'snake',
    })
    useProjectStore.getState().updateSeatCode({ row: 0, col: 0 }, 'A1')

    const classroom = useProjectStore.getState().project.classroom
    expect(classroom.numbering.pattern).toBe('{row}-{col}')
    expect(classroom.numbering.order).toBe('snake')
    expect(classroom.codeOverrides.r0c0).toBe('A1')
  })

  it('限制格子大小', () => {
    useProjectStore.getState().updateCellSize(200)
    expect(useProjectStore.getState().project.settings.cellSize).toBe(64)

    useProjectStore.getState().updateCellSize(10)
    expect(useProjectStore.getState().project.settings.cellSize).toBe(40)
  })

  it('歷史最多保留 50 步', () => {
    for (let index = 1; index <= 55; index += 1) {
      useProjectStore.getState().renameProject(`教室 ${index}`)
    }

    expect(history().pastStates).toHaveLength(50)

    for (let index = 0; index < 50; index += 1) {
      history().undo()
    }

    expect(useProjectStore.getState().project.name).toBe('教室 5')
    expect(history().pastStates).toHaveLength(0)
  })

  it('新增、更新與刪除人員，並拒絕空白姓名', () => {
    const store = useProjectStore.getState()
    const personId = store.addPerson({
      name: ' 林品妤 ',
      studentNo: ' A01 ',
    })

    expect(personId).not.toBeNull()
    expect(store.addPerson({ name: '   ' })).toBeNull()

    useProjectStore.getState().updatePerson(personId!, {
      note: '班長',
    })

    expect(useProjectStore.getState().project.roster.persons[0]).toMatchObject(
      {
        name: '林品妤',
        studentNo: 'A01',
        note: '班長',
      },
    )

    useProjectStore.getState().deletePerson(personId!)
    expect(useProjectStore.getState().project.roster.persons).toHaveLength(0)
  })

  it('管理標籤名稱與型別，變更型別時清除人員值', () => {
    const store = useProjectStore.getState()
    const tagId = store.addTag({
      name: '組別',
      type: 'enum',
      options: ['A', 'B'],
    })
    const personId = store.addPerson({
      name: '甲',
      tags: { [tagId!]: 'A' },
    })

    expect(tagId).not.toBeNull()
    expect(
      useProjectStore.getState().addTag({ name: '組別', type: 'enum' }),
    ).toBeNull()
    expect(
      useProjectStore.getState().updateTag(tagId!, { type: 'number' }),
    ).toBe(true)
    expect(
      useProjectStore.getState().project.roster.persons[0].tags[tagId!],
    ).toBeUndefined()
    expect(
      useProjectStore.getState().updatePerson(personId!, { name: '  ' }),
    ).toBe(false)
  })

  it('刪除標籤時同步移除相關規則，刪除人員時清除鎖定與固定規則', () => {
    const store = useProjectStore.getState()
    const tagId = store.addTag({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })!
    const personId = store.addPerson({ name: '甲' })!

    const separateRule: SeparateRule = {
      id: 'separate-1',
      enabled: true,
      strength: 'hard',
      weight: 1,
      note: '',
      type: 'separate',
      tagId,
      values: [],
      adjacency: 'all8',
    }
    const pinRule: PinRule = {
      id: 'pin-1',
      enabled: true,
      strength: 'hard',
      weight: 1,
      note: '',
      type: 'pin',
      personId,
      seatId: 'r0c0',
    }

    useProjectStore.setState((state) => ({
      project: {
        ...state.project,
        lockedPersonIds: [personId],
        rules: [separateRule, pinRule],
      },
    }))
    useProjectStore.temporal.getState().clear()

    useProjectStore.getState().deleteTag(tagId)
    expect(useProjectStore.getState().project.rules).toEqual([pinRule])

    useProjectStore.getState().deletePerson(personId)
    expect(useProjectStore.getState().project.lockedPersonIds).toEqual([])
    expect(useProjectStore.getState().project.rules).toEqual([])
  })

  it('匯入名單時合併既有座號並可復原', () => {
    const store = useProjectStore.getState()
    store.addPerson({ name: '舊生', studentNo: 'A01' })
    const plan = buildImportPlan(
      parseTextTable('姓名,座號\n甲,A01\n乙,A02\n', 'csv'),
      { 0: 'name', 1: 'studentNo' },
      [],
    )

    const outcome = useProjectStore
      .getState()
      .importRoster(plan, 'merge')

    expect(outcome.addedCount).toBe(1)
    expect(outcome.skippedExistingCount).toBe(1)
    expect(
      useProjectStore
        .getState()
        .project.roster.persons.map((person) => person.name),
    ).toEqual(['舊生', '乙'])

    history().undo()
    expect(
      useProjectStore
        .getState()
        .project.roster.persons.map((person) => person.name),
    ).toEqual(['舊生'])
  })

  it('覆蓋名單時保留既有標籤定義並延伸選項', () => {
    const store = useProjectStore.getState()
    const tag = createTagDef({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })
    store.addTag(tag)
    const plan = buildImportPlan(
      parseTextTable('姓名,組別\n甲,B\n', 'csv'),
      { 0: 'name', 1: `tag:${tag.id}` },
      [tag],
    )

    useProjectStore.getState().importRoster(plan, 'replace')

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)
    expect(useProjectStore.getState().project.roster.tags[0].options).toEqual([
      'A',
      'B',
    ])
  })
})
