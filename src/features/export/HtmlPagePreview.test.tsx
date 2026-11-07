import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HtmlPagePreview } from './HtmlPagePreview'

describe('HtmlPagePreview', () => {
  it('依頁寬建立即時預覽 iframe', () => {
    const { rerender } = render(
      <HtmlPagePreview html="<p>預覽</p>" pageWidth={800} />,
    )

    expect(screen.getByTitle('即時頁面預覽')).toHaveStyle({
      width: '856px',
    })

    rerender(<HtmlPagePreview html="<p>預覽</p>" pageWidth={1180} />)
    expect(screen.getByTitle('即時頁面預覽')).toHaveStyle({
      width: '1236px',
    })
  })

  it('載入後依內容高度更新預覽', () => {
    render(<HtmlPagePreview html="<p>預覽</p>" pageWidth={800} />)

    const frame = screen.getByTitle('即時頁面預覽')

    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      value: {
        body: { scrollHeight: 880 },
        documentElement: { scrollHeight: 900 },
      },
    })
    fireEvent.load(frame)

    expect(frame).toHaveStyle({ height: '900px' })
  })

  it('依實際頁面高度量測，不受 iframe 高度影響', () => {
    render(<HtmlPagePreview html="<p>預覽</p>" pageWidth={800} />)

    const frame = screen.getByTitle('即時頁面預覽')

    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      value: {
        body: { scrollHeight: 1 },
        documentElement: { scrollHeight: 1 },
        querySelector: () => ({
          getBoundingClientRect: () => ({ height: 900 }),
        }),
      },
    })
    fireEvent.load(frame)

    expect(frame).toHaveStyle({ height: '956px' })
  })
})
