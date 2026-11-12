import type { Cell, CellType, Classroom } from '../../types/domain'
import { DEFAULT_NUMBERING } from '../classroom/classroomOps'

export interface ClassroomTemplate {
  id: string
  name: string
  description: string
  category: '排列' | '走道' | '分組'
  cols: number
  rows: number
  cells: CellType[]
}

function layout(
  cols: number,
  rows: number,
  seat: (row: number, col: number) => CellType,
): CellType[] {
  return Array.from({ length: rows * cols }, (_, index) =>
    seat(Math.floor(index / cols), index % cols),
  )
}

export const CLASSROOM_TEMPLATES: ClassroomTemplate[] = [
  {
    id: 'standard',
    name: '標準行列',
    description: '6 欄 × 5 列，全部為座位，適合一般教室。',
    category: '排列',
    cols: 6,
    rows: 5,
    cells: layout(6, 5, () => 'seat'),
  },
  {
    id: 'grouped',
    name: '分組座位',
    description: '8 欄 × 6 列，以兩條縱向走道分成三組。',
    category: '分組',
    cols: 8,
    rows: 6,
    cells: layout(8, 6, (_, col) => (col === 2 || col === 5 ? 'aisle' : 'seat')),
  },
  {
    id: 'u-shape',
    name: 'U 字型',
    description: '7 欄 × 5 列，沿教室外圍排列，中央保留活動空間。',
    category: '排列',
    cols: 7,
    rows: 5,
    cells: layout(7, 5, (row, col) =>
      row === 0 || row === 4 || col === 0 || col === 6 ? 'seat' : 'empty',
    ),
  },
  {
    id: 'exam',
    name: '考試分開',
    description: '6 欄 × 5 列，每隔一欄設走道，降低左右相鄰。',
    category: '走道',
    cols: 6,
    rows: 5,
    cells: layout(6, 5, (_, col) => (col % 2 === 1 ? 'aisle' : 'seat')),
  },
]

export function createClassroomFromTemplate(
  template: ClassroomTemplate,
): Classroom {
  return {
    id: crypto.randomUUID(),
    name: template.name,
    cols: template.cols,
    rows: template.rows,
    cells: template.cells.map<Cell>((type) => ({ type })),
    numbering: { ...DEFAULT_NUMBERING },
    codeOverrides: {},
  }
}

export function countTemplateCells(template: ClassroomTemplate): {
  seats: number
  aisles: number
  blocked: number
  empty: number
} {
  return template.cells.reduce(
    (counts, type) => {
      if (type === 'seat') counts.seats += 1
      if (type === 'aisle') counts.aisles += 1
      if (type === 'blocked') counts.blocked += 1
      if (type === 'empty') counts.empty += 1
      return counts
    },
    { seats: 0, aisles: 0, blocked: 0, empty: 0 },
  )
}
