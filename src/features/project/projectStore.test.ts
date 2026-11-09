import { beforeEach, describe, expect, it } from 'vitest'
import type { PinRule, SeparateRule } from '../../types/domain'
import {
  buildImportPlan,
  parseTextTable,
} from '../roster/importRoster'
import { createClassroom } from '../classroom/classroomOps'
import { createTagDef } from '../roster/rosterOps'
import { createRule } from '../rules/ruleOps'
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

  it('取代教室配置並保留單一步復原', () => {
    const original = useProjectStore.getState().project.classroom
    const next = createClassroom({ cols: 4, rows: 3 })
    next.cells[0] = { type: 'blocked' }

    useProjectStore.getState().replaceClassroom(next)

    expect(useProjectStore.getState().project.classroom).toBe(next)
    expect(history().pastStates).toHaveLength(1)

    history().undo()
    expect(useProjectStore.getState().project.classroom).toBe(original)
  })

  it('套用新教室時清除失效座位分配與固定規則', () => {
    const store = useProjectStore.getState()
    const personId = store.addPerson({ name: '林品妤' })!
    store.addRule(
      createRule('pin', {
        personId,
        seatId: 'r0c0',
      }),
    )
    useProjectStore.getState().runSeating({
      occupancy: { kind: 'full' },
      allocation: { kind: 'ordered', orderBy: 'import', fill: 'row-major' },
      seed: 'share-room',
      partial: false,
    })

    expect(
      useProjectStore.getState().project.currentAssignment?.assignments.r0c0,
    ).toBe(personId)

    const next = createClassroom({ cols: 2, rows: 2 })
    next.cells[0] = { type: 'blocked' }
    useProjectStore.getState().replaceClassroom(next)

    const project = useProjectStore.getState().project
    expect(project.currentAssignment?.assignments).toEqual({})
    expect(project.currentAssignment?.unassignedPersonIds).toEqual([personId])
    expect(project.rules).toEqual([])
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

  function addPeople(count: number) {
    for (let index = 1; index <= count; index += 1) {
      useProjectStore.getState().addPerson({
        name: `學生 ${index}`,
        studentNo: String(index).padStart(2, '0'),
      })
    }

    useProjectStore.temporal.getState().clear()
  }

  const seatingConfig = {
    occupancy: { kind: 'full' as const },
    allocation: {
      kind: 'ordered' as const,
      orderBy: 'studentNo' as const,
      fill: 'row-major' as const,
    },
    seed: 'store-seed',
    partial: false,
  }

  it('執行排座後保存結果，且只寫入一筆歷史', () => {
    addPeople(3)

    const outcome = useProjectStore.getState().runSeating(seatingConfig)

    expect(outcome.ok).toBe(true)
    expect(
      useProjectStore.getState().project.currentAssignment?.assignments,
    ).toEqual({
      r0c0: expect.any(String),
      r0c1: expect.any(String),
      r0c2: expect.any(String),
    })
    expect(history().pastStates).toHaveLength(1)
  })

  it('第一次安排人員時自動建立手動座位表', () => {
    addPeople(2)

    const personId =
      useProjectStore.getState().project.roster.persons[0].id
    const outcome = useProjectStore
      .getState()
      .assignUnassigned(personId, 'r0c0', {
        manualConfig: seatingConfig,
      })

    expect(outcome.ok).toBe(true)
    const assignment =
      useProjectStore.getState().project.currentAssignment
    expect(assignment?.source).toBe('manual')
    expect(assignment?.assignments).toEqual({ r0c0: personId })
    expect(assignment?.unassignedPersonIds).toHaveLength(1)
    expect(history().pastStates).toHaveLength(1)

    const secondPersonId =
      useProjectStore.getState().project.roster.persons[1].id
    const placed = useProjectStore
      .getState()
      .assignUnassigned(secondPersonId, 'r0c1')

    expect(placed.ok).toBe(true)
    expect(
      useProjectStore.getState().project.currentAssignment?.assignments.r0c1,
    ).toBe(secondPersonId)
    expect(history().pastStates).toHaveLength(2)
  })

  it('名單為空時不建立手動座位表', () => {
    const outcome = useProjectStore
      .getState()
      .assignUnassigned('missing-person', 'r0c0', {
        manualConfig: seatingConfig,
      })

    expect(outcome.ok).toBe(false)
    expect(useProjectStore.getState().project.currentAssignment).toBeNull()
    expect(history().pastStates).toHaveLength(0)
  })

  it('沒有可用座位時不建立手動座位表', () => {
    const classroom =
      useProjectStore.getState().project.classroom
    const positions = Array.from(
      { length: classroom.cols * classroom.rows },
      (_, index) => ({
        row: Math.floor(index / classroom.cols),
        col: index % classroom.cols,
      }),
    )
    useProjectStore.getState().applyCellTypes(positions, 'blocked')
    addPeople(1)
    const personId =
      useProjectStore.getState().project.roster.persons[0].id
    history().clear()

    const outcome = useProjectStore
      .getState()
      .assignUnassigned(personId, 'r0c0', {
        manualConfig: seatingConfig,
      })

    expect(outcome.ok).toBe(false)
    expect(useProjectStore.getState().project.currentAssignment).toBeNull()
    expect(history().pastStates).toHaveLength(0)
  })

  it('容量不足時不寫入結果或歷史', () => {
    useProjectStore.getState().resizeRoom(2, 2)
    addPeople(5)

    const outcome = useProjectStore.getState().runSeating(seatingConfig)

    expect(outcome.ok).toBe(false)
    expect(useProjectStore.getState().project.currentAssignment).toBeNull()
    expect(history().pastStates).toHaveLength(0)
  })

  it('部分排座保留未分配人員', () => {
    useProjectStore.getState().resizeRoom(2, 2)
    addPeople(5)

    const outcome = useProjectStore.getState().runSeating({
      ...seatingConfig,
      partial: true,
    })

    expect(outcome.ok).toBe(true)
    expect(
      useProjectStore.getState().project.currentAssignment
        ?.unassignedPersonIds,
    ).toHaveLength(1)
  })

  it('切換座位顯示模式並可復原', () => {
    useProjectStore.getState().setDisplay('both')
    expect(useProjectStore.getState().project.settings.display).toBe('both')

    history().undo()
    expect(useProjectStore.getState().project.settings.display).toBe('name')
  })

  it('鎖定與解除鎖定同步更新結果與鎖定意圖', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const personId =
      useProjectStore.getState().project.roster.persons[0].id

    useProjectStore.getState().togglePersonLock(personId)
    expect(useProjectStore.getState().project.lockedPersonIds).toEqual([
      personId,
    ])
    expect(
      useProjectStore.getState().project.currentAssignment?.lockedPersonIds,
    ).toContain(personId)

    useProjectStore.getState().togglePersonLock(personId)
    expect(useProjectStore.getState().project.lockedPersonIds).toEqual([])
    expect(
      useProjectStore.getState().project.currentAssignment?.lockedPersonIds,
    ).not.toContain(personId)
  })

  it('拖曳互換座位並可復原', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const assignmentsBefore =
      useProjectStore.getState().project.currentAssignment!.assignments

    const result = useProjectStore
      .getState()
      .moveSeatOccupant('r0c0', 'r0c1')

    expect(result.ok).toBe(true)
    expect(
      useProjectStore.getState().project.currentAssignment!.assignments,
    ).toEqual({
      r0c0: assignmentsBefore.r0c1,
      r0c1: assignmentsBefore.r0c0,
    })

    history().undo()
    expect(
      useProjectStore.getState().project.currentAssignment!.assignments,
    ).toEqual(assignmentsBefore)
  })

  it('鎖定人員不可移動，但可選擇覆蓋鎖定的目標', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const people = useProjectStore.getState().project.roster.persons
    useProjectStore.getState().togglePersonLock(people[0].id)

    const blocked = useProjectStore
      .getState()
      .moveSeatOccupant('r0c1', 'r0c0')
    expect(blocked.ok).toBe(false)

    const lockedTarget = useProjectStore
      .getState()
      .moveSeatOccupant('r0c1', 'r0c0', {
        allowLockedTarget: true,
      })
    expect(lockedTarget.ok).toBe(true)
    expect(lockedTarget.unlockedPersonId).toBe(people[0].id)
    expect(useProjectStore.getState().project.lockedPersonIds).toEqual([])
  })

  it('安排未分配人員時可將原佔用者退回未分配', () => {
    useProjectStore.getState().resizeRoom(2, 2)
    addPeople(5)
    useProjectStore.getState().runSeating({
      ...seatingConfig,
      partial: true,
    })
    const project = useProjectStore.getState().project
    const unassignedId = project.currentAssignment!.unassignedPersonIds[0]
    const targetSeat = Object.keys(
      project.currentAssignment!.assignments,
    )[0]

    const outcome = useProjectStore
      .getState()
      .assignUnassigned(unassignedId, targetSeat)

    expect(outcome.ok).toBe(true)
    expect(
      useProjectStore.getState().project.currentAssignment!.assignments[
        targetSeat
      ],
    ).toBe(unassignedId)
    expect(
      useProjectStore.getState().project.currentAssignment
        ?.unassignedPersonIds,
    ).toContain(outcome.displacedPersonId)
  })

  it('解除分配後人員進入未分配並解除鎖定', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const personId =
      useProjectStore.getState().project.roster.persons[0].id
    useProjectStore.getState().togglePersonLock(personId)

    useProjectStore.getState().unassignPerson(personId)

    expect(
      useProjectStore.getState().project.currentAssignment
        ?.unassignedPersonIds,
    ).toContain(personId)
    expect(useProjectStore.getState().project.lockedPersonIds).not.toContain(
      personId,
    )
  })

  it('教室格子改為走道後清除該座位的分配與鎖定', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const assignment =
      useProjectStore.getState().project.currentAssignment!
    const occupiedSeat = Object.keys(assignment.assignments)[1]
    const occupiedPersonId = assignment.assignments[occupiedSeat]
    const match = /^r(\d+)c(\d+)$/.exec(occupiedSeat)!

    useProjectStore.getState().togglePersonLock(occupiedPersonId)
    useProjectStore.getState().applyCellTypes(
      [{ row: Number(match[1]), col: Number(match[2]) }],
      'aisle',
    )

    const next = useProjectStore.getState().project
    expect(next.currentAssignment!.assignments[occupiedSeat]).toBeUndefined()
    expect(next.currentAssignment!.unassignedPersonIds).toContain(
      occupiedPersonId,
    )
    expect(next.lockedPersonIds).not.toContain(occupiedPersonId)
  })

  it('清除排座結果但保留鎖定意圖', () => {
    addPeople(2)
    useProjectStore.getState().runSeating(seatingConfig)
    const personId =
      useProjectStore.getState().project.roster.persons[0].id
    useProjectStore.getState().togglePersonLock(personId)

    useProjectStore.getState().clearAssignment()

    expect(useProjectStore.getState().project.currentAssignment).toBeNull()
    expect(useProjectStore.getState().project.lockedPersonIds).toContain(
      personId,
    )
  })

  it('匯入專案後取代目前專案並清空復原歷史', () => {
    useProjectStore.getState().renameProject('舊專案')
    const next = createDefaultProject()
    next.name = '匯入的專案'

    useProjectStore.getState().replaceProject(next)

    expect(useProjectStore.getState().project.name).toBe('匯入的專案')
    expect(history().pastStates).toHaveLength(0)
    expect(history().futureStates).toHaveLength(0)
  })

  it('新增、更新、切換與刪除規則並寫入歷史', () => {
    const tagId = useProjectStore.getState().addTag({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })!
    const rule = {
      ...createRule('separate', { tagId }),
      id: 'rule-1',
      values: ['A'],
    }

    expect(useProjectStore.getState().addRule(rule)).toBe(true)
    expect(useProjectStore.getState().project.rules).toHaveLength(1)
    expect(history().pastStates).toHaveLength(2)

    useProjectStore.getState().updateRule({ ...rule, note: '分開坐' })
    expect(useProjectStore.getState().project.rules[0].note).toBe('分開坐')

    useProjectStore.getState().toggleRule('rule-1')
    expect(useProjectStore.getState().project.rules[0].enabled).toBe(false)

    useProjectStore.getState().deleteRule('rule-1')
    expect(useProjectStore.getState().project.rules).toEqual([])
  })

  it('拒絕無效規則並在既有結果上更新衝突', () => {
    const store = useProjectStore.getState()
    const tagId = store.addTag({
      name: '組別',
      type: 'enum',
      options: ['A'],
    })!
    const firstId = store.addPerson({ name: '甲' })!
    const secondId = useProjectStore.getState().addPerson({ name: '乙' })!
    useProjectStore.getState().setPersonsTag([firstId, secondId], tagId, 'A')
    useProjectStore.getState().runSeating(seatingConfig)

    const invalid = {
      ...createRule('separate', { tagId: 'missing' }),
      id: 'invalid-rule',
    }
    expect(useProjectStore.getState().addRule(invalid)).toBe(false)

    const valid = {
      ...createRule('separate', { tagId }),
      id: 'valid-rule',
      adjacency: 'orthogonal' as const,
    }
    expect(useProjectStore.getState().addRule(valid)).toBe(true)

    const assignment =
      useProjectStore.getState().project.currentAssignment!
    expect(assignment.hardViolationCount).toBe(1)
    expect(assignment.violations[0].ruleId).toBe('valid-rule')

    useProjectStore.getState().toggleRule('valid-rule')
    expect(
      useProjectStore.getState().project.currentAssignment
        ?.hardViolationCount,
    ).toBe(0)
  })
})
