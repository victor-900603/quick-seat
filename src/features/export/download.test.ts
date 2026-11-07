import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob, downloadText } from './download'

describe('download', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('建立下載連結、點擊後移除並釋放物件 URL', () => {
    vi.useFakeTimers()
    const objectUrl = 'blob:quick-seat'
    const createObjectURL = vi.fn((_blob: Blob) => objectUrl)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    const downloaded: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        downloaded.push(this.download)
      },
    )

    downloadBlob(new Blob(['seat']), '座位表.txt')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(downloaded).toEqual(['座位表.txt'])
    expect(document.querySelector('a[download]')).toBeNull()

    vi.runAllTimers()

    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })

  it('將文字包成指定 MIME 的 Blob 後下載', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:text')
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    )

    downloadText('{"name":"三年甲班"}', 'project.json', 'application/json')

    const blob = createObjectURL.mock.calls[0][0] as Blob

    expect(blob.type).toBe('application/json')
    expect(await blob.text()).toBe('{"name":"三年甲班"}')
  })
})
