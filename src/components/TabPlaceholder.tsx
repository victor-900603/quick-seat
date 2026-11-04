import type { ReactNode } from 'react'
import type { TabId } from '../app/tabs'
import { getTab } from '../app/tabs'
import { StepPlaceholder } from './StepPlaceholder'

interface TabPlaceholderProps {
  id: TabId
  preview: ReactNode
}

export function TabPlaceholder({ id, preview }: TabPlaceholderProps) {
  const tab = getTab(id)

  return (
    <StepPlaceholder
      description={tab.description}
      items={tab.planned}
      kicker={tab.kicker}
      preview={preview}
      previewLabel={tab.previewLabel}
      step={tab.step}
      title={tab.title}
    />
  )
}
