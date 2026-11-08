import * as Tabs from '@radix-ui/react-tabs'
import { type ComponentType, useCallback, useState } from 'react'
import { StepIcon } from '../components/StepIcon'
import { HistoryControls } from '../features/project/HistoryControls'
import { ProjectNameDialog } from '../features/project/ProjectNameDialog'
import { useAutosave, type SaveStatus } from '../features/project/useAutosave'
import { useHistoryShortcuts } from '../features/project/useHistoryShortcuts'
import { useProjectStore } from '../features/project/projectStore'
import { useReadOnlyMode } from '../lib/useReadOnlyMode'
import { ExportPage } from '../pages/ExportPage'
import { LayoutPage } from '../pages/LayoutPage'
import { RosterPage } from '../pages/RosterPage'
import { RulesPage } from '../pages/RulesPage'
import { SeatingPage } from '../pages/SeatingPage'
import { TABS, type TabId } from './tabs'

const PAGES: Record<TabId, ComponentType> = {
  classroom: LayoutPage,
  roster: RosterPage,
  rules: RulesPage,
  seating: SeatingPage,
  export: ExportPage,
}

const seatPattern = [
  1, 1, 0, 1, 1,
  1, 0, 1, 1, 1,
  1, 1, 1, 0, 1,
  0, 1, 1, 1, 0,
]

function SeatMark() {
  return (
    <div aria-hidden="true" className="grid grid-cols-5 gap-[3px]">
      {seatPattern.map((filled, index) => (
        <span
          className={`h-2 w-2 rounded-[1px] ${
            index === 8
              ? 'bg-chalk-accent'
              : filled
                ? 'bg-chalk/70'
                : 'border border-chalk/35'
          }`}
          key={index}
        />
      ))}
    </div>
  )
}

const SAVE_LABELS: Record<SaveStatus, string> = {
  saved: '本機儲存',
  saving: '儲存中',
  error: '儲存失敗',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('classroom')
  const [renaming, setRenaming] = useState(false)
  const project = useProjectStore((state) => state.project)
  const renameProject = useProjectStore((state) => state.renameProject)
  const saveStatus = useAutosave(project)
  const readOnly = useReadOnlyMode()

  useHistoryShortcuts({ disabled: readOnly })

  const closeRename = useCallback(() => setRenaming(false), [])

  return (
    <Tabs.Root
      className="flex min-h-svh flex-col"
      onValueChange={(value) => setActiveTab(value as TabId)}
      value={activeTab}
    >
      <header className="board-grid border-b border-board bg-board text-chalk">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex shrink-0 items-center gap-3.5">
            <SeatMark />
            <div>
              <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/55">
                SEATING PLANNER
              </p>
              <h1 className="font-display text-xl tracking-wide text-chalk">
                QuickSeat
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              aria-haspopup="dialog"
              aria-label={`重新命名專案，目前名稱：${project.name}`}
              className="group hidden text-right disabled:cursor-not-allowed disabled:opacity-60 sm:block"
              disabled={readOnly}
              onClick={() => setRenaming(true)}
              title="重新命名專案"
              type="button"
            >
              <span className="block font-mono text-[9px] tracking-[0.2em] text-chalk/45">
                專案
              </span>
              <span className="block border-b border-transparent text-xs text-chalk/85 transition-colors group-hover:border-chalk/40 group-hover:text-chalk">
                {project.name}
              </span>
            </button>
            <HistoryControls disabled={readOnly} />
            <span
              className={`shrink-0 whitespace-nowrap border px-2.5 py-1 font-mono text-[9px] tracking-[0.15em] ${
                saveStatus === 'error'
                  ? 'border-chalk-accent/60 text-chalk-accent'
                  : 'border-chalk/25 text-chalk/60'
              }`}
            >
              {SAVE_LABELS[saveStatus]}
            </span>
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6">
          <Tabs.List
            aria-label="排座流程"
            className="flex gap-1 overflow-x-auto"
          >
            {TABS.map((tab) => (
              <Tabs.Trigger
                className="group flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-3.5 text-sm text-muted transition-colors hover:text-ink data-[state=active]:border-mark data-[state=active]:text-ink"
                key={tab.id}
                value={tab.id}
              >
                <StepIcon className="h-4 w-4" id={tab.id} />
                <span className="font-mono text-[9px] tracking-[0.15em] text-muted group-data-[state=active]:text-mark">
                  {tab.step}
                </span>
                <span>{tab.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
      </div>

      <main className="paper-grid flex-1">
        {TABS.map((tab) => {
          const Page = PAGES[tab.id]

          return (
            <Tabs.Content key={tab.id} value={tab.id}>
              <Page />
            </Tabs.Content>
          )
        })}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3 font-mono text-[9px] tracking-[0.12em] text-muted">
          <span>QUICKSEAT / 排座流程</span>
          <span>資料僅儲存在此瀏覽器</span>
        </div>
      </footer>

      {renaming ? (
        <ProjectNameDialog
          name={project.name}
          onClose={closeRename}
          onSave={(name) => {
            renameProject(name)
            closeRename()
          }}
        />
      ) : null}
    </Tabs.Root>
  )
}

export default App
