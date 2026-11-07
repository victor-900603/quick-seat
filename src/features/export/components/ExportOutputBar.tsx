interface ExportOutputBarProps {
  assignedCount: number
  busy: 'xlsx' | 'html' | 'json' | null
  hasAssignment: boolean
  stale: boolean
  totalSeats: number
  onHtml: () => void
  onPrint: () => void
  onWorkbook: () => void
}

export function ExportOutputBar({
  assignedCount,
  busy,
  hasAssignment,
  stale,
  totalSeats,
  onHtml,
  onPrint,
  onWorkbook,
}: ExportOutputBarProps) {
  return (
    <div className="border-t border-line bg-paper/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[9px] leading-4 tracking-[0.1em] text-muted">
          {stale ? '結果可能已過期' : `${totalSeats} 個座位 / ${assignedCount} 位已分配`}
        </p>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            className="border border-accent/35 bg-surface px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!hasAssignment || busy !== null}
            onClick={onWorkbook}
            type="button"
          >
            {busy === 'xlsx' ? '產生中…' : '下載 Excel'}
          </button>
          <button
            className="border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!hasAssignment || busy !== null}
            onClick={onHtml}
            type="button"
          >
            {busy === 'html' ? '產生中…' : '下載 HTML'}
          </button>
          <button
            className="col-span-2 border border-mark bg-mark px-3 py-2 text-xs font-medium text-chalk transition-colors hover:bg-mark/90 disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-1"
            disabled={!hasAssignment || busy !== null}
            onClick={onPrint}
            type="button"
          >
            預覽 / 列印 PDF
          </button>
        </div>
      </div>
    </div>
  )
}
