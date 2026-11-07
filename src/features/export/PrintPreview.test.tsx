import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrintPreview } from './PrintPreview'

describe('PrintPreview', () => {
  it('顯示列印預覽並可關閉', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PrintPreview
        html="<p>座位表</p>"
        paperLabel="A4 橫向"
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('dialog', { name: '列印預覽' })).toBeVisible()
    expect(screen.getByTitle('座位表列印預覽')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('按 Escape 關閉預覽', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PrintPreview
        html="<p>座位表</p>"
        paperLabel="A4 橫向"
        onClose={onClose}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('按下列印時呼叫預覽頁的列印', async () => {
    const user = userEvent.setup()
    render(
      <PrintPreview
        html="<p>座位表</p>"
        paperLabel="A4 橫向"
        onClose={() => {}}
      />,
    )

    const frame = screen.getByTitle('座位表列印預覽') as HTMLIFrameElement
    const focus = vi
      .spyOn(frame.contentWindow!, 'focus')
      .mockImplementation(() => {})
    const print = vi
      .spyOn(frame.contentWindow!, 'print')
      .mockImplementation(() => {})

    await user.click(
      screen.getByRole('button', { name: '列印 / 儲存 PDF' }),
    )

    expect(focus).toHaveBeenCalled()
    expect(print).toHaveBeenCalled()
  })
})
