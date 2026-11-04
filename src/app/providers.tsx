import type { ReactNode } from 'react'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * 集中掛載全域 Provider。目前僅包裝 children，後續加入共用 UI 與
 * 狀態相關的 Provider 時由此擴充。
 */
export function AppProviders({ children }: AppProvidersProps) {
  return children
}
