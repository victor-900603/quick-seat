import type { ChangeEvent, RefObject } from 'react'

interface ProjectFilePanelProps {
  backupBeforeImport: boolean
  busy: boolean
  generatedAt: string
  readOnly: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onBackupChange: (checked: boolean) => void
  onExport: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onImportClick: () => void
}

export function ProjectFilePanel({
  backupBeforeImport,
  busy,
  generatedAt,
  readOnly,
  fileInputRef,
  onBackupChange,
  onExport,
  onFileChange,
  onImportClick,
}: ProjectFilePanelProps) {
  return (
    <section
      aria-labelledby="project-file-title"
      className="mt-4 border border-line bg-surface/80"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-12 shrink-0 items-center justify-center border border-line bg-paper font-mono text-[9px] tracking-[0.12em] text-muted">
            JSON
          </span>
          <div className="min-w-0">
            <h3
              className="text-sm font-medium text-ink"
              id="project-file-title"
            >
              專案備份與還原
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              完整專案包含教室、名單、標籤、規則、鎖定與排座結果。
            </p>
            <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-muted">
              更新於 {generatedAt}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy}
            onClick={onExport}
            type="button"
          >
            匯出專案 JSON
          </button>
          <button
            className="border border-mark/40 bg-mark/5 px-3 py-2 text-xs font-medium text-mark transition-colors hover:bg-mark/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={readOnly}
            onClick={onImportClick}
            type="button"
          >
            匯入專案 JSON
          </button>
          <input
            accept=".json,application/json"
            aria-label="選擇專案 JSON"
            className="hidden"
            onChange={onFileChange}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[11px] text-muted">
        <input
          checked={backupBeforeImport}
          className="accent-accent"
          disabled={readOnly}
          onChange={(event) => onBackupChange(event.target.checked)}
          type="checkbox"
        />
        匯入前先下載目前專案的 JSON 備份
      </label>
    </section>
  )
}
