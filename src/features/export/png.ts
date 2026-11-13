import type {
  ExportContentOptions,
  ExportGridCell,
  ExportSnapshot,
} from './exportData'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  formatGeneratedAt,
  getExportPageDimensions,
  getExportSeatContent,
  getExportTrackLayout,
} from './exportData'

export const PNG_EXPORT_SCALE = 2

export const PNG_COLORS = {
  board: '#173b32',
  chalk: '#f2f0e3',
  paper: '#f6f4ec',
  surface: '#fffdf7',
  ink: '#1f2a26',
  muted: '#68736b',
  line: '#d8d5c7',
  accentSoft: '#e2ebe5',
  mark: '#b8502f',
  aisle: '#e7e4d7',
  aisleLine: '#d5d0c0',
  blocked: '#1f2a26',
  blockedMark: '#7e9389',
  empty: '#faf8f0',
} as const

const FONT_FAMILY = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'
const MONO_FAMILY = '"IBM Plex Mono", "Consolas", monospace'

const PAGE_PADDING = 40
const HEADER_TITLE_HEIGHT = 58
const HEADER_STATS_HEIGHT = 46
const HEADER_GAP = 26
const STAT_BOX_WIDTH = 88
const STAT_BOX_HEIGHT = 46
const STAT_GAP = 8
const STAGE_HEIGHT = 36
const STAGE_GAP = 12
const GRID_GAP = 24
const LEGEND_HEIGHT = 24
const FOOTER_HEIGHT = 26
const CELL_PADDING = 6
const CELL_LINE_HEIGHT = 1.35
const MIN_ROW_HEIGHT = 18
const LEGEND_SWATCH = 14

interface PngRect {
  x: number
  y: number
  width: number
  height: number
}

interface PngLayout {
  width: number
  height: number
  contentWidth: number
  header: { top: number; height: number }
  stage: PngRect | null
  grid: {
    rows: Array<{ y: number; height: number }>
    columns: Array<{ x: number; width: number }>
  }
  legend: { top: number; height: number }
  footer: { top: number; height: number; visible: boolean }
}

export function getPngLogicalWidth(
  options: Pick<ExportContentOptions, 'paperSize' | 'orientation'>,
): number {
  return getExportPageDimensions({ ...options, marginMm: 0 }).widthPx
}

function computeLayout(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
): PngLayout {
  const width = getPngLogicalWidth(options)
  const contentWidth = width - PAGE_PADDING * 2
  const statsHeight = options.showStats
    ? HEADER_STATS_HEIGHT + (snapshot.stale ? 18 : 0)
    : 0
  const titleHeight = options.showTitle ? HEADER_TITLE_HEIGHT : 0
  const headerContent = Math.max(titleHeight, statsHeight)
  const headerHeight = headerContent > 0 ? headerContent + HEADER_GAP : 0
  const header = { top: PAGE_PADDING, height: headerHeight }
  let cursor = PAGE_PADDING + headerHeight

  const stage = options.showStage
    ? {
        x: PAGE_PADDING,
        y: cursor,
        width: contentWidth,
        height: STAGE_HEIGHT,
      }
    : null

  if (stage) {
    cursor += STAGE_HEIGHT + STAGE_GAP
  }

  const track = getExportTrackLayout(snapshot, options)
  const cols = Math.max(snapshot.cols, 1)
  const gap = Math.max(0, options.cellGap)
  const weights = Array.from(
    { length: cols },
    (_, index) => track.columnWeights[index] ?? 1,
  )
  const weightTotal =
    weights.reduce((total, weight) => total + weight, 0) || 1
  const unit = Math.max(
    4,
    (contentWidth - gap * (cols - 1)) / weightTotal,
  )
  const columns: Array<{ x: number; width: number }> = []
  let columnX = PAGE_PADDING

  for (const weight of weights) {
    const columnWidth = unit * weight

    columns.push({ x: columnX, width: columnWidth })
    columnX += columnWidth + gap
  }

  const rows: Array<{ y: number; height: number }> = []
  let rowY = cursor

  for (let index = 0; index < snapshot.grid.length; index += 1) {
    const height = Math.max(
      MIN_ROW_HEIGHT,
      track.rowHeights[index] ?? options.htmlCellHeight,
    )

    rows.push({ y: rowY, height })
    rowY += height + gap
  }

  const gridHeight = rows.length > 0 ? rowY - gap - cursor : 0
  cursor += gridHeight

  const legendTop = cursor + (gridHeight > 0 ? GRID_GAP : 0)
  cursor = legendTop + LEGEND_HEIGHT

  const footerVisible =
    options.showFooter || options.showGeneratedAt || snapshot.stale
  const footer = {
    top: cursor + 12,
    height: footerVisible ? FOOTER_HEIGHT : 0,
    visible: footerVisible,
  }

  return {
    height: footer.top + footer.height + PAGE_PADDING,
    width,
    contentWidth,
    header,
    stage,
    grid: { rows, columns },
    legend: { top: legendTop, height: LEGEND_HEIGHT },
    footer,
  }
}

