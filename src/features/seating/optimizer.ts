import type { Project } from '../../types/domain'
import { evaluateAssignment } from '../rules/evaluateRules'
import { hashSeed, mulberry32 } from './allocation'

export interface SeatingOptimizerOptions {
  /** 總迭代上限；未指定時依座位數調整。 */
  maxIterations?: number
  /** 最佳化時間上限，毫秒。 */
  timeLimitMs?: number
  /** 模擬退火起始溫度。 */
  initialTemperature?: number
  /** 模擬退火結束溫度。 */
  finalTemperature?: number
  /** 每次迭代的降溫比例。 */
  coolingRate?: number
  /** 重新升溫次數。 */
  restarts?: number
}

export interface SeatingOptimizationProgress {
  iteration: number
  maxIterations: number
  restart: number
  restarts: number
}

export interface OptimizeSeatingInput {
  project: Project
  assignments: Record<string, string>
  activeSeatIds: string[]
  fixedPersonIds: string[]
  unassignedPersonIds: string[]
  seed: string
  options?: SeatingOptimizerOptions
  onProgress?: (progress: SeatingOptimizationProgress) => void
}

export interface SeatingOptimization {
  assignments: Record<string, string>
  timedOut: boolean
  iterations: number
}

interface Score {
  hard: number
  soft: number
  total: number
  cost: number
}

export const DEFAULT_OPTIMIZER_TIME_LIMIT_MS = 10000
const DEFAULT_TIME_LIMIT_MS = DEFAULT_OPTIMIZER_TIME_LIMIT_MS
const DEFAULT_INITIAL_TEMPERATURE = 2
const DEFAULT_FINAL_TEMPERATURE = 0.01
const DEFAULT_COOLING_RATE = 0.9995
const DEFAULT_RESTARTS = 3
const TIME_CHECK_INTERVAL = 32
const PROGRESS_INTERVAL_MS = 100

function scoreAssignment(
  project: Project,
  assignments: Record<string, string>,
  unassignedPersonIds: string[],
): Score {
  const evaluation = evaluateAssignment(project, {
    assignments,
    unassignedPersonIds,
  })

  return {
    hard: evaluation.hardViolationCount,
    soft: evaluation.softCost,
    total: evaluation.violationCount,
    // 硬違反優先於軟成本；總違反數只用來打破平手。
    cost:
      evaluation.hardViolationCount * 10 +
      evaluation.softCost * 0.1 +
      evaluation.violationCount * 0.001,
  }
}

function isBetter(candidate: Score, current: Score): boolean {
  if (candidate.hard !== current.hard) {
    return candidate.hard < current.hard
  }

  if (candidate.soft !== current.soft) {
    return candidate.soft < current.soft
  }

  return candidate.total < current.total
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(1, Math.floor(value))
}

