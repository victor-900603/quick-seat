import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import { createDefaultProject } from '../project/defaultProject'
import { useProjectStore } from '../project/projectStore'
import { createRule } from '../rules/ruleOps'
import { ExportEditor } from './ExportEditor'
import { downloadBlob, downloadText } from './download'
import { createPngBlob } from './png'
import { serializeProject } from './projectFile'
import { createWorkbookBlob } from './workbook'

vi.mock('./download', () => ({
  downloadBlob: vi.fn(),
  downloadText: vi.fn(),
}))

vi.mock('./workbook', () => ({
  createWorkbookBlob: vi.fn(),
}))

vi.mock('./png', () => ({
  createPngBlob: vi.fn(),
}))

const workbookBlob = new Blob(['xlsx'])
const pngBlob = new Blob(['png'], { type: 'image/png' })
const downloadBlobMock = vi.mocked(downloadBlob)
const downloadTextMock = vi.mocked(downloadText)
const workbookMock = vi.mocked(createWorkbookBlob)
const pngMock = vi.mocked(createPngBlob)

function prepareProject(project = createExportFixture()) {
  useProjectStore.setState({ project })
  useProjectStore.temporal.getState().clear()
}

describe('ExportEditor', () => {
  beforeEach(() => {
    prepareProject()
    workbookMock.mockReset()
    workbookMock.mockResolvedValue(workbookBlob)
    pngMock.mockReset()
    pngMock.mockResolvedValue(pngBlob)
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
    expect(screen.getByRole('button', { name: '下載 PNG' })).toBeDisabled()

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

  it('可隱藏走道文字並套用到 HTML 與 Excel', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('tab', { name: '顯示' }))
    await user.click(screen.getByLabelText('走道文字'))

    await user.click(screen.getByRole('button', { name: '下載 HTML' }))
    const html = downloadTextMock.mock.calls[0][0]

    expect(html).toContain('class="cell aisle"')
    expect(html).not.toContain('<span>走道</span>')

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ showAisleLabel: false }),
        expect.anything(),
      )
    })
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

  it('可下載 PNG 座位表並套用模板與對齊', async () => {
    const user = userEvent.setup()
    render(<ExportEditor />)

    fireEvent.change(screen.getByLabelText('座位內容模板'), {
      target: { value: '{name}｜{tag:分組}' },
    })
    await user.click(screen.getByLabelText('靠左'))
    await user.click(screen.getByRole('button', { name: '下載 PNG' }))

    await waitFor(() => {
      expect(pngMock).toHaveBeenCalledTimes(1)
    })

    expect(pngMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: '三年甲班' }),
      expect.objectContaining({
        template: '{name}｜{tag:分組}',
        align: 'left',
      }),
    )
    expect(downloadBlobMock).toHaveBeenCalledWith(
      pngBlob,
      expect.stringMatching(
        /^QuickSeat-三年甲班-\d{8}-\d{4}\.png$/,
      ),
    )
    expect(screen.getByText('已下載 PNG 座位表。')).toBeVisible()
  })

  it('PNG 產生失敗時顯示錯誤且不下載', async () => {
    pngMock.mockRejectedValueOnce(new Error('Canvas 無法使用。'))
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('button', { name: '下載 PNG' }))

    expect(
      await screen.findByText('Canvas 無法使用。'),
    ).toBeVisible()
    expect(downloadBlobMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '下載 PNG' })).toBeEnabled()
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
        expect.anything(),
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
        expect.anything(),
      )
    })
  })

  it('可設定無座位列高與欄寬並套用到輸出', async () => {
    const project = createExportFixture()
    const { cols, rows } = project.classroom

    for (let col = 0; col < cols; col += 1) {
      project.classroom.cells[cols + col] = { type: 'aisle' }
    }

    for (let row = 0; row < rows; row += 1) {
      project.classroom.cells[row * cols + cols - 1] = { type: 'empty' }
    }

    prepareProject(project)
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('tab', { name: '版面' }))
    expect(screen.getByText('目前套用：1 列、1 欄。')).toBeVisible()

    fireEvent.change(screen.getByLabelText('無座位欄寬'), {
      target: { value: '50' },
    })
    fireEvent.change(screen.getByLabelText('無座位列高'), {
      target: { value: '50' },
    })

    await user.click(screen.getByRole('button', { name: '下載 HTML' }))
    const html = downloadTextMock.mock.calls[0][0]

    expect(html).toContain(
      '--grid-columns:minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.5fr)',
    )
    expect(html).toContain('--row-height:27px')

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          unusedColumnWidth: 50,
          unusedRowHeight: 50,
        }),
        expect.anything(),
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
        expect.anything(),
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

  it('可選擇將規則報告加入 Excel', async () => {
    const user = userEvent.setup()
    const project = createExportFixture()
    const tag = project.roster.tags[0]
    project.rules = [
      createRule('separate', {
        tagId: tag.id,
        adjacency: 'orthogonal',
      }),
    ]
    prepareProject(project)
    render(<ExportEditor />)

    await user.click(screen.getByRole('tab', { name: 'Excel' }))
    await user.click(screen.getByLabelText('包含規則報告工作表'))
    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledTimes(1)
    })

    expect(workbookMock.mock.calls[0][2]).toMatchObject({
      totalRules: 1,
      enabledRules: 1,
      rows: [{ typeLabel: '分開' }],
    })
  })

  it('勾選規則報告頁後下載 HTML 包含規則報告內容', async () => {
    const project = createExportFixture()
    project.rules = [
      createRule('separate', {
        tagId: project.roster.tags[0].id,
        adjacency: 'orthogonal',
      }),
    ]
    prepareProject(project)
    const user = userEvent.setup()
    render(<ExportEditor />)

    await user.click(screen.getByRole('tab', { name: '顯示' }))
    await user.click(screen.getByLabelText('規則報告頁'))
    await user.click(screen.getByRole('button', { name: '下載 HTML' }))

    const html = downloadTextMock.mock.calls[0][0]

    expect(html).toContain('規則報告')
    expect(html).toContain('<th scope="col">類型</th>')
    expect(html).toContain('彼此分開')

    await user.click(screen.getByRole('button', { name: '下載 Excel' }))

    await waitFor(() => {
      expect(workbookMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          showRuleReportPage: true,
          includeRuleReport: false,
        }),
        expect.anything(),
      )
    })
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
    expect(screen.getByRole('button', { name: '下載 PNG' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '匯出專案 JSON' }),
    ).toBeEnabled()
  })
})
