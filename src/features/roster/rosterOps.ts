import type { Person, Roster, TagDef, TagValueType } from '../../types/domain'

export const TAG_COLORS = [
  '#2f6b58',
  '#b8502f',
  '#3e5f8a',
  '#8a5a2b',
  '#6b5b8a',
  '#68736b',
] as const

export const DEFAULT_TAG_COLOR = TAG_COLORS[0]

export const TAG_TYPE_LABELS: Record<TagValueType, string> = {
  enum: '選項',
  number: '數值',
  boolean: '是／否',
}

export type TagValue = string | number | boolean

export type TagValueParseResult =
  | { ok: true; value: TagValue }
  | { ok: false; message: string }
  | null

export interface PersonInput {
  name: string
  studentNo?: string
  note?: string
  tags?: Person['tags']
  extra?: Person['extra']
}

export interface TagInput {
  name: string
  type: TagValueType
  color?: string
  options?: string[]
}

export interface PersonPatch {
  name?: string
  studentNo?: string
  note?: string
  tags?: Person['tags']
  extra?: Person['extra']
}

export interface TagPatch {
  name?: string
  type?: TagValueType
  color?: string
  options?: string[]
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', '是', '有'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', '否', '無'])

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

export function normalizeTagOptions(options: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const option of options) {
    const next = option.trim()

    if (!next || seen.has(next)) {
      continue
    }

    seen.add(next)
    result.push(next)
  }

  return result
}

export function createTagDef(input: TagInput): TagDef {
  return {
    id: crypto.randomUUID(),
    name: clean(input.name),
    type: input.type,
    options:
      input.type === 'enum' ? normalizeTagOptions(input.options ?? []) : [],
    color: input.color ?? DEFAULT_TAG_COLOR,
  }
}

export function createPerson(input: PersonInput): Person {
  return {
    id: crypto.randomUUID(),
    name: clean(input.name),
    studentNo: clean(input.studentNo),
    tags: { ...(input.tags ?? {}) },
    extra: { ...(input.extra ?? {}) },
    note: clean(input.note),
  }
}

export function isTagNameTaken(
  roster: Roster,
  name: string,
  excludeId?: string,
): boolean {
  const target = clean(name).toLocaleLowerCase('zh-Hant')

  return roster.tags.some(
    (tag) =>
      tag.id !== excludeId &&
      tag.name.toLocaleLowerCase('zh-Hant') === target,
  )
}

function sameRecord(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => left[key] === right[key])
  )
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function samePerson(left: Person, right: Person): boolean {
  return (
    left.name === right.name &&
    left.studentNo === right.studentNo &&
    left.note === right.note &&
    sameRecord(left.tags, right.tags) &&
    sameRecord(left.extra, right.extra)
  )
}

export function addPerson(roster: Roster, person: Person): Roster {
  if (roster.persons.some((item) => item.id === person.id)) {
    return roster
  }

  return {
    ...roster,
    persons: [...roster.persons, person],
  }
}

export function updatePerson(
  roster: Roster,
  personId: string,
  patch: PersonPatch,
): Roster {
  const index = roster.persons.findIndex((person) => person.id === personId)

  if (index < 0) {
    return roster
  }

  const current = roster.persons[index]
  const next: Person = {
    ...current,
    name: patch.name === undefined ? current.name : clean(patch.name),
    studentNo:
      patch.studentNo === undefined
        ? current.studentNo
        : clean(patch.studentNo),
    note: patch.note === undefined ? current.note : clean(patch.note),
    tags: patch.tags === undefined ? current.tags : { ...patch.tags },
    extra: patch.extra === undefined ? current.extra : { ...patch.extra },
  }

  if (samePerson(current, next)) {
    return roster
  }

  const persons = [...roster.persons]
  persons[index] = next

  return { ...roster, persons }
}

export function removePerson(roster: Roster, personId: string): Roster {
  if (!roster.persons.some((person) => person.id === personId)) {
    return roster
  }

  return {
    ...roster,
    persons: roster.persons.filter((person) => person.id !== personId),
  }
}

export function parseTagValue(
  tag: TagDef,
  raw: string,
): TagValueParseResult {
  const value = raw.trim()

  if (!value) {
    return null
  }

  if (tag.type === 'enum') {
    return { ok: true, value }
  }

  if (tag.type === 'number') {
    const parsed = Number(value)

    return Number.isFinite(parsed)
      ? { ok: true, value: parsed }
      : { ok: false, message: '請輸入有效數值' }
  }

  const normalized = value.toLocaleLowerCase('en-US')

  if (TRUE_VALUES.has(normalized)) {
    return { ok: true, value: true }
  }

  if (FALSE_VALUES.has(normalized)) {
    return { ok: true, value: false }
  }

  return { ok: false, message: '請輸入是或否' }
}

