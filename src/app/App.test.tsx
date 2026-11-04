import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AppProviders } from './providers'

const tabs = [
  { tab: /教室/, heading: '教室配置' },
  { tab: /名單/, heading: '學生名單' },
  { tab: /規則/, heading: '排座規則' },
  { tab: /排座/, heading: '安排座位' },
  { tab: /匯出/, heading: '匯出與分享' },
]

describe('App', () => {
  it('預設顯示教室配置', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    expect(
      screen.getByRole('heading', { name: '教室配置' }),
    ).toBeInTheDocument()
  })

  it.each(tabs)('切換至 $heading', async ({ tab, heading }) => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: tab }))

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })
})
