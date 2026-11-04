import type { Person, ProjectSettings } from '../../types/domain'

export function formatPersonLabel(
  person: Person,
  display: ProjectSettings['display'],
): string {
  switch (display) {
    case 'name':
      return person.name
    case 'studentNo':
      return person.studentNo || '未填座號'
    case 'both':
      return `${person.name} · ${person.studentNo || '未填座號'}`
    case 'none':
      return ''
  }
}

export function formatSeatPosition(row: number, col: number): string {
  return `第 ${row + 1} 列第 ${col + 1} 欄`
}
