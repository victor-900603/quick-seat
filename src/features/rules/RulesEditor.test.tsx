import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { createRule } from './ruleOps'
import { RulesEditor } from './RulesEditor'

const seatingConfig = {
  occupancy: { kind: 'full' as const },
  allocation: {
    kind: 'ordered' as const,
    orderBy: 'studentNo' as const,
    fill: 'row-major' as const,
  },
  seed: 'seed',
  partial: false,
}

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function setupRoster() {
  const store = useProjectStore.getState()
  const tagId = store.addTag({
    name: '分組',
    type: 'enum',
    options: ['A', 'B'],
  })!
  const firstId = store.addPerson({ name: '林品妤', studentNo: '01' })!
  const secondId = useProjectStore.getState().addPerson({
    name: '陳柏宇',
    studentNo: '02',
  })!
  useProjectStore.getState().setPersonsTag(
    [firstId, secondId],
    tagId,
    'A',
  )
  return { tagId, firstId, secondId }
}

describe('RulesEditor', () => {
  beforeEach(resetStore)

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('建立、編輯、停用與刪除規則', async () => {
    const user = userEvent.setup()
    const { tagId } = setupRoster()
    render(<RulesEditor />)

    expect(screen.getByText('尚未建立規則')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '新增規則' }))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: '新增規則' }),
    ).toBeVisible()
    await user.click(within(dialog).getByLabelText('A'))
    await user.click(
      within(dialog).getByRole('button', { name: '儲存規則' }),
    )

    expect(useProjectStore.getState().project.rules).toHaveLength(1)
    const rule = useProjectStore.getState().project.rules[0]
    expect(rule).toMatchObject({
      type: 'separate',
      tagId,
      values: ['A'],
      enabled: true,
    })
    expect(screen.getByText(/彼此分開/)).toBeVisible()
    expect(screen.getByText('規則已新增。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '編輯' }))
    const editDialog = screen.getByRole('dialog')
    await user.type(within(editDialog).getByLabelText('備註'), '考試分開')
    await user.click(
      within(editDialog).getByRole('button', { name: '儲存規則' }),
    )
    expect(useProjectStore.getState().project.rules[0].note).toBe(
      '考試分開',
    )

    await user.click(screen.getByLabelText('啟用規則：分開'))
    expect(useProjectStore.getState().project.rules[0].enabled).toBe(false)

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(useProjectStore.getState().project.rules).toEqual([])
    expect(screen.getByText('尚未建立規則')).toBeVisible()
  })

  it('顯示缺少標籤等驗證錯誤', async () => {
    const user = userEvent.setup()
    render(<RulesEditor />)

    await user.click(screen.getByRole('button', { name: '新增規則' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: '儲存規則' }),
    )

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      '請選擇有效的標籤。',
    )
    expect(useProjectStore.getState().project.rules).toEqual([])
  })

  it('可在沒有標籤時建立固定座位規則', async () => {
    const user = userEvent.setup()
    useProjectStore.getState().addPerson({ name: '林品妤', studentNo: '01' })
    render(<RulesEditor />)

    await user.click(screen.getByRole('button', { name: '新增規則' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('規則類型')).toHaveValue('pin')
    await user.click(
      within(dialog).getByRole('button', { name: '儲存規則' }),
    )

    expect(useProjectStore.getState().project.rules[0]).toMatchObject({
      type: 'pin',
      personId:
        useProjectStore.getState().project.roster.persons[0].id,
      seatId: 'r0c0',
    })
    expect(screen.getByText(/固定在 01/)).toBeVisible()
  })

  it('顯示既有排座結果的規則衝突', () => {
    const { tagId } = setupRoster()
    useProjectStore.getState().runSeating(seatingConfig)
    useProjectStore.getState().addRule({
      ...createRule('separate', { tagId }),
      id: 'rule-separate',
      adjacency: 'orthogonal',
    })

    render(<RulesEditor />)

    expect(screen.getAllByText('1 個衝突')).toHaveLength(1)
    expect(screen.getByText('0 / 1')).toBeVisible()
    expect(screen.getByText(/到「排座」分頁/)).toBeVisible()
  })

  it('手機唯讀時停用規則編輯', async () => {
    const { tagId } = setupRoster()
    useProjectStore.getState().addRule(
      createRule('separate', { tagId }),
    )
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(<RulesEditor />)

    expect(
      await screen.findByText(
        '手機為唯讀檢視。請使用平板或電腦編輯排座規則。',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '新增規則' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '編輯' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '刪除' })).toBeDisabled()
  })

  it('切換規則類型時保留對話框可用', async () => {
    const user = userEvent.setup()
    const { tagId } = setupRoster()
    render(<RulesEditor />)

    await user.click(screen.getByRole('button', { name: '新增規則' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('規則類型'), {
      target: { value: 'position' },
    })

    expect(within(dialog).getByLabelText('位置')).toBeVisible()
    expect(within(dialog).getByLabelText('範圍')).toBeVisible()

    fireEvent.change(within(dialog).getByLabelText('規則類型'), {
      target: { value: 'avoid' },
    })
    expect(within(dialog).getByLabelText('第一個標籤')).toBeVisible()
    expect(within(dialog).getByLabelText('第二個標籤')).toBeVisible()
    expect(tagId).not.toBe('')
  })
})
