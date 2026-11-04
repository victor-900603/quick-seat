import { describe, expect, it } from 'vitest'
import type { Person, Project } from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import { buildSeatingResult } from './engine'
import { createInputRevision, hashRevision, isAssignmentStale } from './revision'

function person(id: string, name: string): Person {
  return {
    id,
    name,
    studentNo: id,
    tags: {},
    extra: {},
    note: '',
  }
}

function projectWithPeople(): Project {
  const project = createDefaultProject()
  project.roster.persons = [person('p1', '王小明'), person('p2', '陳小美')]
  return project
}

describe('revision', () => {
  it('穩定序列化忽略物件鍵順序', () => {
    expect(hashRevision({ a: 1, b: 2 })).toBe(hashRevision({ b: 2, a: 1 }))
  })

  it('教室、名單、規則、座位模式或分配方式變更都會改變版本', () => {
    const project = projectWithPeople()
    const occupancy = { kind: 'full' as const }
    const allocation = {
      kind: 'ordered' as const,
      orderBy: 'studentNo' as const,
      fill: 'row-major' as const,
    }
    const base = createInputRevision(project, occupancy, allocation)

    expect(createInputRevision(project, occupancy, allocation)).toBe(base)
    expect(
      createInputRevision(
        {
          ...project,
          classroom: { ...project.classroom, cols: project.classroom.cols + 1 },
        },
        occupancy,
        allocation,
      ),
    ).not.toBe(base)
    expect(
      createInputRevision(
        {
          ...project,
          roster: {
            ...project.roster,
            persons: project.roster.persons.map((item) =>
              item.id === 'p1' ? { ...item, name: '改名' } : item,
            ),
          },
        },
        occupancy,
        allocation,
      ),
    ).not.toBe(base)
    expect(
      createInputRevision(
        { ...project, rules: [{ id: 'rule' }] as never },
        occupancy,
        allocation,
      ),
    ).not.toBe(base)
    expect(
      createInputRevision(
        project,
        { kind: 'checkerboard', phase: 0 },
        allocation,
      ),
    ).not.toBe(base)
    expect(
      createInputRevision(project, occupancy, { kind: 'random' }),
    ).not.toBe(base)
  })

  it('結果產生後可判斷是否過期，顯示設定不影響有效性', () => {
    const project = projectWithPeople()
    const outcome = buildSeatingResult(project, {
      occupancy: { kind: 'full' },
      allocation: {
        kind: 'ordered',
        orderBy: 'studentNo',
        fill: 'row-major',
      },
      seed: '',
      partial: false,
    })

    expect(outcome.ok).toBe(true)

    if (!outcome.ok) {
      return
    }

    project.currentAssignment = outcome.result
    expect(isAssignmentStale(project)).toBe(false)

    project.settings.display = 'both'
    expect(isAssignmentStale(project)).toBe(false)

    project.roster.persons[0].name = '改名'
    expect(isAssignmentStale(project)).toBe(true)
  })

  it('沒有結果時不標記為過期', () => {
    expect(isAssignmentStale(projectWithPeople())).toBe(false)
  })
})
