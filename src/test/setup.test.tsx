import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('測試環境', () => {
  it('可渲染元件並使用 jest-dom 斷言', () => {
    render(<p>QuickSeat</p>)

    expect(screen.getByText('QuickSeat')).toBeInTheDocument()
  })
})
