import { describe, expect, it } from 'vitest'
import type { Person, Project } from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import {
  createRuleEvaluationContext,
  evaluateAssignment,
  scoreAssignmentWithContext,
} from './evaluateRules'
import { createRule } from './ruleOps'

function person(id: string, name: string, group = 'A'): Person {
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
  project.classroom.rows = 3
  project.classroom.cells = Array.from({ length: 9 }, () => ({
    type: 'seat' as const,
  }))
  project.roster.tags = [
    {
      id: 'tag-group',
      name: '分組',
      type: 'enum',
      options: ['A', 'B'],
      color: '#2f6b58',
    },
  ]
  project.roster.persons = [
    person('person-1', '林品妤'),
    person('person-2', '陳柏宇'),
    person('person-3', '王小明'),
    person('person-4', '李美華', 'B'),
  ]
  return project
}

function clusterRule(adjacency: 'orthogonal' | 'all8' = 'all8') {
  return createRule('together', {
    tagId: 'tag-group',
    values: ['A'],
    adjacency,
    mode: 'cluster',
  })
}

describe('together cluster rule', () => {
  it('同一值的所有人形成單一群聚時符合規則', () => {
    const project = createProject()
    project.rules = [clusterRule()]
    const result = evaluateAssignment(project, {
      assignments: {
        r0c0: 'person-1',
        r1c1: 'person-2',
        r2c2: 'person-3',
      },
      unassignedPersonIds: [],
    })

    expect(result.violations).toHaveLength(0)
    expect(result.satisfiedCount).toBe(1)
  })

  it('同一值被拆成多個群聚時計為一個違反', () => {
    const project = createProject()
    project.rules = [clusterRule()]
    const result = evaluateAssignment(project, {
      assignments: {
        r0c0: 'person-1',
        r0c2: 'person-2',
      },
      unassignedPersonIds: ['person-3'],
    })

    expect(result.violations).toHaveLength(2)
    expect(result.violations[0]?.message).toContain('分成 2 個群聚')
    expect(result.violations[1]?.message).toContain('尚未安排座位')
  })

  it('同一值被拆成四個群聚時依多出的群聚數計分', () => {
    const project = createProject()
    project.roster.persons.push(person('person-5', '張雅婷', 'A'))
    project.rules = [clusterRule()]
    const assignment = {
      assignments: {
        r0c0: 'person-1',
        r0c2: 'person-2',
        r2c0: 'person-3',
        r2c2: 'person-5',
      },
      unassignedPersonIds: [],
    }
    const result = evaluateAssignment(project, assignment)
    const context = createRuleEvaluationContext(project)
    const fast = scoreAssignmentWithContext(context, assignment)

    expect(result.violations).toHaveLength(3)
    expect(result.violations[0]?.message).toContain('分成 4 個群聚')
    expect(fast.hardViolationCount).toBe(3)
    expect(fast.violationCount).toBe(3)
  })

  it('正交與含斜角使用不同的連通結果', () => {
    const project = createProject()
    project.rules = [clusterRule('orthogonal')]
    const assignments = {
      r0c0: 'person-1',
      r1c1: 'person-2',
    }

    const orthogonal = evaluateAssignment(project, {
      assignments,
      unassignedPersonIds: [],
    })
    project.rules = [clusterRule('all8')]
    const all8 = evaluateAssignment(project, {
      assignments,
      unassignedPersonIds: [],
    })

    expect(orthogonal.violations).toHaveLength(1)
    expect(all8.violations).toHaveLength(0)
  })

  it('多值各自形成群聚，單人組也符合', () => {
    const project = createProject()
    project.rules = [
      createRule('together', {
        tagId: 'tag-group',
        adjacency: 'all8',
        mode: 'cluster',
      }),
    ]
    const result = evaluateAssignment(project, {
      assignments: {
        r0c0: 'person-1',
        r0c1: 'person-2',
        r2c2: 'person-4',
      },
      unassignedPersonIds: ['person-3'],
    })

    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]?.message).toContain('尚未安排座位')
  })

  it('舊規則沒有 mode 時維持缺少鄰居的判定', () => {
    const project = createProject()
    const legacy = createRule('together', {
      tagId: 'tag-group',
      values: ['A'],
      adjacency: 'all8',
    })
    delete legacy.mode
    project.rules = [legacy]
    const result = evaluateAssignment(project, {
      assignments: {
        r0c0: 'person-1',
        r0c2: 'person-2',
      },
      unassignedPersonIds: [],
    })

    expect(result.violations).toHaveLength(2)
    expect(result.violations.every((item) => item.message.includes('缺少同組鄰居'))).toBe(
      true,
    )
  })

  it('快速計分與完整判定的群聚數量一致', () => {
    const project = createProject()
    project.rules = [clusterRule()]
    const assignment = {
      assignments: {
        r0c0: 'person-1',
        r0c2: 'person-2',
      },
      unassignedPersonIds: ['person-3'],
    }
    const context = createRuleEvaluationContext(project)
    const full = evaluateAssignment(project, assignment)
    const fast = scoreAssignmentWithContext(context, assignment)

    expect(fast.hardViolationCount).toBe(full.hardViolationCount)
    expect(fast.softCost).toBe(full.softCost)
    expect(fast.violationCount).toBe(full.violationCount)
  })
})
