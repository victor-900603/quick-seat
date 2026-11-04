import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../features/project/defaultProject'
import {
  ACTIVE_PROJECT_KEY,
  isProject,
  loadProject,
  saveProject,
} from './storage'

function memoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

describe('isProject', () => {
  it('接受預設專案', () => {
    expect(isProject(createDefaultProject())).toBe(true)
  })

  it('拒絕版本、教室長度與格子型別錯誤的資料', () => {
    const project = createDefaultProject()

    expect(isProject({ ...project, schemaVersion: 2 })).toBe(false)
    expect(
      isProject({
        ...project,
        classroom: { ...project.classroom, cells: [] },
      }),
    ).toBe(false)
    expect(
      isProject({
        ...project,
        classroom: {
          ...project.classroom,
          cells: [{ type: 'unknown' }],
        },
      }),
    ).toBe(false)
  })

  it('拒絕缺少名單、設定或鎖定資料的專案', () => {
    const project = createDefaultProject()

    expect(isProject({ ...project, roster: null })).toBe(false)
    expect(isProject({ ...project, settings: { display: 'name' } })).toBe(false)
    expect(isProject({ ...project, lockedPersonIds: [1] })).toBe(false)
    expect(isProject(null)).toBe(false)
  })
})

describe('saveProject / loadProject', () => {
  it('寫入後可讀回相同專案', () => {
    const storage = memoryStorage()
    const project = createDefaultProject()

    expect(saveProject(project, storage)).toEqual({ ok: true })
    expect(loadProject(storage)).toEqual(project)
  })

  it('沒有資料或 JSON 損毀時回傳 null', () => {
    const storage = memoryStorage()

    expect(loadProject(storage)).toBeNull()

    storage.setItem(ACTIVE_PROJECT_KEY, '{broken')
    expect(loadProject(storage)).toBeNull()
  })

  it('資料結構不符時回傳 null', () => {
    const storage = memoryStorage()
    storage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify({ schemaVersion: 1 }))

    expect(loadProject(storage)).toBeNull()
  })

  it('讀取失敗時回傳 null', () => {
    const storage = memoryStorage()
    storage.getItem = () => {
      throw new Error('denied')
    }

    expect(loadProject(storage)).toBeNull()
  })

  it('寫入失敗時回傳錯誤訊息', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('quota exceeded')
    }

    expect(saveProject(createDefaultProject(), storage)).toEqual({
      ok: false,
      message: 'quota exceeded',
    })
  })
})
