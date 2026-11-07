import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { ExportEditor } from './ExportEditor'
import { downloadBlob, downloadText } from './download'
import { serializeProject } from './projectFile'
import { createWorkbookBlob } from './workbook'

vi.mock('./download', () => ({
  downloadBlob: vi.fn(),
  downloadText: vi.fn(),
}))

vi.mock('./workbook', () => ({
  createWorkbookBlob: vi.fn(),
}))

const workbookBlob = new Blob(['xlsx'])
const downloadBlobMock = vi.mocked(downloadBlob)
const downloadTextMock = vi.mocked(downloadText)
const workbookMock = vi.mocked(createWorkbookBlob)

function prepareProject(project = createExportFixture()) {
  useProjectStore.setState({ project })
  useProjectStore.temporal.getState().clear()
}

describe('ExportEditor', () => {
  beforeEach(() => {
    prepareProject()
    workbookMock.mockReset()
    workbookMock.mockResolvedValue(workbookBlob)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('沒有排座結果時停用座位表匯出，但仍可下載專案 JSON', async () => {
    prepareProject(createDefaultProject())
    const user = userEvent.setup()
    render(<ExportEditor />)

    expect(
      screen.getByText(
        '尚未排座，沒有座位表可輸出。專案 JSON 仍可下載作為備份。',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '下載 Excel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下載 HTML' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '匯出專案 JSON' }))

    expect(downloadTextMock).toHaveBeenCalledTimes(1)
    expect(downloadTextMock.mock.calls[0][1]).toMatch(
      /^QuickSeat-未命名教室-\d{8}-\d{4}\.json$/,
    )
    expect(screen.getByText('已下載專案 JSON 備份。')).toBeVisible()
  })

  it('未分配名單關閉時停用名單細節選項', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('tab', { name: '顯示' }))
    const notes = screen.getByLabelText('未分配備註')
    const tags = screen.getByLabelText('未分配標籤')
    const unassigned = screen.getByLabelText('未分配名單')

    expect(notes).toBeEnabled()
    expect(tags).toBeEnabled()

    await user.click(unassigned)
    expect(notes).toBeDisabled()
    expect(tags).toBeDisabled()

    await user.click(unassigned)
    expect(notes).toBeEnabled()
    expect(tags).toBeEnabled()
  })

  it('可下載 Excel 座位表並顯示成功提示', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledWith(
        workbookBlob,
        expect.stringMatching(
          /^QuickSeat-三年甲班-\d{8}-\d{4}\.xlsx$/,
        ),
      )
    })
    expect(workbookMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('已下載 Excel 座位表。')).toBeVisible()
  })

  it('匯出時套用座位內容模板', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('座位內容模板'), {
      target: { value: '{name}｜{tag:分組}' },
    })
    expect(screen.getByText('{tag:分組}')).toBeVisible()
    expect(screen.getByText('{extra:電話}')).toBeVisible()
    await user.click(screen.getByLabelText('靠左'))
    await user.click(screen.getByRole('button', { name: '下載 HTML' }))

    const html = downloadTextMock.mock.calls[0][0]

    expect(html).toContain('林品妤｜A')
    expect(html).not.toContain('01\n林品妤\n01')
    expect(html).toContain('align-left')

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          template: '{name}｜{tag:分組}',
          align: 'left',
        }),
      )
    })
  })

  it('可調整紙張、格高、字級與關閉自動換行並套用到下載', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('紙張'), {
      target: { value: 'A3' },
    })
    await user.click(screen.getByRole('tab', { name: '版面' }))
    fireEvent.change(screen.getByLabelText('格高'), {
      target: { value: '72' },
    })
    fireEvent.change(document.getElementById('html-font-size')!, {
      target: { value: '13' },
    })
    fireEvent.click(screen.getByLabelText('自動換行'))

    await user.click(screen.getByRole('button', { name: '下載 HTML' }))
    const html = downloadTextMock.mock.calls[0][0]
    expect(html).toContain('--page-width:420mm')
    expect(html).toContain('--page-height:297mm')
    expect(html).toContain('--cell-height:72px')
    expect(html).toContain('--font-size:13px')
    expect(html).toContain('seat-grid no-wrap')
    expect(screen.getByTitle('即時頁面預覽')).toHaveStyle({
      width: '1643px',
    })

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paperSize: 'A3',
          htmlCellHeight: 72,
          htmlFontSize: 13,
          htmlWrap: false,
        }),
      )
    })
  })

  it('可調整紙張分頁、顯示內容與 Excel 欄位', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('紙張'), {
      target: { value: 'A3' },
    })
    fireEvent.change(screen.getByLabelText('方向'), {
      target: { value: 'portrait' },
    })
    await user.click(screen.getByRole('tab', { name: '版面' }))
    fireEvent.change(screen.getByLabelText('每頁列數'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: '重複表頭' }))
    await user.click(screen.getByRole('tab', { name: '顯示' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '未分配名單' }))
    await user.click(screen.getByRole('tab', { name: 'Excel' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '電話' }))

    await user.click(screen.getByRole('button', { name: '下載 HTML' }))
    const html = downloadTextMock.mock.calls[0][0]

    expect(html).toContain('size: A3 portrait')
    expect(html).toContain('第 1 / 3 頁')
    expect(html).toContain('--cell-gap:5px')
    expect((html.match(/<header>/g) ?? [])).toHaveLength(1)
    expect(html).not.toContain('未分配人員')

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paperSize: 'A3',
          orientation: 'portrait',
          rowsPerPage: 2,
          repeatHeader: false,
          showUnassigned: false,
          excelHiddenColumns: expect.arrayContaining(['extra:電話']),
        }),
      )
    })
  })

  it('可開啟 PDF 列印預覽並關閉', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '預覽 / 列印 PDF' }))

    expect(
      screen.getByRole('dialog', { name: '列印預覽' }),
    ).toBeInTheDocument()
    expect(
      screen.getByTitle('座位表列印預覽'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('可開啟放大預覽並關閉', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '放大預覽' }))

    expect(
      screen.getByRole('dialog', { name: '放大預覽' }),
    ).toBeInTheDocument()
    expect(screen.getByTitle('放大頁面預覽')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('點選可用變數會插入游標位置', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    const textarea = screen.getByLabelText(
      '座位內容模板',
    ) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'AB' } })
    textarea.focus()
    textarea.setSelectionRange(1, 1)

    await user.click(
      screen.getByRole('button', { name: '插入 {name}（姓名）' }),
    )

    expect(textarea).toHaveValue('A{name}B')
    expect(textarea).toHaveFocus()
    expect(textarea).toHaveProperty('selectionStart', 7)
    expect(textarea).toHaveProperty('selectionEnd', 7)
  })

  it('切換頁面後保留座位內容模板', async () => {
    const user = userEvent.setup()
    const view = render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('座位內容模板'), {
      target: { value: '{name}｜{studentNo}' },
    })
    await user.click(screen.getByLabelText('靠左'))
    view.unmount()
    render(<ExportEditor />)

    expect(screen.getByLabelText('座位內容模板')).toHaveValue(
      '{name}｜{studentNo}',
    )
    expect(screen.getByLabelText('靠左')).toBeChecked()
  })

  it('下載 HTML 時輸出目前專案內容與正確檔名', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '下載 HTML' }))

    const [html, fileName, mimeType] = downloadTextMock.mock.calls[0]

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('三年甲班')
    expect(fileName).toMatch(
      /^QuickSeat-三年甲班-\d{8}-\d{4}\.html$/,
    )
    expect(mimeType).toBe('text/html;charset=utf-8')
    expect(screen.getByText('已下載唯讀 HTML 座位表。')).toBeVisible()
  })

  it('匯出 JSON 時包含完整專案', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '匯出專案 JSON' }))

    const [json, fileName, mimeType] = downloadTextMock.mock.calls[0]

    expect(JSON.parse(json)).toMatchObject({
      name: '三年甲班',
      schemaVersion: 1,
    })
    expect(fileName).toMatch(
      /^QuickSeat-三年甲班-\d{8}-\d{4}\.json$/,
    )
    expect(mimeType).toBe('application/json;charset=utf-8')
  })

  it('匯入專案前確認、下載備份並重設復原歷史', async () => {
    prepareProject()
    useProjectStore.getState().renameProject('目前教室')
    const imported = createDefaultProject()
    imported.name = '四年乙班'
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('選擇專案 JSON'), {
      target: {
        files: [
          new File([serializeProject(imported)], 'project.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    await waitFor(() => {
      expect(useProjectStore.getState().project.name).toBe('四年乙班')
    })

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('目前教室'),
    )
    expect(downloadTextMock).toHaveBeenCalledWith(
      expect.stringContaining('目前教室'),
      expect.stringMatching(
        /^QuickSeat-目前教室-\d{8}-\d{4}\.json$/,
      ),
      'application/json;charset=utf-8',
    )
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(0)
    expect(
      screen.getByText('已匯入專案「四年乙班」，復原歷史已重設。'),
    ).toBeVisible()
  })

  it('可取消匯入前的備份下載', async () => {
    prepareProject()
    useProjectStore.getState().renameProject('目前教室')
    const imported = createDefaultProject()
    imported.name = '五年丙班'
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(
      screen.getByRole('checkbox', {
        name: '匯入前先下載目前專案的 JSON 備份',
      }),
    )

    fireEvent.change(screen.getByLabelText('選擇專案 JSON'), {
      target: {
        files: [
          new File([serializeProject(imported)], 'project.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    await waitFor(() => {
      expect(useProjectStore.getState().project.name).toBe('五年丙班')
    })

    expect(downloadTextMock).not.toHaveBeenCalled()
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('取消匯入時不覆蓋專案，也不下載備份', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const imported = createDefaultProject()
    imported.name = '四年乙班'
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('選擇專案 JSON'), {
      target: {
        files: [
          new File([serializeProject(imported)], 'project.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledTimes(1)
    })
    expect(downloadTextMock).not.toHaveBeenCalled()
    expect(useProjectStore.getState().project.name).toBe('三年甲班')
  })

  it('匯入格式錯誤時顯示錯誤，不詢問覆蓋', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('選擇專案 JSON'), {
      target: {
        files: [
          new File(['{'], 'broken.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    expect(
      await screen.findByText('無法解析 JSON，請確認檔案格式。'),
    ).toBeVisible()
    expect(confirm).not.toHaveBeenCalled()
    expect(downloadTextMock).not.toHaveBeenCalled()
  })

  it('結果過期時顯示警示，仍允許下載', () => {
    prepareProject()
    useProjectStore.getState().addPerson({ name: '新同學' })
    render(<ExportEditor />)

    expect(
      screen.getByText(
        '目前排座結果與最新名單、教室或規則不一致。仍可匯出，但內容可能已過期。',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '下載 Excel' })).toBeEnabled()
  })

  it('手機唯讀時停用匯入，但仍可下載匯出檔', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    render(<ExportEditor />)

    expect(screen.getByText(/手機為唯讀檢視/)).toBeVisible()
    expect(
      screen.getByRole('button', { name: '匯入專案 JSON' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '下載 Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '下載 HTML' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '匯出專案 JSON' }),
    ).toBeEnabled()
  })
})
