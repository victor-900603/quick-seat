import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useReadOnlyMode } from '../../lib/useReadOnlyMode'
import { useProjectStore } from '../project/projectStore'
import {
  buildExportSnapshot,
  createExportFileName,
  EXPORT_TEMPLATE_FIELDS,
  formatGeneratedAt,
  getExportPageDimensions,
  getExportTrackLayout,
  type ExportContentOptions,
} from './exportData'
import { downloadBlob, downloadText } from './download'
import { buildHtmlDocument, countExportPages } from './html'
import { HtmlPreviewDialog } from './HtmlPreviewDialog'
import { PrintPreview } from './PrintPreview'
import { parseProjectFile, serializeProject } from './projectFile'
import { createPngBlob } from './png'
import { buildRuleReport } from './ruleReport'
import { createWorkbookBlob } from './workbook'
import { loadExportOptions, saveExportOptions } from './exportPreferences'
import { ExportHeader } from './components/ExportHeader'
import { ExportTemplateDialog } from '../templates/ExportTemplateDialog'
import { applyExportTemplate } from '../templates/exportTemplates'
import { ExportPreviewPanel } from './components/ExportPreviewPanel'
import { ExportSettingsPanel } from './components/ExportSettingsPanel'
import { ProjectFilePanel } from './components/ProjectFilePanel'

type Notice = { tone: 'success' | 'error'; message: string }

