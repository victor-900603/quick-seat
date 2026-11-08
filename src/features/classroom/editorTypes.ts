import type { CellType } from '../../types/domain'

export type EditorTool =
  | 'select'
  | 'seat'
  | 'aisle-row'
  | 'aisle-col'
  | 'blocked'
  | 'empty'
  | 'rect'

export interface ToolDefinition {
  id: EditorTool
  label: string
  shortcut: string
  description: string
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'select',
    label: '選取',
    shortcut: '1',
    description: '選取格子並查看屬性',
  },
  {
    id: 'seat',
    label: '座位',
    shortcut: '2',
    description: '將格子設為可坐座位',
  },
  {
    id: 'aisle-row',
    label: '橫向走道',
    shortcut: '3',
    description: '點一格，將整列設為走道',
  },
  {
    id: 'aisle-col',
    label: '縱向走道',
    shortcut: '4',
    description: '點一格，將整欄設為走道',
  },
  {
    id: 'blocked',
    label: '禁坐',
    shortcut: '5',
    description: '將格子設為禁止就坐',
  },
  {
    id: 'empty',
    label: '清除',
    shortcut: '6',
    description: '將格子清為空白',
  },
  {
    id: 'rect',
    label: '矩形',
    shortcut: '7',
    description: '拖曳框選矩形範圍並批次填入',
  },
]

export const PAINT_TOOLS: EditorTool[] = ['seat', 'blocked', 'empty']

export const CELL_TYPE_LABELS: Record<CellType, string> = {
  seat: '座位',
  aisle: '走道',
  blocked: '禁坐',
  empty: '空白',
}

export function isPaintTool(
  tool: EditorTool,
): tool is 'seat' | 'blocked' | 'empty' {
  return PAINT_TOOLS.includes(tool)
}