export function getPngLayoutSize(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): { width: number; height: number } {
  const layout = computeLayout(snapshot, options)

  return { width: layout.width, height: layout.height }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }

  let fitted = ''

  for (const char of Array.from(text)) {
    if (ctx.measureText(`${fitted}${char}…`).width > maxWidth) {
      break
    }

    fitted += char
  }

  return fitted ? `${fitted}…` : '…'
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  wrap: boolean,
): string[] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    if (!wrap) {
      lines.push(paragraph)
      continue
    }

    if (paragraph === '') {
      lines.push('')
      continue
    }

    let line = ''

    for (const char of Array.from(paragraph)) {
      const next = `${line}${char}`

      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line)
        line = char
      } else {
        line = next
      }
    }

    lines.push(line)
  }

  return lines
}

function drawSeatText(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: ExportContentOptions,
  rect: PngRect,
): void {
  const fontSize = Math.max(6, options.htmlFontSize)
  const lineHeight = fontSize * CELL_LINE_HEIGHT

  ctx.fillStyle = PNG_COLORS.ink
  ctx.font = `500 ${fontSize}px ${FONT_FAMILY}`
  ctx.textAlign = options.align === 'center' ? 'center' : 'left'
  ctx.textBaseline = 'middle'

  const lines = wrapText(
    ctx,
    text,
    Math.max(1, rect.width - CELL_PADDING * 2),
    options.htmlWrap,
  )
  const maxLines = Math.max(
    1,
    Math.floor((rect.height - CELL_PADDING * 2) / lineHeight),
  )
  const visible = lines.slice(0, maxLines)
  const startY =
    rect.y + rect.height / 2 - (visible.length * lineHeight) / 2 + lineHeight / 2
  const textX =
    options.align === 'center'
      ? rect.x + rect.width / 2
      : rect.x + CELL_PADDING

  visible.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight)
  })
}

