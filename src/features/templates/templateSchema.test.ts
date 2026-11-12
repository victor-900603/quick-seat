import { describe, expect, it } from 'vitest'
import {
  TEMPLATE_SCHEMA_VERSION,
  createTemplateBundle,
  parseTemplateBundle,
  serializeTemplateBundle,
} from './templateSchema'

describe('templateSchema', () => {
  it('建立包含三類內建範本的版本包', () => {
    const bundle = createTemplateBundle()

    expect(bundle.version).toBe(TEMPLATE_SCHEMA_VERSION)
    expect(bundle.classroom).toHaveLength(4)
    expect(bundle.rules).toHaveLength(4)
    expect(bundle.exports).toHaveLength(4)
    expect(bundle.classroom[0].cells).not.toBe(
      createTemplateBundle().classroom[0].cells,
    )
  })

  it('序列化後可還原相同內容', () => {
    const bundle = createTemplateBundle()
    const parsed = parseTemplateBundle(serializeTemplateBundle(bundle))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.bundle).toEqual(bundle)
  })

  it('拒絕無法解析的 JSON', () => {
    const result = parseTemplateBundle('{')

    expect(result).toEqual({
      ok: false,
      message: '無法解析範本檔，請確認 JSON 格式。',
    })
  })

  it('拒絕不支援的版本', () => {
    const bundle = createTemplateBundle()
    const result = parseTemplateBundle(
      JSON.stringify({ ...bundle, version: 99 }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('版本')
  })

  it('拒絕重複的範本識別碼', () => {
    const bundle = createTemplateBundle()
    bundle.classroom[1] = {
      ...bundle.classroom[1],
      id: bundle.classroom[0].id,
    }
    const result = parseTemplateBundle(JSON.stringify(bundle))

    expect(result.ok).toBe(false)
  })

  it('拒絕格子數量與尺寸不一致的教室範本', () => {
    const bundle = createTemplateBundle()
    bundle.classroom[0] = {
      ...bundle.classroom[0],
      cells: bundle.classroom[0].cells.slice(1),
    }
    const result = parseTemplateBundle(JSON.stringify(bundle))

    expect(result.ok).toBe(false)
  })
})
