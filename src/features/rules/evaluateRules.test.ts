import { describe, expect, it } from 'vitest'
import type {
  AssignmentResult,
  Person,
  Project,
  Rule,
  TagDef,
} from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import {
  applyRuleEvaluation,
  evaluateAssignment,
} from './evaluateRules'
import { createRule } from './ruleOps'

const GROUP_TAG: TagDef = {
  id: 'tag-group',
  name: '分組',
  type: 'enum',
  options: ['A', 'B'],
  color: '#2f6b58',
}

function person(
  id: string,
  name: string,
  value: string,
): Person {
  return {
    id,
    name,
    studentNo: id.slice(-1),
    tags: { 'tag-group': value },
    extra: {},
    note: '',
  }
}

function createProject(options: {
  assignments: Record<string, string>
  persons?: Person[]
  rules?: Rule[]
  unassigned?: string[]
  seats?: string[]
}): Project {
  const project = createDefaultProject()
  project.classroom.cols = 3
  project.classroom.rows = 3
  project.classroom.cells = Array.from({ length: 9 }, (_, index) => ({
    type: options.seats?.includes(
      `r${Math.floor(index / 3)}c${index % 3}`,
    )
      ? 'seat'
      : options.seats
        ? 'blocked'
        : 'seat',
  }))
  project.roster.tags = [GROUP_TAG]
  project.roster.persons =
    options.persons ?? [
      person('person-1', '林品妤', 'A'),
      person('person-2', '陳柏宇', 'B'),
      person('person-3', '王小明', 'A'),
    ]
  project.rules = options.rules ?? []
  project.currentAssignment = {
    id: 'assignment',
    createdAt: '2026-01-01T00:00:00.000Z',
    seed: 'seed',
    inputRevision: 'revision',
    occupancy: { kind: 'full' },
    allocation: {
      kind: 'ordered',
      orderBy: 'studentNo',
      fill: 'row-major',
    },
    assignments: options.assignments,
    unassignedPersonIds: options.unassigned ?? [],
    lockedPersonIds: [],
    hardViolationCount: 0,
    softCost: 0,
    timedOut: false,
    violations: [],
    satisfiedCount: 0,
    ruleCount: 0,
  }
  return project
}

function result(
  project: Project,
): AssignmentResult {
  return project.currentAssignment as AssignmentResult
}

