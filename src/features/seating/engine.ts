import type {
  AllocationMode,
  AssignmentResult,
  Classroom,
  OccupancyMode,
  Person,
  Project,
  Rule,
} from '../../types/domain'
import { findPersonSeat } from './seatingOps'
import { createSeed, orderPersons } from './allocation'
import {
  buildOccupancySummary,
  isSeatCell,
  type PhaseCounts,
} from './occupancy'
import { createInputRevision } from './revision'
import { parseSeatId } from '../classroom/numbering'
import { applyRuleEvaluation } from '../rules/evaluateRules'
import {
  optimizeSeatingAssignments,
  type SeatingOptimizationProgress,
  type SeatingOptimizerOptions,
} from './optimizer'

export interface SeatingConfig {
  occupancy: OccupancyMode
  allocation: AllocationMode
  seed: string
  /** 座位不足時，只安排可容納的人數。 */
  partial: boolean
  /** 有非固定規則時，是否執行規則最佳化。預設啟用。 */
  optimize?: boolean
  /** 只交換已有人員的座位，不移動到空位。 */
  stayCompact?: boolean
  optimizer?: SeatingOptimizerOptions
}

export type SeatingFailureCode =
  | 'no-persons'
  | 'no-seats'
  | 'capacity'
  | 'pin-conflict'

export interface SeatingFailure {
  ok: false
  code: SeatingFailureCode
  message: string
  personCount: number
  capacity: number
  missing: number
  phaseCounts: PhaseCounts
}

export interface SeatingSuccess {
  ok: true
  result: AssignmentResult
  assignedCount: number
  unassignedCount: number
  capacity: number
}

export type SeatingOutcome = SeatingFailure | SeatingSuccess

interface PinTarget {
  personId: string
  seatId: string
}

function validPinTargets(
  classroom: Pick<Classroom, 'cols' | 'rows' | 'cells'>,
  rules: Rule[],
  persons: Person[],
): { pins: PinTarget[]; conflict: string | null } {
  const personIds = new Set(persons.map((person) => person.id))
  const pins: PinTarget[] = []
  const pinnedPersons = new Set<string>()
  const pinnedSeats = new Set<string>()

  for (const rule of rules) {
    if (rule.type !== 'pin' || !rule.enabled) {
      continue
    }

    const position = parseSeatId(rule.seatId)

    if (!personIds.has(rule.personId)) {
      return { pins: [], conflict: '固定座位規則指向不存在的人員。' }
    }

    if (
      !position ||
      !isSeatCell(classroom, position.row, position.col)
    ) {
      return { pins: [], conflict: '固定座位規則指向不存在或非座位的格子。' }
    }

    if (pinnedPersons.has(rule.personId)) {
      return { pins: [], conflict: '同一位人員有多個固定座位規則。' }
    }

    if (pinnedSeats.has(rule.seatId)) {
      return { pins: [], conflict: '同一個座位被多個固定座位規則佔用。' }
    }

    pinnedPersons.add(rule.personId)
    pinnedSeats.add(rule.seatId)
    pins.push({ personId: rule.personId, seatId: rule.seatId })
  }

  return { pins, conflict: null }
}

function failure(
  code: SeatingFailureCode,
  message: string,
  personCount: number,
  capacity: number,
  phaseCounts: PhaseCounts,
): SeatingFailure {
  return {
    ok: false,
    code,
    message,
    personCount,
    capacity,
    missing: Math.max(0, personCount - capacity),
    phaseCounts,
  }
}

