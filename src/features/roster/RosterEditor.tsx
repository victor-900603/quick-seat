import { useMemo, useState } from 'react'
import { InspectorTabs } from '../../components/InspectorTabs'
import { PageHeader } from '../../components/PageHeader'
import { useReadOnlyMode } from '../../lib/useReadOnlyMode'
import type { Person } from '../../types/domain'
import { useProjectStore } from '../project/projectStore'
import type {
  ImportMode,
  ImportOutcome,
  ImportPlan,
} from './importRoster'
import {
  formatTagValue,
  type PersonInput,
  type PersonPatch,
  type TagValue,
} from './rosterOps'
import { BatchTagBar } from './components/BatchTagBar'
import { ImportPanel } from './components/ImportPanel'
import { PersonPanel } from './components/PersonPanel'
import { RosterTable } from './components/RosterTable'
import { TagPanel } from './components/TagPanel'

function matchesQuery(
  person: Person,
  query: string,
  tagNames: Map<string, string>,
): boolean {
  if (!query) {
    return true
  }

  if (
    person.name.toLocaleLowerCase('zh-Hant').includes(query) ||
    person.studentNo.toLocaleLowerCase('en-US').includes(query) ||
    person.note.toLocaleLowerCase('zh-Hant').includes(query)
  ) {
    return true
  }

  return Object.entries(person.tags).some(([tagId, value]) => {
    const tagName = tagNames.get(tagId) ?? ''

    return (
      tagName.toLocaleLowerCase('zh-Hant').includes(query) ||
      formatTagValue(value)
        .toLocaleLowerCase('zh-Hant')
        .includes(query)
    )
  }) || Object.values(person.extra).some((value) =>
    value.toLocaleLowerCase('zh-Hant').includes(query),
  )
}

