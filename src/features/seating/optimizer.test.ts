import { describe, expect, it } from 'vitest'
import type { Person, Project, TagDef } from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import { evaluateAssignment } from '../rules/evaluateRules'
import { createRule } from '../rules/ruleOps'
import { optimizeSeatingAssignments } from './optimizer'

const GROUP_TAG: TagDef = {
  id: 'tag-group',
  name: '分組',
  type: 'enum',
  options: ['A', 'B'],
  color: '#2f6b58',
}

function person(id: string, name: string, group: string): Person {
  return {
    id,
    name,
    studentNo: id.slice(-1),
    tags: { 'tag-group': group },
    extra: {},
    note: '',
  }
}

function createProject(): Project {
  const project = createDefaultProject()
  project.classroom.cols = 3
  project.classroom.rows = 2
  project.classroom.cells = Array.from({ length: 6 }, () => ({
    type: 'seat' as const,
  }))
  project.roster.tags = [GROUP_TAG]
  project.roster.persons = [
    person('person-1', '林品妤', 'A'),
    person('person-2', '陳柏宇', 'A'),
    person('person-3', '王小明', 'B'),
    person('person-4', '李美華', 'B'),
  ]
  return project
}

const ACTIVE_SEATS = ['r0c0', 'r0c1', 'r0c2', 'r1c0', 'r1c1', 'r1c2']

describe('seating optimizer', () => {
  it('可透過換位降低分開規則的硬衝突', () => {
    const project = createProject()
    const rule = createRule('separate', {
      tagId: GROUP_TAG.id,
      adjacency: 'all8',
    })
    project.rules = [rule]
    const assignments = {
      r0c0: 'person-1',
      r0c1: 'person-2',
      r0c2: 'person-3',
      r1c0: 'person-4',
    }

    const result = optimizeSeatingAssignments({
      project,
      assignments,
      activeSeatIds: ACTIVE_SEATS,
      fixedPersonIds: [],
      unassignedPersonIds: [],
      seed: 'seed',
      options: {
        maxIterations: 20000,
        timeLimitMs: 2000,
      },
    })
    const evaluation = evaluateAssignment(project, {
      assignments: result.assignments,
      unassignedPersonIds: [],
    })

    expect(evaluation.hardViolationCount).toBe(0)
    expect(result.assignments).not.toEqual(assignments)
    expect(Object.keys(result.assignments)).toHaveLength(4)
  })

  it('相同種子與輸入產生相同結果', () => {
    const project = createProject()
    project.rules = [
      createRule('separate', {
        tagId: GROUP_TAG.id,
        adjacency: 'orthogonal',
      }),
    ]
    const input = {
      project,
      assignments: {
        r0c0: 'person-1',
        r0c1: 'person-3',
        r0c2: 'person-2',
        r1c0: 'person-4',
      },
      activeSeatIds: ACTIVE_SEATS,
      fixedPersonIds: [],
      unassignedPersonIds: [],
      seed: 'deterministic',
      options: {
        maxIterations: 4000,
        timeLimitMs: 10000,
      },
    }

    const first = optimizeSeatingAssignments(input)
    const second = optimizeSeatingAssignments(input)

    expect(first.assignments).toEqual(second.assignments)
  })

  it('固定人員不會被移動', () => {
    const project = createProject()
    project.rules = [
      createRule('separate', {
        tagId: GROUP_TAG.id,
        adjacency: 'all8',
      }),
    ]

    const result = optimizeSeatingAssignments({
      project,
      assignments: {
        r0c0: 'person-1',
        r0c1: 'person-2',
        r0c2: 'person-3',
        r1c0: 'person-4',
      },
      activeSeatIds: ACTIVE_SEATS,
      fixedPersonIds: ['person-1'],
      unassignedPersonIds: [],
      seed: 'seed',
      options: {
        maxIterations: 10000,
        timeLimitMs: 2000,
      },
    })

    expect(result.assignments.r0c0).toBe('person-1')
  })

  it('未分配人員維持不變', () => {
    const project = createProject()
    project.rules = [
      createRule('together', {
        tagId: GROUP_TAG.id,
        adjacency: 'orthogonal',
      }),
    ]

    const result = optimizeSeatingAssignments({
      project,
      assignments: {
        r0c0: 'person-1',
        r0c1: 'person-2',
      },
      activeSeatIds: ACTIVE_SEATS,
      fixedPersonIds: [],
      unassignedPersonIds: ['person-3', 'person-4'],
      seed: 'seed',
      options: {
        maxIterations: 5000,
        timeLimitMs: 2000,
      },
    })

    expect(new Set(Object.values(result.assignments))).toEqual(
      new Set(['person-1', 'person-2']),
    )
  })

  it('達到時間上限時回傳標記與目前最佳結果', () => {
    const project = createProject()
    project.rules = [
      createRule('separate', {
        tagId: GROUP_TAG.id,
        adjacency: 'all8',
      }),
    ]
    const assignments = {
      r0c0: 'person-1',
      r0c1: 'person-2',
    }

    const result = optimizeSeatingAssignments({
      project,
      assignments,
      activeSeatIds: ACTIVE_SEATS,
      fixedPersonIds: [],
      unassignedPersonIds: ['person-3', 'person-4'],
      seed: 'seed',
      options: { timeLimitMs: 0 },
    })

    expect(result.timedOut).toBe(true)
    expect(result.assignments).toEqual(assignments)
  })
})
