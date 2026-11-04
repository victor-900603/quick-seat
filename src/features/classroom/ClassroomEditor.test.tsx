import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
import { AppProviders } from '../../app/providers'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { ClassroomEditor } from './ClassroomEditor'

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function getCell(row: number, col: number) {
  return screen.getByRole('button', {
    name: new RegExp(`^第 ${row + 1} 列第 ${col + 1} 欄，`),
  })
}

function getGrid() {
  return screen.getByRole('group', { name: '教室座位配置' })
}

describe('ClassroomEditor', () => {
  beforeEach(resetStore)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('渲染預設 6 × 5 教室與統計數量', () => {
    render(<ClassroomEditor />)

    expect(screen.getByRole('heading', { name: '教室配置' })).toBeVisible()
    expect(
      within(getGrid()).getAllByRole('button', { name: /，座位/ }),
    ).toHaveLength(30)
    expect(screen.getByText('將游標移到格子上查看座標')).toBeVisible()
  })

  it('選取格子後可切換型別，並以一次復原回到原狀', async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    fireEvent.pointerDown(getCell(0, 0), {
      pointerType: 'mouse',
      button: 0,
    })

    expect(getCell(0, 0)).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '走道' }))

    expect(useProjectStore.getState().project.classroom.cells[0].type).toBe(
      'aisle',
    )

    await user.click(screen.getByRole('button', { name: '復原' }))

    expect(useProjectStore.getState().project.classroom.cells[0].type).toBe(
      'seat',
    )
  })

  it('拖曳上色只建立一筆歷史，復原會還原整段筆畫', async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: '走道（3）' }))

    fireEvent.pointerDown(getCell(0, 0), {
      pointerType: 'mouse',
      button: 0,
    })
    fireEvent.pointerOver(getCell(0, 1))
    fireEvent.pointerOver(getCell(0, 2))
    fireEvent.pointerUp(window)

    const cells = useProjectStore.getState().project.classroom.cells

    expect(cells.slice(0, 3).every((cell) => cell.type === 'aisle')).toBe(true)
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: '復原' }))

    expect(
      useProjectStore
        .getState()
        .project.classroom.cells.slice(0, 3)
        .every((cell) => cell.type === 'seat'),
    ).toBe(true)
  })

  it('矩形工具可預覽並填入指定型別', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    await user.click(screen.getByRole('button', { name: '矩形（6）' }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: '矩形填入型別' }),
      '禁坐',
    )

    fireEvent.pointerDown(getCell(0, 0), {
      pointerType: 'mouse',
      button: 0,
    })
    fireEvent.pointerOver(getCell(1, 1))

    expect(getCell(1, 1)).toHaveAccessibleName(/禁坐/)

    fireEvent.pointerUp(window)

    const cells = useProjectStore.getState().project.classroom.cells

    expect(cells[0].type).toBe('blocked')
    expect(cells[1].type).toBe('blocked')
    expect(cells[6].type).toBe('blocked')
    expect(cells[7].type).toBe('blocked')
    expect(cells[2].type).toBe('seat')
  })

  it('可把整列與整欄設為走道', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    fireEvent.pointerDown(getCell(1, 1), {
      pointerType: 'mouse',
      button: 0,
    })

    await user.click(screen.getByRole('button', { name: '整列走道' }))
    await user.click(screen.getByRole('button', { name: '整欄走道' }))

    const cells = useProjectStore.getState().project.classroom.cells

    expect(cells.filter((cell) => cell.type === 'aisle')).toHaveLength(10)
    expect(cells.filter((cell) => cell.type === 'seat')).toHaveLength(20)
  })

  it('可覆寫單一座位編號並清除', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    fireEvent.pointerDown(getCell(0, 0), {
      pointerType: 'mouse',
      button: 0,
    })

    const input = screen.getByRole('textbox', { name: '座位編號覆寫' })

    await user.clear(input)
    await user.type(input, 'A1')
    await user.click(screen.getByRole('button', { name: '套用' }))

    expect(getCell(0, 0)).toHaveAccessibleName(/A1/)
    expect(
      useProjectStore.getState().project.classroom.codeOverrides.r0c0,
    ).toBe('A1')

    await user.click(screen.getByRole('button', { name: '清除' }))

    expect(getCell(0, 0)).toHaveAccessibleName(/01/)
    expect(
      useProjectStore.getState().project.classroom.codeOverrides.r0c0,
    ).toBeUndefined()
  })

  it('可調整編號樣式、補零位數與起始序號', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    const pad = screen.getByRole('textbox', { name: '補零位數' })

    await user.clear(pad)
    await user.type(pad, '3')
    await user.tab()

    expect(within(getGrid()).getByText('001')).toBeVisible()

    const startAt = screen.getByRole('textbox', { name: '起始序號' })

    await user.clear(startAt)
    await user.type(startAt, '5')
    await user.tab()

    expect(within(getGrid()).getByText('005')).toBeVisible()

    const pattern = screen.getByRole('textbox', { name: '編號樣式' })

    await user.clear(pattern)
    fireEvent.change(pattern, { target: { value: '{row}-{col}' } })
    fireEvent.keyDown(pattern, { key: 'Enter' })

    expect(
      useProjectStore.getState().project.classroom.numbering.pattern,
    ).toBe('{row}-{col}')
    expect(within(getGrid()).getByText('1-1')).toBeVisible()
  })

  it('調整教室尺寸會新增座位並移除失效的編號覆寫', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    fireEvent.pointerDown(getCell(0, 5), {
      pointerType: 'mouse',
      button: 0,
    })

    await user.type(
      screen.getByRole('textbox', { name: '座位編號覆寫' }),
      'Z9',
    )
    await user.click(screen.getByRole('button', { name: '套用' }))

    const cols = screen.getByRole('textbox', { name: '欄數' })

    await user.clear(cols)
    await user.type(cols, '2')
    await user.tab()

    const classroom = useProjectStore.getState().project.classroom

    expect(classroom.cols).toBe(2)
    expect(classroom.cells).toHaveLength(10)
    expect(classroom.codeOverrides).toEqual({})

    await user.clear(cols)
    await user.type(cols, '8')
    await user.tab()

    expect(
      useProjectStore.getState().project.classroom.cells,
    ).toHaveLength(40)
  })

  it('數字鍵切換工具、方向鍵移動選取', async () => {
    render(<ClassroomEditor />)

    const grid = getGrid()

    fireEvent.keyDown(grid, { key: '3' })

    expect(screen.getByRole('button', { name: '走道（3）' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowDown' })

    expect(getCell(1, 1)).toHaveAttribute('aria-pressed', 'true')
  })

  it('縮放會改變格子顯示尺寸，重設回到 100%', async () => {
    const user = userEvent.setup()
    render(<ClassroomEditor />)

    await user.click(screen.getByRole('button', { name: '放大' }))

    expect(getCell(0, 0)).toHaveStyle({ width: '65px', height: '65px' })

    await user.click(screen.getByRole('button', { name: '重設縮放' }))

    expect(getCell(0, 0)).toHaveStyle({ width: '52px', height: '52px' })
  })

  it('手機寬度下為唯讀並顯示提示', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(<ClassroomEditor />)

    expect(
      screen.getByText('手機為唯讀檢視。請使用平板或電腦編輯教室配置。'),
    ).toBeVisible()
    expect(getGrid()).toHaveAttribute('tabindex', '-1')
    expect(getCell(0, 0)).toBeDisabled()
    expect(screen.getByRole('button', { name: '走道（3）' })).toBeDisabled()
  })
})
