import { z } from 'zod'
import type { Project } from '../../types/domain'

const cellType = z.enum(['seat', 'aisle', 'blocked', 'empty'])
const numberingOrder = z.enum(['row-major', 'snake', 'col-major'])
const adjacency = z.enum(['orthogonal', 'all8'])
const strength = z.enum(['hard', 'soft'])
const tagValue = z.union([z.string(), z.number(), z.boolean()])

const cellSchema = z.object({
  type: cellType,
})

const numberingSchema = z.object({
  pattern: z.string(),
  order: numberingOrder,
  startAt: z.number().int().min(0).max(9999),
  pad: z.number().int().min(0).max(6),
})

const classroomSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    cols: z.number().int().min(1).max(60),
    rows: z.number().int().min(1).max(60),
    cells: z.array(cellSchema),
    numbering: numberingSchema,
    codeOverrides: z.record(z.string(), z.string()),
  })
  .superRefine((value, context) => {
    if (value.cells.length !== value.cols * value.rows) {
      context.addIssue({
        code: 'custom',
        message: '教室格子數量與欄列數不一致',
        path: ['cells'],
      })
    }
  })

const tagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['enum', 'number', 'boolean']),
  options: z.array(z.string()),
  color: z.string(),
})

const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  studentNo: z.string(),
  tags: z.record(z.string(), tagValue),
  extra: z.record(z.string(), z.string()),
  note: z.string(),
})

const rosterSchema = z.object({
  persons: z.array(personSchema),
  tags: z.array(tagSchema),
  extraColumns: z.array(z.string()),
})

const ruleBase = {
  id: z.string().min(1),
  enabled: z.boolean(),
  strength,
  weight: z.number().int().min(1).max(10),
  note: z.string(),
}

const separateRuleSchema = z.object({
  ...ruleBase,
  type: z.literal('separate'),
  tagId: z.string().min(1),
  values: z.array(z.string()),
  adjacency,
})

const togetherRuleSchema = z.object({
  ...ruleBase,
  type: z.literal('together'),
  tagId: z.string().min(1),
  values: z.array(z.string()),
  adjacency,
})

const positionRuleSchema = z.object({
  ...ruleBase,
  type: z.literal('position'),
  tagId: z.string().min(1),
  value: z.string(),
  position: z.enum(['front', 'back', 'left', 'right', 'aisle']),
  band: z.number().int().min(1).max(60),
})

const avoidRuleSchema = z.object({
  ...ruleBase,
  type: z.literal('avoid'),
  tagIdA: z.string().min(1),
  valueA: z.string(),
  tagIdB: z.string().min(1),
  valueB: z.string(),
  adjacency,
})

const pinRuleSchema = z.object({
  ...ruleBase,
  type: z.literal('pin'),
  personId: z.string().min(1),
  seatId: z.string().min(1),
})

const ruleSchema = z.discriminatedUnion('type', [
  separateRuleSchema,
  togetherRuleSchema,
  positionRuleSchema,
  avoidRuleSchema,
  pinRuleSchema,
])

const occupancySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('full') }),
  z.object({
    kind: z.literal('checkerboard'),
    phase: z.union([z.literal(0), z.literal(1), z.literal('auto')]),
  }),
])

const allocationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ordered'),
    orderBy: z.enum(['studentNo', 'name', 'import']),
    fill: numberingOrder,
  }),
  z.object({ kind: z.literal('random') }),
])

const violationSchema = z.object({
  ruleId: z.string(),
  severity: strength,
  message: z.string(),
  seatIds: z.array(z.string()),
  personIds: z.array(z.string()),
})

const assignmentSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  source: z.enum(['auto', 'manual']).optional(),
  seed: z.string(),
  inputRevision: z.string(),
  occupancy: occupancySchema,
  allocation: allocationSchema,
  assignments: z.record(z.string(), z.string()),
  unassignedPersonIds: z.array(z.string()),
  lockedPersonIds: z.array(z.string()),
  hardViolationCount: z.number().int().min(0),
  softCost: z.number(),
  timedOut: z.boolean(),
  violations: z.array(violationSchema),
  satisfiedCount: z.number().int().min(0),
  ruleCount: z.number().int().min(0),
})

const settingsSchema = z.object({
  display: z.enum(['name', 'studentNo', 'both', 'none']),
  adjacencyDefault: adjacency,
  cellSize: z.number().min(40).max(64),
  printShowTagColors: z.boolean(),
})

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  classroom: classroomSchema,
  roster: rosterSchema,
  rules: z.array(ruleSchema),
  lockedPersonIds: z.array(z.string()),
  currentAssignment: assignmentSchema.nullable(),
  settings: settingsSchema,
})

export type ProjectImportResult =
  | { ok: true; project: Project }
  | { ok: false; message: string }

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function parseProjectFile(text: string): ProjectImportResult {
  let value: unknown

  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, message: '無法解析 JSON，請確認檔案格式。' }
  }

  const parsed = projectSchema.safeParse(value)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.length ? issue.path.join('.') : '專案'

    return {
      ok: false,
      message: `專案檔格式不正確（${path}）：${issue?.message ?? '未知錯誤'}`,
    }
  }

  return { ok: true, project: parsed.data as Project }
}
