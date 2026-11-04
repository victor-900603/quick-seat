import * as Tabs from '@radix-ui/react-tabs'
import { type ComponentType, useState } from 'react'
import { StepIcon } from '../components/StepIcon'
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

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('classroom')

  return (
    <Tabs.Root
      className="flex min-h-svh flex-col"
      onValueChange={(value) => setActiveTab(value as TabId)}
      value={activeTab}
    >
      <header className="board-grid border-b border-board bg-board text-chalk">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <SeatMark />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/55">
                SEATING PLANNER
              </p>
              <h1 className="font-display text-xl tracking-wide text-chalk">
                QuickSeat
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[9px] tracking-[0.2em] text-chalk/45">
                專案
              </p>
              <p className="text-xs text-chalk/85">未命名教室</p>
            </div>
            <span className="border border-chalk/25 px-2.5 py-1 font-mono text-[9px] tracking-[0.15em] text-chalk/60">
              本機儲存
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
    </Tabs.Root>
  )
}

export default App
