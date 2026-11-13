import { describe, expect, it, vi } from 'vitest'
import { createExportFixture } from '../../test/projectFixtures'
import {
  DEFAULT_EXPORT_CONTENT_OPTIONS,
  buildExportSnapshot,
} from './exportData'
import {
  PNG_COLORS,
  PNG_EXPORT_SCALE,
  createPngBlob,
  getPngLayoutSize,
} from './png'

interface RecordedText {
  text: string
  align: string
  font: string
}

interface RecordedFill {
  style: string
  width: number
  height: number
}

function createContextMock() {
  const texts: RecordedText[] = []
  const fills: RecordedFill[] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillText: vi.fn((text: string, _x: number, _y: number) => {
      texts.push({
        text: String(text),
        align: context.textAlign,
        font: context.font,
      })
    }),
    measureText: vi.fn(
      (text: string) =>
        ({ width: Array.from(String(text)).length * 8 }) as TextMetrics,
    ),
    fillRect: vi.fn(
      (x: number, y: number, width: number, height: number) => {
        void x
        void y
        fills.push({
          style: String(context.fillStyle),
          width,
          height,
        })
      },
    ),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    scale: vi.fn(),
  }

  return { context, texts, fills }
}

function installCanvas({
  context,
  blob,
}: {
  context?: ReturnType<typeof createContextMock>['context'] | null
  blob?: Blob | null
} = {}) {
  const mock = createContextMock()
  const activeContext =
    context === undefined ? mock.context : context
  const activeBlob =
    blob === undefined
      ? new Blob(['png'], { type: 'image/png' })
      : blob
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => activeContext),
    toBlob: vi.fn(
      (callback: BlobCallback, _type?: string) => {
        callback(activeBlob)
      },
    ),
  }
  const originalCreateElement = document.createElement.bind(
    document,
  ) as (tagName: string) => HTMLElement

  vi.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
  ) => {
    if (tagName === 'canvas') {
      return canvas as unknown as HTMLElement
    }

    return originalCreateElement(tagName)
  }) as typeof document.createElement)

  return {
    canvas,
    context: activeContext,
    texts: mock.texts,
    fills: mock.fills,
    blob: activeBlob,
  }
}

function textsOf(
  calls: Array<{ text: string; align: string }>,
): string[] {
  return calls.map((call) => call.text)
}

describe('png export', () => {
  it('以兩倍解析度建立 PNG Blob 並回傳固定版面尺寸', async () => {
    const { canvas, context, blob } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())
    const options = DEFAULT_EXPORT_CONTENT_OPTIONS
    const size = getPngLayoutSize(snapshot, options)

    const result = await createPngBlob(snapshot, options)

    expect(result).toBe(blob)
    expect(result.type).toBe('image/png')
    expect(size.width).toBeGreaterThan(1000)
    expect(size.height).toBeGreaterThan(400)
    expect(canvas.width).toBe(
      Math.round(size.width * PNG_EXPORT_SCALE),
    )
    expect(canvas.height).toBe(
      Math.round(size.height * PNG_EXPORT_SCALE),
    )
    expect(context?.scale).toHaveBeenCalledWith(
      PNG_EXPORT_SCALE,
      PNG_EXPORT_SCALE,
    )
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png',
    )
  })

  it('繪製標題、統計、講台、座位內容與圖例', async () => {
    const { texts } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())

    await createPngBlob(snapshot)

    const values = textsOf(texts)

    expect(values).toContain('QUICKSEAT / SEATING PLAN')
    expect(values).toContain('三年甲班')
    expect(values).toContain('講 台')
    expect(values).toContain('座位')
    expect(values).toContain('已分配')
    expect(values).toContain('未分配')
    expect(values).toContain('林品妤')
    expect(values).toContain('圖例')
    expect(values).toContain('已分配座位')
    expect(values).toContain('禁坐')
    expect(values).toContain('走道')
  })

  it('繪製走道斜線、禁坐底色與空白虛線', async () => {
    const project = createExportFixture()
    const lastIndex =
      project.classroom.rows * project.classroom.cols - 1

    project.classroom.cells[lastIndex] = { type: 'empty' }
    const snapshot = buildExportSnapshot(project)
    const { context, fills, texts } = installCanvas()

    await createPngBlob(snapshot)

    expect(
      fills.some((fill) => fill.style === PNG_COLORS.aisle),
    ).toBe(true)
    expect(
      fills.some((fill) => fill.style === PNG_COLORS.blocked),
    ).toBe(true)
    expect(
      fills.some((fill) => fill.style === PNG_COLORS.empty),
    ).toBe(true)
    expect(context?.setLineDash).toHaveBeenCalledWith([6, 4])
    expect(context?.setLineDash).toHaveBeenCalledWith([])
    expect(context?.moveTo).toHaveBeenCalled()
    expect(context?.lineTo).toHaveBeenCalled()
    expect(textsOf(texts)).toContain('×')
  })

  it('依座位內容模板與對齊輸出座位文字', async () => {
    const { texts } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())

    await createPngBlob(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      template: '{name}｜{tag:分組}',
      align: 'left',
      htmlWrap: false,
    })

    const content = texts.find(
      (text) => text.text === '林品妤｜A',
    )

    expect(content).toBeDefined()
    expect(content?.align).toBe('left')
  })

  it('可關閉標題、統計、講台與走道文字', async () => {
    const { texts } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())

    await createPngBlob(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showTitle: false,
      showStats: false,
      showStage: false,
      showAisleLabel: false,
    })

    const values = textsOf(texts)

    expect(values).not.toContain('三年甲班')
    expect(values).not.toContain('講 台')
    expect(values).not.toContain('已分配')
    expect(values.filter((value) => value === '走道')).toHaveLength(1)
  })

  it('結果過期時標示警示，並可選擇顯示匯出時間', async () => {
    const { texts } = installCanvas()
    const snapshot = buildExportSnapshot(
      createExportFixture(),
      new Date('2026-01-02T07:08:00.000Z'),
    )

    snapshot.stale = true

    await createPngBlob(snapshot, {
      ...DEFAULT_EXPORT_CONTENT_OPTIONS,
      showGeneratedAt: true,
    })

    const values = textsOf(texts)

    expect(values).toContain('結果可能已過期')
    expect(
      values.some(
        (value) =>
          value.includes('結果可能已過期') &&
          value.includes('2026'),
      ),
    ).toBe(true)
  })

  it('沒有座位列時仍可產生圖檔', async () => {
    const { canvas } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())

    snapshot.grid = []

    await createPngBlob(snapshot)

    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)
  })

  it('專案名稱過長時以省略號截斷', async () => {
    const { texts } = installCanvas()
    const snapshot = buildExportSnapshot(createExportFixture())

    snapshot.projectName = '非常長的專案名稱'.repeat(20)

    await createPngBlob(snapshot)

    expect(
      texts.some(
        (text) =>
          text.text.endsWith('…') &&
          text.text.length < snapshot.projectName.length,
      ),
    ).toBe(true)
  })

  it('瀏覽器不支援 Canvas 2D 時拒絕產生', async () => {
    installCanvas({ context: null })
    const snapshot = buildExportSnapshot(createExportFixture())

    await expect(createPngBlob(snapshot)).rejects.toThrow(
      '瀏覽器不支援 Canvas 2D',
    )
  })

  it('Canvas 無法輸出 Blob 時拒絕產生', async () => {
    installCanvas({ blob: null })
    const snapshot = buildExportSnapshot(createExportFixture())

    await expect(createPngBlob(snapshot)).rejects.toThrow(
      '無法產生 PNG 圖檔。',
    )
  })
})
