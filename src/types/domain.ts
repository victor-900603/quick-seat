export type CellType = 'seat' | 'aisle' | 'blocked' | 'empty'

export interface Cell {
  type: CellType
}

export type NumberingOrder = 'row-major' | 'snake' | 'col-major'

export interface SeatNumbering {
  /** 支援 {row}、{col}、{index} 佔位符。 */
  pattern: string
  order: NumberingOrder
  /** 起始序號，預設 1。 */
  startAt: number
  /** 補零位數，預設 0。 */
  pad: number
}

export interface Classroom {
  id: string
  name: string
  /** 欄數（左右）。 */
  cols: number
  /** 列數（前後），row 0 為最靠近講台。 */
  rows: number
  /** 長度為 rows * cols，索引為 row * cols + col。 */
  cells: Cell[]
  numbering: SeatNumbering
  /** seatId 對應自訂座位編號。 */
  codeOverrides: Record<string, string>
}

export type TagValueType = 'enum' | 'number' | 'boolean'

export interface TagDef {
  id: string
  name: string
  type: TagValueType
  /** enum 的選項；其他型別為空陣列。 */
  options: string[]
  /** 顯示色票。 */
  color: string
}

export interface Person {
  id: string
  name: string
  studentNo: string
  tags: Record<string, string | number | boolean>
  /** 未映射欄位的原始值。 */
  extra: Record<string, string>
  note: string
}

export interface Roster {
  persons: Person[]
  tags: TagDef[]
  /** 匯入時未映射的欄位名稱。 */
  extraColumns: string[]
}

export type Strength = 'hard' | 'soft'

export interface RuleBase {
  id: string
  enabled: boolean
  strength: Strength
  /** 1-10，僅軟約束使用。 */
  weight: number
  note: string
}

export interface SeparateRule extends RuleBase {
  type: 'separate'
  tagId: string
  /** 空陣列表示該標籤的所有值。 */
  values: string[]
  adjacency: Adjacency
}

export interface TogetherRule extends RuleBase {
  type: 'together'
  tagId: string
  values: string[]
  adjacency: Adjacency
}

export type PositionKind = 'front' | 'back' | 'left' | 'right' | 'aisle'

export interface PositionRule extends RuleBase {
  type: 'position'
  tagId: string
  value: string
  position: PositionKind
  /** front/back 為排數；left/right 為欄數；aisle 忽略。 */
  band: number
}

export interface AvoidRule extends RuleBase {
  type: 'avoid'
  tagIdA: string
  valueA: string
  tagIdB: string
  valueB: string
  adjacency: Adjacency
}

export interface PinRule extends RuleBase {
  type: 'pin'
  personId: string
  seatId: string
}

export type Rule =
  | SeparateRule
  | TogetherRule
  | PositionRule
  | AvoidRule
  | PinRule

export type Adjacency = 'orthogonal' | 'all8'

export type OccupancyMode =
  | { kind: 'full' }
  | { kind: 'checkerboard'; phase: 0 | 1 | 'auto' }

export type AllocationMode =
  | {
      kind: 'ordered'
      orderBy: 'studentNo' | 'name' | 'import'
      fill: NumberingOrder
    }
  | { kind: 'random' }

export interface RuleViolation {
  ruleId: string
  severity: Strength
  message: string
  seatIds: string[]
  personIds: string[]
}

export interface AssignmentResult {
  id: string
  createdAt: string
  seed: string
  /** 產生結果時的輸入版本。 */
  inputRevision: string
  occupancy: OccupancyMode
  allocation: AllocationMode
  /** seatId 對應 personId。 */
  assignments: Record<string, string>
  /** 當時未分配的人員。 */
  unassignedPersonIds: string[]
  /** 當時生效的鎖定。 */
  lockedPersonIds: string[]
  hardViolationCount: number
  softCost: number
  timedOut: boolean
  violations: RuleViolation[]
  satisfiedCount: number
  ruleCount: number
}

export interface ProjectSettings {
  display: 'name' | 'studentNo' | 'both' | 'none'
  adjacencyDefault: Adjacency
  /** 40-64 px。 */
  cellSize: number
  printShowTagColors: boolean
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  classroom: Classroom
  roster: Roster
  rules: Rule[]
  /** 鎖定意圖，不隨結果過期而遺失。 */
  lockedPersonIds: string[]
  currentAssignment: AssignmentResult | null
  settings: ProjectSettings
}

export interface SeatRef {
  /** 格式為 r{row}c{col}。 */
  id: string
  row: number
  col: number
  /** 由 numbering 或 codeOverrides 產生。 */
  code: string
}