export function RosterEditor() {
  const roster = useProjectStore((state) => state.project.roster)
  const addPerson = useProjectStore((state) => state.addPerson)
  const updatePerson = useProjectStore((state) => state.updatePerson)
  const deletePerson = useProjectStore((state) => state.deletePerson)
  const setPersonsTag = useProjectStore((state) => state.setPersonsTag)
  const addTag = useProjectStore((state) => state.addTag)
  const updateTag = useProjectStore((state) => state.updateTag)
  const deleteTag = useProjectStore((state) => state.deleteTag)
  const importRoster = useProjectStore((state) => state.importRoster)
  const readOnly = useReadOnlyMode()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [importOpen, setImportOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [personDirty, setPersonDirty] = useState(false)

  const tagNames = useMemo(
    () => new Map(roster.tags.map((tag) => [tag.id, tag.name])),
    [roster.tags],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-Hant')
  const filteredPersons = useMemo(
    () =>
      roster.persons.filter((person) =>
        matchesQuery(person, normalizedQuery, tagNames),
      ),
    [normalizedQuery, roster.persons, tagNames],
  )
  const selectedPerson =
    roster.persons.find((person) => person.id === selectedId) ?? null
  const personCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const tag of roster.tags) {
      counts.set(
        tag.id,
        roster.persons.filter((person) =>
          Object.prototype.hasOwnProperty.call(person.tags, tag.id),
        ).length,
      )
    }

    return counts
  }, [roster.persons, roster.tags])

  const canLeavePerson = () =>
    !personDirty ||
    window.confirm('目前的人員資料尚未儲存，確定要離開嗎？')

  const selectPerson = (personId: string) => {
    if (personId === selectedId) {
      return
    }

    if (!canLeavePerson()) {
      return
    }

    setSelectedId(personId)
    setCreating(false)
    setPersonDirty(false)
  }

  const startCreate = () => {
    if (creating || !canLeavePerson()) {
      return
    }

    setCreating(true)
    setSelectedId(null)
    setPersonDirty(false)
  }

  const toggleCheck = (personId: string) => {
    setCheckedIds((current) => {
      const next = new Set(current)

      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }

      return next
    })
  }

  const toggleAll = () => {
    setCheckedIds((current) => {
      const allChecked =
        filteredPersons.length > 0 &&
        filteredPersons.every((person) => current.has(person.id))

      if (allChecked) {
        const next = new Set(current)
        filteredPersons.forEach((person) => next.delete(person.id))
        return next
      }

      return new Set([
        ...current,
        ...filteredPersons.map((person) => person.id),
      ])
    })
  }

  const handleCreate = (input: PersonInput): boolean => {
    const personId = addPerson(input)

    if (!personId) {
      return false
    }

    setSelectedId(personId)
    setCreating(false)
    setPersonDirty(false)
    setFlash(`已新增「${input.name.trim()}」。`)
    return true
  }

  const handleUpdate = (
    personId: string,
    patch: PersonPatch,
  ): boolean => {
    const ok = updatePerson(personId, patch)

    if (ok) {
      setPersonDirty(false)
      setFlash('人員資料已儲存。')
    }

    return ok
  }

  const handleDelete = (personId: string) => {
    deletePerson(personId)
    setSelectedId(null)
    setPersonDirty(false)
    setCheckedIds((current) => {
      const next = new Set(current)
      next.delete(personId)
      return next
    })
    setFlash('已刪除人員，可使用復原恢復。')
  }

  const handleImport = (
    plan: ImportPlan,
    mode: ImportMode,
  ): ImportOutcome => {
    const outcome = importRoster(plan, mode)
    const skipped =
      outcome.skippedExistingCount > 0
        ? `，略過 ${outcome.skippedExistingCount} 位既有座號`
        : ''

    setFlash(`已匯入 ${outcome.addedCount} 位人員${skipped}。`)
    setCheckedIds(new Set())

    if (mode === 'replace') {
      setSelectedId(null)
      setCreating(false)
      setPersonDirty(false)
    }

    return outcome
  }

  const applyBatchTag = (tagId: string, value: TagValue) => {
    setPersonsTag([...checkedIds], tagId, value)
    setFlash(`已套用標籤至 ${checkedIds.size} 位人員。`)
  }

  const clearBatchTag = (tagId: string) => {
    setPersonsTag([...checkedIds], tagId, null)
    setFlash(`已清除 ${checkedIds.size} 位人員的標籤值。`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <PageHeader
        description="匯入試算表並確認欄位映射，再用標籤描述分組、需求與其他排座條件。"
        kicker="ROSTER"
        stats={[
          { label: '人員', value: roster.persons.length },
          { label: '標籤', value: roster.tags.length },
          { label: '額外欄位', value: roster.extraColumns.length },
        ]}
        step="02"
        title="學生名單"
      />

      {readOnly ? (
        <div
          className="mt-4 border border-mark/30 bg-mark/5 px-3 py-2 font-mono text-[10px] tracking-[0.08em] text-mark"
          role="status"
        >
          手機為唯讀檢視。請使用平板或電腦編輯名單與標籤。
        </div>
      ) : null}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <button
              className="border border-board bg-board px-3 py-1.5 text-[11px] text-chalk transition-colors hover:bg-ink disabled:opacity-40"
              disabled={readOnly}
              onClick={() => setImportOpen((current) => !current)}
              type="button"
            >
              {importOpen ? '收起匯入' : '匯入名單'}
            </button>
            <button
              className="border border-line bg-paper px-3 py-1.5 text-[11px] text-ink transition-colors hover:border-accent/50 disabled:opacity-40"
              disabled={readOnly}
              onClick={startCreate}
              type="button"
            >
              新增人員
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <input
                aria-label="搜尋名單"
                className="w-40 border border-line bg-paper px-2.5 py-1.5 text-[11px] text-ink outline-none placeholder:text-muted/60 focus:border-accent sm:w-52"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋姓名、座號或標籤"
                value={query}
              />
              {query ? (
                <button
                  className="font-mono text-[9px] text-muted hover:text-ink"
                  onClick={() => setQuery('')}
                  type="button"
                >
                  清除
                </button>
              ) : null}
            </div>
          </div>

          {importOpen && !readOnly ? (
            <ImportPanel
              existingStudentNos={roster.persons.map(
                (person) => person.studentNo,
              )}
              onApply={handleImport}
              onClose={() => setImportOpen(false)}
              tags={roster.tags}
            />
          ) : null}

          {checkedIds.size > 0 && !readOnly ? (
            <BatchTagBar
              disabled={readOnly}
              onApply={applyBatchTag}
              onClearSelection={() => setCheckedIds(new Set())}
              onClearTag={clearBatchTag}
              selectedCount={checkedIds.size}
              tags={roster.tags}
            />
          ) : null}

          {flash ? (
            <div
              className="flex items-center justify-between gap-3 border-b border-accent/20 bg-accent-soft px-4 py-2"
              role="status"
            >
              <span className="text-[11px] text-accent">{flash}</span>
              <button
                aria-label="關閉提示"
                className="font-mono text-[10px] text-accent/70 hover:text-accent"
                onClick={() => setFlash(null)}
                type="button"
              >
                關閉
              </button>
            </div>
          ) : null}

          <RosterTable
            checkedIds={checkedIds}
            emptyDescription={
              normalizedQuery
                ? '換個關鍵字，或清除搜尋條件。'
                : '匯入 CSV、TSV 或 XLSX 檔案，或手動新增第一位學生。'
            }
            emptyTitle={
              normalizedQuery ? '找不到符合的人員' : '名單是空的'
            }
            onSelect={selectPerson}
            onToggleAll={toggleAll}
            onToggleCheck={toggleCheck}
            persons={filteredPersons}
            readOnly={readOnly}
            selectedId={selectedId}
            tags={roster.tags}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-4 py-2.5 font-mono text-[9px] tracking-[0.08em] text-muted">
            <span>
              顯示 {filteredPersons.length} / {roster.persons.length} 位
            </span>
            <span>標籤 {roster.tags.length} 種</span>
          </div>
        </section>

        <InspectorTabs
          ariaLabel="名單設定"
          defaultValue="person"
          tabs={[
            {
              value: 'person',
              label: '人員',
              content: (
                <PersonPanel
                  creating={creating}
                  disabled={readOnly}
                  extraColumns={roster.extraColumns}
                  key={creating ? 'new' : (selectedPerson?.id ?? 'empty')}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  onDirtyChange={setPersonDirty}
                  onUpdate={handleUpdate}
                  person={selectedPerson}
                  tags={roster.tags}
                />
              ),
            },
            {
              value: 'tags',
              label: '標籤',
              content: (
                <TagPanel
                  disabled={readOnly}
            onAdd={(input) => {
              const tagId = addTag(input)

              if (tagId) {
                setFlash(`已建立標籤「${input.name.trim()}」。`)
              }

              return tagId
            }}
            onDelete={(tagId) => {
              deleteTag(tagId)
              setFlash('已刪除標籤及相關人員值與規則，可使用復原恢復。')
            }}
            onUpdate={(tagId, patch) => {
              const ok = updateTag(tagId, patch)

              if (ok) {
                setFlash('標籤設定已更新。')
              }

              return ok
            }}
            personCounts={personCounts}
            tags={roster.tags}
                  />
                ),
              },
            ]}
        />
      </div>
    </div>
  )
}
