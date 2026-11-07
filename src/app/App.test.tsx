import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createDefaultProject } from '../features/project/defaultProject'
import { useProjectStore } from '../features/project/projectStore'
import App from './App'
import { AppProviders } from './providers'

const tabs = [
  { tab: /教室/, heading: '教室配置' },
  { tab: /名單/, heading: '學生名單' },
  { tab: /規則/, heading: '排座規則' },
  { tab: /排座/, heading: '安排座位' },
  { tab: /匯出/, heading: '匯出與備份' },
]

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  )
}

function addPerson(name: string, studentNo: string) {
  act(() => {
    useProjectStore.getState().addPerson({ name, studentNo })
  })
}

describe('App', () => {
  beforeEach(resetStore)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('預設顯示教室配置', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { name: '教室配置' }),
    ).toBeInTheDocument()
  })

  it.each(tabs)('切換至 $heading', async ({ tab, heading }) => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: tab }))

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('可在名單頁使用全域復原、重做與快捷鍵', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /名單/ }))
    addPerson('林品妤', '01')

    expect(screen.getByText('林品妤')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '復原' }))

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(0)
    expect(
      screen.getByRole('heading', { name: '學生名單' }),
    ).toBeVisible()

    fireEvent.keyDown(window, { ctrlKey: true, key: 'y' })

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)

    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' })

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(0)

    fireEvent.keyDown(window, {
      ctrlKey: true,
      key: 'z',
      shiftKey: true,
    })

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)
  })

  it('在文字輸入框內不攔截復原快捷鍵', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /名單/ }))
    addPerson('陳映彤', '02')

    fireEvent.keyDown(screen.getByRole('textbox', { name: '搜尋名單' }), {
      ctrlKey: true,
      key: 'z',
    })

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)
    expect(screen.getByText('陳映彤')).toBeVisible()
  })

  it('手機唯讀時停用全域復原', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    act(() => {
      useProjectStore.getState().renameProject('手機專案')
    })

    renderApp()

    const undo = screen.getByRole('button', { name: '復原' })

    await waitFor(() => expect(undo).toBeDisabled())

    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' })

    expect(useProjectStore.getState().project.name).toBe('手機專案')
  })
})