export function buildManualAssignment(
  project: Project,
  config: SeatingConfig,
): SeatingOutcome {
  const persons = project.roster.persons
  const fill =
    config.allocation.kind === 'ordered'
      ? config.allocation.fill
      : 'row-major'
  const pinSeatIds = project.rules
    .filter(
      (rule): rule is Extract<Rule, { type: 'pin' }> =>
        rule.type === 'pin' && rule.enabled,
    )
    .map((rule) => rule.seatId)
  const occupancy = buildOccupancySummary(
    project.classroom,
    config.occupancy,
    {
      personCount: persons.length,
      fill,
      extraSeatIds: pinSeatIds,
    },
  )

  if (persons.length === 0) {
    return failure(
      'no-persons',
      '名單尚無人員，無法建立手動座位表。',
      0,
      occupancy.capacity,
      occupancy.phaseCounts,
    )
  }

  if (occupancy.capacity === 0) {
    return failure(
      'no-seats',
      '目前設定沒有可用座位，無法建立手動座位表。',
      persons.length,
      0,
      occupancy.phaseCounts,
    )
  }

  const lockedPersonIds = project.lockedPersonIds.filter((personId) =>
    persons.some((person) => person.id === personId),
  )
  const result: AssignmentResult = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: 'manual',
    seed: config.seed.trim() || createSeed(),
    inputRevision: createInputRevision(
      project,
      occupancy.mode,
      config.allocation,
    ),
    occupancy: occupancy.mode,
    allocation: config.allocation,
    assignments: {},
    unassignedPersonIds: persons.map((person) => person.id),
    lockedPersonIds,
    hardViolationCount: 0,
    softCost: 0,
    timedOut: false,
    violations: [],
    satisfiedCount: 0,
    ruleCount: 0,
  }

  return {
    ok: true,
    result: applyRuleEvaluation(project, result),
    assignedCount: 0,
    unassignedCount: persons.length,
    capacity: occupancy.capacity,
  }
}

