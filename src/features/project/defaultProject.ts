import type { Project, ProjectSettings } from '../../types/domain'
import { createClassroom, DEFAULT_CELL_SIZE } from '../classroom/classroomOps'

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  display: 'name',
  adjacencyDefault: 'all8',
  cellSize: DEFAULT_CELL_SIZE,
  printShowTagColors: false,
}

export function createDefaultProject(): Project {
  const now = new Date().toISOString()

  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: '未命名教室',
    createdAt: now,
    updatedAt: now,
    classroom: createClassroom(),
    roster: {
      persons: [],
      tags: [],
      extraColumns: [],
    },
    rules: [],
    lockedPersonIds: [],
    currentAssignment: null,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  }
}
