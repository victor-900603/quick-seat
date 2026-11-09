import { useEffect, useMemo, useState } from 'react'
import type { Classroom } from '../../../types/domain'
import { downloadText } from '../../export/download'
import {
  MAX_CLASSROOM_SHARE_URL_LENGTH,
  createClassroomShareUrl,
  getClassroomShareStats,
  isClassroomShareUrlTooLong,
  serializeClassroomShareJson,
} from '../classroomShare'

interface ShareClassroomDialogProps {
  classroom: Classroom
  onClose: () => void
}

type CopyStatus = 'idle' | 'copied' | 'error'

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 繼續嘗試舊式複製。
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export function ShareClassroomDialog({
  classroom,
  onClose,
}: ShareClassroomDialogProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const stats = useMemo(() => getClassroomShareStats(classroom), [classroom])
  const shareUrl = useMemo(
    () => createClassroomShareUrl(classroom, window.location.href),
    [classroom],
  )
  const tooLong = isClassroomShareUrlTooLong(shareUrl)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const handleCopy = async () => {
    const copied = await copyText(shareUrl)
    setCopyStatus(copied ? 'copied' : 'error')
  }

  const handleDownload = () => {
    downloadText(
      serializeClassroomShareJson(classroom),
      'QuickSeat-教室分享.json',
      'application/json;charset=utf-8',
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board/85 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="share-classroom-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-line bg-surface shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
              SHARE CLASSROOM
            </p>
            <h3
              className="mt-0.5 font-display text-xl text-ink"
              id="share-classroom-title"
            >
              分享教室
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              連結只包含教室配置，不包含名單、姓名、規則或排座結果。
            </p>
          </div>
          <button
            aria-label="關閉分享教室"
            className="px-1 text-xl leading-none text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              { label: '欄 × 列', value: `${classroom.cols} × ${classroom.rows}` },
              { label: '座位', value: stats.seats },
              { label: '走道', value: stats.aisles },
              { label: '禁坐', value: stats.blocked },
            ].map((item) => (
              <div className="bg-paper px-3 py-2" key={item.label}>
                <p className="font-mono text-[8px] tracking-[0.14em] text-muted">
                  {item.label}
                </p>
                <p className="mt-0.5 font-display text-lg text-ink">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <label
              className="font-mono text-[9px] tracking-[0.14em] text-muted"
              htmlFor="classroom-share-url"
            >
              教室分享連結
            </label>
            <textarea
              className="mt-1.5 w-full resize-none border border-line bg-paper px-3 py-2 font-mono text-[10px] leading-5 text-ink outline-none focus:border-accent"
              id="classroom-share-url"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              rows={4}
              value={shareUrl}
            />
            <p className="mt-1 text-[10px] leading-4 text-muted">
              目前連結 {shareUrl.length.toLocaleString('zh-TW')} 字元，上限{' '}
              {MAX_CLASSROOM_SHARE_URL_LENGTH.toLocaleString('zh-TW')} 字元。
            </p>
          </div>

          {tooLong ? (
            <div
              className="border border-mark/30 bg-mark/5 px-3 py-2 text-xs leading-5 text-mark"
              role="alert"
            >
              連結超過長度上限，無法穩定分享。請下載 JSON 檔傳送。
            </div>
          ) : null}

          {copyStatus === 'copied' ? (
            <p className="text-xs text-accent" role="status">
              已複製分享連結。
            </p>
          ) : null}
          {copyStatus === 'error' ? (
            <p className="text-xs text-mark" role="alert">
              無法自動複製，請選取上方連結後手動複製。
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button
              className="border border-line bg-paper px-3 py-2 text-xs text-muted transition-colors hover:border-ink/40 hover:text-ink"
              onClick={onClose}
              type="button"
            >
              關閉
            </button>
            {tooLong ? (
              <button
                className="border border-mark/40 bg-mark/10 px-3 py-2 text-xs text-mark transition-colors hover:bg-mark/15"
                onClick={handleDownload}
                type="button"
              >
                下載 JSON
              </button>
            ) : (
              <button
                className="border border-accent bg-accent px-3 py-2 text-xs text-chalk transition-colors hover:bg-accent/90"
                onClick={handleCopy}
                type="button"
              >
                複製連結
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
