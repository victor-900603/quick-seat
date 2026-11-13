import { describe, expect, it } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import { createRule } from '../rules/ruleOps'
import { DEFAULT_EXPORT_CONTENT_OPTIONS, buildExportSnapshot } from './exportData'
import {
  buildHtmlDocument,
  countExportPages,
  escapeHtml,
  RULE_REPORT_ROWS_PER_PAGE,
} from './html'
import { buildRuleReport, type ExportRuleReport } from './ruleReport'

function createRuleReportProject() {
  const project = createExportFixture()
  project.rules = [
    createRule('separate', {
      tagId: 'tag-group',
      values: ['A'],
      adjacency: 'orthogonal',
    }),
    createRule('together', {
      tagId: 'tag-group',
      values: ['B'],
    }),
    createRule('pin', {
      personId: 'person-1',
      seatId: 'r0c0',
    }),
  ]
  project.rules[1].enabled = false
  project.rules[2].note = '<script>alert(1)</script>'
  const soft = createRule('separate', {
    tagId: 'tag-group',
    values: ['B'],
    adjacency: 'all8',
  })
  soft.strength = 'soft'
  soft.weight = 7
  project.rules.push(soft)
  return project
}

function reportFor(project: ReturnType<typeof createExportFixture>) {
  return {
    snapshot: buildExportSnapshot(project),
    report: buildRuleReport(project),
  }
}

