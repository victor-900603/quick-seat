import type {
  Adjacency,
  AvoidRule,
  Classroom,
  Person,
  PinRule,
  PositionKind,
  PositionRule,
  Project,
  Rule,
  RuleBase,
  SeparateRule,
  TagDef,
  TogetherRule,
} from '../../types/domain'
import { getSeatRefs, parseSeatId } from '../classroom/numbering'

export type RuleType = Rule['type']

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  separate: '分開',
  together: '同組',
  position: '位置',
  avoid: '避開',
  pin: '固定座位',
}

export const POSITION_LABELS: Record<PositionKind, string> = {
  front: '前排',
  back: '後排',
  left: '左側',
  right: '右側',
  aisle: '走道旁',
}

export const ADJACENCY_LABELS: Record<Adjacency, string> = {
  orthogonal: '上下左右相鄰',
  all8: '含斜角相鄰',
}

export interface RuleFactoryOptions {
  tagId?: string
  personId?: string
  seatId?: string
  adjacency?: Adjacency
}

export interface RuleValidationResult {
  valid: boolean
  message: string | null
}

function baseRule<T extends RuleType>(
  type: T,
): RuleBase & { type: T } {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    strength: 'hard',
    weight: 5,
    note: '',
    type,
  }
}

export function createRule(
  type: 'separate',
  options?: RuleFactoryOptions,
): SeparateRule
export function createRule(
  type: 'together',
  options?: RuleFactoryOptions,
): TogetherRule
export function createRule(
  type: 'position',
  options?: RuleFactoryOptions,
): PositionRule
export function createRule(
  type: 'avoid',
  options?: RuleFactoryOptions,
): AvoidRule
export function createRule(
  type: 'pin',
  options?: RuleFactoryOptions,
): PinRule
export function createRule(
  type: RuleType,
  options?: RuleFactoryOptions,
): Rule
export function createRule(
  type: RuleType,
  options: RuleFactoryOptions = {},
): Rule {
  const adjacency = options.adjacency ?? 'all8'

  if (type === 'position') {
    return {
      ...baseRule(type),
      tagId: options.tagId ?? '',
      value: '',
      position: 'front',
      band: 1,
    }
  }

  if (type === 'avoid') {
    return {
      ...baseRule(type),
      tagIdA: options.tagId ?? '',
      valueA: '',
      tagIdB: '',
      valueB: '',
      adjacency,
    }
  }

  if (type === 'pin') {
    return {
      ...baseRule(type),
      strength: 'hard',
      weight: 1,
      personId: options.personId ?? '',
      seatId: options.seatId ?? '',
    }
  }

  if (type === 'separate') {
    return {
      ...baseRule(type),
      tagId: options.tagId ?? '',
      values: [],
      adjacency,
    }
  }

  return {
    ...baseRule(type),
    tagId: options.tagId ?? '',
    values: [],
    adjacency,
  }
}

export function normalizeRule(rule: Rule): Rule {
  const base = {
    ...rule,
    weight:
      rule.type === 'pin'
        ? 1
        : Math.min(10, Math.max(1, Math.round(rule.weight))),
    strength: rule.type === 'pin' ? ('hard' as const) : rule.strength,
    note: rule.note.trim(),
  }

  switch (base.type) {
    case 'separate':
    case 'together':
      return {
        ...base,
        values: normalizeValues(base.values),
      }
    case 'position':
      return {
        ...base,
        value: base.value.trim(),
        band: Math.min(60, Math.max(1, Math.round(base.band))),
      }
    case 'avoid':
      return {
        ...base,
        valueA: base.valueA.trim(),
        valueB: base.valueB.trim(),
      }
    case 'pin':
      return base
  }
}

export function normalizeValues(values: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const next = value.trim()

    if (!next || seen.has(next)) {
      continue
    }

    seen.add(next)
    result.push(next)
  }

  return result
}

function allowedValues(tag: TagDef): string[] {
  return tag.type === 'boolean' ? ['是', '否'] : tag.options
}

