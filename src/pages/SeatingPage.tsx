import { TabPlaceholder } from '../components/TabPlaceholder'

interface PreviewSeat {
  name?: string
  aisle?: boolean
}

const seats: PreviewSeat[] = [
  { name: '林品妤' },
  { name: '陳柏宇' },
  { aisle: true },
  { name: '張家瑄' },
  { name: '吳承翰' },
  { name: '黃郁婷' },
  { name: '王小明' },
  { name: '李雅婷' },
  { aisle: true },
  { name: '周子晴' },
  { name: '許哲瑋' },
  { name: '鄭羽彤' },
  { name: '林冠廷' },
  { name: '高語安' },
  { aisle: true },
  { name: '潘柏勳' },
  { name: '蔡宜蓁' },
  {},
  { name: '楊承恩' },
  { name: '謝欣妤' },
  { aisle: true },
  { name: '宋品妍' },
  {},
  {},
]

function SeatingPreview() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between font-mono text-[9px] text-muted">
        <span>連續座位</span>
        <span>依座號排序</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {seats.map((seat, index) => {
          if (seat.aisle) {
            return (
              <div
                className="aspect-square border border-dashed border-line"
                key={`aisle-${index}`}
              />
            )
          }

          if (!seat.name) {
            return (
              <div
                className="aspect-square border border-line/70 bg-paper"
                key={`empty-${index}`}
              />
            )
          }

          return (
            <div
              className="flex aspect-square items-center justify-center border border-accent/30 bg-accent-soft px-0.5 text-center text-[9px] leading-tight text-ink"
              key={seat.name}
            >
              {seat.name}
            </div>
          )
        })}
      </div>
      <div className="mt-4 border-t border-line pt-3 font-mono text-[9px] text-muted">
        已分配 19 / 21 個座位
      </div>
    </div>
  )
}

export function SeatingPage() {
  return <TabPlaceholder id="seating" preview={<SeatingPreview />} />
}
