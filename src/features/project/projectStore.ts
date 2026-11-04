import { useStore } from 'zustand'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import type { CellType, Project, SeatNumbering } from '../../types/domain'
import type { CellPosition } from '../classroom/classroomOps'
import {
  clampCellSize,
  resizeClassroom,
  setCellTypes,
  setCodeOverride,
  updateNumbering,
} from '../classroom/classroomOps'
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
}

function touch(project: Project): void {
  project.updatedAt = new Date().toISOString()
}

export const useProjectStore = create<ProjectStore>()(
  temporal(
    immer<ProjectStore>((set) => ({
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

  return {
    canUndo,
    canRedo,
    undo: () => useProjectStore.temporal.getState().undo(),
    redo: () => useProjectStore.temporal.getState().redo(),
  }
}
