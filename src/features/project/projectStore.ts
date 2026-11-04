import { useCallback } from 'react'
import { useStore } from 'zustand'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import type {
  CellType,
  Project,
  Rule,
  SeatNumbering,
} from '../../types/domain'
import type { CellPosition } from '../classroom/classroomOps'
import {
  clampCellSize,
  resizeClassroom,
  setCellTypes,
  setCodeOverride,
  updateNumbering,
} from '../classroom/classroomOps'
import type {
  ImportMode,
  ImportOutcome,
  ImportPlan,
} from '../roster/importRoster'
import { applyImportPlan } from '../roster/importRoster'
import {
  addPerson as addPersonToRoster,
  addTag as addTagToRoster,
  createPerson,
  createTagDef,
  isTagNameTaken,
  removePerson as removePersonFromRoster,
  removeTag as removeTagFromRoster,
  setTagValue,
  updatePerson as updatePersonInRoster,
  updateTag as updateTagInRoster,
  type PersonInput,
  type PersonPatch,
  type TagInput,
  type TagPatch,
  type TagValue,
} from '../roster/rosterOps'
import { loadProject } from '../../lib/storage'
import { createDefaultProject } from './defaultProject'

export interface ProjectStore {
  project: Project
  renameProject: (name: string) => void
  applyCellTypes: (positions: CellPosition[], type: CellType) => void
  resizeRoom: (cols: number, rows: number) => void
  updateSeatNumbering: (patch: Partial<SeatNumbering>) => void
  updateSeatCode: (seat: CellPosition, code: string) => void
  updateCellSize: (size: number) => void
  addPerson: (input: PersonInput) => string | null
  updatePerson: (personId: string, patch: PersonPatch) => boolean
  deletePerson: (personId: string) => void
  setPersonsTag: (
    personIds: string[],
    tagId: string,
    value: TagValue | null,
  ) => void
  addTag: (input: TagInput) => string | null
  updateTag: (tagId: string, patch: TagPatch) => boolean
  deleteTag: (tagId: string) => void
  importRoster: (plan: ImportPlan, mode: ImportMode) => ImportOutcome
}

function touch(project: Project): void {
  project.updatedAt = new Date().toISOString()
}

function ruleUsesTag(rule: Rule, tagId: string): boolean {
  if (rule.type === 'avoid') {
    return rule.tagIdA === tagId || rule.tagIdB === tagId
  }

  return rule.type !== 'pin' && rule.tagId === tagId
}

function prunePersonReferences(project: Project): void {
  const personIds = new Set(
    project.roster.persons.map((person) => person.id),
  )

  project.lockedPersonIds = project.lockedPersonIds.filter((personId) =>
    personIds.has(personId),
  )
  project.rules = project.rules.filter(
    (rule) => rule.type !== 'pin' || personIds.has(rule.personId),
  )

  if (!project.currentAssignment) {
    return
  }

  const assignments = Object.fromEntries(
    Object.entries(project.currentAssignment.assignments).filter(
      ([, personId]) => personIds.has(personId),
    ),
  )

  project.currentAssignment.assignments = assignments
  project.currentAssignment.unassignedPersonIds =
    project.currentAssignment.unassignedPersonIds.filter((personId) =>
      personIds.has(personId),
    )
  project.currentAssignment.lockedPersonIds =
    project.currentAssignment.lockedPersonIds.filter((personId) =>
      personIds.has(personId),
    )
}

