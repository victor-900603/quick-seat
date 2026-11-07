import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HtmlPreviewDialog } from './HtmlPreviewDialog'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('HtmlPreviewDialog', () => {
  it('顯示放大預覽並可關閉', () => {
    const onClose = vi.fn()

    render(
      <HtmlPreviewDialog
        html="<html><body>座位表</body></html>"
        onClose={onClose}
        paperLabel="A4 橫向"
      />,
    )

    expect(screen.getByRole('dialog', { name: '放大預覽' })).toBeInTheDocument()
    expect(
      screen.getByTitle('放大頁面預覽'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '關閉' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('按 Escape 關閉並在卸載後還原頁面捲動', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <HtmlPreviewDialog
        html="<html><body>座位表</body></html>"
        onClose={onClose}
        paperLabel="A4 直向"
      />,
    )

    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
