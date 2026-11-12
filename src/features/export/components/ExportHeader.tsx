import type { ReactNode } from 'react'
import { PageHeader } from '../../../components/PageHeader'

export interface ExportStat {
  label: string
  value: string | number
}

export function ExportHeader({
  actions,
  stats,
}: {
  actions?: ReactNode
  stats: ExportStat[]
}) {
  return (
    <PageHeader
      actions={actions}
      description="先在左側確認列印結果，再輸出座位表或下載完整專案備份。"
      kicker="EXPORT"
      stats={stats}
      statsLabel="匯出統計"
      step="05"
      title="匯出與備份"
    />
  )
}
