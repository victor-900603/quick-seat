import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('預設顯示教室配置', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '教室配置' }),
    ).toBeInTheDocument()
  })

  it('切換分頁後顯示對應內容', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /名單/ }))

    expect(
      screen.getByRole('heading', { name: '學生名單' }),
    ).toBeInTheDocument()
  })
})