describe('evaluateAssignment', () => {
  it('判定同值人員相鄰，並區分正交與八方向', () => {
    const rule = createRule('separate', {
      tagId: GROUP_TAG.id,
      adjacency: 'orthogonal',
    })
    const project = createProject({
      assignments: { r0c0: 'person-1', r1c1: 'person-3' },
      rules: [rule],
    })

    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 0,
      satisfiedCount: 1,
      ruleCount: 1,
    })

    project.rules = [{ ...rule, adjacency: 'all8' }]
    const evaluation = evaluateAssignment(project, result(project))

    expect(evaluation.violationCount).toBe(1)
    expect(evaluation.violations[0]).toMatchObject({
      ruleId: rule.id,
      severity: 'hard',
      seatIds: ['r0c0', 'r1c1'],
      personIds: ['person-1', 'person-3'],
    })
    expect(evaluation.hardViolationCount).toBe(1)
    expect(evaluation.satisfiedCount).toBe(0)
  })

  it('只判定指定值，並計算軟約束成本', () => {
    const rule = createRule('separate', {
      tagId: GROUP_TAG.id,
      adjacency: 'orthogonal',
    })
    const project = createProject({
      assignments: { r0c0: 'person-1', r0c1: 'person-3' },
      rules: [
        {
          ...rule,
          strength: 'soft',
          weight: 4,
          values: ['B'],
        },
      ],
    })
    const evaluation = evaluateAssignment(project, result(project))

    expect(evaluation.violationCount).toBe(0)
    expect(evaluation.softCost).toBe(0)

    project.rules = [
      {
        ...rule,
        strength: 'soft',
        weight: 4,
        values: ['A'],
      },
    ]
    const next = evaluateAssignment(project, result(project))
    expect(next.violationCount).toBe(1)
    expect(next.softCost).toBe(4)
    expect(next.hardViolationCount).toBe(0)
  })

  it('同組規則要求至少一位同值鄰居，未分配者也會列入', () => {
    const rule = createRule('together', {
      tagId: GROUP_TAG.id,
      adjacency: 'orthogonal',
    })
    rule.values = ['A']
    const project = createProject({
      assignments: { r0c0: 'person-1', r0c1: 'person-3' },
      rules: [rule],
    })

    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 0,
      satisfiedCount: 1,
    })

    project.currentAssignment!.assignments = {
      r0c0: 'person-1',
      r0c1: 'person-2',
    }
    project.currentAssignment!.unassignedPersonIds = ['person-3']
    const evaluation = evaluateAssignment(project, result(project))
    expect(evaluation.violationCount).toBe(2)
    expect(
      evaluation.violations.map((item) => item.personIds).flat(),
    ).toEqual(['person-1', 'person-3'])
  })

  it('判定前後左右與走道旁位置', () => {
    const front = createRule('position', { tagId: GROUP_TAG.id })
    front.value = 'A'
    front.position = 'front'
    front.band = 1

    const project = createProject({
      assignments: { r0c0: 'person-1', r1c1: 'person-3' },
      rules: [front],
    })

    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 1,
      satisfiedCount: 0,
    })

    project.rules = [{ ...front, position: 'aisle' }]
    project.classroom.cells[1] = { type: 'aisle' }
    project.currentAssignment!.assignments = {
      r0c0: 'person-1',
      r0c2: 'person-3',
    }
    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 0,
      satisfiedCount: 1,
    })

    project.classroom.cells[1] = { type: 'seat' }
    project.currentAssignment!.assignments = {
      r0c0: 'person-1',
      r1c1: 'person-3',
    }
    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 2,
    })

    project.currentAssignment!.assignments = {}
    project.currentAssignment!.unassignedPersonIds = [
      'person-1',
      'person-2',
      'person-3',
    ]
    const unassigned = evaluateAssignment(project, result(project))
    expect(unassigned.violationCount).toBe(2)
  })

  it('判定避開組合與固定座位', () => {
    const avoid = createRule('avoid', { tagId: GROUP_TAG.id })
    avoid.tagIdB = GROUP_TAG.id
    avoid.valueA = 'A'
    avoid.valueB = 'B'
    avoid.adjacency = 'orthogonal'

    const project = createProject({
      assignments: { r0c0: 'person-1', r0c1: 'person-2' },
      rules: [avoid],
    })
    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 1,
    })

    const pin = createRule('pin', {
      personId: 'person-1',
      seatId: 'r0c0',
    })
    project.rules = [pin]
    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 0,
      satisfiedCount: 1,
    })

    project.currentAssignment!.assignments = {
      r0c1: 'person-1',
      r0c0: 'person-2',
    }
    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 1,
      hardViolationCount: 1,
    })
  })

  it('停用規則不列入計算，無效規則會產生衝突', () => {
    const rule = createRule('separate', { tagId: GROUP_TAG.id })
    const project = createProject({
      assignments: { r0c0: 'person-1', r0c1: 'person-3' },
      rules: [{ ...rule, enabled: false }],
    })

    expect(evaluateAssignment(project, result(project))).toMatchObject({
      violationCount: 0,
      ruleCount: 0,
      satisfiedCount: 0,
    })

    project.rules = [{ ...rule, tagId: 'missing' }]
    const evaluation = evaluateAssignment(project, result(project))
    expect(evaluation.violationCount).toBe(1)
    expect(evaluation.violations[0].message).toContain('設定無效')
  })

  it('可將判定結果寫回排座結果', () => {
    const rule = createRule('separate', { tagId: GROUP_TAG.id })
    const project = createProject({
      assignments: { r0c0: 'person-1', r0c1: 'person-3' },
      rules: [rule],
    })
    const next = applyRuleEvaluation(project, result(project))

    expect(next).toMatchObject({
      hardViolationCount: 1,
      softCost: 0,
      satisfiedCount: 0,
      ruleCount: 1,
    })
    expect(next.violations).toHaveLength(1)
  })
})
