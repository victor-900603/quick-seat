import type {
  Adjacency,
  AssignmentResult,
  Person,
  Project,
  Rule,
  RuleViolation,
  TagDef,
} from '../../types/domain'
import { getSeatRefs, parseSeatId } from '../classroom/numbering'
import {
  POSITION_LABELS,
  formatRuleSummary,
  tagValueText,
  validateRule,
} from './ruleOps'

export interface RuleEvaluation {
  violations: RuleViolation[]
  hardViolationCount: number
  softCost: number
  satisfiedCount: number
  ruleCount: number
  violationCount: number
}

interface AssignedSeat {
  seatId: string
  row: number
  col: number
  person: Person
}

function collectAssignedSeats(
  project: Pick<Project, 'classroom' | 'roster'>,
  assignments: Record<string, string>,
): AssignedSeat[] {
  const personsById = new Map(
    project.roster.persons.map((person) => [person.id, person]),
  )
  const seats: AssignedSeat[] = []

  for (const [seatId, personId] of Object.entries(assignments)) {
    const position = parseSeatId(seatId)
    const person = personsById.get(personId)

    if (!position || !person) {
      continue
    }

    const cell =
      project.classroom.cells[
        position.row * project.classroom.cols + position.col
      ]

    if (cell?.type !== 'seat') {
      continue
    }

    seats.push({ seatId, ...position, person })
  }

  return seats
}

function isNeighbor(
  left: AssignedSeat,
  right: AssignedSeat,
  adjacency: Adjacency,
): boolean {
  const rowDistance = Math.abs(left.row - right.row)
  const colDistance = Math.abs(left.col - right.col)

  if (rowDistance === 0 && colDistance === 0) {
    return false
  }

  return adjacency === 'orthogonal'
    ? rowDistance + colDistance === 1
    : rowDistance <= 1 && colDistance <= 1
}

function valueOf(
  person: Person,
  tag: TagDef | undefined,
  tagId: string,
): string {
  return tagValueText(tag, person.tags[tagId])
}

function matchesValue(
  values: string[],
  value: string,
): boolean {
  return Boolean(value) && (values.length === 0 || values.includes(value))
}

function pairKey(left: AssignedSeat, right: AssignedSeat): string {
  return left.seatId < right.seatId
    ? `${left.seatId}|${right.seatId}`
    : `${right.seatId}|${left.seatId}`
}

function violation(
  rule: Rule,
  message: string,
  seats: AssignedSeat[] = [],
  persons: Person[] = [],
): RuleViolation {
  return {
    ruleId: rule.id,
    severity: rule.strength,
    message,
    seatIds: seats.map((seat) => seat.seatId),
    personIds: persons.map((person) => person.id),
  }
}

