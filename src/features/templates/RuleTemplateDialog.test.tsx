import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Rule } from '../../types/domain'
import { createDefaultProject } from '../project/defaultProject'
import { RuleTemplateDialog } from './RuleTemplateDialog'

function project() {
  const next = createDefaultProject()
  next.roster.tags = [
    {
      id: 'tag-group',
      name: '分組',
      type: 'enum',
      options: ['A', 'B'],
      color: '#2f6b58',
    },
  ]
  return next
}

describe('RuleTemplateDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('確認後會套用目前範本', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn((rules: Rule[]) => {
      void rules
      return true
    })
    const onClose = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <RuleTemplateDialog
        onApply={onApply}
        onClose={onClose}
        project={project()}
        readOnly={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: '套用範本' }))

    expect(window.confirm).toHaveBeenCalledWith(
      '套用後會新增這些規則，確定要繼續嗎？',
    )
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0]).toHaveLength(1)
    expect(onApply.mock.calls[0][0][0]).toMatchObject({
      type: 'separate',
      tagId: 'tag-group',
      values: [],
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('取消確認時不套用', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn((rules: Rule[]) => {
      void rules
      return true
    })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <RuleTemplateDialog
        onApply={onApply}
        onClose={vi.fn()}
        project={project()}
        readOnly={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: '套用範本' }))

    expect(onApply).not.toHaveBeenCalled()
  })

  it('沒有標籤時停用套用', () => {
    render(
      <RuleTemplateDialog
        onApply={vi.fn(() => true)}
        onClose={vi.fn()}
        project={createDefaultProject()}
        readOnly={false}
      />,
    )

    expect(
      screen.getByText('目前沒有標籤，請先到名單頁建立標籤。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '套用範本' })).toBeDisabled()
  })

  it('手機唯讀時只能預覽', () => {
    render(
      <RuleTemplateDialog
        onApply={vi.fn(() => true)}
        onClose={vi.fn()}
        project={project()}
        readOnly
      />,
    )

    expect(
      screen.getByText('手機為唯讀檢視，只能預覽規則範本。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '套用範本' })).toBeDisabled()
  })
})
