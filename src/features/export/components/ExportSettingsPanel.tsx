import type { RefObject } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import {
  EXPORT_LAYOUT_LIMITS,
  getExportRowsPerPage,
  type ExportContentOptions,
} from '../exportData'

interface TemplateField {
  label: string
  token: string
}

interface ExportSettingsPanelProps {
  extraColumns: string[]
  options: ExportContentOptions
  tagColumns: Array<{ id: string; name: string }>
  templateFields: TemplateField[]
  templateRef: RefObject<HTMLTextAreaElement | null>
  onInsertToken: (token: string) => void
  onUpdateOptions: (patch: Partial<ExportContentOptions>) => void
}

const TAB_TRIGGER =
  'border-b-2 border-transparent px-2 py-2.5 text-[11px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 data-[state=active]:border-accent data-[state=active]:bg-surface data-[state=active]:text-accent'

function ToggleField({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`flex items-center gap-2 text-[11px] ${
        disabled ? 'cursor-not-allowed text-muted/60' : 'cursor-pointer text-ink'
      }`}
    >
      <input
        checked={checked}
        className="accent-accent disabled:cursor-not-allowed"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  )
}

function RangeField({
  id,
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: {
  id: string
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  unit: string
  value: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[11px] text-ink" htmlFor={id}>
          {label}
        </label>
        <output className="font-mono text-[10px] text-muted" htmlFor={id}>
          {value} {unit}
        </output>
      </div>
      <input
        className="mt-1 w-full accent-accent"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  )
}

export function ExportSettingsPanel({
  extraColumns,
  options,
  tagColumns,
  templateFields,
  templateRef,
  onInsertToken,
  onUpdateOptions,
}: ExportSettingsPanelProps) {
  const hiddenColumns = new Set(options.excelHiddenColumns)
  const rowsPerPage = getExportRowsPerPage(options)
  const toggleExcelColumn = (key: string) => {
    const next = new Set(options.excelHiddenColumns)

    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }

    onUpdateOptions({ excelHiddenColumns: [...next] })
  }

  return (
    <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      <section
        aria-labelledby="export-settings-title"
        className="border border-line bg-surface"
      >
        <Tabs.Root defaultValue="content">
          <div className="sticky top-0 z-10 border-b border-line bg-surface">
            <div className="flex items-baseline justify-between gap-3 bg-board/[0.035] px-4 py-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.18em] text-accent">
                  SETTINGS
                </p>
                <h3
                  className="mt-0.5 text-sm font-medium text-ink"
                  id="export-settings-title"
                >
                  匯出設定
                </h3>
              </div>
              <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
                HTML / PDF
              </span>
            </div>

            <Tabs.List
              aria-label="匯出設定分類"
              className="grid grid-cols-4 border-t border-line bg-board/[0.02]"
            >
              <Tabs.Trigger className={TAB_TRIGGER} value="content">
                內容
              </Tabs.Trigger>
              <Tabs.Trigger className={TAB_TRIGGER} value="layout">
                版面
              </Tabs.Trigger>
              <Tabs.Trigger className={TAB_TRIGGER} value="display">
                顯示
              </Tabs.Trigger>
              <Tabs.Trigger className={TAB_TRIGGER} value="excel">
                Excel
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content
            className="space-y-5 p-4 focus-visible:outline-none"
            value="content"
          >
            <div>
              <label
                className="font-mono text-[9px] tracking-[0.12em] text-muted"
                htmlFor="export-template"
              >
                座位內容模板
              </label>
              <textarea
                aria-describedby="export-template-help"
                className="mt-2 w-full resize-y border border-line bg-paper px-3 py-2 font-mono text-xs leading-6 text-ink outline-none focus:border-accent"
                id="export-template"
                onChange={(event) =>
                  onUpdateOptions({ template: event.target.value })
                }
                ref={templateRef}
                rows={5}
                spellCheck={false}
                value={options.template}
              />
              <p
                className="mt-2 text-[11px] leading-5 text-muted"
                id="export-template-help"
              >
                直接輸入文字與換行；空白欄位會自動收合。未知變數會原樣輸出。
              </p>
            </div>

            <div className="border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                  可用變數
                </p>
                <p className="text-[10px] text-muted">插入游標位置</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {templateFields.map((field) => (
                  <button
                    aria-label={`插入 ${field.token}（${field.label}）`}
                    className="group flex min-w-0 items-center gap-1 border border-line bg-paper px-1.5 py-1 text-left text-[10px] transition-colors hover:border-accent/40 hover:bg-accent-soft/45 focus-visible:border-accent focus-visible:outline-none"
                    key={field.token}
                    onClick={() => onInsertToken(field.token)}
                    onMouseDown={(event) => event.preventDefault()}
                    title={`插入 ${field.token}`}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-[10px] text-accent/50 group-hover:text-accent"
                    >
                      +
                    </span>
                    <code className="min-w-0 flex-1 truncate text-accent">
                      {field.token}
                    </code>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                文字對齊
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                  <input
                    checked={options.align === 'center'}
                    className="accent-accent"
                    name="export-align"
                    onChange={() => onUpdateOptions({ align: 'center' })}
                    type="radio"
                  />
                  置中
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                  <input
                    checked={options.align === 'left'}
                    className="accent-accent"
                    name="export-align"
                    onChange={() => onUpdateOptions({ align: 'left' })}
                    type="radio"
                  />
                  靠左
                </label>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted">
                套用至 Excel、HTML 與 PDF。
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content
            className="space-y-5 p-4 focus-visible:outline-none"
            value="layout"
          >
            <div>
              <h4 className="text-xs font-medium text-ink">版面</h4>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                紙張與方向請於左側預覽上方調整。
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-xs font-medium text-ink">文字與格子</h4>
                <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
                  OUTPUT
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                Excel 使用固定版面；以下設定套用至 HTML 與 PDF。
              </p>

              <div className="mt-3 space-y-3">
                <RangeField
                  id="html-cell-height"
                  label="格高"
                  max={EXPORT_LAYOUT_LIMITS.htmlCellHeight.max}
                  min={EXPORT_LAYOUT_LIMITS.htmlCellHeight.min}
                  onChange={(value) =>
                    onUpdateOptions({ htmlCellHeight: value })
                  }
                  step={EXPORT_LAYOUT_LIMITS.htmlCellHeight.step}
                  unit="px"
                  value={options.htmlCellHeight}
                />
                <RangeField
                  id="html-font-size"
                  label="字級"
                  max={EXPORT_LAYOUT_LIMITS.htmlFontSize.max}
                  min={EXPORT_LAYOUT_LIMITS.htmlFontSize.min}
                  onChange={(value) =>
                    onUpdateOptions({ htmlFontSize: value })
                  }
                  step={EXPORT_LAYOUT_LIMITS.htmlFontSize.step}
                  unit="px"
                  value={options.htmlFontSize}
                />
                <RangeField
                  id="export-cell-gap"
                  label="格線間距"
                  max={EXPORT_LAYOUT_LIMITS.cellGap.max}
                  min={EXPORT_LAYOUT_LIMITS.cellGap.min}
                  onChange={(value) => onUpdateOptions({ cellGap: value })}
                  step={EXPORT_LAYOUT_LIMITS.cellGap.step}
                  unit="px"
                  value={options.cellGap}
                />
                <RangeField
                  id="export-border-width"
                  label="框線寬度"
                  max={EXPORT_LAYOUT_LIMITS.borderWidth.max}
                  min={EXPORT_LAYOUT_LIMITS.borderWidth.min}
                  onChange={(value) => onUpdateOptions({ borderWidth: value })}
                  step={EXPORT_LAYOUT_LIMITS.borderWidth.step}
                  unit="px"
                  value={options.borderWidth}
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-xs text-ink">
                <input
                  checked={options.htmlWrap}
                  className="accent-accent"
                  onChange={(event) =>
                    onUpdateOptions({ htmlWrap: event.target.checked })
                  }
                  type="checkbox"
                />
                自動換行
              </label>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                關閉後文字不自動換行，超出格寬時可能被截斷或溢出。
              </p>
            </div>

            <div className="border-t border-line pt-4">
              <h4 className="text-xs font-medium text-ink">紙張與分頁</h4>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                邊界與每頁列數套用至 HTML 與 PDF。
              </p>
              <div className="mt-3 space-y-3">
                <RangeField
                  id="export-margin"
                  label="邊界"
                  max={EXPORT_LAYOUT_LIMITS.marginMm.max}
                  min={EXPORT_LAYOUT_LIMITS.marginMm.min}
                  onChange={(value) => onUpdateOptions({ marginMm: value })}
                  step={EXPORT_LAYOUT_LIMITS.marginMm.step}
                  unit="mm"
                  value={options.marginMm}
                />
                <p className="text-[10px] leading-4 text-muted">
                  預覽中的虛線代表紙張外邊界。設為 0 時不保留額外紙張邊界，頁面內距仍會保留；實體印表機也可能有不可列印區。
                </p>
                <RangeField
                  id="export-rows-per-page"
                  label="每頁列數"
                  max={Math.min(
                    EXPORT_LAYOUT_LIMITS.rowsPerPage.max,
                    rowsPerPage.maxRows,
                  )}
                  min={Math.min(
                    EXPORT_LAYOUT_LIMITS.rowsPerPage.min,
                    rowsPerPage.maxRows,
                  )}
                  onChange={(value) =>
                    onUpdateOptions({ rowsPerPage: value })
                  }
                  step={EXPORT_LAYOUT_LIMITS.rowsPerPage.step}
                  unit="列"
                  value={rowsPerPage.effectiveRows}
                />
                <p className="text-[10px] leading-4 text-muted">
                  此紙張與格高最多 {rowsPerPage.maxRows} 列；目前每頁實際{' '}
                  {rowsPerPage.effectiveRows} 列。降低格高可增加每頁列數。
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ToggleField
                  checked={options.showPageBorder}
                  label="顯示頁框"
                  onChange={(checked) =>
                    onUpdateOptions({ showPageBorder: checked })
                  }
                />
                <ToggleField
                  checked={options.showPageNumbers}
                  label="顯示頁碼"
                  onChange={(checked) =>
                    onUpdateOptions({ showPageNumbers: checked })
                  }
                />
                <ToggleField
                  checked={options.repeatHeader}
                  label="重複表頭"
                  onChange={(checked) =>
                    onUpdateOptions({ repeatHeader: checked })
                  }
                />
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content
            className="space-y-5 p-4 focus-visible:outline-none"
            value="display"
          >
            <div>
              <h4 className="text-xs font-medium text-ink">顯示內容</h4>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                控制 HTML 與 PDF 頁面中的區塊；統計以卡片顯示於頁首右側，日期顯示於頁尾。
              </p>
            </div>

            <div>
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                頁首
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ToggleField
                  checked={options.showTitle}
                  label="標題"
                  onChange={(checked) =>
                    onUpdateOptions({ showTitle: checked })
                  }
                />
                <ToggleField
                  checked={options.showStats}
                  label="統計"
                  onChange={(checked) =>
                    onUpdateOptions({ showStats: checked })
                  }
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                頁面內容
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ToggleField
                  checked={options.showStage}
                  label="講台"
                  onChange={(checked) =>
                    onUpdateOptions({ showStage: checked })
                  }
                />
                <ToggleField
                  checked={options.showUnassigned}
                  label="未分配名單"
                  onChange={(checked) =>
                    onUpdateOptions({ showUnassigned: checked })
                  }
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                頁尾
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ToggleField
                  checked={options.showFooter}
                  label="頁尾"
                  onChange={(checked) =>
                    onUpdateOptions({ showFooter: checked })
                  }
                />
                <ToggleField
                  checked={options.showGeneratedAt}
                  label="日期"
                  onChange={(checked) =>
                    onUpdateOptions({ showGeneratedAt: checked })
                  }
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="font-mono text-[9px] tracking-[0.12em] text-muted">
                名單細節
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ToggleField
                  checked={options.showNotes}
                  disabled={!options.showUnassigned}
                  label="未分配備註"
                  onChange={(checked) =>
                    onUpdateOptions({ showNotes: checked })
                  }
                />
                <ToggleField
                  checked={options.showTags}
                  disabled={!options.showUnassigned}
                  label="未分配標籤"
                  onChange={(checked) =>
                    onUpdateOptions({ showTags: checked })
                  }
                />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted">
                僅套用至未分配人員清單；座位內容由模板變數決定。
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content
            className="space-y-4 p-4 focus-visible:outline-none"
            value="excel"
          >
            <div>
              <h4 className="text-xs font-medium text-ink">Excel 名單欄位</h4>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                取消勾選可隱藏名單對照工作表的欄位；座位表不受影響。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ToggleField
                checked={!hiddenColumns.has('seat')}
                label="座位"
                onChange={() => toggleExcelColumn('seat')}
              />
              <ToggleField
                checked={!hiddenColumns.has('name')}
                label="姓名"
                onChange={() => toggleExcelColumn('name')}
              />
              <ToggleField
                checked={!hiddenColumns.has('studentNo')}
                label="座號"
                onChange={() => toggleExcelColumn('studentNo')}
              />
              <ToggleField
                checked={!hiddenColumns.has('note')}
                label="備註"
                onChange={() => toggleExcelColumn('note')}
              />
              {tagColumns.map((tag) => (
                <ToggleField
                  checked={!hiddenColumns.has(`tag:${tag.id}`)}
                  key={tag.id}
                  label={tag.name}
                  onChange={() => toggleExcelColumn(`tag:${tag.id}`)}
                />
              ))}
              {extraColumns.map((column) => (
                <ToggleField
                  checked={!hiddenColumns.has(`extra:${column}`)}
                  key={column}
                  label={column}
                  onChange={() => toggleExcelColumn(`extra:${column}`)}
                />
              ))}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </section>
    </aside>
  )
}
