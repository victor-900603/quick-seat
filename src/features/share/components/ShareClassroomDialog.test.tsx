import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClassroom } from '../../classroom/classroomOps'
import { ShareClassroomDialog } from './ShareClassroomDialog'

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
})

describe('ShareClassroomDialog', () => {
  it('顯示教室統計與分享連結', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    classroom.cells[0] = { type: 'aisle' }
    classroom.cells[1] = { type: 'blocked' }

    render(<ShareClassroomDialog classroom={classroom} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: '分享教室' })).toBeInTheDocument()
    expect(screen.getByText('3 × 2')).toBeInTheDocument()
    expect(
      (screen.getByLabelText('教室分享連結') as HTMLTextAreaElement).value,
    ).toContain('#classroom=')
    expect(screen.getByText(/不包含名單、姓名、規則或排座結果/)).toBeInTheDocument()
  })

  it('複製連結並顯示成功訊息', async () => {
    const classroom = createClassroom({ cols: 2, rows: 2 })

    render(<ShareClassroomDialog classroom={classroom} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '複製連結' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('#classroom='),
      )
    })
    expect(screen.getByText('已複製分享連結。')).toBeInTheDocument()
  })

  it('按 Escape 關閉對話框', () => {
    const onClose = vi.fn()
    const classroom = createClassroom()

    render(<ShareClassroomDialog classroom={classroom} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
