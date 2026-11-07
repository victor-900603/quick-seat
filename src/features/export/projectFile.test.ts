import { describe, expect, it } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import { createDefaultProject } from '../project/defaultProject'
import { parseProjectFile, serializeProject } from './projectFile'

describe('project file', () => {
  it('可完整匯出並讀回專案', () => {
    const project = createExportFixture()
    const result = parseProjectFile(serializeProject(project))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.project.name).toBe('三年甲班')
      expect(result.project.roster.persons).toHaveLength(3)
      expect(result.project.currentAssignment?.assignments).toEqual({
        r0c0: 'person-1',
        r0c1: 'person-2',
      })
      expect(result.project.settings.display).toBe('name')
    }
  })

  it('拒絕無法解析的 JSON', () => {
    expect(parseProjectFile('{')).toMatchObject({
      ok: false,
      message: '無法解析 JSON，請確認檔案格式。',
    })
  })

  it('拒絕不支援的 schemaVersion', () => {
    const project = serializeProject(createDefaultProject()).replace(
      '"schemaVersion": 1',
      '"schemaVersion": 2',
    )

    expect(parseProjectFile(project)).toMatchObject({
      ok: false,
      message: expect.stringContaining('schemaVersion'),
    })
  })

  it('拒絕教室格子數與尺寸不一致的專案', () => {
    const project = createDefaultProject()
    project.classroom.cells.pop()

    expect(parseProjectFile(JSON.stringify(project))).toMatchObject({
      ok: false,
      message: expect.stringContaining('教室格子數量與欄列數不一致'),
    })
  })

  it('接受沒有 source 欄位的舊版排座結果', () => {
    const project = createExportFixture()

    if (project.currentAssignment) {
      delete project.currentAssignment.source
    }

    const result = parseProjectFile(JSON.stringify(project))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.project.currentAssignment?.source).toBeUndefined()
    }
  })
})
