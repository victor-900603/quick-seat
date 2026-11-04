import type { Project } from '../../types/domain'
import { orderSeats, seatId } from '../classroom/numbering'

export interface AssignmentChange {
  assignments: Record<string, string>
  displacedPersonId?: string
}

export function findPersonSeat(
  assignments: Record<string, string>,
  personId: string,
): string | null {
  for (const [seatIdValue, occupant] of Object.entries(assignments)) {
    if (occupant === personId) {
      return seatIdValue
    }
  }

  return null
}

export function swapOrMove(
  assignments: Record<string, string>,
  fromSeatId: string,
  toSeatId: string,
): AssignmentChange | null {
  const movingPersonId = assignments[fromSeatId]

  if (!movingPersonId || fromSeatId === toSeatId) {
    return null
  }

  const targetPersonId = assignments[toSeatId]
  const next = { ...assignments }

  if (targetPersonId) {
    next[fromSeatId] = targetPersonId
  } else {
    delete next[fromSeatId]
  }

  next[toSeatId] = movingPersonId

  return {
    assignments: next,
    displacedPersonId: targetPersonId ?? undefined,
  }
}

export function placePerson(
  assignments: Record<string, string>,
  personId: string,
  seatIdValue: string,
): AssignmentChange | null {
  if (assignments[seatIdValue] === personId) {
    return null
  }

  const previousSeat = findPersonSeat(assignments, personId)
  const displacedPersonId = assignments[seatIdValue]
  const next = { ...assignments }

  if (previousSeat) {
    delete next[previousSeat]
  }

  next[seatIdValue] = personId

  return {
    assignments: next,
    displacedPersonId:
      displacedPersonId && displacedPersonId !== personId
        ? displacedPersonId
        : undefined,
  }
}

export function removePersonAssignment(
  assignments: Record<string, string>,
  personId: string,
): { assignments: Record<string, string>; seatId: string } | null {
  const seat = findPersonSeat(assignments, personId)

  if (!seat) {
    return null
  }

  const next = { ...assignments }
  delete next[seat]

  return { assignments: next, seatId: seat }
}

export function assignmentCount(
  assignments: Record<string, string>,
): number {
  return Object.keys(assignments).length
}

export function unassignedPersonIds(
  personIds: string[],
  assignments: Record<string, string>,
): string[] {
  const assigned = new Set(Object.values(assignments))
  return personIds.filter((personId) => !assigned.has(personId))
}

/**
 * 教室尺寸或格子型別變更後，移除已失效座位的分配，並同步解除相關鎖定。
 * 回傳是否有變更。
 */
export function pruneAssignmentSeats(project: Project): boolean {
  const assignment = project.currentAssignment

  if (!assignment) {
    return false
  }

  const validSeatIds = new Set(
    orderSeats(project.classroom, 'row-major').map((seat) =>
      seatId(seat.row, seat.col),
    ),
  )
  const nextAssignments: Record<string, string> = {}
  const removedPersonIds = new Set<string>()
  let changed = false

  for (const [seatIdValue, personId] of Object.entries(assignment.assignments)) {
    if (validSeatIds.has(seatIdValue)) {
      nextAssignments[seatIdValue] = personId
    } else {
      removedPersonIds.add(personId)
      changed = true
    }
  }

  if (!changed) {
    return false
  }

  assignment.assignments = nextAssignments
  const assigned = new Set(Object.values(nextAssignments))
  const unassigned = new Set(assignment.unassignedPersonIds)

  for (const personId of removedPersonIds) {
    if (!assigned.has(personId)) {
      unassigned.add(personId)
    }
  }

  assignment.unassignedPersonIds = [...unassigned].filter(
    (personId) => !assigned.has(personId),
  )
  assignment.lockedPersonIds = assignment.lockedPersonIds.filter((personId) =>
    assigned.has(personId),
  )
  project.lockedPersonIds = project.lockedPersonIds.filter((personId) =>
    assigned.has(personId),
  )

  return true
}
