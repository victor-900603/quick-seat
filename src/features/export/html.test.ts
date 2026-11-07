import { describe, expect, it } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import { DEFAULT_EXPORT_CONTENT_OPTIONS, buildExportSnapshot } from './exportData'
import { buildHtmlDocument, escapeHtml } from './html'

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
})
