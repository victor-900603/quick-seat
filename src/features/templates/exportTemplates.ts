import type { ExportContentOptions } from '../export/exportData'

export interface ExportTemplate {
  id: string
  name: string
  description: string
  options: Partial<ExportContentOptions>
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'standard',
    name: '標準座位表',
    description: '座位編號、姓名與座號分三行，A4 橫向。',
    options: {
      template: '{seatCode}\n{name}\n{studentNo}',
      align: 'center',
      paperSize: 'A4',
      orientation: 'landscape',
      htmlCellHeight: 54,
      htmlFontSize: 11,
      htmlWrap: true,
    },
  },
  {
    id: 'name-only',
    name: '精簡姓名',
    description: '只顯示姓名，適合班內張貼。',
    options: {
      template: '{name}',
      align: 'center',
      htmlCellHeight: 46,
      htmlFontSize: 13,
      htmlWrap: true,
    },
  },
  {
    id: 'large-print',
    name: '大字版',
    description: '放大姓名與座號，方便遠距離查看。',
    options: {
      template: '{name}\n{studentNo}',
      align: 'center',
      htmlCellHeight: 76,
      htmlFontSize: 16,
      htmlWrap: true,
    },
  },
  {
    id: 'rule-report',
    name: '規則報告版',
    description: '標準座位表並加入 Excel 規則報告工作表。',
    options: {
      template: '{seatCode}\n{name}\n{studentNo}',
      align: 'left',
      includeRuleReport: true,
      htmlCellHeight: 54,
      htmlFontSize: 11,
    },
  },
]

export function applyExportTemplate(
  current: ExportContentOptions,
  template: ExportTemplate,
): ExportContentOptions {
  return { ...current, ...template.options }
}