export const useProjectStore = create<ProjectStore>()(
  temporal(
    immer<ProjectStore>((set, get) => ({
      project: loadProject() ?? createDefaultProject(),

      renameProject: (name) => {
        set((state) => {
          const nextName = name.trim() || '未命名教室'

          if (nextName === state.project.name) {
            return
          }

          state.project.name = nextName
          touch(state.project)
        })
      },

      applyCellTypes: (positions, type) => {
        set((state) => {
          const next = setCellTypes(state.project.classroom, positions, type)

          if (next === state.project.classroom) {
            return
          }

          state.project.classroom = next
          touch(state.project)
        })
      },

      resizeRoom: (cols, rows) => {
        set((state) => {
          const next = resizeClassroom(state.project.classroom, cols, rows)

          if (next === state.project.classroom) {
            return
          }

          state.project.classroom = next
          touch(state.project)
        })
      },

      updateSeatNumbering: (patch) => {
        set((state) => {
          const next = updateNumbering(state.project.classroom, patch)

          if (next === state.project.classroom) {
            return
          }

          state.project.classroom = next
          touch(state.project)
        })
      },

      updateSeatCode: (seat, code) => {
        set((state) => {
          const next = setCodeOverride(state.project.classroom, seat, code)

          if (next === state.project.classroom) {
            return
          }

          state.project.classroom = next
          touch(state.project)
        })
      },

      updateCellSize: (size) => {
        set((state) => {
          const next = clampCellSize(size)

          if (next === state.project.settings.cellSize) {
            return
          }

          state.project.settings.cellSize = next
          touch(state.project)
        })
      },

      addPerson: (input) => {
        const person = createPerson(input)

        if (!person.name) {
          return null
        }

        set((state) => {
          const next = addPersonToRoster(state.project.roster, person)

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          touch(state.project)
        })

        return person.id
      },

      updatePerson: (personId, patch) => {
        if (patch.name !== undefined && !patch.name.trim()) {
          return false
        }

        const current = get().project.roster.persons.find(
          (person) => person.id === personId,
        )

        if (!current) {
          return false
        }

        set((state) => {
          const next = updatePersonInRoster(
            state.project.roster,
            personId,
            patch,
          )

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          touch(state.project)
        })

        return true
      },

      deletePerson: (personId) => {
        set((state) => {
          const next = removePersonFromRoster(
            state.project.roster,
            personId,
          )

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          prunePersonReferences(state.project)
          touch(state.project)
        })
      },

      setPersonsTag: (personIds, tagId, value) => {
        set((state) => {
          const next = setTagValue(
            state.project.roster,
            personIds,
            tagId,
            value,
          )

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          touch(state.project)
        })
      },

      addTag: (input) => {
        const name = input.name.trim()

        if (!name || isTagNameTaken(get().project.roster, name)) {
          return null
        }

        const tag = createTagDef({ ...input, name })

        set((state) => {
          const next = addTagToRoster(state.project.roster, tag)

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          touch(state.project)
        })

        return tag.id
      },

      updateTag: (tagId, patch) => {
        const roster = get().project.roster
        const current = roster.tags.find((tag) => tag.id === tagId)

        if (!current) {
          return false
        }

        if (patch.name !== undefined) {
          const name = patch.name.trim()

          if (!name || isTagNameTaken(roster, name, tagId)) {
            return false
          }
        }

        set((state) => {
          const next = updateTagInRoster(
            state.project.roster,
            tagId,
            patch,
          )

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          touch(state.project)
        })

        return true
      },

      deleteTag: (tagId) => {
        set((state) => {
          const next = removeTagFromRoster(state.project.roster, tagId)

          if (next === state.project.roster) {
            return
          }

          state.project.roster = next
          state.project.rules = state.project.rules.filter(
            (rule) => !ruleUsesTag(rule, tagId),
          )
          touch(state.project)
        })
      },

      importRoster: (plan, mode) => {
        const outcome = applyImportPlan(get().project.roster, plan, mode)

        set((state) => {
          state.project.roster = outcome.roster
          prunePersonReferences(state.project)
          touch(state.project)
        })

        return outcome
      },
    })),
    {
      limit: 50,
      equality: (past, current) => past.project === current.project,
    },
  ),
)

export function useHistoryControls() {
  const canUndo = useStore(
    useProjectStore.temporal,
    (state) => state.pastStates.length > 0,
  )
  const canRedo = useStore(
    useProjectStore.temporal,
    (state) => state.futureStates.length > 0,
  )
  const undo = useCallback(() => {
    useProjectStore.temporal.getState().undo()
  }, [])
  const redo = useCallback(() => {
    useProjectStore.temporal.getState().redo()
  }, [])

  return { canUndo, canRedo, undo, redo }
}
