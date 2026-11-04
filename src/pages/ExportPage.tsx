import { TabPlaceholder } from '../components/TabPlaceholder'

const formats = [
  {
    format: 'XLSX',
    title: '座位表與名單對照',
    detail: '含未分配人員',
  },
  {
    format: 'HTML',
    title: '唯讀列印頁',
    detail: 'A4 橫向、自包含',
  },
  {
    format: 'LINK',
    title: '分享連結',
    detail: '可選擇隱藏姓名',
  },
]

function ExportPreview() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {formats.map((item) => (
        <div className="flex items-center gap-3 px-1 py-3" key={item.format}>
          <span className="flex h-8 w-11 shrink-0 items-center justify-center border border-line bg-paper font-mono text-[9px] tracking-[0.1em] text-accent">
            {item.format}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">{item.title}</p>
            <p className="text-[9px] text-muted">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ExportPage() {
  return <TabPlaceholder id="export" preview={<ExportPreview />} />
}
