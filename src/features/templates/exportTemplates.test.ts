import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  type ExportContentOptions,
} from '../export/exportData'
import {
  EXPORT_TEMPLATES,
  applyExportTemplate,
} from './exportTemplates'

describe('export templates', () => {
  it('內建範本具備唯一識別碼與可套用選項', () => {
    expect(new Set(EXPORT_TEMPLATES.map((item) => item.id)).size).toBe(
      EXPORT_TEMPLATES.length,
    )

    for (const template of EXPORT_TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0)
      expect(Object.keys(template.options).length).toBeGreaterThan(0)
    }
  })

  it('精簡姓名範本只顯示姓名並放大字級', () => {
    const template = EXPORT_TEMPLATES.find(
      (item) => item.id === 'name-only',
    )

    expect(template?.options).toMatchObject({
      template: '{name}',
      htmlCellHeight: 46,
      htmlFontSize: 13,
    })
  })

  it('規則報告範本會開啟規則報告', () => {
    const template = EXPORT_TEMPLATES.find(
      (item) => item.id === 'rule-report',
    )

    expect(template?.options.includeRuleReport).toBe(true)
  })

  it('套用範本會合併目前設定且不修改原物件', () => {
    const current: ExportContentOptions = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '目前模板',
      htmlFontSize: 9,
    }
    const template = EXPORT_TEMPLATES.find(
      (item) => item.id === 'large-print',
    )

    if (!template) {
      throw new Error('找不到大字版範本')
    }

    const next = applyExportTemplate(current, template)

    expect(next.template).toBe(template.options.template)
    expect(next.htmlFontSize).toBe(16)
    expect(next.paperSize).toBe(current.paperSize)
    expect(current.template).toBe('目前模板')
    expect(current.htmlFontSize).toBe(9)
  })
})
