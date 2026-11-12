import { performance } from 'node:perf_hooks'
import { createDefaultProject } from '../src/features/project/defaultProject'
import { createRule } from '../src/features/rules/ruleOps'
import {
  createRuleEvaluationContext,
  evaluateAssignment,
  evaluateAssignmentWithContext,
} from '../src/features/rules/evaluateRules'
import { optimizeSeatingAssignments } from '../src/features/seating/optimizer'

const COLS = 60
const ROWS = 60
const PERSON_COUNT = 60
const EVALUATION_RUNS = 20
const TIME_LIMIT_MS = 1000

const project = createDefaultProject()
project.name = '效能基準'
project.classroom.cols = COLS
project.classroom.rows = ROWS
project.classroom.cells = Array.from({ length: COLS * ROWS }, () => ({
  type: 'seat' as const,
}))
project.roster.tags = [
  {
    id: 'tag-group',
    name: '分組',
    type: 'enum',
    options: ['A', 'B', 'C'],
    color: '#2f6b58',
  },
]
project.roster.persons = Array.from({ length: PERSON_COUNT }, (_, index) => ({
  id: `person-${index + 1}`,
  name: `學生 ${index + 1}`,
  studentNo: String(index + 1).padStart(2, '0'),
  tags: { 'tag-group': ['A', 'B', 'C'][index % 3] },
  extra: {},
  note: '',
}))
project.rules = [
  createRule('separate', {
    tagId: 'tag-group',
    values: ['A'],
    adjacency: 'all8',
  }),
  createRule('position', {
    tagId: 'tag-group',
    value: 'B',
    position: 'front',
    band: 2,
  }),
  createRule('avoid', {
    tagIdA: 'tag-group',
    valueA: 'A',
    tagIdB: 'tag-group',
    valueB: 'B',
    adjacency: 'all8',
  }),
]

const activeSeatIds = Array.from(
  { length: COLS * ROWS },
  (_, index) => `r${Math.floor(index / COLS)}c${index % COLS}`,
)
const assignments = Object.fromEntries(
  activeSeatIds
    .slice(0, PERSON_COUNT)
    .map((seatId, index) => [seatId, `person-${index + 1}`]),
)
const unassignedPersonIds: string[] = []

const evaluationStartedAt = performance.now()
for (let index = 0; index < EVALUATION_RUNS; index += 1) {
  evaluateAssignment(project, { assignments, unassignedPersonIds })
}
const evaluationElapsedMs = performance.now() - evaluationStartedAt

const context = createRuleEvaluationContext(project)
const contextEvaluationStartedAt = performance.now()
for (let index = 0; index < EVALUATION_RUNS; index += 1) {
  evaluateAssignmentWithContext(context, { assignments, unassignedPersonIds })
}
const contextEvaluationElapsedMs =
  performance.now() - contextEvaluationStartedAt

const optimizationStartedAt = performance.now()
const optimization = optimizeSeatingAssignments({
  project,
  assignments,
  activeSeatIds,
  fixedPersonIds: [],
  unassignedPersonIds,
  seed: 'benchmark',
  options: {
    maxIterations: 200000,
    timeLimitMs: TIME_LIMIT_MS,
    restarts: 2,
  },
})
const optimizationElapsedMs = performance.now() - optimizationStartedAt

console.log(
  JSON.stringify(
    {
      classroom: `${COLS}x${ROWS}`,
      seats: activeSeatIds.length,
      persons: PERSON_COUNT,
      rules: project.rules.length,
      evaluationRuns: EVALUATION_RUNS,
      averageEvaluationMs: Number(
        (evaluationElapsedMs / EVALUATION_RUNS).toFixed(3),
      ),
      averageContextEvaluationMs: Number(
        (contextEvaluationElapsedMs / EVALUATION_RUNS).toFixed(3),
      ),
      optimizationTimeLimitMs: TIME_LIMIT_MS,
      optimizationElapsedMs: Number(optimizationElapsedMs.toFixed(1)),
      iterations: optimization.iterations,
      timedOut: optimization.timedOut,
    },
    null,
    2,
  ),
)
