import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { SeatingEditor } from './SeatingEditor'

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function addPersons(entries: Array<[string, string]>) {
  act(() => {
    for (const [name, studentNo] of entries) {
      useProjectStore.getState().addPerson({ name, studentNo })
    }
  })
}

function seatButton(code: string) {
  return screen.getByRole('button', {
    name: new RegExp(`^座位 ${code}，`),
  })
}

function currentAssignments() {
  return useProjectStore.getState().project.currentAssignment?.assignments ?? {}
}

describe('SeatingEditor', () => {
  beforeEach(resetStore)

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('渲染空名單與預設連續座位', () => {
    render(<SeatingEditor />)

    expect(screen.getByRole('heading', { name: '安排座位' })).toBeVisible()
    expect(
      screen.getByText('名單尚無人員。請先到「名單」分頁新增或匯入學生。'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '連續座位' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: '開始排座' }),
    ).toBeDisabled()
    expect(seatButton('01')).toHaveAttribute('data-active', 'true')
  })

  it('可切換手動排座並直接安排第一位人員', async () => {
    const user = userEvent.setup()
    addPersons([
      ['林品妤', '1'],
      ['陳柏宇', '2'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '手動排座' }))

    expect(screen.queryByText('人員分配方式')).not.toBeInTheDocument()
    expect(screen.queryByText('排序依據')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '開始手動排座' }),
    ).not.toBeInTheDocument()

    const historyBefore =
      useProjectStore.temporal.getState().pastStates.length

    await user.click(
      screen.getByRole('button', { name: '選取未分配人員 林品妤' }),
    )
    await user.click(seatButton('01'))

    const assignment = useProjectStore.getState().project.currentAssignment
    const personId = useProjectStore
      .getState()
      .project.roster.persons.find((person) => person.name === '林品妤')?.id
    expect(assignment?.source).toBe('manual')
    expect(assignment?.assignments).toEqual({ r0c0: personId })
    expect(assignment?.unassignedPersonIds).toHaveLength(1)
    expect(currentAssignments().r0c0).toBe(personId)
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(
      historyBefore + 1,
    )
    expect(
      screen.queryByRole('button', { name: '選取未分配人員 林品妤' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '自動排座' }))
    expect(screen.getByText('人員分配方式')).toBeVisible()
  })

  it('手動排座在座位不足時仍可直接安排', async () => {
    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().resizeRoom(2, 2)
    })
    addPersons([
      ['林品妤', '1'],
      ['陳柏宇', '2'],
      ['張書妍', '3'],
      ['王柏翰', '4'],
      ['李欣潔', '5'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '手動排座' }))

    expect(
      screen.queryByRole('button', { name: '只排部分人員' }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '選取未分配人員 林品妤' }),
    )
    await user.click(seatButton('01'))

    expect(
      useProjectStore.getState().project.currentAssignment?.source,
    ).toBe('manual')
    expect(currentAssignments().r0c0).toBeTruthy()
    expect(
      useProjectStore.getState().project.currentAssignment
        ?.unassignedPersonIds,
    ).toHaveLength(4)
  })

  it('依座號排序後產生座位表', async () => {
    const user = userEvent.setup()
    addPersons([
      ['林品妤', '3'],
      ['陳柏宇', '1'],
      ['張家瑄', '2'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))

    const assignments = currentAssignments()
    expect(assignments['r0c0']).toBe(
      useProjectStore.getState().project.roster.persons[1].id,
    )
    expect(assignments['r0c1']).toBe(
      useProjectStore.getState().project.roster.persons[2].id,
    )
    expect(assignments['r0c2']).toBe(
      useProjectStore.getState().project.roster.persons[0].id,
    )
    expect(seatButton('01')).toHaveAccessibleName(/座位 01，陳柏宇/)
    expect(
      screen.getByRole('button', { name: '重新排座' }),
    ).toBeVisible()
  })

  it('相同隨機種子可重現相同座位', async () => {
    const user = userEvent.setup()
    addPersons([
      ['甲', '1'],
      ['乙', '2'],
      ['丙', '3'],
      ['丁', '4'],
      ['戊', '5'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '隨機分配' }))
    const seed = screen.getByRole('textbox', { name: '隨機種子' })
    await user.clear(seed)
    await user.type(seed, 'seed-123')
    await user.click(screen.getByRole('button', { name: '開始排座' }))

    const first = { ...currentAssignments() }

    await user.click(screen.getByRole('button', { name: '重新排座' }))

    expect(currentAssignments()).toEqual(first)
    expect(useProjectStore.getState().project.currentAssignment?.seed).toBe(
      'seed-123',
    )
  })

  it('梅花座只使用指定相位的座位', async () => {
    const user = userEvent.setup()
    addPersons([
      ['甲', '1'],
      ['乙', '2'],
      ['丙', '3'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '梅花座' }))
    await user.click(screen.getByRole('button', { name: '相位 0' }))
    await user.click(screen.getByRole('button', { name: '開始排座' }))

    const assignments = currentAssignments()

    expect(Object.keys(assignments)).toHaveLength(3)
    for (const seatId of Object.keys(assignments)) {
      const match = /^r(\d+)c(\d+)$/.exec(seatId)
      expect(match).not.toBeNull()
      expect((Number(match?.[1]) + Number(match?.[2])) % 2).toBe(0)
    }
    expect(seatButton('02')).toHaveAttribute('data-active', 'false')
  })

  it('點選兩個座位只會切換選取，不會交換人員', async () => {
    const user = userEvent.setup()
    addPersons([
      ['甲', '1'],
      ['乙', '2'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    const firstPerson = currentAssignments()['r0c0']
    const secondPerson = currentAssignments()['r0c1']

    await user.click(seatButton('01'))
    await user.click(seatButton('02'))

    expect(currentAssignments()['r0c0']).toBe(firstPerson)
    expect(currentAssignments()['r0c1']).toBe(secondPerson)
    expect(screen.getByRole('heading', { name: '02' })).toBeVisible()
    expect(screen.queryByText('座位已更新。')).not.toBeInTheDocument()
  })

  it('可鎖定與解除鎖定人員', async () => {
    const user = userEvent.setup()
    addPersons([
      ['甲', '1'],
      ['乙', '2'],
    ])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.click(seatButton('01'))
    await user.click(screen.getByRole('button', { name: '鎖定人員' }))

    expect(useProjectStore.getState().project.lockedPersonIds).toHaveLength(1)

    await user.click(seatButton('02'))
    await user.click(seatButton('01'))

    expect(screen.getByRole('button', { name: '解除鎖定' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '解除鎖定' }))

    expect(useProjectStore.getState().project.lockedPersonIds).toHaveLength(0)
  })

  it('可將人員移回未分配，再點選座位重新安排', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.click(seatButton('01'))
    await user.click(screen.getByRole('button', { name: '移回未分配' }))

    expect(currentAssignments()).toEqual({})
    expect(
      screen.getByRole('button', { name: '選取未分配人員 林品妤' }),
    ).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: '選取未分配人員 林品妤' }),
    )
    await user.click(seatButton('05'))

    expect(currentAssignments()['r0c4']).toBe(
      useProjectStore.getState().project.roster.persons[0].id,
    )
  })

  it('可用再次點擊、取消按鈕與 Escape 清除選取', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(seatButton('01'))
    expect(
      screen.getByRole('button', { name: '關閉座位詳情' }),
    ).toBeVisible()

    await user.click(seatButton('01'))
    expect(
      screen.queryByRole('button', { name: '關閉座位詳情' }),
    ).not.toBeInTheDocument()

    await user.click(seatButton('02'))
    await user.click(screen.getByRole('button', { name: '取消目前選取' }))
    expect(
      screen.queryByRole('button', { name: '關閉座位詳情' }),
    ).not.toBeInTheDocument()

    await user.click(seatButton('01'))
    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('button', { name: '關閉座位詳情' }),
    ).not.toBeInTheDocument()

    const personButton = screen.getByRole('button', {
      name: '選取未分配人員 林品妤',
    })
    await user.click(personButton)
    expect(personButton).toHaveAttribute('aria-pressed', 'true')
    await user.click(personButton)
    expect(personButton).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.queryByRole('button', { name: '取消選取' }),
    ).not.toBeInTheDocument()
  })

  it('可點擊座位圖空白處取消選取', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    const map = screen.getByRole('group', { name: '排座座位圖' })

    await user.click(seatButton('01'))
    expect(
      screen.getByRole('button', { name: '關閉座位詳情' }),
    ).toBeVisible()

    await user.click(map)
    expect(
      screen.queryByRole('button', { name: '關閉座位詳情' }),
    ).not.toBeInTheDocument()

    const personButton = screen.getByRole('button', {
      name: '選取未分配人員 林品妤',
    })
    await user.click(personButton)
    expect(personButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(map)
    expect(personButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('先選座位再點未分配人員可直接安排', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '手動排座' }))
    await user.click(seatButton('01'))
    await user.click(
      screen.getByRole('button', { name: '選取未分配人員 林品妤' }),
    )

    const assignment = useProjectStore.getState().project.currentAssignment
    expect(assignment?.source).toBe('manual')
    expect(assignment?.assignments.r0c0).toBe(
      useProjectStore.getState().project.roster.persons[0].id,
    )
    expect(seatButton('01')).toHaveAccessibleName(/座位 01，林品妤/)
    expect(
      screen.queryByRole('button', { name: '選取未分配人員 林品妤' }),
    ).not.toBeInTheDocument()
  })

  it('座位不足時可只排部分人員', async () => {
    const user = userEvent.setup()
    addPersons(
      Array.from(
        { length: 20 },
        (_, index) => [`學生 ${index + 1}`, String(index + 1)] as [string, string],
      ),
    )
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '梅花座' }))
    await user.click(screen.getByRole('button', { name: '相位 0' }))

    expect(screen.getByText(/座位不足，還缺 5 個/)).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: '只排部分人員' }),
    )

    expect(
      useProjectStore.getState().project.currentAssignment?.unassignedPersonIds,
    ).toHaveLength(5)
  })

  it('座位不足時可自動擴充教室', async () => {
    const user = userEvent.setup()
    addPersons(
      Array.from(
        { length: 32 },
        (_, index) => [`學生 ${index + 1}`, String(index + 1)] as [string, string],
      ),
    )
    render(<SeatingEditor />)

    expect(screen.getByText(/座位不足，還缺 2 個/)).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: '自動擴充教室' }),
    )

    expect(useProjectStore.getState().project.classroom.cols).toBe(6)
    expect(useProjectStore.getState().project.classroom.rows).toBe(6)
    expect(screen.getByText('教室已擴充為 6 欄 × 6 列。')).toBeVisible()
  })

  it('切換座位標示會更新座位圖文字', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', 'A01']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: '座位標示' }),
      'studentNo',
    )

    expect(seatButton('01')).toHaveAccessibleName(/A01/)

    await user.selectOptions(
      screen.getByRole('combobox', { name: '座位標示' }),
      'both',
    )

    expect(seatButton('01')).toHaveAccessibleName(/林品妤 · A01/)
  })

  it('可清除排座結果並保留名單', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.click(screen.getByRole('button', { name: '清除排座結果' }))

    expect(useProjectStore.getState().project.currentAssignment).toBeNull()
    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)
    expect(screen.getByRole('button', { name: '開始排座' })).toBeVisible()
  })

  it('名單變更後顯示結果過期警示', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    act(() => {
      useProjectStore.getState().addPerson({ name: '陳柏宇', studentNo: '2' })
    })

    expect(
      screen.getByText('名單、教室或規則已變更，目前座位圖可能不是最新結果。'),
    ).toBeVisible()
  })

  it('切換座位模式後顯示設定已變更警示', async () => {
    const user = userEvent.setup()
    addPersons([['林品妤', '1']])
    render(<SeatingEditor />)

    await user.click(screen.getByRole('button', { name: '開始排座' }))
    await user.click(screen.getByRole('button', { name: '梅花座' }))

    expect(
      screen.getByText(
        '排座設定已變更，座位圖仍顯示上一次的結果。',
      ),
    ).toBeVisible()
    expect(
      useProjectStore.getState().project.currentAssignment?.occupancy,
    ).toEqual({ kind: 'full' })
  })

  it('沒有可用座位時顯示提示', () => {
    act(() => {
      const classroom = useProjectStore.getState().project.classroom
      const positions = Array.from(
        { length: classroom.cols * classroom.rows },
        (_, index) => ({
          row: Math.floor(index / classroom.cols),
          col: index % classroom.cols,
        }),
      )
      useProjectStore.getState().applyCellTypes(positions, 'blocked')
      useProjectStore.getState().addPerson({ name: '林品妤', studentNo: '1' })
    })

    render(<SeatingEditor />)

    expect(
      screen.getByText(
        '目前設定沒有可用座位。請調整教室配置或座位使用模式。',
      ),
    ).toBeVisible()
  })

  it('手機唯讀時停用排座操作', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    addPersons([['林品妤', '1']])

    render(<SeatingEditor />)

    expect(
      screen.getByText(
        '手機為唯讀檢視。請使用平板或電腦編輯排座設定與座位。',
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: '開始排座' }),
    ).toBeDisabled()
  })
})
