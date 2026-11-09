import type { Project } from '../../types/domain'
import type { SeatingConfig, SeatingOutcome } from './engine'
import type { SeatingOptimizationProgress } from './optimizer'

export interface SeatingWorkerRunRequest {
  type: 'run'
  project: Project
  config: SeatingConfig
}

export type SeatingWorkerResponse =
  | { type: 'progress'; progress: SeatingOptimizationProgress }
  | { type: 'result'; outcome: SeatingOutcome }
  | { type: 'error'; message: string }
