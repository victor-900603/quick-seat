import type { Project } from '../types/domain'
import { createDefaultProject } from '../features/project/defaultProject'
import { createInputRevision } from '../features/seating/revision'

const ALLOCATION = {
  kind: 'ordered' as const,
  orderBy: 'studentNo' as const,
  fill: 'row-major' as const,
}

const OCCUPANCY = { kind: 'full' as const }

export function createExportFixture(): Project {
  const project = createDefaultProject()
  project.name = '三年甲班'
  project.createdAt = '2026-01-02T03:04:05.000Z'
  project.updatedAt = '2026-01-02T03:04:05.000Z'
  project.roster.tags = [
    {
      id: 'tag-group',
      name: '分組',
      type: 'enum',
      options: ['A', 'B'],
      color: '#2f6b58',
    },
  ]
  project.roster.extraColumns = ['電話']
  project.roster.persons = [
    {
      id: 'person-1',
      name: '林品妤',
      studentNo: '01',
      tags: { 'tag-group': 'A' },
      extra: { 電話: '0912' },
      note: '班長',
    },
    {
      id: 'person-2',
      name: '陳柏宇',
      studentNo: '02',
      tags: { 'tag-group': 'B' },
      extra: {},
      note: '',
    },
    {
      id: 'person-3',
      name: '王小明',
      studentNo: '03',
      tags: { 'tag-group': 'A' },
      extra: {},
      note: '轉學生',
    },
  ]
  project.classroom.cells[1 * project.classroom.cols + 1] = { type: 'aisle' }
  project.classroom.cells[2 * project.classroom.cols + 2] = { type: 'blocked' }
  project.currentAssignment = {
    id: 'assignment-1',
    createdAt: '2026-01-02T03:05:00.000Z',
    source: 'auto',
    seed: 'seed-1',
    inputRevision: createInputRevision(project, OCCUPANCY, ALLOCATION),
    occupancy: OCCUPANCY,
    allocation: ALLOCATION,
    assignments: {
      r0c0: 'person-1',
      r0c1: 'person-2',
    },
    unassignedPersonIds: ['person-3'],
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
