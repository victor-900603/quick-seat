import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  EXPORT_LAYOUT_LIMITS,
  type ExportContentOptions,
} from './exportData'

export const EXPORT_OPTIONS_KEY = 'quick-seat:v1:export-options'

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readPaperSize(
  value: unknown,
  fallback: ExportContentOptions['paperSize'],
): ExportContentOptions['paperSize'] {
  return value === 'A4' || value === 'A3' || value === 'Letter'
    ? value
    : fallback
}

function readOrientation(
  value: unknown,
  fallback: ExportContentOptions['orientation'],
): ExportContentOptions['orientation'] {
  return value === 'landscape' || value === 'portrait' ? value : fallback
}

function readHiddenColumns(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function loadExportOptions(
  storage: Storage | null = getStorage(),
): ExportContentOptions {
  if (!storage) {
    return DEFAULT_EXPORT_CONTENT_OPTIONS
  }

  try {
    const raw = storage.getItem(EXPORT_OPTIONS_KEY)

    if (!raw) {
      return DEFAULT_EXPORT_CONTENT_OPTIONS
    }

    const parsed = JSON.parse(raw) as Partial<ExportContentOptions>

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_EXPORT_CONTENT_OPTIONS
    }

    const defaults = DEFAULT_EXPORT_CONTENT_OPTIONS

    return {
      template:
        typeof parsed.template === 'string' ? parsed.template : defaults.template,
      align:
        parsed.align === 'left' || parsed.align === 'center'
          ? parsed.align
          : defaults.align,
      htmlCellHeight: clampNumber(
        parsed.htmlCellHeight,
        defaults.htmlCellHeight,
        EXPORT_LAYOUT_LIMITS.htmlCellHeight.min,
        EXPORT_LAYOUT_LIMITS.htmlCellHeight.max,
      ),
      htmlFontSize: clampNumber(
        parsed.htmlFontSize,
        defaults.htmlFontSize,
        EXPORT_LAYOUT_LIMITS.htmlFontSize.min,
        EXPORT_LAYOUT_LIMITS.htmlFontSize.max,
      ),
      htmlWrap: readBoolean(parsed.htmlWrap, defaults.htmlWrap),
      paperSize: readPaperSize(parsed.paperSize, defaults.paperSize),
      orientation: readOrientation(parsed.orientation, defaults.orientation),
      marginMm: clampNumber(
        parsed.marginMm,
        defaults.marginMm,
        EXPORT_LAYOUT_LIMITS.marginMm.min,
        EXPORT_LAYOUT_LIMITS.marginMm.max,
      ),
      rowsPerPage: clampNumber(
        parsed.rowsPerPage,
        defaults.rowsPerPage,
        EXPORT_LAYOUT_LIMITS.rowsPerPage.min,
        EXPORT_LAYOUT_LIMITS.rowsPerPage.max,
      ),
      showPageNumbers: readBoolean(
        parsed.showPageNumbers,
        defaults.showPageNumbers,
      ),
      showPageBorder: readBoolean(
        parsed.showPageBorder,
        defaults.showPageBorder,
      ),
      repeatHeader: readBoolean(parsed.repeatHeader, defaults.repeatHeader),
      showTitle: readBoolean(parsed.showTitle, defaults.showTitle),
      showStats: readBoolean(parsed.showStats, defaults.showStats),
      showStage: readBoolean(parsed.showStage, defaults.showStage),
      showUnassigned: readBoolean(
        parsed.showUnassigned,
        defaults.showUnassigned,
      ),
      showFooter: readBoolean(parsed.showFooter, defaults.showFooter),
      showGeneratedAt: readBoolean(
        parsed.showGeneratedAt,
        defaults.showGeneratedAt,
      ),
      showNotes: readBoolean(parsed.showNotes, defaults.showNotes),
      showTags: readBoolean(parsed.showTags, defaults.showTags),
      showAisleLabel: readBoolean(
        parsed.showAisleLabel,
        defaults.showAisleLabel,
      ),
      cellGap: clampNumber(
        parsed.cellGap,
        defaults.cellGap,
        EXPORT_LAYOUT_LIMITS.cellGap.min,
        EXPORT_LAYOUT_LIMITS.cellGap.max,
      ),
      borderWidth: clampNumber(
        parsed.borderWidth,
        defaults.borderWidth,
        EXPORT_LAYOUT_LIMITS.borderWidth.min,
        EXPORT_LAYOUT_LIMITS.borderWidth.max,
      ),
      unusedColumnWidth: clampNumber(
        parsed.unusedColumnWidth,
        defaults.unusedColumnWidth,
        EXPORT_LAYOUT_LIMITS.unusedColumnWidth.min,
        EXPORT_LAYOUT_LIMITS.unusedColumnWidth.max,
      ),
      unusedRowHeight: clampNumber(
        parsed.unusedRowHeight,
        defaults.unusedRowHeight,
        EXPORT_LAYOUT_LIMITS.unusedRowHeight.min,
        EXPORT_LAYOUT_LIMITS.unusedRowHeight.max,
      ),
      excelHiddenColumns: readHiddenColumns(parsed.excelHiddenColumns),
      includeRuleReport: readBoolean(
        parsed.includeRuleReport,
        defaults.includeRuleReport,
      ),
      showRuleReportPage: readBoolean(
        parsed.showRuleReportPage,
        defaults.showRuleReportPage,
      ),
      showRuleReportSeats: readBoolean(
        parsed.showRuleReportSeats,
        defaults.showRuleReportSeats,
      ),
      showRuleReportPersons: readBoolean(
        parsed.showRuleReportPersons,
        defaults.showRuleReportPersons,
      ),
      showRuleReportNotes: readBoolean(
        parsed.showRuleReportNotes,
        defaults.showRuleReportNotes,
      ),
    }
  } catch {
    return DEFAULT_EXPORT_CONTENT_OPTIONS
  }
}

export function saveExportOptions(
  options: ExportContentOptions,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(EXPORT_OPTIONS_KEY, JSON.stringify(options))
  } catch {
    // 儲存空間不可用時，維持目前頁面的設定即可。
  }
}
