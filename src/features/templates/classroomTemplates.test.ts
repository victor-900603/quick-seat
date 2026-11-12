import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_TEMPLATES,
  countTemplateCells,
  createClassroomFromTemplate,
} from './classroomTemplates'

describe('classroom templates', () => {
  it('has unique templates with complete cell grids', () => {
    expect(new Set(CLASSROOM_TEMPLATES.map((item) => item.id)).size).toBe(
      CLASSROOM_TEMPLATES.length,
    )

    for (const template of CLASSROOM_TEMPLATES) {
      expect(template.cells).toHaveLength(template.cols * template.rows)
    }
  })

  it('counts cells for each built-in layout', () => {
    const counts = Object.fromEntries(
      CLASSROOM_TEMPLATES.map((template) => [
        template.id,
        countTemplateCells(template),
      ]),
    )

    expect(counts.standard).toEqual({
      seats: 30,
      aisles: 0,
      blocked: 0,
      empty: 0,
    })
    expect(counts.grouped).toEqual({
      seats: 36,
      aisles: 12,
      blocked: 0,
      empty: 0,
    })
    expect(counts['u-shape']).toEqual({
      seats: 20,
      aisles: 0,
      blocked: 0,
      empty: 15,
    })
    expect(counts.exam).toEqual({
      seats: 15,
      aisles: 15,
      blocked: 0,
      empty: 0,
    })
  })

  it('creates an independent classroom from a template', () => {
    const template = CLASSROOM_TEMPLATES[1]
    const first = createClassroomFromTemplate(template)
    const second = createClassroomFromTemplate(template)

    expect(first.id).not.toBe(second.id)
    expect(first.name).toBe(template.name)
    expect(first.cols).toBe(template.cols)
    expect(first.rows).toBe(template.rows)
    expect(first.cells).toHaveLength(template.cols * template.rows)
    expect(first.cells[0]).toEqual({ type: template.cells[0] })
    expect(first.codeOverrides).toEqual({})
    expect(first.numbering).toEqual({
      pattern: '{index}',
      order: 'row-major',
      startAt: 1,
      pad: 2,
    })
  })
})
