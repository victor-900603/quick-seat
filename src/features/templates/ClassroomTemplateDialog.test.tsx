import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassroomTemplateDialog } from './ClassroomTemplateDialog'
import { CLASSROOM_TEMPLATES } from './classroomTemplates'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ClassroomTemplateDialog', () => {
  it('可預覽範本並在確認後套用', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <ClassroomTemplateDialog
        onApply={onApply}
        onClose={onClose}
        readOnly={false}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: '教室範本' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: CLASSROOM_TEMPLATES[0].name }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(
      screen.getByRole('button', { name: CLASSROOM_TEMPLATES[1].name }),
    )
    expect(
      screen.getByRole('button', { name: CLASSROOM_TEMPLATES[1].name }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '套用此範本' }))

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith(CLASSROOM_TEMPLATES[1])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('取消覆蓋確認時不套用', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <ClassroomTemplateDialog
        onApply={onApply}
        onClose={vi.fn()}
        readOnly={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: '套用此範本' }))

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('手機唯讀時只能預覽，不能套用', () => {
    render(
      <ClassroomTemplateDialog
        onApply={vi.fn()}
        onClose={vi.fn()}
        readOnly
      />,
    )

    expect(screen.getByText(/手機為唯讀檢視/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '套用此範本' }),
    ).toBeDisabled()
  })

  it('可關閉對話框', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ClassroomTemplateDialog
        onApply={vi.fn()}
        onClose={onClose}
        readOnly={false}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: '關閉教室範本' }),
    )

    expect(onClose).toHaveBeenCalledOnce()
  })
})
