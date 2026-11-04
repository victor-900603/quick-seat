import { useCallback } from 'react'
import { useStore } from 'zustand'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import type {
  AssignmentResult,
  CellType,
  PinRule,
  Project,
  ProjectSettings,
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
import {
  buildManualAssignment,
  buildSeatingResult,
  type SeatingConfig,
  type SeatingOutcome,
} from '../seating/engine'
import {
  findPersonSeat,
  placePerson,
  pruneAssignmentSeats,
  removePersonAssignment,
  swapOrMove,
} from '../seating/seatingOps'
import { buildOccupancySummary } from '../seating/occupancy'

export interface SeatingActionResult {
  ok: boolean
  message?: string
  displacedPersonId?: string
  unlockedPersonId?: string
}

export interface ProjectStore {
  project: Project
  renameProject: (name: string) => void
  applyCellTypes: (positions: CellPosition[], type: CellType) => void
  resizeRoom: (cols: number, rows: number) => void
  updateSeatNumbering: (patch: Partial<SeatNumbering>) => void
  updateSeatCode: (seat: CellPosition, code: string) => void
  updateCellSize: (size: number) => void
  setDisplay: (display: ProjectSettings['display']) => void
  runSeating: (config: SeatingConfig) => SeatingOutcome
  clearAssignment: () => void
  togglePersonLock: (personId: string) => void
  unassignPerson: (personId: string) => void
  moveSeatOccupant: (
    fromSeatId: string,
    toSeatId: string,
    options?: { allowLockedTarget?: boolean },
  ) => SeatingActionResult
  assignUnassigned: (
    personId: string,
    seatId: string,
    options?: {
      allowLockedTarget?: boolean
      /** 尚無座位表時，以這組設定建立手動座位表並同時安排人員。 */
      manualConfig?: SeatingConfig
    },
  ) => SeatingActionResult
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

function activeSeatIdsForAssignment(
  project: Project,
  assignment: AssignmentResult,
): Set<string> {
  const fill =
    assignment.allocation.kind === 'ordered'
      ? assignment.allocation.fill
      : 'row-major'
  const pins = project.rules
    .filter(
      (rule): rule is PinRule => rule.type === 'pin' && rule.enabled,
    )
    .map((rule) => rule.seatId)

  return new Set(
    buildOccupancySummary(project.classroom, assignment.occupancy, {
      personCount: project.roster.persons.length,
      fill,
      extraSeatIds: pins,
    }).activeSeats.map((seat) => seat.id),
  )
}

function currentActiveSeatIds(project: Project): Set<string> {
  const assignment = project.currentAssignment

  return assignment
    ? activeSeatIdsForAssignment(project, assignment)
    : new Set()
}

function addLock(project: Project, personId: string): void {
  if (!project.lockedPersonIds.includes(personId)) {
    project.lockedPersonIds.push(personId)
  }

  if (
    project.currentAssignment &&
    !project.currentAssignment.lockedPersonIds.includes(personId)
  ) {
    project.currentAssignment.lockedPersonIds.push(personId)
  }
}

function removeLock(project: Project, personId: string): void {
  project.lockedPersonIds = project.lockedPersonIds.filter(
    (lockedPersonId) => lockedPersonId !== personId,
  )

  if (project.currentAssignment) {
    project.currentAssignment.lockedPersonIds =
      project.currentAssignment.lockedPersonIds.filter(
        (lockedPersonId) => lockedPersonId !== personId,
      )
  }
}

function refreshUnassigned(project: Project): void {
  if (!project.currentAssignment) {
    return
  }

  const assigned = new Set(
    Object.values(project.currentAssignment.assignments),
  )
  project.currentAssignment.unassignedPersonIds =
    project.roster.persons
      .map((person) => person.id)
      .filter((personId) => !assigned.has(personId))
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
          pruneAssignmentSeats(state.project)
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
          pruneAssignmentSeats(state.project)
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

      setDisplay: (display) => {
        set((state) => {
          if (state.project.settings.display === display) {
            return
          }

          state.project.settings.display = display
          touch(state.project)
        })
      },

      runSeating: (config) => {
        const outcome = buildSeatingResult(get().project, config)

        if (!outcome.ok) {
          return outcome
        }

        set((state) => {
          state.project.currentAssignment = outcome.result
          touch(state.project)
        })

        return outcome
      },

      clearAssignment: () => {
        set((state) => {
          if (!state.project.currentAssignment) {
            return
          }

          state.project.currentAssignment = null
          touch(state.project)
        })
      },

      togglePersonLock: (personId) => {
        if (
          !get().project.roster.persons.some((person) => person.id === personId)
        ) {
          return
        }

        set((state) => {
          if (state.project.lockedPersonIds.includes(personId)) {
            removeLock(state.project, personId)
          } else {
            addLock(state.project, personId)
          }

          touch(state.project)
        })
      },

      unassignPerson: (personId) => {
        set((state) => {
          const current = state.project.currentAssignment

          if (!current) {
            return
          }

          const change = removePersonAssignment(
            current.assignments,
            personId,
          )

          if (!change) {
            return
          }

          current.assignments = change.assignments
          refreshUnassigned(state.project)
          removeLock(state.project, personId)
          touch(state.project)
        })
      },

      moveSeatOccupant: (fromSeatId, toSeatId, options) => {
        const project = get().project
        const current = project.currentAssignment

        if (!current) {
          return { ok: false, message: '尚未排座，沒有可移動的人員。' }
        }

        const activeSeats = currentActiveSeatIds(project)

        if (!activeSeats.has(fromSeatId) || !activeSeats.has(toSeatId)) {
          return { ok: false, message: '目標座位不在本次排座範圍內。' }
        }

        const movingPersonId = current.assignments[fromSeatId]

        if (!movingPersonId) {
          return { ok: false, message: '來源座位沒有可移動的人員。' }
        }

        if (project.lockedPersonIds.includes(movingPersonId)) {
          return {
            ok: false,
            message: '已鎖定的人員不可移動，請先解除鎖定。',
          }
        }

        if (fromSeatId === toSeatId) {
          return { ok: true }
        }

        const targetPersonId = current.assignments[toSeatId]

        if (
          targetPersonId &&
          project.lockedPersonIds.includes(targetPersonId) &&
          !options?.allowLockedTarget
        ) {
          return {
            ok: false,
            message: '目標座位的人員已鎖定，請先解除鎖定。',
          }
        }

        set((state) => {
          const stateCurrent = state.project.currentAssignment

          if (!stateCurrent) {
            return
          }

          const change = swapOrMove(
            stateCurrent.assignments,
            fromSeatId,
            toSeatId,
          )

          if (!change) {
            return
          }

          stateCurrent.assignments = change.assignments

          if (
            targetPersonId &&
            state.project.lockedPersonIds.includes(targetPersonId)
          ) {
            removeLock(state.project, targetPersonId)
          }

          refreshUnassigned(state.project)
          touch(state.project)
        })

        return {
          ok: true,
          displacedPersonId: targetPersonId,
          unlockedPersonId:
            targetPersonId &&
            project.lockedPersonIds.includes(targetPersonId)
              ? targetPersonId
              : undefined,
        }
      },

      assignUnassigned: (personId, seatId, options) => {
        const project = get().project
        const existing = project.currentAssignment
        let current = existing
        let createdManual = false

        if (!current) {
          if (!options?.manualConfig) {
            return { ok: false, message: '尚未排座，無法安排人員。' }
          }

          const outcome = buildManualAssignment(
            project,
            options.manualConfig,
          )

          if (!outcome.ok) {
            return { ok: false, message: outcome.message }
          }

          current = outcome.result
          createdManual = true
        }

        if (
          !project.roster.persons.some((person) => person.id === personId)
        ) {
          return { ok: false, message: '找不到要安排的人員。' }
        }

        if (findPersonSeat(current.assignments, personId)) {
          return {
            ok: false,
            message: '此人已有座位，請直接拖曳座位上的名牌。',
          }
        }

        if (!activeSeatIdsForAssignment(project, current).has(seatId)) {
          return { ok: false, message: '目標座位不在本次排座範圍內。' }
        }

        const targetPersonId = current.assignments[seatId]

        if (
          targetPersonId &&
          project.lockedPersonIds.includes(targetPersonId) &&
          !options?.allowLockedTarget
        ) {
          return {
            ok: false,
            message: '目標座位的人員已鎖定，請先解除鎖定。',
          }
        }

        const change = placePerson(current.assignments, personId, seatId)

        if (!change) {
          return { ok: false, message: '無法安排座位。' }
        }

        set((state) => {
          if (createdManual) {
            state.project.currentAssignment = {
              ...current,
              assignments: change.assignments,
            }
          }

          const stateCurrent = state.project.currentAssignment

          if (!stateCurrent) {
            return
          }

          if (!createdManual) {
            stateCurrent.assignments = change.assignments
          }

          if (
            targetPersonId &&
            state.project.lockedPersonIds.includes(targetPersonId)
          ) {
            removeLock(state.project, targetPersonId)
          }

          refreshUnassigned(state.project)
          touch(state.project)
        })

        return {
          ok: true,
          displacedPersonId: targetPersonId,
          unlockedPersonId:
            targetPersonId &&
            project.lockedPersonIds.includes(targetPersonId)
              ? targetPersonId
              : undefined,
        }
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
