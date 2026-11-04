import type { CellType } from '../types/domain'
import { TabPlaceholder } from '../components/TabPlaceholder'

interface PreviewCell {
  type: CellType
  code?: string
}

const cells: PreviewCell[] = [
  { type: 'seat', code: '01' },
  { type: 'seat', code: '02' },
  { type: 'aisle' },
  { type: 'seat', code: '03' },
  { type: 'seat', code: '04' },
  { type: 'blocked' },
  { type: 'seat', code: '05' },
  { type: 'seat', code: '06' },
  { type: 'aisle' },
  { type: 'seat', code: '07' },
  { type: 'seat', code: '08' },
  { type: 'blocked' },
  { type: 'seat', code: '09' },
  { type: 'seat', code: '10' },
  { type: 'aisle' },
  { type: 'seat', code: '11' },
  { type: 'seat', code: '12' },
  { type: 'seat', code: '13' },
  { type: 'seat', code: '14' },
  { type: 'seat', code: '15' },
  { type: 'aisle' },
  { type: 'seat', code: '16' },
  { type: 'seat', code: '17' },
  { type: 'seat', code: '18' },
]

const cellClass: Record<CellType, string> = {
  seat: 'border border-accent/35 bg-accent-soft text-accent',
  aisle: 'border border-dashed border-line bg-transparent',
  blocked: 'border border-ink/70 bg-ink/85',
  empty: 'border border-line/70 bg-paper',
}

function ClassroomPreview() {
  return (
    <div>
      <div className="mb-3 border border-board bg-board py-1 text-center font-mono text-[9px] tracking-[0.4em] text-chalk">
        講台
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((cell, index) => (
          <div
            className={`flex aspect-square items-center justify-center rounded-[2px] font-mono text-[9px] ${cellClass[cell.type]}`}
            key={`${cell.type}-${index}`}
          >
            {cell.code}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[9px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border border-accent/35 bg-accent-soft" />
          座位
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border border-dashed border-line" />
          走道
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-ink/85" />
          禁坐
        </span>
      </div>
    </div>
  )
}

export function LayoutPage() {
  return <TabPlaceholder id="classroom" preview={<ClassroomPreview />} />
}
