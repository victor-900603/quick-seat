import { describe, expect, it } from 'vitest'
import type { AssignmentResult } from '../../types/domain'
import { createClassroom, setCellTypes } from '../classroom/classroomOps'
import { createDefaultProject } from '../project/defaultProject'
import {
  assignmentCount,
  findPersonSeat,
  placePerson,
  pruneAssignmentSeats,
  removePersonAssignment,
  swapOrMove,
  unassignedPersonIds,
} from './seatingOps'

function assignment(
  assignments: Record<string, string>,
  lockedPersonIds: string[] = [],
): AssignmentResult {
  return {
    id: 'assignment',
    createdAt: '2026-01-01T00:00:00.000Z',
    seed: '',
    inputRevision: 'revision',
    occupancy: { kind: 'full' },
    allocation: {
      kind: 'ordered',
      orderBy: 'studentNo',
      fill: 'row-major',
    },
    assignments,
    unassignedPersonIds: [],
    lockedPersonIds,
    hardViolationCount: 0,
    softCost: 0,
    timedOut: false,
    violations: [],
    satisfiedCount: 0,
    ruleCount: 0,
  }
}

describe('seatingOps', () => {
  it('交換兩個座位的人員', () => {
    const change = swapOrMove(
      { r0c0: 'p1', r0c1: 'p2' },
      'r0c0',
      'r0c1',
    )

    expect(change?.assignments).toEqual({ r0c0: 'p2', r0c1: 'p1' })
  })

  it('移動到空位時移除原座位', () => {
    const change = swapOrMove({ r0c0: 'p1' }, 'r0c0', 'r0c1')

    expect(change?.assignments).toEqual({ r0c1: 'p1' })
    expect(change?.displacedPersonId).toBeUndefined()
  })

  it('將未分配人員放到已佔用座位時，原人員被擠出', () => {
    const change = placePerson({ r0c0: 'p1' }, 'p2', 'r0c0')

    expect(change?.assignments).toEqual({ r0c0: 'p2' })
    expect(change?.displacedPersonId).toBe('p1')
  })

  it('已分配人員換位時清除原座位', () => {
    const change = placePerson({ r0c0: 'p1' }, 'p1', 'r0c2')

    expect(change?.assignments).toEqual({ r0c2: 'p1' })
  })

  it('查詢與移除人員座位', () => {
    const assignments = { r0c0: 'p1', r0c1: 'p2' }

    expect(findPersonSeat(assignments, 'p2')).toBe('r0c1')
    expect(findPersonSeat(assignments, 'p3')).toBeNull()
    expect(removePersonAssignment(assignments, 'p1')?.assignments).toEqual({
      r0c1: 'p2',
    })
    expect(assignmentCount(assignments)).toBe(2)
    expect(unassignedPersonIds(['p1', 'p2', 'p3'], assignments)).toEqual([
      'p3',
    ])
  })

  it('教室變更後清除失效座位分配與鎖定', () => {
    const project = createDefaultProject()
    project.classroom = setCellTypes(
      createClassroom({ cols: 2, rows: 2 }),
      [{ row: 1, col: 1 }],
      'aisle',
    )
    project.currentAssignment = assignment(
      { r0c0: 'p1', r1c1: 'p2' },
      ['p1', 'p2'],
    )
    project.lockedPersonIds = ['p1', 'p2']

    expect(pruneAssignmentSeats(project)).toBe(true)
    expect(project.currentAssignment.assignments).toEqual({ r0c0: 'p1' })
    expect(project.currentAssignment.unassignedPersonIds).toEqual(['p2'])
    expect(project.currentAssignment.lockedPersonIds).toEqual(['p1'])
    expect(project.lockedPersonIds).toEqual(['p1'])
  })

  it('沒有失效座位時不變更', () => {
    const project = createDefaultProject()
    project.classroom = createClassroom({ cols: 2, rows: 2 })
    project.currentAssignment = assignment({ r0c0: 'p1' }, ['p1'])
    project.lockedPersonIds = ['p1']

    expect(pruneAssignmentSeats(project)).toBe(false)
  })
})