export function validateRule(
  rule: Rule,
  project: Pick<Project, 'classroom' | 'roster' | 'rules'>,
  ignoreId?: string,
): RuleValidationResult {
  const tagById = new Map(project.roster.tags.map((tag) => [tag.id, tag]))
  const personIds = new Set(
    project.roster.persons.map((person) => person.id),
  )

  if (rule.type === 'pin') {
    if (!rule.personId || !personIds.has(rule.personId)) {
      return { valid: false, message: '請選擇要固定的人員。' }
    }

    const position = parseSeatId(rule.seatId)

    if (
      !position ||
      position.row < 0 ||
      position.col < 0 ||
      position.row >= project.classroom.rows ||
      position.col >= project.classroom.cols ||
      project.classroom.cells[
        position.row * project.classroom.cols + position.col
      ]?.type !== 'seat'
    ) {
      return { valid: false, message: '請選擇有效的固定座位。' }
    }

    const duplicate = project.rules.find(
      (candidate) =>
        candidate.id !== ignoreId &&
        candidate.enabled &&
        candidate.type === 'pin' &&
        candidate.personId === rule.personId,
    )

    if (duplicate) {
      return { valid: false, message: '這位人員已有其他固定座位規則。' }
    }

    const occupied = project.rules.find(
      (candidate) =>
        candidate.id !== ignoreId &&
        candidate.enabled &&
        candidate.type === 'pin' &&
        candidate.seatId === rule.seatId,
    )

    if (occupied) {
      return { valid: false, message: '這個座位已被其他固定座位規則使用。' }
    }

    return { valid: true, message: null }
  }

  if (rule.type === 'avoid') {
    const tagA = tagById.get(rule.tagIdA)
    const tagB = tagById.get(rule.tagIdB)

    if (!tagA) {
      return { valid: false, message: '請選擇第一個有效的標籤。' }
    }

    if (!tagB) {
      return { valid: false, message: '請選擇第二個有效的標籤。' }
    }

    if (!rule.valueA || !rule.valueB) {
      return { valid: false, message: '請選擇要避開的兩個標籤值。' }
    }

    if (
      tagA.type !== 'number' &&
      !allowedValues(tagA).includes(rule.valueA)
    ) {
      return {
        valid: false,
        message: `標籤「${tagA.name}」沒有「${rule.valueA}」這個值。`,
      }
    }

    if (
      tagB.type !== 'number' &&
      !allowedValues(tagB).includes(rule.valueB)
    ) {
      return {
        valid: false,
        message: `標籤「${tagB.name}」沒有「${rule.valueB}」這個值。`,
      }
    }

    return { valid: true, message: null }
  }

  const tag = tagById.get(rule.tagId)

  if (!tag) {
    return { valid: false, message: '請選擇有效的標籤。' }
  }

  if (rule.type === 'separate' || rule.type === 'together') {
    if (rule.values.length > 0) {
      const invalid = rule.values.find(
        (value) => !allowedValues(tag).includes(value),
      )

      if (tag.type !== 'number' && invalid) {
        return {
          valid: false,
          message: `標籤「${tag.name}」沒有「${invalid}」這個值。`,
        }
      }
    }

    return { valid: true, message: null }
  }

  if (!rule.value) {
    return { valid: false, message: '請選擇要套用的標籤值。' }
  }

  if (
    tag.type !== 'number' &&
    !allowedValues(tag).includes(rule.value)
  ) {
    return {
      valid: false,
      message: `標籤「${tag.name}」沒有「${rule.value}」這個值。`,
    }
  }

  return { valid: true, message: null }
}

function sameRule(left: Rule, right: Rule): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function addRule(rules: Rule[], rule: Rule): Rule[] {
  if (rules.some((candidate) => candidate.id === rule.id)) {
    return rules
  }

  return [...rules, rule]
}

export function replaceRule(rules: Rule[], rule: Rule): Rule[] {
  const index = rules.findIndex((candidate) => candidate.id === rule.id)

  if (index < 0 || sameRule(rules[index], rule)) {
    return rules
  }

  const next = [...rules]
  next[index] = rule
  return next
}

export function removeRule(rules: Rule[], ruleId: string): Rule[] {
  const next = rules.filter((rule) => rule.id !== ruleId)

  return next.length === rules.length ? rules : next
}

export function toggleRule(rules: Rule[], ruleId: string): Rule[] {
  const index = rules.findIndex((rule) => rule.id === ruleId)

  if (index < 0) {
    return rules
  }

  const next = [...rules]
  next[index] = { ...rules[index], enabled: !rules[index].enabled }
  return next
}

export function pruneInvalidPinRules(
  rules: Rule[],
  classroom: Classroom,
  persons: Person[],
): Rule[] {
  const personIds = new Set(persons.map((person) => person.id))
  const seatIds = new Set(getSeatRefs(classroom).map((seat) => seat.id))

  const next = rules.filter(
    (rule) =>
      rule.type !== 'pin' ||
      (personIds.has(rule.personId) && seatIds.has(rule.seatId)),
  )

  return next.length === rules.length ? rules : next
}

export function tagValueText(
  tag: TagDef | undefined,
  value: string | number | boolean | undefined,
): string {
  if (value === undefined || value === null) {
    return ''
  }

  if (tag?.type === 'boolean') {
    return value ? '是' : '否'
  }

  return String(value)
}

function tagName(tags: TagDef[], tagId: string): string {
  return tags.find((tag) => tag.id === tagId)?.name ?? '未知標籤'
}

function seatCode(
  project: Pick<Project, 'classroom'>,
  seatId: string,
): string {
  return (
    getSeatRefs(project.classroom).find((seat) => seat.id === seatId)
      ?.code ?? seatId
  )
}

export function formatRuleSummary(
  rule: Rule,
  project: Pick<Project, 'classroom' | 'roster'>,
): string {
  const tags = project.roster.tags

  switch (rule.type) {
    case 'separate': {
      const values =
        rule.values.length > 0 ? rule.values.join('、') : '所有值'
      return `「${tagName(tags, rule.tagId)}」的 ${values} 彼此分開（${ADJACENCY_LABELS[rule.adjacency]}）`
    }
    case 'together': {
      const values =
        rule.values.length > 0 ? rule.values.join('、') : '所有值'
      return `「${tagName(tags, rule.tagId)}」的 ${values} 至少有一位同值鄰居（${ADJACENCY_LABELS[rule.adjacency]}）`
    }
    case 'position': {
      const band =
        rule.position === 'aisle'
          ? ''
          : ` ${rule.band} ${
              rule.position === 'front' || rule.position === 'back'
                ? '排'
                : '欄'
            }`
      return `「${tagName(tags, rule.tagId)}」值為 ${rule.value} 安排在${POSITION_LABELS[rule.position]}${band}`
    }
    case 'avoid':
      return `「${tagName(tags, rule.tagIdA)}」${rule.valueA} 避開「${tagName(tags, rule.tagIdB)}」${rule.valueB}（${ADJACENCY_LABELS[rule.adjacency]}）`
    case 'pin': {
      const person = project.roster.persons.find(
        (candidate) => candidate.id === rule.personId,
      )
      return `${person?.name ?? '未知人員'} 固定在 ${seatCode(project, rule.seatId)}`
    }
  }
}
