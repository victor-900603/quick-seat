import type {
  Adjacency,
  Rule,
  Strength,
  TagDef,
} from '../../types/domain'
import { createRule } from '../rules/ruleOps'

export type RuleTemplateId =
  | 'separate-all'
  | 'together-cluster'
  | 'front-band'
  | 'avoid-tags'

export interface RuleTemplate {
  id: RuleTemplateId
  name: string
  description: string
  category: '分開' | '同組' | '位置' | '避開'
  needsValue: boolean
  needsSecondTag: boolean
}

export interface RuleTemplateInput {
  tagId: string
  values?: string[]
  secondTagId?: string
  secondTagValues?: string[]
  band?: number
}

export interface RuleTemplateResult {
  ok: boolean
  rules: Rule[]
  message?: string
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'separate-all',
    name: '考試分開',
    description: '所選標籤的所有值彼此不相鄰，適合考試或需要拉開距離的場合。',
    category: '分開',
    needsValue: false,
    needsSecondTag: false,
  },
  {
    id: 'together-cluster',
    name: '分組群聚',
    description: '所選標籤的每個值各自形成單一群聚，適合分組活動。',
    category: '同組',
    needsValue: true,
    needsSecondTag: false,
  },
  {
    id: 'front-band',
    name: '安排在前排',
    description: '所選標籤值安排在指定列數內，適合需要靠近講台的學生。',
    category: '位置',
    needsValue: true,
    needsSecondTag: false,
  },
  {
    id: 'avoid-tags',
    name: '兩組避開',
    description: '兩個標籤值彼此不相鄰，適合需要保持距離的組合。',
    category: '避開',
    needsValue: true,
    needsSecondTag: true,
  },
]

function baseOptions(strength: Strength, weight: number, note: string) {
  return { strength, weight, note }
}

function withBase<T extends Rule>(
  rule: T,
  strength: Strength,
  weight: number,
  note: string,
): T {
  return { ...rule, ...baseOptions(strength, weight, note) }
}

export function createRulesFromTemplate(
  templateId: RuleTemplateId,
  input: RuleTemplateInput,
  adjacency: Adjacency = 'all8',
): RuleTemplateResult {
  const template = RULE_TEMPLATES.find((item) => item.id === templateId)

  if (!template) {
    return { ok: false, rules: [], message: '找不到規則範本。' }
  }

  if (!input.tagId) {
    return { ok: false, rules: [], message: '請選擇標籤。' }
  }

  if (template.needsValue && (input.values ?? []).length === 0) {
    return { ok: false, rules: [], message: '請至少選擇一個套用值。' }
  }

  if (template.needsSecondTag) {
    if (!input.secondTagId) {
      return { ok: false, rules: [], message: '請選擇第二個標籤。' }
    }

    if (input.secondTagId === input.tagId) {
      return {
        ok: false,
        rules: [],
        message: '兩個標籤必須不同。',
      }
    }

    if (!input.secondTagValues || input.secondTagValues.length === 0) {
      return {
        ok: false,
        rules: [],
        message: '請至少選擇一個第二標籤值。',
      }
    }
  }

  if (templateId === 'separate-all') {
    return {
      ok: true,
      rules: [
        withBase(
          createRule('separate', {
            tagId: input.tagId,
            values: input.values ?? [],
            adjacency,
          }),
          'hard',
          5,
          template.description,
        ),
      ],
    }
  }

  if (templateId === 'together-cluster') {
    return {
      ok: true,
      rules: [
        withBase(
          createRule('together', {
            tagId: input.tagId,
            values: input.values ?? [],
            adjacency,
            mode: 'cluster',
          }),
          'soft',
          4,
          template.description,
        ),
      ],
    }
  }

  if (templateId === 'front-band') {
    const rule = createRule('position', { tagId: input.tagId })
    return {
      ok: true,
      rules: [
        withBase(
          {
            ...rule,
            value: (input.values ?? [])[0] ?? '',
            position: 'front',
            band: Math.min(60, Math.max(1, Math.trunc(input.band ?? 2))),
          },
          'soft',
          3,
          template.description,
        ),
      ],
    }
  }

  return {
    ok: true,
    rules: [
      (() => {
        const rule = createRule('avoid', { adjacency })
        return withBase(
          {
            ...rule,
            tagIdA: input.tagId,
            valueA: (input.values ?? [])[0] ?? '',
            tagIdB: input.secondTagId ?? '',
            valueB: input.secondTagValues?.[0] ?? '',
          },
          'hard',
          5,
          template.description,
        )
      })(),
    ],
  }
}

export function templateValues(tag: TagDef | undefined): string[] {
  if (!tag) {
    return []
  }

  if (tag.type === 'boolean') {
    return ['是', '否']
  }

  return tag.options
}
