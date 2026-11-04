import type {
  AllocationMode,
  Person,
} from '../../types/domain'
import type { SeatSlot } from './occupancy'

const NUMERIC_STUDENT_NO = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

export interface AllocationOutcome {
  assignments: Record<string, string>
  unassignedPersonIds: string[]
  orderedPersonIds: string[]
}

function numericStudentNo(value: string): number | null {
  const trimmed = value.trim()

  if (!NUMERIC_STUDENT_NO.test(trimmed)) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function compareStudentNo(a: Person, b: Person): number {
  const numberA = numericStudentNo(a.studentNo)
  const numberB = numericStudentNo(b.studentNo)

  if (numberA !== null && numberB !== null && numberA !== numberB) {
    return numberA - numberB
  }

  return a.studentNo.localeCompare(b.studentNo, 'zh-Hant')
}

export function sortPersons(
  persons: Person[],
  orderBy: 'studentNo' | 'name' | 'import',
): Person[] {
  const indexed = persons.map((person, index) => ({ person, index }))

  indexed.sort((left, right) => {
    let compared = 0

    if (orderBy === 'studentNo') {
      compared = compareStudentNo(left.person, right.person)
    } else if (orderBy === 'name') {
      compared = left.person.name.localeCompare(right.person.name, 'zh-Hant')
    }

    return compared || left.index - right.index
  })

  return indexed.map((item) => item.person)
}

export function hashSeed(seed: string): number {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const next = [...items]
  const random = mulberry32(hashSeed(seed))

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[target]
    next[target] = current
  }

  return next
}

export function createSeed(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = crypto.getRandomValues(new Uint32Array(1))
    return values[0].toString(36)
  }

  return Math.random().toString(36).slice(2, 10)
}

export function orderPersons(
  persons: Person[],
  allocation: AllocationMode,
  seed: string,
): Person[] {
  if (allocation.kind === 'random') {
    return shuffleWithSeed(persons, seed)
  }

  return sortPersons(persons, allocation.orderBy)
}

export function allocatePersons(
  persons: Person[],
  seats: SeatSlot[],
  allocation: AllocationMode,
  seed: string,
): AllocationOutcome {
  const ordered = orderPersons(persons, allocation, seed)
  const assignments: Record<string, string> = {}
  const unassignedPersonIds: string[] = []

  ordered.forEach((person, index) => {
    const seat = seats[index]

    if (seat) {
      assignments[seat.id] = person.id
    } else {
      unassignedPersonIds.push(person.id)
    }
  })

  return {
    assignments,
    unassignedPersonIds,
    orderedPersonIds: ordered.map((person) => person.id),
  }
}
