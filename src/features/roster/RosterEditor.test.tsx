import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { RosterEditor } from './RosterEditor'

function resetStore() {
  useProjectStore.setState({ project: createDefaultProject() })
  useProjectStore.temporal.getState().clear()
}

function addPerson(name: string, studentNo = '') {
  return useProjectStore.getState().addPerson({ name, studentNo })!
}

function csvFile(content: string, name = 'roster.csv') {
  return new File([content], name, { type: 'text/csv' })
}

function personRow(name: string) {
  const row = screen.getByText(name).closest('tr')

  if (!row) {
    throw new Error(`找不到 ${name} 的列`)
  }

  return row
}

describe('RosterEditor', () => {
  beforeEach(resetStore)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('可新增與編輯人員，並拒絕空白姓名', async () => {
    const user = userEvent.setup()
    render(<RosterEditor />)

    expect(screen.getByRole('heading', { name: '學生名單' })).toBeVisible()
    expect(screen.getByText('名單是空的')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '新增人員' }))
    await user.click(screen.getByRole('button', { name: '新增至名單' }))

    expect(screen.getByRole('alert')).toHaveTextContent('請輸入姓名。')

    await user.type(screen.getByLabelText('姓名'), '林品妤')
    await user.type(screen.getByLabelText('座號'), 'A01')
    await user.type(screen.getByLabelText('備註'), '班長')
    await user.click(screen.getByRole('button', { name: '新增至名單' }))

    const person = useProjectStore.getState().project.roster.persons[0]

    expect(person).toMatchObject({
      name: '林品妤',
      studentNo: 'A01',
      note: '班長',
    })
    expect(screen.getByText('已新增「林品妤」。')).toBeVisible()

    await user.clear(screen.getByLabelText('備註'))
    await user.type(screen.getByLabelText('備註'), '學藝股長')
    await user.click(screen.getByRole('button', { name: '儲存變更' }))

    expect(
      useProjectStore.getState().project.roster.persons[0].note,
    ).toBe('學藝股長')
    expect(screen.getByText('人員資料已儲存。')).toBeVisible()
    expect(screen.getByText('已儲存')).toBeVisible()
  })

  it('顯示匯入的額外欄位並納入搜尋', async () => {
    const user = userEvent.setup()
    const personId = addPerson('林品妤', 'A01')
    const { project } = useProjectStore.getState()

    useProjectStore.setState({
      project: {
        ...project,
        roster: {
          ...project.roster,
          extraColumns: ['電話'],
          persons: project.roster.persons.map((person) =>
            person.id === personId
              ? { ...person, extra: { 電話: '0912-345-678' } }
              : person,
          ),
        },
      },
    })

    render(<RosterEditor />)
    await user.click(personRow('林品妤'))

    expect(
      screen.getByRole('heading', { name: '其他欄位' }),
    ).toBeVisible()
    expect(screen.getByText('0912-345-678')).toBeVisible()

    await user.type(screen.getByLabelText('搜尋名單'), '0912')
    expect(screen.getByText('顯示 1 / 1 位')).toBeVisible()
  })

  it('點擊整列可開啟人員資料，勾選不影響目前選取', async () => {
    const user = userEvent.setup()
    addPerson('甲', 'A01')
    addPerson('乙', 'A02')

    render(<RosterEditor />)
    await user.click(personRow('甲'))

    expect(screen.getByLabelText('姓名')).toHaveValue('甲')
    expect(
      screen.queryByRole('button', { name: '編輯 甲' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('選取 乙'))

    expect(screen.getByLabelText('姓名')).toHaveValue('甲')
  })

  it('切換人員時會確認尚未儲存的草稿', async () => {
    const user = userEvent.setup()
    addPerson('甲', 'A01')
    addPerson('乙', 'A02')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<RosterEditor />)
    await user.click(personRow('甲'))
    await user.type(screen.getByLabelText('備註'), '前排')

    expect(screen.getByText('未儲存')).toBeVisible()

    await user.click(personRow('乙'))

    expect(confirm).toHaveBeenCalledWith(
      '目前的人員資料尚未儲存，確定要離開嗎？',
    )
    expect(screen.getByLabelText('姓名')).toHaveValue('甲')

    confirm.mockReturnValue(true)
    await user.click(personRow('乙'))

    expect(screen.getByLabelText('姓名')).toHaveValue('乙')
    expect(screen.getByLabelText('備註')).toHaveValue('')
  })

  it('刪除人員前會確認，取消時保留資料', async () => {
    const user = userEvent.setup()
    addPerson('林品妤', 'A01')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<RosterEditor />)
    await user.click(personRow('林品妤'))
    await user.click(screen.getByRole('button', { name: '刪除' }))

    expect(confirm).toHaveBeenCalledWith(
      '確定刪除「林品妤」嗎？此操作可以復原。',
    )
    expect(useProjectStore.getState().project.roster.persons).toHaveLength(1)

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: '刪除' }))

    expect(useProjectStore.getState().project.roster.persons).toHaveLength(0)
    expect(screen.getByText('已刪除人員，可使用復原恢復。')).toBeVisible()
    expect(screen.getByText('名單是空的')).toBeVisible()
  })

  it('可建立、編輯與刪除標籤，並套用到人員', async () => {
    const user = userEvent.setup()
    addPerson('林品妤', 'A01')

    render(<RosterEditor />)
    await user.click(personRow('林品妤'))
    await user.click(screen.getByRole('tab', { name: '標籤' }))
    await user.click(screen.getByRole('button', { name: '新增標籤' }))
    await user.type(screen.getByLabelText('名稱'), '組別')
    await user.type(screen.getByLabelText('選項'), 'A、B')
    await user.click(screen.getByRole('button', { name: '儲存標籤' }))

    const tag = useProjectStore.getState().project.roster.tags[0]

    expect(tag).toMatchObject({ name: '組別', options: ['A', 'B'] })
    expect(screen.getByText('已建立標籤「組別」。')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: '人員' }))
    await user.selectOptions(screen.getByLabelText('組別'), 'A')
    await user.click(screen.getByRole('button', { name: '儲存變更' }))

    expect(
      useProjectStore.getState().project.roster.persons[0].tags[tag.id],
    ).toBe('A')

    await user.click(screen.getByRole('tab', { name: '標籤' }))
    await user.click(screen.getByRole('button', { name: '編輯標籤 組別' }))
    await user.clear(screen.getByLabelText('名稱'))
    await user.type(screen.getByLabelText('名稱'), '小組')
    await user.click(screen.getByRole('button', { name: '儲存標籤' }))

    expect(useProjectStore.getState().project.roster.tags[0].name).toBe('小組')
    expect(screen.getByText('標籤設定已更新。')).toBeVisible()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: '刪除標籤 小組' }))

    expect(useProjectStore.getState().project.roster.tags).toHaveLength(0)
    expect(
      useProjectStore.getState().project.roster.persons[0].tags,
    ).toEqual({})
    expect(
      screen.getByText('已刪除標籤及相關人員值與規則，可使用復原恢復。'),
    ).toBeVisible()
  })

  it('可設定選項、數值與是／否三種標籤值', async () => {
    const user = userEvent.setup()
    const store = useProjectStore.getState()
    const groupId = store.addTag({
      name: '組別',
      type: 'enum',
      options: ['A', 'B'],
    })!
    const heightId = store.addTag({ name: '身高', type: 'number' })!
    const leaderId = store.addTag({ name: '幹部', type: 'boolean' })!
    addPerson('林品妤', 'A01')

    render(<RosterEditor />)
    await user.click(personRow('林品妤'))

    await user.selectOptions(screen.getByLabelText('組別'), 'B')
    await user.type(screen.getByLabelText('身高'), '165')
    await user.selectOptions(screen.getByLabelText('幹部'), 'true')
    await user.click(screen.getByRole('button', { name: '儲存變更' }))

    expect(
      useProjectStore.getState().project.roster.persons[0].tags,
    ).toEqual({
      [groupId]: 'B',
      [heightId]: 165,
      [leaderId]: true,
    })
  })

  it('可批次套用與清除標籤', async () => {
    const user = userEvent.setup()
    const tagId = useProjectStore.getState().addTag({
      name: '組別',
      type: 'enum',
      options: ['A', 'B'],
    })!
    addPerson('甲')
    addPerson('乙')

    render(<RosterEditor />)
    await user.click(screen.getByLabelText('選取 甲'))
    await user.click(screen.getByLabelText('選取 乙'))

    expect(screen.getByText('已選 2 位')).toBeVisible()

    await user.selectOptions(screen.getByLabelText('批次標籤'), tagId)
    await user.selectOptions(screen.getByLabelText('組別'), 'A')
    await user.click(screen.getByRole('button', { name: '套用' }))

    expect(
      useProjectStore
        .getState()
        .project.roster.persons.map((person) => person.tags[tagId]),
    ).toEqual(['A', 'A'])
    expect(screen.getByText('已套用標籤至 2 位人員。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '清除此標籤' }))

    expect(
      useProjectStore
        .getState()
        .project.roster.persons.map((person) => person.tags[tagId]),
    ).toEqual([undefined, undefined])
    expect(screen.getByText('已清除 2 位人員的標籤值。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '取消選取' }))
    expect(screen.queryByText('已選 2 位')).not.toBeInTheDocument()
  })

  it('可依姓名、座號與標籤搜尋並清除條件', async () => {
    const user = userEvent.setup()
    addPerson('甲', 'A01')
    addPerson('乙', 'A02')
    addPerson('丙', 'A03')

    render(<RosterEditor />)
    await user.type(screen.getByRole('textbox', { name: '搜尋名單' }), '乙')

    expect(screen.getByText('顯示 1 / 3 位')).toBeVisible()
    expect(
      screen.getByRole('button', { name: '開啟 乙 的人員資料' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: '開啟 甲 的人員資料' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清除' }))

    expect(screen.getByText('顯示 3 / 3 位')).toBeVisible()
  })

  it('可匯入 CSV、預覽略過數量並合併名單', async () => {
    const user = userEvent.setup()
    addPerson('舊生', 'A01')

    render(<RosterEditor />)
    await user.click(screen.getByRole('button', { name: '匯入名單' }))

    expect(
      screen.getByText('Excel 僅支援 .xlsx，舊版 .xls 請先另存新檔'),
    ).toBeVisible()

    fireEvent.change(screen.getByLabelText('選擇檔案'), {
      target: {
        files: [csvFile('姓名,座號\n甲,A01\n乙,A02\n')],
      },
    })

    expect(await screen.findByText(/可匯入 1 位/)).toBeVisible()
    expect(
      screen.getByText('檔案已讀取，請確認欄位映射。'),
    ).toBeVisible()
    expect(
      screen.queryByText('Excel 僅支援 .xlsx，舊版 .xls 請先另存新檔'),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/另略過 1 位既有座號/)).toBeVisible()
    expect(screen.getByText('欄位與資料檢查通過。')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: '匯入 1 位人員' }),
    )

    expect(
      useProjectStore
        .getState()
        .project.roster.persons.map((person) => person.name),
    ).toEqual(['舊生', '乙'])
    expect(
      screen.getByText('已匯入 1 位人員，略過 1 位既有座號。'),
    ).toBeVisible()
    expect(screen.queryByText('欄位映射')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '匯入名單' }))
    await user.click(screen.getByRole('button', { name: '關閉' }))

    expect(
      screen.queryByText('將 CSV、TSV 或 XLSX 檔案拖曳到這裡'),
    ).not.toBeInTheDocument()
  })

  it('不支援的檔案與缺少姓名欄位會顯示錯誤', async () => {
    const user = userEvent.setup()
    render(<RosterEditor />)
    await user.click(screen.getByRole('button', { name: '匯入名單' }))

    fireEvent.change(screen.getByLabelText('選擇檔案'), {
      target: {
        files: [csvFile('姓名\n甲\n', 'legacy.xls')],
      },
    })

    expect(
      await screen.findByText('僅支援 CSV、TSV 或 XLSX 檔案。'),
    ).toBeVisible()

    fireEvent.change(screen.getByLabelText('選擇檔案'), {
      target: {
        files: [csvFile('座號\nA01\n')],
      },
    })

    expect(
      await screen.findByText('請指定一個姓名欄位。'),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: '匯入 0 位人員' }),
    ).toBeDisabled()
  })

  it('手機寬度下顯示唯讀提示並停用編輯', async () => {
    addPerson('林品妤', 'A01')
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(<RosterEditor />)

    expect(
      await screen.findByText(
        '手機為唯讀檢視。請使用平板或電腦編輯名單與標籤。',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '匯入名單' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '新增人員' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('tab', { name: '標籤' }))
    expect(screen.getByRole('button', { name: '新增標籤' })).toBeDisabled()
    expect(screen.queryByLabelText('選取 林品妤')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByLabelText('選取全部人員')).not.toBeInTheDocument()
    })

    expect(within(screen.getByRole('table')).getByText('林品妤')).toBeVisible()
  })
})
