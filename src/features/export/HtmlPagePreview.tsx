import { useEffect, useRef, useState } from 'react'

const HTML_BODY_PADDING = 28
const INITIAL_HEIGHT = 600

export function HtmlPagePreview({
  html,
  pageWidth,
}: {
  html: string
  pageWidth: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const frameObserverRef = useRef<ResizeObserver | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [contentHeight, setContentHeight] = useState(INITIAL_HEIGHT)
  const frameWidth = pageWidth + HTML_BODY_PADDING * 2

  useEffect(() => {
    const element = containerRef.current

    if (!element) {
      return
    }

    const updateWidth = () => {
      const nextWidth = element.clientWidth
      setContainerWidth((current) =>
        Math.abs(current - nextWidth) > 1 ? nextWidth : current,
      )
    }
    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      frameObserverRef.current?.disconnect()
    },
    [],
  )

  const scale =
    containerWidth > 0 ? Math.min(1, containerWidth / frameWidth) : 1

  const handleLoad = () => {
    const frame = frameRef.current

    if (!frame) {
      return
    }

    frameObserverRef.current?.disconnect()

    const measure = () => {
      const document = frame.contentDocument

      if (!document) {
        return false
      }

      const pages =
        typeof document.querySelector === 'function'
          ? document.querySelector('.pages')
          : null
      const pagesHeight = pages?.getBoundingClientRect().height ?? 0
      const height =
        pagesHeight > 1
          ? Math.ceil(pagesHeight + HTML_BODY_PADDING * 2)
          : Math.max(
              1,
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            )

      if (height > 1) {
        setContentHeight(height)
      }

      return height > 1
    }

    measure()

    const body = frame.contentDocument?.body

    if (body && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure)
      observer.observe(body)
      frameObserverRef.current = observer
    }
  }

  return (
    <div ref={containerRef}>
      <div
        className="relative mx-auto overflow-hidden border border-line bg-surface shadow-[0_18px_50px_-30px_rgba(31,42,38,0.45)]"
        style={{
          width: frameWidth * scale,
          height: Math.max(1, contentHeight) * scale,
        }}
      >
        <div
          style={{
            width: frameWidth,
            height: Math.max(1, contentHeight),
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            className="block border-0 bg-white"
            key={html}
            onLoad={handleLoad}
            ref={frameRef}
            srcDoc={html}
            style={{
              width: frameWidth,
              height: Math.max(1, contentHeight),
            }}
            title="即時頁面預覽"
          />
        </div>
      </div>
    </div>
  )
}