export function buildSeatingResult(
  project: Project,
  config: SeatingConfig,
  onProgress?: (progress: SeatingOptimizationProgress) => void,
): SeatingOutcome {
  const persons = project.roster.persons
  const personCount = persons.length
  const pinInfo = validPinTargets(
    project.classroom,
    project.rules,
    persons,
  )
  const pins = pinInfo.pins
  const pinSeatIds = pins.map((pin) => pin.seatId)
  const fill =
    config.allocation.kind === 'ordered'
      ? config.allocation.fill
      : 'row-major'
  const occupancy = buildOccupancySummary(
    project.classroom,
    config.occupancy,
    {
      personCount,
      fill,
      extraSeatIds: pinSeatIds,
    },
  )

  if (pinInfo.conflict) {
    return failure(
      'pin-conflict',
      pinInfo.conflict,
      personCount,
      occupancy.capacity,
      occupancy.phaseCounts,
    )
  }

  if (personCount === 0) {
    return failure(
      'no-persons',
      '名單中尚無人員，請先新增或匯入名單。',
      personCount,
      occupancy.capacity,
      occupancy.phaseCounts,
    )
  }

  if (occupancy.capacity === 0) {
    return failure(
      'no-seats',
      '目前配置沒有可用座位，請調整教室或座位使用模式。',
      personCount,
      occupancy.capacity,
      occupancy.phaseCounts,
    )
  }

  if (personCount > occupancy.capacity && !config.partial) {
    return failure(
      'capacity',
      `人數 ${personCount} 超過可用座位 ${occupancy.capacity}，缺少 ${personCount - occupancy.capacity} 個座位。`,
      personCount,
      occupancy.capacity,
      occupancy.phaseCounts,
    )
  }

  const effectiveSeed = config.seed || createSeed()
  const ordered = orderPersons(persons, config.allocation, effectiveSeed)
  const orderedIndex = new Map(
    ordered.map((person, index) => [person.id, index]),
  )
  const pinnedPersonIds = new Set(pins.map((pin) => pin.personId))
  const currentAssignments = project.currentAssignment?.assignments ?? {}
  const activeSeatIds = new Set(occupancy.activeSeats.map((seat) => seat.id))
  const lockedWithSeat = project.lockedPersonIds
    .map((personId) => ({
      personId,
      seatId: findPersonSeat(currentAssignments, personId),
    }))
    .filter(
      (entry): entry is { personId: string; seatId: string } =>
        Boolean(entry.seatId && activeSeatIds.has(entry.seatId)),
    )
  const lockedPersonIds = new Set(
    lockedWithSeat.map((entry) => entry.personId),
  )
  const selected: Person[] = []

  for (const pin of pins) {
    const person = persons.find((candidate) => candidate.id === pin.personId)

    if (person) {
      selected.push(person)
    }
  }

  for (const entry of lockedWithSeat) {
    if (
      selected.length >= occupancy.capacity ||
      pinnedPersonIds.has(entry.personId)
    ) {
      continue
    }

    const person = persons.find(
      (candidate) => candidate.id === entry.personId,
    )

    if (person) {
      selected.push(person)
    }
  }

  for (const person of ordered) {
    if (selected.length >= occupancy.capacity) {
      break
    }

    if (!pinnedPersonIds.has(person.id) && !lockedPersonIds.has(person.id)) {
      selected.push(person)
    }
  }

  selected.sort(
    (left, right) =>
      (orderedIndex.get(left.id) ?? 0) - (orderedIndex.get(right.id) ?? 0),
  )

  const assignments: Record<string, string> = {}
  const usedSeatIds = new Set<string>()

  for (const pin of pins) {
    assignments[pin.seatId] = pin.personId
    usedSeatIds.add(pin.seatId)
  }

  const appliedLockedPersonIds: string[] = []

  for (const entry of lockedWithSeat) {
    if (usedSeatIds.has(entry.seatId)) {
      continue
    }

    assignments[entry.seatId] = entry.personId
    usedSeatIds.add(entry.seatId)
    appliedLockedPersonIds.push(entry.personId)
  }

  const remainingSeats = occupancy.activeSeats.filter(
    (seat) => !usedSeatIds.has(seat.id),
  )
  const fixedPersonIds = new Set([
    ...pinnedPersonIds,
    ...appliedLockedPersonIds,
  ])
  const remainingPersons = selected.filter(
    (person) => !fixedPersonIds.has(person.id),
  )

  remainingPersons.forEach((person, index) => {
    const seat = remainingSeats[index]

    if (seat) {
      assignments[seat.id] = person.id
    }
  })

  const activeSeatIdsForOptimization = [
    ...new Set([
      ...occupancy.activeSeats.map((seat) => seat.id),
      ...Object.keys(assignments),
    ]),
  ]
  const shouldOptimize =
    config.optimize !== false &&
    project.rules.some(
      (rule) => rule.enabled && rule.type !== 'pin',
    )
  const assignedBeforeOptimization = new Set(
    Object.values(assignments),
  )
  const optimization = shouldOptimize
    ? optimizeSeatingAssignments({
        project,
        assignments,
        activeSeatIds: activeSeatIdsForOptimization,
        fixedPersonIds: [
          ...pinInfo.pins.map((pin) => pin.personId),
          ...appliedLockedPersonIds,
        ],
        unassignedPersonIds: persons
          .filter((person) => !assignedBeforeOptimization.has(person.id))
          .map((person) => person.id),
        seed: effectiveSeed,
        options: {
          ...config.optimizer,
          stayCompact:
            config.stayCompact ?? config.optimizer?.stayCompact ?? false,
        },
        onProgress,
      })
    : null
  const finalAssignments = optimization?.assignments ?? assignments
  const assignedPersonIds = new Set(Object.values(finalAssignments))
  const unassigned = persons
    .filter((person) => !assignedPersonIds.has(person.id))
    .map((person) => person.id)
  const assignedCount = Object.keys(finalAssignments).length
  const resultOccupancy: OccupancyMode = occupancy.mode
  const result: AssignmentResult = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: 'auto',
    seed: effectiveSeed,
    inputRevision: createInputRevision(
      project,
      resultOccupancy,
      config.allocation,
    ),
    occupancy: resultOccupancy,
    allocation: config.allocation,
    assignments: finalAssignments,
    unassignedPersonIds: unassigned,
    lockedPersonIds: [
      ...pinInfo.pins.map((pin) => pin.personId),
      ...appliedLockedPersonIds,
    ],
    hardViolationCount: 0,
    softCost: 0,
    timedOut: optimization?.timedOut ?? false,
    violations: [],
    satisfiedCount: 0,
    ruleCount: 0,
  }

  return {
    ok: true,
    result: applyRuleEvaluation(project, result),
    assignedCount,
    unassignedCount: unassigned.length,
    capacity: occupancy.capacity,
  }
}
