import { describe, expect, it } from 'vitest'
import type { Person, PinRule, Project } from '../../types/domain'
import { createClassroom, setCellTypes } from '../classroom/classroomOps'
import { createDefaultProject } from '../project/defaultProject'
import { buildSeatingResult, type SeatingConfig } from './engine'
import { findPersonSeat } from './seatingOps'

function person(id: string, name: string, studentNo: string): Person {
  return {
    id,
    name,
    studentNo,
    tags: {},
    extra: {},
    note: '',
  }
}

function projectWith(count: number): Project {
  const project = createDefaultProject()
  project.classroom = createClassroom({ cols: 3, rows: 2 })
  project.roster.persons = Array.from({ length: count }, (_, index) =>
    person(`p${index + 1}`, `學生 ${index + 1}`, String(index + 1).padStart(2, '0')),
  )
  return project
}

const baseConfig: SeatingConfig = {
  occupancy: { kind: 'full' },
  allocation: {
    kind: 'ordered',
    orderBy: 'studentNo',
    fill: 'row-major',
  },
  seed: 'seed',
  partial: false,
}

function pinRule(personId: string, seatId: string): PinRule {
  return {
    id: `pin-${personId}`,
    type: 'pin',
    enabled: true,
    strength: 'hard',
    weight: 10,
    note: '',
    personId,
    seatId,
  }
}

describe('seating engine', () => {
  it('依排序與填座順序產生完整分配', () => {
    const project = projectWith(6)
    const outcome = buildSeatingResult(project, baseConfig)

    expect(outcome.ok).toBe(true)

    if (!outcome.ok) {
      return
    }

    expect(outcome.result.assignments).toEqual({
      r0c0: 'p1',
      r0c1: 'p2',
      r0c2: 'p3',
      r1c0: 'p4',
      r1c1: 'p5',
      r1c2: 'p6',
    })
    expect(outcome.result.unassignedPersonIds).toEqual([])
    expect(outcome.result.ruleCount).toBe(0)
    expect(outcome.result.timedOut).toBe(false)
  })

  it('隨機模式相同種子產生相同分配', () => {
    const project = projectWith(6)
    const config: SeatingConfig = {
      ...baseConfig,
      allocation: { kind: 'random' },
    }
    const first = buildSeatingResult(project, config)
    const second = buildSeatingResult(project, config)

    expect(first.ok && second.ok).toBe(true)

    if (first.ok && second.ok) {
      expect(first.result.assignments).toEqual(second.result.assignments)
      expect(first.result.seed).toBe('seed')
    }
  })

  it('梅花模式使用符合相位的座位', () => {
    const project = projectWith(3)
    const outcome = buildSeatingResult(project, {
      ...baseConfig,
      occupancy: { kind: 'checkerboard', phase: 0 },
    })

    expect(outcome.ok).toBe(true)

    if (outcome.ok) {
      expect(outcome.capacity).toBe(3)
      expect(Object.keys(outcome.result.assignments)).toEqual([
        'r0c0',
        'r0c2',
        'r1c1',
      ])
    }
  })

  it('容量不足時阻擋，勾選部分排座後保留未分配名單', () => {
    const project = projectWith(7)
    const blocked = buildSeatingResult(project, baseConfig)

    expect(blocked.ok).toBe(false)

    if (!blocked.ok) {
      expect(blocked.code).toBe('capacity')
      expect(blocked.missing).toBe(1)
    }

    const partial = buildSeatingResult(project, {
      ...baseConfig,
      partial: true,
    })

    expect(partial.ok).toBe(true)

    if (partial.ok) {
      expect(partial.assignedCount).toBe(6)
      expect(partial.unassignedCount).toBe(1)
      expect(partial.result.unassignedPersonIds).toEqual(['p7'])
    }
  })

  it('固定座位規則生效，且不符合梅花相位仍納入座位', () => {
    const project = projectWith(3)
    project.rules = [pinRule('p3', 'r0c1')]
    const outcome = buildSeatingResult(project, {
      ...baseConfig,
      occupancy: { kind: 'checkerboard', phase: 0 },
    })

    expect(outcome.ok).toBe(true)

    if (outcome.ok) {
      expect(outcome.result.assignments.r0c1).toBe('p3')
      expect(outcome.capacity).toBe(4)
      expect(outcome.result.lockedPersonIds).toContain('p3')
    }
  })

  it('鎖定人員在重排後維持原座位', () => {
    const project = projectWith(6)
    const first = buildSeatingResult(project, baseConfig)

    expect(first.ok).toBe(true)

    if (!first.ok) {
      return
    }

    project.currentAssignment = first.result
    project.lockedPersonIds = ['p2']
    const originalSeat = findPersonSeat(first.result.assignments, 'p2')
    const second = buildSeatingResult(project, {
      ...baseConfig,
      allocation: { kind: 'random' },
      seed: 'different',
    })

    expect(second.ok).toBe(true)

    if (second.ok && originalSeat) {
      expect(findPersonSeat(second.result.assignments, 'p2')).toBe(originalSeat)
      expect(second.result.lockedPersonIds).toContain('p2')
    }
  })

  it('固定座位與鎖定衝突時以固定座位優先', () => {
    const project = projectWith(4)
    const first = buildSeatingResult(project, baseConfig)

    expect(first.ok).toBe(true)

    if (!first.ok) {
      return
    }

    const lockedSeat = findPersonSeat(first.result.assignments, 'p1')
    expect(lockedSeat).toBeTruthy()

    if (!lockedSeat) {
      return
    }

    project.currentAssignment = first.result
    project.lockedPersonIds = ['p1']
    project.rules = [pinRule('p2', lockedSeat)]
    const outcome = buildSeatingResult(project, baseConfig)

    expect(outcome.ok).toBe(true)

    if (outcome.ok) {
      expect(outcome.result.assignments[lockedSeat]).toBe('p2')
      expect(outcome.result.lockedPersonIds).toContain('p2')
      expect(outcome.result.lockedPersonIds).not.toContain('p1')
    }
  })

  it('沒有名單或沒有座位時回傳可讀錯誤', () => {
    const empty = buildSeatingResult(projectWith(0), baseConfig)

    expect(empty.ok).toBe(false)

    if (!empty.ok) {
      expect(empty.code).toBe('no-persons')
    }

    const project = projectWith(3)
    project.classroom = setCellTypes(
      project.classroom,
      Array.from({ length: 6 }, (_, index) => ({
        row: Math.floor(index / 3),
        col: index % 3,
      })),
      'aisle',
    )
    const noSeats = buildSeatingResult(project, baseConfig)

    expect(noSeats.ok).toBe(false)

    if (!noSeats.ok) {
      expect(noSeats.code).toBe('no-seats')
    }
  })

  it('部分排座優先納入固定座位人員', () => {
    const project = projectWith(7)
    project.rules = [pinRule('p7', 'r0c0')]
    const outcome = buildSeatingResult(project, {
      ...baseConfig,
      partial: true,
    })

    expect(outcome.ok).toBe(true)

    if (outcome.ok) {
      expect(outcome.result.assignments.r0c0).toBe('p7')
      expect(outcome.result.unassignedPersonIds).toHaveLength(1)
      expect(outcome.result.unassignedPersonIds).not.toContain('p7')
    }
  })
})