export function ExportEditor() {
  const project = useProjectStore((state) => state.project)
  const replaceProject = useProjectStore((state) => state.replaceProject)
  const readOnly = useReadOnlyMode()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templateRef = useRef<HTMLTextAreaElement>(null)
  const pendingTemplateSelection = useRef<{ start: number; end: number } | null>(
    null,
  )
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState<
    'xlsx' | 'html' | 'json' | 'png' | null
  >(null)
  const [backupBeforeImport, setBackupBeforeImport] = useState(true)
  const [printHtml, setPrintHtml] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [options, setOptions] = useState<ExportContentOptions>(
    loadExportOptions,
  )
  const [templateOpen, setTemplateOpen] = useState(false)
  const [previousOptions, setPreviousOptions] =
    useState<ExportContentOptions | null>(null)
  const closePrintPreview = useCallback(() => setPrintHtml(null), [])
  const closeFullPreview = useCallback(() => setShowFullPreview(false), [])
  const updateOptions = (patch: Partial<ExportContentOptions>) => {
    setOptions((current) => ({ ...current, ...patch }))
  }

  useEffect(() => {
    saveExportOptions(options)
  }, [options])

  useEffect(() => {
    const selection = pendingTemplateSelection.current
    const textarea = templateRef.current

    if (!selection || !textarea) {
      return
    }

    textarea.focus()
    textarea.setSelectionRange(selection.start, selection.end)
    pendingTemplateSelection.current = null
  }, [options.template])

  const insertTemplateToken = (token: string) => {
    const textarea = templateRef.current
    const start = textarea?.selectionStart ?? options.template.length
    const end = textarea?.selectionEnd ?? start
    const template = `${options.template.slice(0, start)}${token}${options.template.slice(end)}`

    pendingTemplateSelection.current = {
      start: start + token.length,
      end: start + token.length,
    }
    setOptions((current) => ({ ...current, template }))
  }

  const snapshot = useMemo(() => buildExportSnapshot(project), [project])
  const ruleReport = useMemo(() => buildRuleReport(project), [project])
  const previewHtml = useMemo(
    () => buildHtmlDocument(snapshot, options, ruleReport),
    [options, ruleReport, snapshot],
  )
  const paper = getExportPageDimensions(options)
  const pageCount = countExportPages(snapshot, options, ruleReport)
  const trackLayout = getExportTrackLayout(snapshot, options)
  const hasAssignment = Boolean(project.currentAssignment)
  const templateFields = useMemo(
    () => [
      ...EXPORT_TEMPLATE_FIELDS,
      ...project.roster.tags.map((tag) => ({
        token: `{tag:${tag.name}}`,
        label: `標籤：${tag.name}`,
      })),
      ...project.roster.extraColumns.map((column) => ({
        token: `{extra:${column}}`,
        label: `欄位：${column}`,
      })),
    ],
    [project.roster.extraColumns, project.roster.tags],
  )
  const date = new Date(snapshot.generatedAt)
  const stats = [
    { label: '座位', value: snapshot.totalSeats },
    { label: '已分配', value: snapshot.assignedCount },
    { label: '未分配', value: snapshot.unassignedCount },
    {
      label: '狀態',
      value: snapshot.stale
        ? '待更新'
        : hasAssignment
          ? '可匯出'
          : '未排座',
    },
  ]

  const reportError = (message: string) => {
    setNotice({ tone: 'error', message })
  }

  const handleWorkbook = async () => {
    setBusy('xlsx')

    try {
      const blob = await createWorkbookBlob(snapshot, options, ruleReport)
      downloadBlob(blob, createExportFileName(project.name, 'xlsx', date))
      setNotice({ tone: 'success', message: '已下載 Excel 座位表。' })
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法產生 Excel 檔案。',
      )
    } finally {
      setBusy(null)
    }
  }

  const handleHtml = () => {
    setBusy('html')

    try {
      downloadText(
        previewHtml,
        createExportFileName(project.name, 'html', date),
        'text/html;charset=utf-8',
      )
      setNotice({ tone: 'success', message: '已下載唯讀 HTML 座位表。' })
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法產生 HTML 檔案。',
      )
    } finally {
      setBusy(null)
    }
  }

  const handlePng = async () => {
    setBusy('png')

    try {
      const blob = await createPngBlob(snapshot, options)
      downloadBlob(blob, createExportFileName(project.name, 'png', date))
      setNotice({ tone: 'success', message: '已下載 PNG 座位表。' })
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法產生 PNG 圖檔。',
      )
    } finally {
      setBusy(null)
    }
  }

  const handlePrintPreview = () => {
    try {
      setPrintHtml(previewHtml)
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法產生列印預覽。',
      )
    }
  }

  const handleJsonExport = () => {
    setBusy('json')

    try {
      downloadText(
        serializeProject(project),
        createExportFileName(project.name, 'json', new Date()),
        'application/json;charset=utf-8',
      )
      setNotice({ tone: 'success', message: '已下載專案 JSON 備份。' })
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法匯出專案檔案。',
      )
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    const result = parseProjectFile(text)

    if (!result.ok) {
      reportError(result.message)
      return
    }

    const confirmed = window.confirm(
      `匯入專案會覆蓋目前的「${project.name}」，並重設復原歷史。\n${
        backupBeforeImport
          ? '匯入前會先下載目前專案的 JSON 備份。'
          : '本次匯入不會自動下載備份。'
      }\n確定繼續嗎？`,
    )

    if (!confirmed) {
      return
    }

    try {
      if (backupBeforeImport) {
        downloadText(
          serializeProject(project),
          createExportFileName(project.name, 'json', new Date()),
          'application/json;charset=utf-8',
        )
      }

      replaceProject(result.project)
      setNotice({
        tone: 'success',
        message: `已匯入專案「${result.project.name}」，復原歷史已重設。`,
      })
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : '無法匯入專案檔案。',
      )
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (file) {
      await handleFile(file)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <ExportHeader
        actions={
          <>
            <button
              className="border border-line bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!previousOptions}
              onClick={() => {
                if (!previousOptions) {
                  return
                }

                setOptions(previousOptions)
                setPreviousOptions(null)
              }}
              type="button"
            >
              復原匯出設定
            </button>
            <button
              aria-haspopup="dialog"
              className="border border-line bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={() => setTemplateOpen(true)}
              type="button"
            >
              匯出範本
            </button>
          </>
        }
        stats={stats}
      />

      {templateOpen ? (
        <ExportTemplateDialog
          onApply={(template) => {
            setPreviousOptions(options)
            setOptions((current) =>
              applyExportTemplate(current, template),
            )
            setTemplateOpen(false)
          }}
          onClose={() => setTemplateOpen(false)}
          readOnly={readOnly}
        />
      ) : null}

      {readOnly ? (
        <p className="mb-4 border border-line bg-surface px-4 py-3 text-xs leading-5 text-muted">
          手機為唯讀檢視。可下載匯出檔，但匯入專案請使用平板或電腦。
        </p>
      ) : null}

      {notice ? (
        <div
          aria-live="polite"
          className={`mb-4 flex items-start justify-between gap-3 border px-4 py-3 text-xs leading-5 ${
            notice.tone === 'error'
              ? 'border-mark/40 bg-mark/5 text-mark'
              : 'border-accent/35 bg-accent-soft/60 text-accent'
          }`}
        >
          <span>{notice.message}</span>
          <button
            aria-label="關閉提示"
            className="shrink-0 text-base leading-none opacity-60 hover:opacity-100"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      {snapshot.stale ? (
        <p className="mb-4 border border-mark/40 bg-mark/5 px-4 py-3 text-xs leading-5 text-ink">
          目前排座結果與最新名單、教室或規則不一致。仍可匯出，但內容可能已過期。
        </p>
      ) : null}

      {!hasAssignment ? (
        <p className="mb-4 border border-line bg-surface px-4 py-3 text-xs leading-5 text-muted">
          尚未排座，沒有座位表可輸出。專案 JSON 仍可下載作為備份。
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ExportPreviewPanel
          assignedCount={snapshot.assignedCount}
          busy={busy}
          hasAssignment={hasAssignment}
          html={previewHtml}
          marginMm={options.marginMm}
          onHtml={handleHtml}
          onOpenFullPreview={() => setShowFullPreview(true)}
          onOrientationChange={(orientation) =>
            updateOptions({ orientation })
          }
          onPaperSizeChange={(paperSize) => updateOptions({ paperSize })}
          onPrint={handlePrintPreview}
          onPng={handlePng}
          onWorkbook={handleWorkbook}
          orientation={options.orientation}
          pageCount={pageCount}
          paper={paper}
          paperSize={options.paperSize}
          stale={snapshot.stale}
          totalSeats={snapshot.totalSeats}
        />

        <ExportSettingsPanel
          extraColumns={snapshot.extraColumns}
          onInsertToken={insertTemplateToken}
          onUpdateOptions={updateOptions}
          options={options}
          tagColumns={snapshot.tags}
          templateFields={templateFields}
          templateRef={templateRef}
          unusedColumnCount={trackLayout.unusedColumnCount}
          unusedRowCount={trackLayout.unusedRowCount}
        />
      </div>

      <ProjectFilePanel
        backupBeforeImport={backupBeforeImport}
        busy={busy === 'json'}
        fileInputRef={fileInputRef}
        generatedAt={formatGeneratedAt(snapshot.generatedAt)}
        onBackupChange={setBackupBeforeImport}
        onExport={handleJsonExport}
        onFileChange={handleFileChange}
        onImportClick={() => fileInputRef.current?.click()}
        readOnly={readOnly}
      />

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-6 text-muted">
        匯出檔會保存在瀏覽器下載資料夾。Excel、HTML、PNG 與 PDF
        的座位文字依「座位內容模板」輸出；Excel 使用固定版面，HTML、PNG
        與 PDF 共用紙張、格高、字級與換行設定。
      </p>

      {printHtml ? (
        <PrintPreview
          html={printHtml}
          paperLabel={paper.label}
          onClose={closePrintPreview}
        />
      ) : null}

      {showFullPreview ? (
        <HtmlPreviewDialog
          html={previewHtml}
          onClose={closeFullPreview}
          paperLabel={paper.label}
        />
      ) : null}
    </section>
  )
}
