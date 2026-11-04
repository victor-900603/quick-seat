import { describe, expect, it } from 'vitest'
import { createDefaultProject, DEFAULT_PROJECT_SETTINGS } from './defaultProject'

describe('createDefaultProject', () => {
  it('建立包含預設教室與空名單的專案', () => {
    const project = createDefaultProject()

    expect(project.schemaVersion).toBe(1)
    expect(project.name).toBe('未命名教室')
    expect(project.classroom.cols).toBe(6)
    expect(project.classroom.rows).toBe(5)
    expect(project.classroom.cells).toHaveLength(30)
    expect(project.roster).toEqual({
      persons: [],
      tags: [],
      extraColumns: [],
    })
    expect(project.rules).toEqual([])
    expect(project.lockedPersonIds).toEqual([])
    expect(project.currentAssignment).toBeNull()
    expect(project.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
  })

  it('每次建立都有獨立識別碼與時間', () => {
    const first = createDefaultProject()
    const second = createDefaultProject()

    expect(first.id).not.toBe(second.id)
    expect(first.settings).not.toBe(second.settings)
    expect(first.classroom).not.toBe(second.classroom)
  })
})