export function evaluateAssignment(
  project: Project,
  assignment: Pick<AssignmentResult, 'assignments' | 'unassignedPersonIds'>,
): RuleEvaluation {
  const tagsById = new Map(
    project.roster.tags.map((tag) => [tag.id, tag]),
  )
  const seats = collectAssignedSeats(project, assignment.assignments)
  const seatsById = new Map(seats.map((seat) => [seat.seatId, seat]))
  const personsById = new Map(
    project.roster.persons.map((person) => [person.id, person]),
  )
  const seatRefs = getSeatRefs(project.classroom)
  const codeBySeatId = new Map(
    seatRefs.map((seat) => [seat.id, seat.code]),
  )
  const enabledRules = project.rules.filter((rule) => rule.enabled)
  const violations: RuleViolation[] = []

  for (const rule of enabledRules) {
    const validation = validateRule(rule, project, rule.id)
    const ruleViolations: RuleViolation[] = []

    if (!validation.valid) {
      ruleViolations.push(
        violation(
          rule,
          `規則「${formatRuleSummary(rule, project)}」設定無效：${validation.message}`,
        ),
      )
      violations.push(...ruleViolations)
      continue
    }

    if (rule.type === 'separate') {
      const tag = tagsById.get(rule.tagId)
      const seen = new Set<string>()

      for (const left of seats) {
        for (const right of seats) {
          if (
            left === right ||
            !isNeighbor(left, right, rule.adjacency)
          ) {
            continue
          }

          const key = pairKey(left, right)

          if (seen.has(key)) {
            continue
          }

          const leftValue = valueOf(left.person, tag, rule.tagId)
          const rightValue = valueOf(right.person, tag, rule.tagId)

          if (
            leftValue &&
            leftValue === rightValue &&
            matchesValue(rule.values, leftValue)
          ) {
            seen.add(key)
            ruleViolations.push(
              violation(
                rule,
                `「${tag?.name ?? '標籤'}」的「${leftValue}」在座位 ${
                  codeBySeatId.get(left.seatId) ?? left.seatId
                } 與 ${codeBySeatId.get(right.seatId) ?? right.seatId} 相鄰。`,
                [left, right],
                [left.person, right.person],
              ),
            )
          }
        }
      }
    } else if (rule.type === 'together') {
      const tag = tagsById.get(rule.tagId)
      const seen = new Set<string>()

      for (const seat of seats) {
        const value = valueOf(seat.person, tag, rule.tagId)

        if (!matchesValue(rule.values, value)) {
          continue
        }

        seen.add(seat.person.id)
        const hasNeighbor = seats.some(
          (candidate) =>
            candidate.seatId !== seat.seatId &&
            isNeighbor(seat, candidate, rule.adjacency) &&
            valueOf(candidate.person, tag, rule.tagId) === value,
        )

        if (!hasNeighbor) {
          ruleViolations.push(
            violation(
              rule,
              `「${seat.person.name}」缺少同組鄰居（${tag?.name ?? '標籤'}：${value}）。`,
              [seat],
              [seat.person],
            ),
          )
        }
      }

      for (const personId of assignment.unassignedPersonIds) {
        const person = personsById.get(personId)

        if (!person || seen.has(person.id)) {
          continue
        }

        const value = valueOf(person, tag, rule.tagId)

        if (matchesValue(rule.values, value)) {
          ruleViolations.push(
            violation(
              rule,
              `「${person.name}」尚未安排座位，無法符合同組規則。`,
              [],
              [person],
            ),
          )
        }
      }
    } else if (rule.type === 'position') {
      const tag = tagsById.get(rule.tagId)
      const assignedPersonIds = new Set(
        seats.map((seat) => seat.person.id),
      )
      const subjects = seats.filter(
        (seat) =>
          valueOf(seat.person, tag, rule.tagId) === rule.value,
      )

      for (const seat of subjects) {
        const cell = (row: number, col: number) =>
          project.classroom.cells[
            row * project.classroom.cols + col
          ]

        let valid = false

        if (rule.position === 'front') {
          valid = seat.row < rule.band
        } else if (rule.position === 'back') {
          valid = seat.row >= project.classroom.rows - rule.band
        } else if (rule.position === 'left') {
          valid = seat.col < rule.band
        } else if (rule.position === 'right') {
          valid = seat.col >= project.classroom.cols - rule.band
        } else {
          valid = [
            [seat.row - 1, seat.col],
            [seat.row + 1, seat.col],
            [seat.row, seat.col - 1],
            [seat.row, seat.col + 1],
          ].some(([row, col]) => cell(row, col)?.type === 'aisle')
        }

        if (!valid) {
          ruleViolations.push(
            violation(
              rule,
              `「${seat.person.name}」未符合${POSITION_LABELS[rule.position]}安排（${tag?.name ?? '標籤'}：${rule.value}）。`,
              [seat],
              [seat.person],
            ),
          )
        }
      }

      for (const person of project.roster.persons) {
        if (
          assignedPersonIds.has(person.id) ||
          valueOf(person, tag, rule.tagId) !== rule.value
        ) {
          continue
        }

        ruleViolations.push(
          violation(
            rule,
            `「${person.name}」尚未安排座位，無法符合${POSITION_LABELS[rule.position]}規則。`,
            [],
            [person],
          ),
        )
      }
    } else if (rule.type === 'avoid') {
      const tagA = tagsById.get(rule.tagIdA)
      const tagB = tagsById.get(rule.tagIdB)
      const seen = new Set<string>()

      for (const left of seats) {
        for (const right of seats) {
          if (
            left === right ||
            !isNeighbor(left, right, rule.adjacency)
          ) {
            continue
          }

          const key = pairKey(left, right)

          if (seen.has(key)) {
            continue
          }

          const leftA = valueOf(left.person, tagA, rule.tagIdA)
          const leftB = valueOf(left.person, tagB, rule.tagIdB)
          const rightA = valueOf(right.person, tagA, rule.tagIdA)
          const rightB = valueOf(right.person, tagB, rule.tagIdB)
          const matchesForward =
            leftA === rule.valueA && rightB === rule.valueB
          const matchesBackward =
            leftB === rule.valueB && rightA === rule.valueA

          if (matchesForward || matchesBackward) {
            seen.add(key)
            ruleViolations.push(
              violation(
                rule,
                `「${left.person.name}」與「${right.person.name}」在座位 ${
                  codeBySeatId.get(left.seatId) ?? left.seatId
                } 與 ${codeBySeatId.get(right.seatId) ?? right.seatId} 相鄰，未避開指定組合。`,
                [left, right],
                [left.person, right.person],
              ),
            )
          }
        }
      }
    } else if (rule.type === 'pin') {
      const person = personsById.get(rule.personId)
      const actualSeatId = Object.entries(assignment.assignments).find(
        ([, personId]) => personId === rule.personId,
      )?.[0]
      const expectedCode =
        codeBySeatId.get(rule.seatId) ?? rule.seatId

      if (!person) {
        ruleViolations.push(
          violation(rule, '固定座位規則指向不存在的人員。'),
        )
      } else if (actualSeatId !== rule.seatId) {
        const actual = actualSeatId ? seatsById.get(actualSeatId) : null
        ruleViolations.push(
          violation(
            rule,
            actual
              ? `「${person.name}」目前坐在 ${
                  codeBySeatId.get(actual.seatId) ?? actual.seatId
                }，應固定在 ${expectedCode}。`
              : `「${person.name}」尚未安排座位，應固定在 ${expectedCode}。`,
            actual ? [actual] : [],
            [person],
          ),
        )
      }
    }

    violations.push(...ruleViolations)
  }

  const hardViolationCount = violations.filter(
    (item) => item.severity === 'hard',
  ).length
  const softCost = violations.reduce((total, item) => {
    if (item.severity !== 'soft') {
      return total
    }

    const rule = project.rules.find(
      (candidate) => candidate.id === item.ruleId,
    )
    return total + (rule?.weight ?? 1)
  }, 0)
  const violatedRuleIds = new Set(
    violations.map((item) => item.ruleId),
  )

  return {
    violations,
    hardViolationCount,
    softCost,
    satisfiedCount: enabledRules.filter(
      (rule) => !violatedRuleIds.has(rule.id),
    ).length,
    ruleCount: enabledRules.length,
    violationCount: violations.length,
  }
}

export function applyRuleEvaluation(
  project: Project,
  assignment: AssignmentResult,
): AssignmentResult {
  const evaluation = evaluateAssignment(project, assignment)

  return {
    ...assignment,
    violations: evaluation.violations,
    hardViolationCount: evaluation.hardViolationCount,
    softCost: evaluation.softCost,
    satisfiedCount: evaluation.satisfiedCount,
    ruleCount: evaluation.ruleCount,
  }
}
