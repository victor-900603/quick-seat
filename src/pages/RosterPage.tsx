import { TabPlaceholder } from '../components/TabPlaceholder'

const students = [
  { name: '林品妤', no: 'A01', tag: '數學 A' },
  { name: '陳柏宇', no: 'A02', tag: '英文 B' },
  { name: '張家瑄', no: 'A03', tag: '數學 A' },
  { name: '吳承翰', no: 'A04', tag: '學習扶助' },
  { name: '黃郁婷', no: 'A05', tag: '英文 B' },
]

function RosterPreview() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {students.map((student) => (
        <div
          className="flex items-center gap-3 px-1 py-2.5"
          key={student.no}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft font-mono text-[10px] text-accent">
            {student.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink">{student.name}</p>
            <p className="font-mono text-[9px] text-muted">{student.no}</p>
          </div>
          <span className="border border-line bg-paper px-1.5 py-0.5 text-[9px] text-muted">
            {student.tag}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between px-1 py-2.5">
        <span className="text-[10px] text-muted">另有 23 位學生</span>
        <span className="font-mono text-[9px] tracking-[0.15em] text-muted">
          XLSX / CSV
        </span>
      </div>
    </div>
  )
}

export function RosterPage() {
  return <TabPlaceholder id="roster" preview={<RosterPreview />} />
}
