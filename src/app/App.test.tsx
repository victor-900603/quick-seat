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
import { createClassroom } from '../features/classroom/classroomOps'
import { createDefaultProject } from '../features/project/defaultProject'
import { useProjectStore } from '../features/project/projectStore'
import {
  clearClassroomShareHash,
  createClassroomShareUrl,
} from '../features/share/classroomShare'
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
  beforeEach(() => {
    resetStore()
    clearClassroomShareHash()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('預設顯示教室配置', async () => {
    renderApp()

    expect(
      await screen.findByRole(
        'heading',
        { name: '教室配置' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  it.each(tabs)('切換至 $heading', async ({ tab, heading }) => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: tab }))

    expect(
      await screen.findByRole('heading', { name: heading }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('可在名單頁使用全域復原、重做與快捷鍵', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /名單/ }))
    await screen.findByRole('heading', { name: '學生名單' })
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
    await screen.findByRole('heading', { name: '學生名單' })
    addPerson('陳映彤', '02')

    fireEvent.keyDown(screen.getByRole('textbox', { name: '搜尋名單' }), {
      ctrlKey: true,
      key: 'z',
    })

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)
    expect(screen.getByText('陳映彤')).toBeVisible()
  })

  it('可從頁首重新命名專案', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(
      screen.getByRole('button', {
        name: '重新命名專案，目前名稱：未命名教室',
      }),
    )

    expect(
      screen.getByRole('dialog', { name: '重新命名專案' }),
    ).toBeInTheDocument()

    const input = screen.getByRole('textbox', { name: '專案名稱' })

    expect(input).toHaveValue('未命名教室')
    expect(input).toHaveFocus()

    await user.clear(input)
    await user.type(input, '三年甲班')
    await user.click(screen.getByRole('button', { name: '儲存名稱' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useProjectStore.getState().project.name).toBe('三年甲班')
    expect(
      screen.getByRole('button', {
        name: '重新命名專案，目前名稱：三年甲班',
      }),
    ).toBeInTheDocument()
  })

  it('可按 Escape 取消重新命名專案', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(
      screen.getByRole('button', {
        name: '重新命名專案，目前名稱：未命名教室',
      }),
    )

    const input = screen.getByRole('textbox', { name: '專案名稱' })

    await user.clear(input)
    await user.type(input, '不會儲存')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useProjectStore.getState().project.name).toBe('未命名教室')
  })

  it('可從分享連結預覽並套用教室', async () => {
    const user = userEvent.setup()
    const shared = createClassroom({ cols: 3, rows: 2 })
    shared.cells[0] = { type: 'aisle' }
    const shareUrl = createClassroomShareUrl(shared, window.location.href)
    window.location.hash = new URL(shareUrl).hash
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp()

    expect(
      await screen.findByRole('dialog', { name: '分享的教室' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '套用到目前教室' }))

    const project = useProjectStore.getState().project
    expect(project.classroom.cols).toBe(3)
    expect(project.classroom.rows).toBe(2)
    expect(project.classroom.cells[0].type).toBe('aisle')
    expect(window.location.hash).toBe('')
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
