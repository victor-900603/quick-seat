import type {
  ExportContentOptions,
  ExportGridCell,
  ExportSnapshot,
} from './exportData'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  getExportPageDimensions,
  getExportRowsPerPage,
  getExportSeatContent,
  getExportTrackLayout,
  type ExportTrackLayout,
} from './exportData'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeColor(value: string): string {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : '#2f6b58'
}

function buildSeatCell(entry: ExportGridCell, options: ExportContentOptions) {
  if (entry.type === 'aisle') {
    return `<div class="cell aisle">${
      options.showAisleLabel ? '<span>走道</span>' : ''
    }</div>`
  }

  if (entry.type === 'blocked') {
    return '<div class="cell blocked"></div>'
  }

  if (entry.type === 'empty') {
    return '<div class="cell empty"></div>'
  }

  const seat = entry.seat

  if (!seat) {
    return '<div class="cell seat"></div>'
  }

  const content = getExportSeatContent(seat, options)
  const occupied = seat.person ? ' occupied' : ''

  return `<div class="cell seat${occupied} align-${options.align}"><div class="seat-text">${escapeHtml(
    content.text,
  )}</div></div>`
}

function buildSeatGrid(
  rows: ExportGridCell[][],
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  trackLayout: ExportTrackLayout,
  rowOffset: number,
) {
  const wrapClass = options.htmlWrap ? '' : ' no-wrap'
  const columnTemplate = trackLayout.columnWeights
    .map((weight) => `minmax(0, ${weight}fr)`)
    .join(' ')
  const rowsHtml = rows
    .map((row, index) => {
      const rowHeight =
        trackLayout.rowHeights[rowOffset + index] ?? options.htmlCellHeight

      return `<div class="grid-row" style="--row-height:${rowHeight}px">${row
        .map((entry) => buildSeatCell(entry, options))
        .join('')}</div>`
    })
    .join('')

  return `<div class="seat-grid${wrapClass}" style="--cols:${snapshot.cols};--grid-columns:${columnTemplate}">${rowsHtml}</div>`
}

