import { beforeEach, describe, expect, it } from 'vitest'
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
})
