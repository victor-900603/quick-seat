import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export interface InspectorTab {
  value: string
  label: string
  content: ReactNode
}

interface InspectorTabsProps {
  ariaLabel: string
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  tabs: InspectorTab[]
}

export function InspectorTabs({
  ariaLabel,
  defaultValue,
  value,
  onValueChange,
  tabs,
}: InspectorTabsProps) {
  return (
    <Tabs.Root
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      value={value}
    >
      <Tabs.List
        aria-label={ariaLabel}
        className="grid border-t border-line bg-board/[0.02]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            className="border-b-2 border-transparent px-2 py-2.5 text-[11px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 data-[state=active]:border-accent data-[state=active]:bg-surface data-[state=active]:text-accent"
            key={tab.value}
            value={tab.value}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content className="mt-3" key={tab.value} value={tab.value}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
