import type { CellType } from '../../types/domain'
import {
  CLASSROOM_TEMPLATES,
  type ClassroomTemplate,
} from './classroomTemplates'
import {
  EXPORT_TEMPLATES,
  type ExportTemplate,
} from './exportTemplates'
import { RULE_TEMPLATES, type RuleTemplate } from './ruleTemplates'

export const TEMPLATE_SCHEMA_VERSION = 1

export interface TemplateBundleV1 {
  version: 1
  classroom: ClassroomTemplate[]
  rules: RuleTemplate[]
  exports: ExportTemplate[]
}

export type TemplateBundleResult =
  | { ok: true; bundle: TemplateBundleV1 }
  | { ok: false; message: string }

const CELL_TYPES = new Set<CellType>(['seat', 'aisle', 'blocked', 'empty'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateIdList(
  items: Array<{ id: string }>,
  label: string,
): string | null {
  const ids = new Set<string>()

  for (const item of items) {
    if (!isNonEmptyString(item.id)) {
      return `${label}缺少識別碼。`
    }

    if (ids.has(item.id)) {
      return `${label}含重複識別碼：${item.id}。`
    }

    ids.add(item.id)
  }

  return null
}

function validateClassroomTemplates(
  value: unknown,
): string | null {
  if (!Array.isArray(value)) {
    return '教室範本必須是陣列。'
  }

  const templates = value as ClassroomTemplate[]

  for (const template of templates) {
    if (!isRecord(template)) {
      return '教室範本格式不正確。'
    }

    if (
      !isNonEmptyString(template.name) ||
      !isNonEmptyString(template.description) ||
      !isNonEmptyString(template.category)
    ) {
      return `教室範本「${template.id ?? '未命名'}」缺少名稱或說明。`
    }

    if (
      !Number.isInteger(template.cols) ||
      !Number.isInteger(template.rows) ||
      template.cols < 1 ||
      template.cols > 60 ||
      template.rows < 1 ||
      template.rows > 60
    ) {
      return `教室範本「${template.name}」尺寸不正確。`
    }

    if (
      !Array.isArray(template.cells) ||
      template.cells.length !== template.cols * template.rows
    ) {
      return `教室範本「${template.name}」格子數與尺寸不一致。`
    }

    if (template.cells.some((cell) => !CELL_TYPES.has(cell))) {
      return `教室範本「${template.name}」含無效格子型別。`
    }
  }

  return validateIdList(templates, '教室範本')
}

function validateRuleTemplates(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return '規則範本必須是陣列。'
  }

  const templates = value as RuleTemplate[]

  for (const template of templates) {
    if (
      !isRecord(template) ||
      !isNonEmptyString(template.name) ||
      !isNonEmptyString(template.description) ||
      !isNonEmptyString(template.category) ||
      typeof template.needsValue !== 'boolean' ||
      typeof template.needsSecondTag !== 'boolean'
    ) {
      return '規則範本格式不正確。'
    }
  }

  return validateIdList(templates, '規則範本')
}

function validateExportTemplates(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return '匯出範本必須是陣列。'
  }

  const templates = value as ExportTemplate[]

  for (const template of templates) {
    if (
      !isRecord(template) ||
      !isNonEmptyString(template.name) ||
      !isNonEmptyString(template.description) ||
      !isRecord(template.options)
    ) {
      return '匯出範本格式不正確。'
    }
  }

  return validateIdList(templates, '匯出範本')
}

export function createTemplateBundle(): TemplateBundleV1 {
  return {
    version: TEMPLATE_SCHEMA_VERSION,
    classroom: CLASSROOM_TEMPLATES.map((template) => ({
      ...template,
      cells: [...template.cells],
    })),
    rules: RULE_TEMPLATES.map((template) => ({ ...template })),
    exports: EXPORT_TEMPLATES.map((template) => ({
      ...template,
      options: { ...template.options },
    })),
  }
}

export function serializeTemplateBundle(
  bundle: TemplateBundleV1 = createTemplateBundle(),
): string {
  return JSON.stringify(bundle, null, 2)
}

export function parseTemplateBundle(text: string): TemplateBundleResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, message: '無法解析範本檔，請確認 JSON 格式。' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: '範本檔必須是物件。' }
  }

  if (parsed.version !== TEMPLATE_SCHEMA_VERSION) {
    return {
      ok: false,
      message: `不支援的範本版本：${String(parsed.version ?? '未指定')}。`,
    }
  }

  const classroomError = validateClassroomTemplates(parsed.classroom)
  if (classroomError) {
    return { ok: false, message: classroomError }
  }

  const ruleError = validateRuleTemplates(parsed.rules)
  if (ruleError) {
    return { ok: false, message: ruleError }
  }

  const exportError = validateExportTemplates(parsed.exports)
  if (exportError) {
    return { ok: false, message: exportError }
  }

  return {
    ok: true,
    bundle: parsed as unknown as TemplateBundleV1,
  }
}