describe('html export', () => {
  it('產生自包含的列印頁與座位內容', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()))

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('lang="zh-Hant"')
    expect(html).toContain('@page { size: A4 landscape;')
    expect(html).toContain('--cols:6')
    expect(html).toContain('林品妤')
    expect(html).toContain('01\n林品妤\n01')
    expect(html).toContain('align-center')
    expect(html).toContain('未分配人員')
    expect(html).toContain('王小明')
    expect(html).toContain('轉學生')
  })

  it('統計以卡片顯示於頁首右側，日期可選並顯示於頁尾', () => {
    const snapshot = buildExportSnapshot(
      createExportFixture(),
      new Date('2026-01-02T07:08:00.000Z'),
    )
    const html = buildHtmlDocument(snapshot)

    expect(html).toContain('class="header-stats"')
    expect(html).toContain('class="stat"')
    expect(html).not.toContain('可輸出')
    expect(html).not.toContain('2026-01-02')

    const dated = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showGeneratedAt: true,
    })
    const header = dated.match(/<header>[\s\S]*?<\/header>/)?.[0] ?? ''

    expect(header).not.toContain('2026-01-02')
    expect(dated).toMatch(/<footer>[\s\S]*2026-01-02[\s\S]*<\/footer>/)
  })

  it('可隱藏走道文字但保留走道樣式', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showAisleLabel: false,
    })

    expect(html).toContain('class="cell aisle"')
    expect(html).not.toContain('<span>走道</span>')
  })

  it('可關閉統計，標題與統計都關閉時不輸出頁首', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const noStats = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showStats: false,
    })
    const noHeader = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showStats: false,
      showTitle: false,
    })

    expect(noStats).toContain('<h1>')
    expect(noStats).not.toContain('class="header-stats"')
    expect(noHeader).not.toContain('<header>')
  })

  it('可依模板隱藏座位編號並靠左對齊', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{name}｜{tag:分組}',
      align: 'left',
    })

    expect(html).toContain('林品妤｜A')
    expect(html).not.toContain('01\n林品妤\n01')
    expect(html).toContain('align-left')
  })

  it('可調整紙張、格高、字級與關閉自動換行', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      paperSize: 'A3',
      orientation: 'landscape',
      htmlCellHeight: 72,
      htmlFontSize: 13,
      htmlWrap: false,
    })

    expect(html).toContain('--page-width:420mm')
    expect(html).toContain('--page-height:297mm')
    expect(html).toContain('--cell-height:72px')
    expect(html).toContain('--font-size:13px')
    expect(html).toContain('seat-grid no-wrap')
  })

  it('無座位列與欄可套用較小的尺寸', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const cols = snapshot.cols

    snapshot.grid[1] = Array.from({ length: cols }, () => ({
      type: 'aisle' as const,
      seat: null,
    }))
    snapshot.grid = snapshot.grid.map((row) => {
      const next = [...row]
      next[cols - 1] = { type: 'empty', seat: null }
      return next
    })

    const html = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      unusedColumnWidth: 50,
      unusedRowHeight: 50,
    })

    expect(html).toContain(
      '--grid-columns:minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.5fr)',
    )
    expect(html).toContain('--row-height:27px')
    expect(html).toContain('--row-height:54px')
    expect(html).toContain(
      'height: var(--row-height, var(--cell-height, 54px))',
    )
  })

  it('列印時保留頁框與可列印高度', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      paperSize: 'A3',
      orientation: 'portrait',
      marginMm: 12,
    })

    expect(html).toContain('--print-page-height:396mm')
    expect(html).toContain('--page-margin:12mm')
    expect(html).toContain('class="page has-margin"')
    expect(html).toContain('.page.has-margin::before')
    expect(html).toContain(
      'padding: calc(var(--page-margin, 0mm) + 6mm) calc(var(--page-margin, 0mm) + 8mm)',
    )
    expect(html).toContain(
      'height: calc(var(--print-page-height, 190mm) - 1mm)',
    )
    expect(html).toContain('border: 1px solid var(--line)')
    expect(html).toContain('padding: 6mm 8mm')
  })

  it('邊界為 0 時不顯示邊界輔助線', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      marginMm: 0,
    })

    expect(html).toContain('--page-margin:0mm')
    expect(html).not.toContain('class="page has-margin"')
    expect(html).not.toContain('class="page no-border has-margin"')
  })

  it('可關閉頁框', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showPageBorder: false,
    })

    expect(html).toContain('class="page no-border has-margin"')
    expect(html).toContain('.page.no-border { border: 0; }')
  })

  it('跳脫專案、姓名與備註中的 HTML', () => {
    const project = createExportFixture()
    project.name = '<script>alert("x")</script>'
    project.roster.persons[0] = {
      ...project.roster.persons[0],
      name: '<b>林品妤</b>',
    }
    project.roster.persons[2] = {
      ...project.roster.persons[2],
      note: 'a & b',
    }

    const html = buildHtmlDocument(buildExportSnapshot(project))

    expect(html).not.toContain('<script>alert("x")</script>')
    expect(html).not.toContain('<b>林品妤</b>')
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;林品妤&lt;/b&gt;')
    expect(html).toContain('a &amp; b')
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })

  it('跳脫模板中的標籤值', () => {
    const project = createExportFixture()
    project.roster.persons[0] = {
      ...project.roster.persons[0],
      tags: { 'tag-group': '<b>A</b>' },
    }

    const html = buildHtmlDocument(buildExportSnapshot(project), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{tags}',
      align: 'center',
    })

    expect(html).not.toContain('<b>A</b>')
    expect(html).toContain('&lt;b&gt;A&lt;/b&gt;')
  })

  it('未開啟規則報告頁時不輸出報告內容', () => {
    const { snapshot, report } = reportFor(createRuleReportProject())
    const html = buildHtmlDocument(snapshot, DEFAULT_EXPORT_CONTENT_OPTIONS, report)

    expect(html).not.toContain('規則報告')
    expect(html).not.toContain('class="rule-table"')
    expect(countExportPages(snapshot, DEFAULT_EXPORT_CONTENT_OPTIONS, report)).toBe(
      countExportPages(snapshot, DEFAULT_EXPORT_CONTENT_OPTIONS),
    )
  })

  it('開啟規則報告頁但沒有規則時不產生報告頁', () => {
    const { snapshot, report } = reportFor(createExportFixture())
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
    }
    const html = buildHtmlDocument(snapshot, options, report)

    expect(report.totalRules).toBe(0)
    expect(html).not.toContain('規則報告')
    expect(countExportPages(snapshot, options, report)).toBe(
      countExportPages(snapshot, options),
    )
  })

  it('產生規則報告頁，包含摘要、表頭、停用規則與轉義', () => {
    const { snapshot, report } = reportFor(createRuleReportProject())
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
      showRuleReportSeats: true,
      showRuleReportPersons: true,
      showRuleReportNotes: true,
    }
    const html = buildHtmlDocument(snapshot, options, report)

    expect(html).toContain('<h2 class="section-title">規則報告</h2>')
    expect(html).toContain('aria-label="規則報告摘要"')
    expect(html).toContain('<span>總規則</span>')
    expect(html).toContain('<span>啟用規則</span>')
    expect(html).toContain('<span>硬違反</span>')
    expect(html).toContain('<span>軟成本</span>')
    expect(html).toContain('<span>結果過期</span>')
    expect(html).toContain('<span>判定逾時</span>')

    for (const column of [
      '類型',
      '規則',
      '強度',
      '權重',
      '狀態',
      '衝突',
      '座位',
      '人員',
      '備註',
    ]) {
      expect(html).toContain(`<th scope="col">${column}</th>`)
    }

    expect(html).toContain('彼此分開')
    expect(html).toContain('已停用')
    expect(html).toContain('硬約束')
    expect(html).toContain('軟約束')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('規則報告預設不輸出座位、人員與備註欄位', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const report: ExportRuleReport = {
      rows: [
        {
          ruleId: 'rule-sensitive',
          type: 'separate',
          typeLabel: '分開',
          summary: '測試規則',
          strength: 'hard',
          weight: 5,
          enabled: true,
          status: '1 個衝突',
          violationCount: 1,
          seatCodes: ['01', '02'],
          personNames: ['林品妤', '陳柏宇'],
          note: '敏感<i>備註</i>',
        },
      ],
      totalRules: 1,
      enabledRules: 1,
      violationCount: 1,
      hardViolationCount: 1,
      softCost: 0,
      stale: false,
      timedOut: false,
    }
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
    }
    const html = buildHtmlDocument(snapshot, options, report)
    const table =
      html.match(/<table class="rule-table">[\s\S]*?<\/table>/)?.[0] ?? ''

    expect(table.match(/<th scope="col">/g)).toHaveLength(6)
    expect(table).toContain('<th scope="col">類型</th>')
    expect(table).toContain('<th scope="col">衝突</th>')
    expect(table).not.toContain('座位')
    expect(table).not.toContain('人員')
    expect(table).not.toContain('備註')
    expect(table).not.toContain('01、02')
    expect(table).not.toContain('林品妤、陳柏宇')
    expect(table).not.toContain('敏感')
  })

  it('開啟規則報告欄位後輸出座位、人員與備註', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const report: ExportRuleReport = {
      rows: [
        {
          ruleId: 'rule-sensitive',
          type: 'separate',
          typeLabel: '分開',
          summary: '測試規則',
          strength: 'hard',
          weight: 5,
          enabled: true,
          status: '1 個衝突',
          violationCount: 1,
          seatCodes: ['01', '02'],
          personNames: ['林品妤', '陳柏宇'],
          note: '敏感<i>備註</i>',
        },
      ],
      totalRules: 1,
      enabledRules: 1,
      violationCount: 1,
      hardViolationCount: 1,
      softCost: 0,
      stale: false,
      timedOut: false,
    }
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
      showRuleReportSeats: true,
      showRuleReportPersons: true,
      showRuleReportNotes: true,
    }
    const html = buildHtmlDocument(snapshot, options, report)
    const table =
      html.match(/<table class="rule-table">[\s\S]*?<\/table>/)?.[0] ?? ''

    expect(table.match(/<th scope="col">/g)).toHaveLength(9)
    expect(table).toContain('<th scope="col">座位</th>')
    expect(table).toContain('<th scope="col">人員</th>')
    expect(table).toContain('<th scope="col">備註</th>')
    expect(table).toContain('01、02')
    expect(table).toContain('林品妤、陳柏宇')
    expect(table).toContain('敏感&lt;i&gt;備註&lt;/i&gt;')
    expect(table).not.toContain('<i>備註</i>')
  })

  it('開啟規則報告頁但未提供報告或沒有資料列時不產生報告頁', () => {
    const snapshot = buildExportSnapshot(createRuleReportProject())
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
    }
    const emptyReport: ExportRuleReport = {
      rows: [],
      totalRules: 2,
      enabledRules: 2,
      violationCount: 0,
      hardViolationCount: 0,
      softCost: 0,
      stale: false,
      timedOut: false,
    }

    expect(buildHtmlDocument(snapshot, options)).not.toContain('規則報告')
    expect(countExportPages(snapshot, options)).toBe(
      countExportPages(snapshot, DEFAULT_EXPORT_CONTENT_OPTIONS),
    )
    expect(countExportPages(snapshot, options, emptyReport)).toBe(
      countExportPages(snapshot, DEFAULT_EXPORT_CONTENT_OPTIONS),
    )
    expect(buildHtmlDocument(snapshot, options, emptyReport)).not.toContain(
      '規則報告',
    )
  })

  it('規則過多時依固定列數分頁，頁碼與頁數正確', () => {
    const project = createExportFixture()
    const totalRules = RULE_REPORT_ROWS_PER_PAGE * 2 + 5
    project.rules = Array.from({ length: totalRules }, (_, index) => {
      const rule = createRule('position', {
        tagId: 'tag-group',
      })
      rule.value = 'A'
      rule.note = `備註 ${index + 1}`
      return rule
    })
    const { snapshot } = reportFor(project)
    const report: ExportRuleReport = buildRuleReport(project)
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
      showRuleReportNotes: true,
    }
    const basePages = countExportPages(snapshot, options)
    const pageCount = countExportPages(snapshot, options, report)
    const html = buildHtmlDocument(snapshot, options, report)
    const reportPages = Math.ceil(totalRules / RULE_REPORT_ROWS_PER_PAGE)

    expect(basePages).toBe(2)
    expect(pageCount).toBe(basePages + reportPages)
    expect(html.match(/class="rule-report"/g)).toHaveLength(reportPages)
    expect(html.match(/<table class="rule-table">/g)).toHaveLength(reportPages)
    expect(html.match(/<thead>/g)).toHaveLength(reportPages)
    expect(html.match(/aria-label="規則報告摘要"/g)).toHaveLength(1)
    expect(html).toContain(`第 ${basePages + 1} / ${pageCount} 頁`)
    expect(html).toContain(`第 ${pageCount} / ${pageCount} 頁`)
    expect(html).toContain('備註 1')
    expect(html).toContain(`備註 ${RULE_REPORT_ROWS_PER_PAGE}`)
    expect(html).toContain(`備註 ${RULE_REPORT_ROWS_PER_PAGE + 1}`)
    expect(html).toContain(`備註 ${totalRules}`)
    expect(html).not.toContain(`備註 ${totalRules + 1}`)
  })

  it('模板支援列、欄、備註、座號與額外欄位', () => {
    const project = createExportFixture()
    project.roster.persons[1] = {
      ...project.roster.persons[1],
      studentNo: '',
    }
    const html = buildHtmlDocument(buildExportSnapshot(project), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template:
        '{row}-{col}-{note}|{studentNo}|{extra:電話}|{extra:未知欄位}',
    })

    expect(html).toContain('1-1-班長|01|0912|')
    expect(html).toContain('1-2-|未填座號||')
  })

  it('關閉未分配標籤與備註時不輸出細節', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showNotes: false,
      showTags: false,
    })

    expect(html).toContain('王小明')
    expect(html).not.toContain('class="tag"')
    expect(html).not.toContain('轉學生')
  })

  it('可關閉講台並保留頁碼', () => {
    const html = buildHtmlDocument(buildExportSnapshot(createExportFixture()), {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showFooter: false,
      showStage: false,
    })

    expect(html).not.toContain('class="stage"')
    expect(html).toContain('<footer><span></span><div class="footer-meta">')
    expect(html).toContain('第 1 / 2 頁')
  })

  it('未分配人員的標籤顏色無效時使用預設色', () => {
    const project = createExportFixture()
    project.roster.tags[0] = {
      ...project.roster.tags[0],
      color: 'not-a-color',
    }
    const html = buildHtmlDocument(buildExportSnapshot(project))

    expect(html).toContain('--tag-color:#2f6b58')
    expect(html).not.toContain('--tag-color:not-a-color')
  })

  it('報告摘要可標示未過期與判定逾時', () => {
    const { snapshot, report } = reportFor(createRuleReportProject())
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showRuleReportPage: true,
    }
    const html = buildHtmlDocument(snapshot, options, {
      ...report,
      stale: false,
      timedOut: true,
    })

    expect(html).toContain('<b>否</b><span>結果過期</span>')
    expect(html).toContain('<b>是</b><span>判定逾時</span>')
  })

  it('關閉未分配名單時報告頁接在座位表頁之後', () => {
    const { snapshot, report } = reportFor(createRuleReportProject())
    const options = {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showUnassigned: false,
      showRuleReportPage: true,
    }
    const html = buildHtmlDocument(snapshot, options, report)

    expect(html).not.toContain('未分配人員')
    expect(html.indexOf('class="seat-grid')).toBeLessThan(
      html.indexOf('class="rule-report"'),
    )
    expect(html).toContain('第 2 / 2 頁')
  })

  it('頁尾全部關閉且結果未過期時不輸出頁尾', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    const html = buildHtmlDocument(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showFooter: false,
      showPageNumbers: false,
      showGeneratedAt: false,
    })

    expect(snapshot.stale).toBe(false)
    expect(html).not.toContain('<footer>')
  })

  it('沒有座位列時仍產生一頁空白座位表', () => {
    const snapshot = buildExportSnapshot(createExportFixture())
    snapshot.grid = []
    const html = buildHtmlDocument(snapshot)

    expect(html.match(/<section class="page/g)).toHaveLength(2)
    expect(html).toContain('第 1 / 2 頁')
  })
})