function buildUnassigned(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
) {
  const items =
    snapshot.unassigned.length === 0
      ? '<p class="empty-note">所有名單人員皆已安排座位。</p>'
      : `<ul class="unassigned-list">${snapshot.unassigned
          .map((person) => {
            const tags = options.showTags
              ? person.tags
                  .map(
                    (tag) =>
                      `<span class="tag" style="--tag-color:${safeColor(
                        tag.color,
                      )}">${escapeHtml(tag.name)}：${escapeHtml(tag.value)}</span>`,
                  )
                  .join('')
              : ''
            const note =
              options.showNotes && person.note
                ? `<span class="note">${escapeHtml(person.note)}</span>`
                : ''

            return `<li><span class="unassigned-name">${escapeHtml(
              person.name,
            )}</span><span class="unassigned-no">${escapeHtml(
              person.studentNo || '未填座號',
            )}</span>${tags}${note}</li>`
          })
          .join('')}</ul>`

  return `<section class="unassigned"><h2 class="section-title">未分配人員</h2>${items}</section>`
}

function buildPageHeader(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
) {
  const title = options.showTitle
    ? `<div class="title-block"><p class="kicker">QUICKSEAT / SEATING PLAN</p><h1>${escapeHtml(
        snapshot.projectName,
      )}</h1></div>`
    : ''
  const stats = buildStats(snapshot, options)

  if (!title && !stats) {
    return ''
  }

  return `<header>${title}${stats}</header>`
}

function buildStats(snapshot: ExportSnapshot, options: ExportContentOptions) {
  if (!options.showStats) {
    return ''
  }

  return `<div class="header-stats" aria-label="座位統計"><div class="stat"><b>${snapshot.totalSeats}</b><span>座位</span></div><div class="stat"><b>${snapshot.assignedCount}</b><span>已分配</span></div><div class="stat"><b>${snapshot.unassignedCount}</b><span>未分配</span></div></div>`
}

function buildPageFooter(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  pageIndex: number,
  pageCount: number,
) {
  const pageNumber = options.showPageNumbers
    ? `<span>第 ${pageIndex + 1} / ${pageCount} 頁</span>`
    : ''
  const generatedAt = options.showGeneratedAt
    ? `<span>${escapeHtml(snapshot.generatedAt.slice(0, 10))}</span>`
    : ''
  const warning = snapshot.stale
    ? '<span class="badge warning">結果可能已過期</span>'
    : ''

  if (!options.showFooter && !pageNumber && !generatedAt && !warning) {
    return ''
  }

  const brand = options.showFooter
    ? '<span>QUICKSEAT / 座位表</span>'
    : '<span></span>'

  return `<footer>${brand}<div class="footer-meta">${generatedAt}${warning}${pageNumber}</div></footer>`
}

function buildPageClass(options: ExportContentOptions) {
  const classes = ['page']
  if (!options.showPageBorder) {
    classes.push('no-border')
  }
  if (options.marginMm > 0) {
    classes.push('has-margin')
  }
  return classes.join(' ')
}

function buildPage(
  snapshot: ExportSnapshot,
  options: ExportContentOptions,
  trackLayout: ExportTrackLayout,
  rows: ExportGridCell[][],
  rowOffset: number,
  pageIndex: number,
  pageCount: number,
  includeUnassigned = false,
  showHeader = true,
) {
  return `<section class="${buildPageClass(options)}"><div class="page-body">${
    showHeader
      ? `${buildPageHeader(snapshot, options)}${
          options.showStage ? '<div class="stage">講 台</div>' : ''
        }`
      : ''
  }${buildSeatGrid(rows, snapshot, options, trackLayout, rowOffset)}${
    includeUnassigned ? buildUnassigned(snapshot, options) : ''
  }</div>${buildPageFooter(snapshot, options, pageIndex, pageCount)}</section>`
}

export function countExportPages(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): number {
  const { effectiveRows } = getExportRowsPerPage(options)
  const gridPages = Math.max(1, Math.ceil(snapshot.grid.length / effectiveRows))
  const unassignedPage =
    options.showUnassigned && snapshot.unassigned.length > 0 ? 1 : 0

  return gridPages + unassignedPage
}

export function buildHtmlDocument(
  snapshot: ExportSnapshot,
  options: ExportContentOptions = DEFAULT_EXPORT_CONTENT_OPTIONS,
): string {
  const { effectiveRows } = getExportRowsPerPage(options)
  const chunks: ExportGridCell[][][] = []

  for (let index = 0; index < snapshot.grid.length; index += effectiveRows) {
    chunks.push(snapshot.grid.slice(index, index + effectiveRows))
  }

  if (chunks.length === 0) {
    chunks.push([])
  }

  const hasUnassignedPage =
    options.showUnassigned && snapshot.unassigned.length > 0
  const pageCount = countExportPages(snapshot, options)
  const paper = getExportPageDimensions(options)
  const trackLayout = getExportTrackLayout(snapshot, options)
  let rowOffset = 0
  const pages = chunks
    .map((rows, index) => {
      const page = buildPage(
        snapshot,
        options,
        trackLayout,
        rows,
        rowOffset,
        index,
        pageCount,
        false,
        index === 0 || options.repeatHeader,
      )
      rowOffset += rows.length
      return page
    })
    .join('')

  const unassignedPage = hasUnassignedPage
    ? `<section class="${buildPageClass(options)}"><div class="page-body">${
        options.repeatHeader
          ? buildPageHeader(snapshot, options)
          : ''
      }${buildUnassigned(snapshot, options)}</div>${buildPageFooter(
        snapshot,
        options,
        pageCount - 1,
        pageCount,
      )}</section>`
    : ''

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(snapshot.projectName)} 座位表</title>
<style>
:root {
  --paper: #f6f4ec;
  --surface: #fffdf7;
  --board: #173b32;
  --chalk: #f2f0e3;
  --ink: #1f2a26;
  --muted: #68736b;
  --line: #d8d5c7;
  --accent: #2f6b58;
  --accent-soft: #e2ebe5;
  --mark: #b8502f;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
body {
  font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  padding: 28px;
  font-size: 12px;
}
.pages { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.page {
  position: relative;
  width: var(--page-width, 210mm);
  height: var(--page-height, 297mm);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  padding: calc(var(--page-margin, 0mm) + 6mm) calc(var(--page-margin, 0mm) + 8mm);
  overflow: hidden;
}
.page.has-margin::before {
  content: "";
  position: absolute;
  inset: var(--page-margin);
  border: 2px dashed rgba(47, 107, 88, .5);
  pointer-events: none;
}
.page-body { flex: 1; min-height: 0; }
.page.no-border { border: 0; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; border-bottom: 2px solid var(--board); padding-bottom: 14px; }
.title-block { min-width: 0; }
.kicker { margin: 0; font: 600 9px/1.4 "IBM Plex Mono", monospace; letter-spacing: .24em; color: var(--muted); }
h1 { margin: 4px 0 0; font-family: "Noto Serif TC", serif; font-size: 26px; letter-spacing: .04em; }
.header-stats { display: flex; flex: none; align-items: flex-start; gap: 8px; margin-left: auto; }
.stat { border: 1px solid var(--line); padding: 7px 12px; background: var(--paper); }
.stat b { display: block; font-family: "IBM Plex Mono", monospace; font-size: 16px; font-weight: 500; color: var(--ink); }
.stat span { color: var(--muted); font-size: 9px; letter-spacing: .08em; white-space: nowrap; }
.badge { display: inline-block; border: 1px solid var(--line); padding: 2px 7px; font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: .08em; }
.badge.warning { border-color: #d7a58e; color: var(--mark); background: #fbf0ea; }
.stage { background: var(--board); color: var(--chalk); text-align: center; padding: 7px; font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: .28em; margin-bottom: var(--cell-gap, 5px); }
.seat-grid { display: flex; flex-direction: column; gap: var(--cell-gap, 5px); }
.grid-row { display: grid; grid-template-columns: var(--grid-columns, repeat(var(--cols), minmax(0, 1fr))); gap: var(--cell-gap, 5px); }
.cell { height: var(--row-height, var(--cell-height, 54px)); border: var(--border-width, 1px) solid var(--line); padding: 5px 5px 4px; position: relative; overflow: hidden; }
.cell.seat { background: var(--surface); display: flex; align-items: center; }
.cell.seat.occupied { background: var(--accent-soft); border-color: #b7cdc2; }
.cell.aisle { background: repeating-linear-gradient(135deg, #eeeade 0 5px, #e4dfd0 5px 6px); color: var(--muted); font-size: 9px; display: flex; align-items: center; justify-content: center; }
.cell.blocked { background: var(--board); border-color: var(--board); }
.cell.blocked::after { content: "×"; color: #7e9389; position: absolute; inset: 0; display: grid; place-items: center; font-size: 20px; }
.cell.empty { border-style: dashed; background: #faf8f0; }
.seat-text { width: 100%; white-space: pre-line; overflow-wrap: anywhere; font-size: var(--font-size, 11px); line-height: 1.35; text-align: center; }
.align-center .seat-text { text-align: center; }
.align-left .seat-text { text-align: left; }
.seat-grid.no-wrap .seat-text { white-space: pre; overflow-wrap: normal; }
.section-title { margin: 26px 0 8px; font-family: "Noto Serif TC", serif; font-size: 15px; border-bottom: 1px solid var(--line); padding-bottom: 5px; }
.unassigned-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.unassigned-list li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 7px; border: 1px solid var(--line); padding: 6px 8px; background: var(--paper); }
.unassigned-name { font-weight: 600; }
.unassigned-no { color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: 9px; }
.tag { border: 1px solid color-mix(in srgb, var(--tag-color) 35%, white); background: color-mix(in srgb, var(--tag-color) 10%, white); color: var(--tag-color); padding: 1px 5px; font-size: 9px; }
.note { color: var(--muted); font-size: 9px; margin-left: auto; overflow-wrap: anywhere; }
.empty-note { color: var(--muted); font-size: 11px; }
footer { margin-top: 22px; padding-top: 9px; border-top: 1px solid var(--line); color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: 8px; letter-spacing: .08em; display: flex; justify-content: space-between; gap: 10px; }
.footer-meta { display: flex; align-items: center; gap: 10px; margin-left: auto; }
@media print {
  @page { size: ${paper.cssSize}; margin: ${options.marginMm}mm; }
  html, body { background: #fff; }
  body { padding: 0; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pages { display: block; }
  .page.has-margin::before { display: none; }
  .page { width: 100%; height: calc(var(--print-page-height, 190mm) - 1mm); border: 1px solid var(--line); padding: 6mm 8mm; overflow: hidden; break-after: page; page-break-after: always; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .cell { height: var(--row-height, var(--cell-height, 54px)); }
  .unassigned-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
</head>
<body>
<main class="pages" style="--page-width:${paper.widthMm}mm;--page-height:${paper.heightMm}mm;--page-margin:${options.marginMm}mm;--print-page-height:${paper.printHeightMm}mm;--cell-height:${options.htmlCellHeight}px;--font-size:${options.htmlFontSize}px;--cell-gap:${options.cellGap}px;--border-width:${options.borderWidth}px">${pages}${unassignedPage}</main>
</body>
</html>`
}