export function formatTagValue(value: TagValue): string {
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  return String(value)
}

export function setTagValue(
  roster: Roster,
  personIds: string[],
  tagId: string,
  value: TagValue | null,
): Roster {
  if (!roster.tags.some((tag) => tag.id === tagId)) {
    return roster
  }

  const ids = new Set(personIds)
  let changed = false
  const persons = roster.persons.map((person) => {
    if (!ids.has(person.id)) {
      return person
    }

    const current = person.tags[tagId]
    const hasCurrent = Object.prototype.hasOwnProperty.call(
      person.tags,
      tagId,
    )

    if (value === null) {
      if (!hasCurrent) {
        return person
      }

      const tags = { ...person.tags }
      delete tags[tagId]
      changed = true
      return { ...person, tags }
    }

    if (hasCurrent && current === value) {
      return person
    }

    changed = true
    return {
      ...person,
      tags: { ...person.tags, [tagId]: value },
    }
  })

  return changed ? { ...roster, persons } : roster
}

export function addTag(roster: Roster, tag: TagDef): Roster {
  if (isTagNameTaken(roster, tag.name)) {
    return roster
  }

  return {
    ...roster,
    tags: [...roster.tags, tag],
  }
}

export function updateTag(
  roster: Roster,
  tagId: string,
  patch: TagPatch,
): Roster {
  const index = roster.tags.findIndex((tag) => tag.id === tagId)

  if (index < 0) {
    return roster
  }

  const current = roster.tags[index]
  const nextName = patch.name === undefined ? current.name : clean(patch.name)

  if (!nextName || isTagNameTaken(roster, nextName, tagId)) {
    return roster
  }

  const nextType = patch.type ?? current.type
  const nextOptions =
    nextType === 'enum'
      ? normalizeTagOptions(patch.options ?? current.options)
      : []
  const nextColor = patch.color ?? current.color

  if (
    nextName === current.name &&
    nextType === current.type &&
    nextColor === current.color &&
    sameStringArray(nextOptions, current.options)
  ) {
    return roster
  }

  const tags = [...roster.tags]
  tags[index] = {
    ...current,
    name: nextName,
    type: nextType,
    options: nextOptions,
    color: nextColor,
  }

  let changed = false
  const persons = roster.persons.map((person) => {
    if (!Object.prototype.hasOwnProperty.call(person.tags, tagId)) {
      return person
    }

    const value = person.tags[tagId]
    const keep =
      typeof value === 'string' && nextType === 'enum'
        ? nextOptions.includes(value)
        : nextType === 'number'
          ? typeof value === 'number' && Number.isFinite(value)
          : nextType === 'boolean'
            ? typeof value === 'boolean'
            : false

    if (keep) {
      return person
    }

    const personTags = { ...person.tags }
    delete personTags[tagId]
    changed = true
    return { ...person, tags: personTags }
  })

  return {
    ...roster,
    tags,
    persons: changed ? persons : roster.persons,
  }
}

export function removeTag(roster: Roster, tagId: string): Roster {
  if (!roster.tags.some((tag) => tag.id === tagId)) {
    return roster
  }

  return {
    ...roster,
    tags: roster.tags.filter((tag) => tag.id !== tagId),
    persons: roster.persons.map((person) => {
      if (!Object.prototype.hasOwnProperty.call(person.tags, tagId)) {
        return person
      }

      const tags = { ...person.tags }
      delete tags[tagId]
      return { ...person, tags }
    }),
  }
}

export function extendTagOptions(
  roster: Roster,
  updates: TagDef[],
): Roster {
  if (updates.length === 0) {
    return roster
  }

  const updateById = new Map(updates.map((tag) => [tag.id, tag]))
  const updateByName = new Map(
    updates.map((tag) => [tag.name.toLocaleLowerCase('zh-Hant'), tag]),
  )
  let changed = false

  const tags = roster.tags.map((tag) => {
    const update =
      updateById.get(tag.id) ??
      updateByName.get(tag.name.toLocaleLowerCase('zh-Hant'))

    if (!update) {
      return tag
    }

    const nextOptions =
      tag.type === 'enum'
        ? normalizeTagOptions([...tag.options, ...update.options])
        : tag.options

    if (
      nextOptions.length === tag.options.length &&
      nextOptions.every((option, index) => option === tag.options[index])
    ) {
      return tag
    }

    changed = true
    return { ...tag, options: nextOptions }
  })

  const existingNames = new Set(
    tags.map((tag) => tag.name.toLocaleLowerCase('zh-Hant')),
  )
  const additions = updates.filter(
    (tag) => !existingNames.has(tag.name.toLocaleLowerCase('zh-Hant')),
  )

  if (!changed && additions.length === 0) {
    return roster
  }

  return {
    ...roster,
    tags: [...tags, ...additions],
  }
}
