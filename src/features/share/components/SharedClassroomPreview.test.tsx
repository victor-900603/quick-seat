import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createClassroom } from '../../classroom/classroomOps'
import { SharedClassroomPreview } from './SharedClassroomPreview'

describe('SharedClassroomPreview', () => {
  it('顯示唯讀教室並可套用', () => {
    const classroom = createClassroom({ cols: 3, rows: 2 })
    classroom.cells[0] = { type: 'aisle' }
    const onApply = vi.fn()

    render(
      <SharedClassroomPreview
        onApply={onApply}
        onClose={() => {}}
        readOnly={false}
        state={{ status: 'ready', classroom }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: '分享的教室' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '教室座位配置' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '套用到目前教室' }))
    expect(onApply).toHaveBeenCalledWith(classroom)
  })

  it('手機唯讀時停用套用', () => {
    const classroom = createClassroom()

    render(
      <SharedClassroomPreview
        onApply={() => {}}
        onClose={() => {}}
        readOnly
        state={{ status: 'ready', classroom }}
      />,
    )

    expect(screen.getByRole('button', { name: '套用到目前教室' })).toBeDisabled()
  })

  it('顯示損壞連結的錯誤與關閉操作', () => {
    const onClose = vi.fn()

    render(
      <SharedClassroomPreview
        onApply={() => {}}
        onClose={onClose}
        readOnly={false}
        state={{ status: 'error', message: '分享連結格式不正確。' }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: '無法開啟分享連結' }),
    ).toBeInTheDocument()
    expect(screen.getByText('分享連結格式不正確。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '關閉' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