function drawAisleLines(
  ctx: CanvasRenderingContext2D,
  rect: PngRect,
): void {
  const step = 9

  ctx.strokeStyle = PNG_COLORS.aisleLine
  ctx.lineWidth = 1

  for (let offset = -rect.height; offset < rect.width; offset += step) {
    ctx.beginPath()
    ctx.moveTo(rect.x + offset, rect.y + rect.height)
    ctx.lineTo(rect.x + offset + rect.height, rect.y)
    ctx.stroke()
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  entry: ExportGridCell,
  options: ExportContentOptions,
  rect: PngRect,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  ctx.clip()

  if (entry.type === 'aisle') {
    ctx.fillStyle = PNG_COLORS.aisle
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    drawAisleLines(ctx, rect)

    if (options.showAisleLabel) {
      ctx.fillStyle = PNG_COLORS.muted
      ctx.font = `9px ${FONT_FAMILY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        '走道',
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      )
    }
  } else if (entry.type === 'blocked') {
    ctx.fillStyle = PNG_COLORS.blocked
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.fillStyle = PNG_COLORS.blockedMark
    ctx.font = `300 20px ${FONT_FAMILY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      '×',
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    )
  } else if (entry.type === 'empty') {
    ctx.fillStyle = PNG_COLORS.empty
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

    if (options.borderWidth > 0) {
      ctx.strokeStyle = PNG_COLORS.line
      ctx.lineWidth = options.borderWidth
      ctx.setLineDash([6, 4])
      ctx.strokeRect(
        rect.x + options.borderWidth / 2,
        rect.y + options.borderWidth / 2,
        rect.width - options.borderWidth,
        rect.height - options.borderWidth,
      )
      ctx.setLineDash([])
    }
  } else {
    const seat = entry.seat

    ctx.fillStyle = seat?.person
      ? PNG_COLORS.accentSoft
      : PNG_COLORS.surface
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

    if (options.borderWidth > 0) {
      ctx.strokeStyle = PNG_COLORS.line
      ctx.lineWidth = options.borderWidth
      ctx.strokeRect(
        rect.x + options.borderWidth / 2,
        rect.y + options.borderWidth / 2,
        rect.width - options.borderWidth,
        rect.height - options.borderWidth,
      )
    }

    if (seat) {
      drawSeatText(
        ctx,
        getExportSeatContent(seat, options).text,
        options,
        rect,
      )
    }
  }

  ctx.restore()
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  layout: PngLayout,
): void {
  if (layout.header.height === 0) {
    return
  }

  const { top } = layout.header
  const statsWidth = options.showStats
    ? STAT_BOX_WIDTH * 3 + STAT_GAP * 2
    : 0

  if (options.showTitle) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = PNG_COLORS.muted
    ctx.font = `600 10px ${MONO_FAMILY}`
    ctx.fillText('QUICKSEAT / SEATING PLAN', PAGE_PADDING, top + 2)

    ctx.fillStyle = PNG_COLORS.ink
    ctx.font = `600 30px ${FONT_FAMILY}`
    ctx.fillText(
      fitText(
        ctx,
        snapshot.projectName,
        layout.contentWidth - (statsWidth > 0 ? statsWidth + 24 : 0),
      ),
      PAGE_PADDING,
      top + 20,
    )
  }

  if (options.showStats) {
    const stats = [
      { label: '座位', value: snapshot.totalSeats },
      { label: '已分配', value: snapshot.assignedCount },
      { label: '未分配', value: snapshot.unassignedCount },
    ]
    let statX = layout.width - PAGE_PADDING - statsWidth

    for (const stat of stats) {
      ctx.fillStyle = PNG_COLORS.paper
      ctx.fillRect(statX, top, STAT_BOX_WIDTH, STAT_BOX_HEIGHT)
      ctx.strokeStyle = PNG_COLORS.line
      ctx.lineWidth = 1
      ctx.strokeRect(
        statX + 0.5,
        top + 0.5,
        STAT_BOX_WIDTH - 1,
        STAT_BOX_HEIGHT - 1,
      )
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = PNG_COLORS.ink
      ctx.font = `500 16px ${MONO_FAMILY}`
      ctx.fillText(String(stat.value), statX + 12, top + 8)
      ctx.fillStyle = PNG_COLORS.muted
      ctx.font = `9px ${FONT_FAMILY}`
      ctx.fillText(stat.label, statX + 12, top + 30)
      statX += STAT_BOX_WIDTH + STAT_GAP
    }

    if (snapshot.stale) {
      ctx.fillStyle = PNG_COLORS.mark
      ctx.font = `9px ${FONT_FAMILY}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(
        '結果可能已過期',
        layout.width - PAGE_PADDING,
        top + STAT_BOX_HEIGHT + 6,
      )
    }
  }

  ctx.strokeStyle = PNG_COLORS.board
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAGE_PADDING, top + layout.header.height - 10)
  ctx.lineTo(layout.width - PAGE_PADDING, top + layout.header.height - 10)
  ctx.stroke()
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  layout: PngLayout,
): void {
  if (!layout.stage) {
    return
  }

  const { x, y, width, height } = layout.stage

  ctx.fillStyle = PNG_COLORS.board
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = PNG_COLORS.chalk
  ctx.font = `600 12px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('講 台', x + width / 2, y + height / 2)
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  layout: PngLayout,
): void {
  const { rows, columns } = layout.grid

  snapshot.grid.forEach((line, rowIndex) => {
    const row = rows[rowIndex]

    if (!row) {
      return
    }

    line.forEach((entry, columnIndex) => {
      const column = columns[columnIndex]

      if (!column) {
        return
      }

      drawCell(ctx, entry, options, {
        x: column.x,
        y: row.y,
        width: column.width,
        height: row.height,
      })
    })
  })
}

function drawLegendSwatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  kind: 'occupied' | 'seat' | 'aisle' | 'blocked' | 'empty',
): void {
  const y = centerY - LEGEND_SWATCH / 2

  if (kind === 'blocked') {
    ctx.fillStyle = PNG_COLORS.blocked
    ctx.fillRect(x, y, LEGEND_SWATCH, LEGEND_SWATCH)
    return
  }

  ctx.fillStyle =
    kind === 'occupied'
      ? PNG_COLORS.accentSoft
      : kind === 'aisle'
        ? PNG_COLORS.aisle
        : kind === 'empty'
          ? PNG_COLORS.empty
          : PNG_COLORS.surface
  ctx.fillRect(x, y, LEGEND_SWATCH, LEGEND_SWATCH)
  ctx.strokeStyle = PNG_COLORS.line
  ctx.lineWidth = 1

  if (kind === 'empty') {
    ctx.setLineDash([3, 2])
  }

  ctx.strokeRect(x + 0.5, y + 0.5, LEGEND_SWATCH - 1, LEGEND_SWATCH - 1)

  if (kind === 'empty') {
    ctx.setLineDash([])
  }
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  layout: PngLayout,
): void {
  const centerY = layout.legend.top + layout.legend.height / 2

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = PNG_COLORS.ink
  ctx.font = `600 10px ${FONT_FAMILY}`
  ctx.fillText('圖例', PAGE_PADDING, centerY)

  let x = PAGE_PADDING + ctx.measureText('圖例').width + 18
  const items: Array<{
    label: string
    kind: 'occupied' | 'seat' | 'aisle' | 'blocked' | 'empty'
  }> = [
    { label: '已分配座位', kind: 'occupied' },
    { label: '空座位', kind: 'seat' },
    { label: '走道', kind: 'aisle' },
    { label: '禁坐', kind: 'blocked' },
    { label: '空白', kind: 'empty' },
  ]

  for (const item of items) {
    drawLegendSwatch(ctx, x, centerY, item.kind)
    x += LEGEND_SWATCH + 6

    ctx.fillStyle = PNG_COLORS.muted
    ctx.font = `10px ${FONT_FAMILY}`
    ctx.textAlign = 'left'
    ctx.fillText(item.label, x, centerY)
    x += ctx.measureText(item.label).width + 20
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  layout: PngLayout,
): void {
  if (!layout.footer.visible) {
    return
  }

  const centerY = layout.footer.top + layout.footer.height / 2

  ctx.textBaseline = 'middle'

  if (options.showFooter) {
    ctx.fillStyle = PNG_COLORS.muted
    ctx.font = `10px ${MONO_FAMILY}`
    ctx.textAlign = 'left'
    ctx.fillText('QUICKSEAT / 座位表', PAGE_PADDING, centerY)
  }

  const meta: string[] = []

  if (options.showGeneratedAt) {
    meta.push(formatGeneratedAt(snapshot.generatedAt))
  }

  if (snapshot.stale) {
    meta.push('結果可能已過期')
  }

  if (meta.length > 0) {
    ctx.fillStyle = snapshot.stale ? PNG_COLORS.mark : PNG_COLORS.muted
    ctx.font = `10px ${FONT_FAMILY}`
    ctx.textAlign = 'right'
    ctx.fillText(
      meta.join(' · '),
      layout.width - PAGE_PADDING,
      centerY,
    )
  }
}

function drawPng(
  ctx: CanvasRenderingContext2D,
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  layout: PngLayout,
): void {
  ctx.fillStyle = PNG_COLORS.paper
  ctx.fillRect(0, 0, layout.width, layout.height)

  drawHeader(ctx, snapshot, options, layout)
  drawStage(ctx, layout)
  drawGrid(ctx, snapshot, options, layout)
  drawLegend(ctx, layout)
  drawFooter(ctx, snapshot, options, layout)
}

export async function createPngBlob(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): Promise<Blob> {
  const layout = computeLayout(snapshot, options)
  const canvas = document.createElement('canvas')

  canvas.width = Math.round(layout.width * PNG_EXPORT_SCALE)
  canvas.height = Math.round(layout.height * PNG_EXPORT_SCALE)

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('瀏覽器不支援 Canvas 2D，無法產生 PNG。')
  }

  context.scale(PNG_EXPORT_SCALE, PNG_EXPORT_SCALE)
  drawPng(context, snapshot, options, layout)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('無法產生 PNG 圖檔。'))
    }, 'image/png')
  })
}