export function optimizeSeatingAssignments(
  input: OptimizeSeatingInput,
): SeatingOptimization {
  const options = input.options ?? {}
  const activeSeatIds = [...new Set(input.activeSeatIds)]
  const seatCount = activeSeatIds.length
  const maxIterations = Math.min(
    500000,
    positiveInteger(
      options.maxIterations,
      Math.max(50000, seatCount * 1000),
    ),
  )
  const timeLimitMs =
    options.timeLimitMs === undefined
      ? DEFAULT_TIME_LIMIT_MS
      : Math.max(0, options.timeLimitMs)
  const initialTemperature =
    options.initialTemperature ?? DEFAULT_INITIAL_TEMPERATURE
  const finalTemperature =
    options.finalTemperature ?? DEFAULT_FINAL_TEMPERATURE
  const coolingRate = options.coolingRate ?? DEFAULT_COOLING_RATE
  const restarts = positiveInteger(options.restarts, DEFAULT_RESTARTS)
  const fixedPersonIds = new Set(input.fixedPersonIds)
  const random = mulberry32(hashSeed(`${input.seed}:optimizer`))
  const startedAt = performance.now()
  let iterations = 0

  let currentAssignments = { ...input.assignments }
  let currentScore = scoreAssignment(
    input.project,
    currentAssignments,
    input.unassignedPersonIds,
  )
  let bestAssignments = currentAssignments
  let bestScore = currentScore
  let timedOut = false

  const restartIterations = Math.max(
    1,
    Math.floor(maxIterations / restarts),
  )
  let lastProgressAt = Number.NEGATIVE_INFINITY

  const reportProgress = (restart: number) => {
    const now = performance.now()

    if (now - lastProgressAt < PROGRESS_INTERVAL_MS) {
      return
    }

    lastProgressAt = now
    input.onProgress?.({
      iteration: iterations,
      maxIterations,
      restart,
      restarts,
    })
  }

  for (let restart = 0; restart < restarts; restart += 1) {
    currentAssignments = bestAssignments
    currentScore = bestScore
    let temperature = initialTemperature

    reportProgress(restart + 1)

    for (
      let restartStep = 0;
      restartStep < restartIterations;
      restartStep += 1
    ) {
      if (iterations >= maxIterations) {
        break
      }

      if (iterations % TIME_CHECK_INTERVAL === 0) {
        reportProgress(restart + 1)

        if (performance.now() - startedAt >= timeLimitMs) {
          timedOut = true
          break
        }
      }

      const movableSeats = activeSeatIds.filter((seatId) => {
        const personId = currentAssignments[seatId]
        return Boolean(personId) && !fixedPersonIds.has(personId)
      })
      const emptySeats = activeSeatIds.filter(
        (seatId) => !currentAssignments[seatId],
      )
      const canSwap = movableSeats.length >= 2
      const canMove = movableSeats.length >= 1 && emptySeats.length >= 1

      if (!canSwap && !canMove) {
        break
      }

      let nextAssignments: Record<string, string> | null = null
      const useMove = canMove && (!canSwap || random() < 0.3)

      if (useMove) {
        const fromSeatId =
          movableSeats[Math.floor(random() * movableSeats.length)]
        const toSeatId = emptySeats[Math.floor(random() * emptySeats.length)]

        nextAssignments = { ...currentAssignments }
        nextAssignments[toSeatId] = nextAssignments[fromSeatId]
        delete nextAssignments[fromSeatId]
      } else {
        const firstIndex = Math.floor(random() * movableSeats.length)
        let secondIndex = Math.floor(random() * movableSeats.length)

        if (secondIndex === firstIndex) {
          secondIndex = (secondIndex + 1) % movableSeats.length
        }

        const firstSeatId = movableSeats[firstIndex]
        const secondSeatId = movableSeats[secondIndex]

        if (firstSeatId !== secondSeatId) {
          nextAssignments = { ...currentAssignments }
          ;[nextAssignments[firstSeatId], nextAssignments[secondSeatId]] = [
            nextAssignments[secondSeatId],
            nextAssignments[firstSeatId],
          ]
        }
      }

      iterations += 1
      temperature *= coolingRate

      if (!nextAssignments) {
        continue
      }

      const nextScore = scoreAssignment(
        input.project,
        nextAssignments,
        input.unassignedPersonIds,
      )
      const delta = nextScore.cost - currentScore.cost
      const accept =
        delta <= 0 ||
        (temperature > 0 && random() < Math.exp(-delta / temperature))

      if (accept) {
        currentAssignments = nextAssignments
        currentScore = nextScore

        if (isBetter(currentScore, bestScore)) {
          bestScore = currentScore
          bestAssignments = currentAssignments
        }
      }

      if (temperature < finalTemperature) {
        break
      }
    }

    if (timedOut || iterations >= maxIterations) {
      break
    }
  }

  input.onProgress?.({
    iteration: iterations,
    maxIterations,
    restart: restarts,
    restarts,
  })

  return {
    assignments: bestAssignments,
    timedOut,
    iterations,
  }
}

/** 只保留給測試與呼叫端使用的分數型別。 */
export type OptimizerScore = Pick<Score, 'hard' | 'soft' | 'total'>
