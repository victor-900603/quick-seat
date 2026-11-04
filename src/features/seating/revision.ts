import type {
  AllocationMode,
  OccupancyMode,
  Project,
} from '../../types/domain'

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined'
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const fields = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)

  return `{${fields.join(',')}}`
}

export function hashRevision(value: unknown): string {
  const text = stableStringify(value)
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createInputRevision(
  project: Pick<Project, 'classroom' | 'roster' | 'rules'>,
  occupancy: OccupancyMode,
  allocation: AllocationMode,
): string {
  return hashRevision({
    classroom: project.classroom,
    roster: project.roster,
    rules: project.rules,
    occupancy,
    allocation,
  })
}

export function isAssignmentStale(project: Project): boolean {
  if (!project.currentAssignment) {
    return false
  }

  return (
    project.currentAssignment.inputRevision !==
    createInputRevision(
      project,
      project.currentAssignment.occupancy,
      project.currentAssignment.allocation,
    )
  )
}
