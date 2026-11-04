import { useMemo, useRef, useState } from 'react'
import type { TagDef } from '../../../types/domain'
import {
  EXTRA_COLUMN,
  IGNORE_COLUMN,
  NAME_COLUMN,
  NOTE_COLUMN,
  STUDENT_NO_COLUMN,
  buildImportPlan,
  getMappingError,
  readRosterFile,
  suggestMappings,
  type ColumnMapping,
  type ImportMode,
  type ImportOutcome,
  type ImportPlan,
  type RosterTable,
} from '../importRoster'

interface ImportPanelProps {
  tags: TagDef[]
  existingStudentNos: string[]
  onClose: () => void
  onApply: (plan: ImportPlan, mode: ImportMode) => ImportOutcome
}

const selectClass =
  'w-full border border-line bg-paper px-2 py-1.5 text-[11px] text-ink outline-none focus:border-accent'

export function ImportPanel({
  tags,
  existingStudentNos,
  onClose,
  onApply,
}: ImportPanelProps) {
  const [table, setTable] = useState<RosterTable | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = async (file: File) => {
    setBusy(true)
    setError(null)

    try {
      const nextTable = await readRosterFile(file)

      if (nextTable.headers.length === 0 || nextTable.rows.length === 0) {
        throw new Error('檔案沒有可匯入的標題或資料列。')
      }

      setTable(nextTable)
      setMapping(suggestMappings(nextTable.headers, tags))
      setFileName(file.name)
    } catch (caught) {
      setTable(null)
      setFileName('')
      setError(
        caught instanceof Error ? caught.message : '無法讀取檔案。',
      )
    } finally {
      setBusy(false)
    }
  }

  const plan = useMemo(
    () =>
      table
        ? buildImportPlan(table, mapping, tags)
        : {
            persons: [],
            tags: [],
            extraColumns: [],
            issues: [],
            skippedCount: 0,
          },
    [mapping, table, tags],
  )
  const mappingError = table
    ? getMappingError(table, mapping, tags)
    : '請先選擇檔案。'
  const existingNoSet = new Set(
    existingStudentNos.map((studentNo) => studentNo.trim()).filter(Boolean),
  )
  const duplicateExistingCount =
    mode === 'merge'
      ? plan.persons.filter(
          (person) =>
            person.studentNo && existingNoSet.has(person.studentNo),
        ).length
      : 0
  const importableCount = plan.persons.length - duplicateExistingCount
  const canImport =
    !mappingError && !busy && importableCount > 0

  const updateMapping = (column: number, value: string) => {
    setMapping((current) => ({ ...current, [column]: value }))
  }

  return (
    <div className="border-b border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-paper px-4 py-3">
        <div>
          <p className="font-mono text-[8px] tracking-[0.24em] text-muted">
            IMPORT
          </p>
          <p className="font-display text-base text-ink">匯入名單</p>
        </div>
        <button
          className="font-mono text-[9px] text-muted hover:text-ink"
          onClick={onClose}
          type="button"
        >
          關閉
        </button>
      </div>

      <div className="px-4 py-4">
        <input
          accept=".csv,.tsv,.xlsx"
          className="sr-only"
          id="roster-import-file"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void loadFile(file)
            }

            event.target.value = ''
          }}
          ref={inputRef}
          type="file"
        />
        <div
          className={`border border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-paper'
          }`}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]

            if (file) {
              void loadFile(file)
            }
          }}
        >
          <p className="text-xs text-ink">
            {fileName || '將 CSV、TSV 或 XLSX 檔案拖曳到這裡'}
          </p>
          <p
            className={`mt-1 font-mono text-[9px] ${
              fileName ? 'text-accent' : 'text-muted'
            }`}
            role={fileName ? 'status' : undefined}
          >
            {fileName
              ? '檔案已讀取，請確認欄位映射。'
              : 'Excel 僅支援 .xlsx，舊版 .xls 請先另存新檔'}
          </p>
          <label
            className="mt-3 inline-block cursor-pointer border border-board bg-board px-3 py-1.5 text-[11px] text-chalk transition-colors hover:bg-ink"
            htmlFor="roster-import-file"
          >
            {fileName ? '重新選擇檔案' : '選擇檔案'}
          </label>
          {busy ? (
            <p className="mt-2 font-mono text-[9px] text-accent" role="status">
              讀取中
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 border border-mark/30 bg-mark/5 px-3 py-2 text-[11px] text-mark" role="alert">
            {error}
          </p>
        ) : null}

        {table ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm text-ink">欄位映射</h3>
                <span className="font-mono text-[8px] text-muted">
                  {table.rows.length} 列資料
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {table.headers.map((header, column) => {
                  const target = mapping[column] ?? IGNORE_COLUMN

                  return (
                    <div
                      className="border border-line bg-paper px-2.5 py-2"
                      key={`${header}-${column}`}
                    >
                      <p className="mb-1 truncate text-[11px] text-ink">
                        {header}
                      </p>
                      <select
                        aria-label={`${header} 欄位映射`}
                        className={selectClass}
                        onChange={(event) =>
                          updateMapping(column, event.target.value)
                        }
                        value={target}
                      >
                        <optgroup label="人員欄位">
                          <option value={NAME_COLUMN}>姓名</option>
                          <option value={STUDENT_NO_COLUMN}>座號</option>
                          <option value={NOTE_COLUMN}>備註</option>
                        </optgroup>
                        {tags.length > 0 ? (
                          <optgroup label="現有標籤">
                            {tags.map((tag) => (
                              <option key={tag.id} value={`tag:${tag.id}`}>
                                標籤：{tag.name}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        <optgroup label="其他">
                          <option value={`new:${column}`}>
                            建立標籤：{header}
                          </option>
                          <option value={EXTRA_COLUMN}>保留為額外欄位</option>
                          <option value={IGNORE_COLUMN}>忽略此欄</option>
                        </optgroup>
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm text-ink">資料預覽</h3>
                <span className="font-mono text-[8px] text-muted">
                  最多顯示前 4 列
                </span>
              </div>
              <div className="overflow-x-auto border border-line">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-paper font-mono text-[9px] text-muted">
                      {table.headers.map((header, index) => (
                        <th
                          className="px-2.5 py-1.5 font-normal"
                          key={`${header}-${index}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.slice(0, 4).map((row, rowIndex) => (
                      <tr
                        className="border-b border-line/60 last:border-b-0"
                        key={rowIndex}
                      >
                        {table.headers.map((_, column) => (
                          <td
                            className="max-w-40 truncate px-2.5 py-1.5 text-[11px] text-ink"
                            key={column}
                          >
                            {row[column] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <fieldset>
                <legend className="mb-1.5 font-mono text-[9px] tracking-[0.12em] text-muted">
                  匯入方式
                </legend>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-[11px] text-ink">
                    <input
                      checked={mode === 'merge'}
                      className="accent-accent"
                      name="import-mode"
                      onChange={() => setMode('merge')}
                      type="radio"
                    />
                    合併名單
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-ink">
                    <input
                      checked={mode === 'replace'}
                      className="accent-accent"
                      name="import-mode"
                      onChange={() => setMode('replace')}
                      type="radio"
                    />
                    覆蓋名單
                  </label>
                </div>
              </fieldset>

              <div className="text-right">
                <p className="font-mono text-[9px] text-muted">
                  可匯入 {importableCount} 位
                  {duplicateExistingCount > 0
                    ? `，另略過 ${duplicateExistingCount} 位既有座號`
                    : ''}
                </p>
                {plan.skippedCount > 0 ? (
                  <p className="font-mono text-[9px] text-mark">
                    檔案內略過 {plan.skippedCount} 列
                  </p>
                ) : null}
              </div>
            </div>

            {mappingError ? (
              <p
                className="border border-mark/30 bg-mark/5 px-3 py-2 text-[11px] text-mark"
                role="alert"
              >
                {mappingError}
              </p>
            ) : plan.issues.length === 0 ? (
              <p className="border border-accent/25 bg-accent-soft px-3 py-2 text-[11px] text-accent">
                欄位與資料檢查通過。
              </p>
            ) : (
              <div className="border border-mark/25 bg-mark/5 px-3 py-2">
                <p className="font-mono text-[9px] tracking-[0.1em] text-mark">
                  需要注意的資料
                </p>
                <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-mark">
                  {plan.issues.slice(0, 5).map((issue, index) => (
                    <li key={`${issue.row}-${index}`}>
                      {issue.row ? `第 ${issue.row} 列：` : ''}
                      {issue.message}
                    </li>
                  ))}
                </ul>
                {plan.issues.length > 5 ? (
                  <p className="mt-1 font-mono text-[9px] text-mark">
                    另有 {plan.issues.length - 5} 則
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
              <button
                className="border border-line bg-paper px-3 py-1.5 text-[11px] text-muted hover:text-ink"
                onClick={onClose}
                type="button"
              >
                取消
              </button>
              <button
                className="border border-board bg-board px-4 py-1.5 text-[11px] text-chalk hover:bg-ink disabled:opacity-40"
                disabled={!canImport}
                onClick={() => {
                  onApply(plan, mode)
                  onClose()
                }}
                type="button"
              >
                匯入 {importableCount} 位人員
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
