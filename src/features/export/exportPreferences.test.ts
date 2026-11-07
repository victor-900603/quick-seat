import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPORT_CONTENT_OPTIONS } from './exportData'
import {
  EXPORT_OPTIONS_KEY,
  loadExportOptions,
  saveExportOptions,
} from './exportPreferences'

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

describe('exportPreferences', () => {
  it('沒有設定時回傳預設值', () => {
    expect(loadExportOptions(createStorage())).toEqual(
      DEFAULT_EXPORT_CONTENT_OPTIONS,
    )
  })

  it('可儲存並讀回模板與對齊', () => {
    const storage = createStorage()
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{name}｜{studentNo}',
      align: 'left' as const,
    }

    saveExportOptions(options, storage)

    expect(storage.getItem(EXPORT_OPTIONS_KEY)).not.toBeNull()
    expect(loadExportOptions(storage)).toEqual(options)
  })

  it('舊版只有模板與對齊時補上版面預設值', () => {
    const storage = createStorage({
      [EXPORT_OPTIONS_KEY]: JSON.stringify({
        template: '{name}',
        align: 'left',
      }),
    })

    expect(loadExportOptions(storage)).toEqual({
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{name}',
      align: 'left',
    })
  })

  it('超出範圍的版面數值會夾在允許範圍內', () => {
    const storage = createStorage({
      [EXPORT_OPTIONS_KEY]: JSON.stringify({
        ...DEFAULT_EXPORT_CONTENT_OPTIONS,
        marginMm: 99,
        htmlFontSize: 1,
      }),
    })
    const options = loadExportOptions(storage)

    expect(options.marginMm).toBe(20)
    expect(options.htmlFontSize).toBe(8)
  })

  it('格式錯誤時回傳預設值', () => {
    const storage = createStorage({
      [EXPORT_OPTIONS_KEY]: JSON.stringify({ template: 1, align: 'right' }),
    })

    expect(loadExportOptions(storage)).toEqual(DEFAULT_EXPORT_CONTENT_OPTIONS)
  })
})
