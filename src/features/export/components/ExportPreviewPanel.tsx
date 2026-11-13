import type {
  ExportOrientation,
  ExportPageDimensions,
  ExportPaperSize,
} from '../exportData'
import { HtmlPagePreview } from '../HtmlPagePreview'
import { ExportOutputBar } from './ExportOutputBar'

interface ExportPreviewPanelProps {
  assignedCount: number
  busy: 'xlsx' | 'html' | 'json' | 'png' | null
  hasAssignment: boolean
  html: string
  marginMm: number
  orientation: ExportOrientation
  pageCount: number
  paper: ExportPageDimensions
  paperSize: ExportPaperSize
  stale: boolean
  totalSeats: number
  onHtml: () => void
  onOpenFullPreview: () => void
  onOrientationChange: (value: ExportOrientation) => void
  onPaperSizeChange: (value: ExportPaperSize) => void
  onPrint: () => void
  onPng: () => void
  onWorkbook: () => void
}

export function ExportPreviewPanel({
  assignedCount,
  busy,
  hasAssignment,
  html,
  marginMm,
  orientation,
  pageCount,
  paper,
  paperSize,
  stale,
  totalSeats,
  onHtml,
  onOpenFullPreview,
  onOrientationChange,
  onPaperSizeChange,
  onPrint,
  onPng,
  onWorkbook,
}: ExportPreviewPanelProps) {
  return (
    <section
      aria-labelledby="export-preview-title"
      className="min-w-0 border border-line bg-surface"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-board/[0.035] px-4 py-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-accent">
            LIVE PREVIEW
          </p>
          <h3
            className="mt-0.5 text-sm font-medium text-ink"
            id="export-preview-title"
          >
            即時預覽
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
            <span className="font-mono text-[9px] tracking-[0.1em]">紙張</span>
            <select
              className="border border-line bg-surface px-2 py-1.5 text-[10px] text-ink outline-none focus:border-accent"
              id="export-paper-size"
              onChange={(event) =>
                onPaperSizeChange(event.target.value as ExportPaperSize)
              }
              value={paperSize}
            >
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="Letter">Letter</option>
            </select>
          </label>
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
            <span className="font-mono text-[9px] tracking-[0.1em]">方向</span>
            <select
              className="border border-line bg-surface px-2 py-1.5 text-[10px] text-ink outline-none focus:border-accent"
              id="export-orientation"
              onChange={(event) =>
                onOrientationChange(event.target.value as ExportOrientation)
              }
              value={orientation}
            >
              <option value="landscape">橫向</option>
              <option value="portrait">直向</option>
            </select>
          </label>
          <button
            className="shrink-0 whitespace-nowrap border border-line bg-surface px-2.5 py-1.5 text-[10px] text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={onOpenFullPreview}
            type="button"
          >
            放大預覽
          </button>
        </div>
      </div>

      <div className="bg-board/[0.045] p-3 sm:p-4">
        <div className="max-h-[68vh] overflow-auto border border-line/80 bg-paper/55 p-3 [scrollbar-gutter:stable]">
          <HtmlPagePreview html={html} pageWidth={paper.widthPx} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] tracking-[0.08em] text-muted">
          <span>
            {paper.label} · {paper.widthMm} × {paper.heightMm} mm · {pageCount}{' '}
            頁
          </span>
          <span>
            {marginMm > 0 ? '虛線為紙張邊界 · ' : ''}依容器等比例縮放
          </span>
        </div>
      </div>

      <ExportOutputBar
        assignedCount={assignedCount}
        busy={busy}
        hasAssignment={hasAssignment}
        onHtml={onHtml}
        onPrint={onPrint}
        onPng={onPng}
        onWorkbook={onWorkbook}
        stale={stale}
        totalSeats={totalSeats}
      />
    </section>
  )
}
