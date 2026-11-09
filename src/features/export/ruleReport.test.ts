import { describe, expect, it } from 'vitest'
import type {
  AssignmentResult,
  Person,
  Project,
  TagDef,
} from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import { createRule } from '../rules/ruleOps'
import { createInputRevision } from '../seating/revision'
import { buildRuleReport } from './ruleReport'

const GROUP_TAG: TagDef = {
  id: 'tag-group',
  name: '分組',
  type: 'enum',
  options: ['A'],
  color: '#2f6b58',
}

function person(id: string, name: string, studentNo: string): Person {
  return {
    id,
    name,
    studentNo,
    tags: { 'tag-group': 'A' },
    extra: {},
    note: '',
  }
}

function createProject(): Project {
  const project = createDefaultProject()
  project.name = '規則測試'
  project.classroom.cols = 2
  project.classroom.rows = 2
  project.classroom.cells = Array.from({ length: 4 }, () => ({
    type: 'seat' as const,
  }))
  project.roster.tags = [GROUP_TAG]
  project.roster.persons = [
    person('p1', '林品妤', '01'),
    person('p2', '陳柏宇', '02'),
  ]
  project.rules = [
    createRule('separate', {
      tagId: GROUP_TAG.id,
      adjacency: 'orthogonal',
    }),
  ]
  project.rules[0].id = 'rule-separate'
  project.rules[0].note = '考試時分開'
  return project
}

function assignmentFor(project: Project): AssignmentResult {
  const occupancy = { kind: 'full' as const }
  const allocation = {
    kind: 'ordered' as const,
    orderBy: 'studentNo' as const,
    fill: 'row-major' as const,
  }

  return {
    id: 'assignment',
    createdAt: '2026-11-09T00:00:00.000Z',
    source: 'manual',
    seed: 'seed',
    inputRevision: createInputRevision(project, occupancy, allocation),
    occupancy,
    allocation,
    assignments: { r0c0: 'p1', r0c1: 'p2' },
    unassignedPersonIds: [],
    lockedPersonIds: [],
    hardViolationCount: 0,
    softCost: 0,
    timedOut: false,
    violations: [],
    satisfiedCount: 0,
    ruleCount: 0,
  }
}

describe('buildRuleReport', () => {
  it('整理規則、衝突數、座位與人員', () => {
    const project = createProject()
    project.currentAssignment = assignmentFor(project)
    const report = buildRuleReport(project)

    expect(report.totalRules).toBe(1)
    expect(report.enabledRules).toBe(1)
    expect(report.violationCount).toBe(1)
    expect(report.rows[0]).toMatchObject({
      ruleId: 'rule-separate',
      typeLabel: '分開',
      strength: 'hard',
      status: '1 個衝突',
      violationCount: 1,
      seatCodes: ['01', '02'],
      personNames: ['林品妤', '陳柏宇'],
      note: '考試時分開',
    })
    expect(report.stale).toBe(false)
  })

  it('保留停用規則並標示狀態', () => {
    const project = createProject()
    project.rules[0].enabled = false
    project.currentAssignment = assignmentFor(project)
    const report = buildRuleReport(project)

    expect(report.enabledRules).toBe(0)
    expect(report.rows[0].status).toBe('已停用')
    expect(report.rows[0].weight).toBe(5)
  })

  it('沒有排座結果時標示尚未排座', () => {
    const project = createProject()
    const report = buildRuleReport(project)

    expect(report.rows[0].status).toBe('尚未排座')
    expect(report.violationCount).toBe(0)
  })

  it('沒有規則時回傳空清單', () => {
    const project = createProject()
    project.rules = []
    project.currentAssignment = assignmentFor(project)

    expect(buildRuleReport(project).rows).toEqual([])
  })
})
