import type { ReactNode } from 'react'

interface StepPlaceholderProps {
  step: string
  kicker: string
  title: string
  description: string
  items: readonly string[]
  previewLabel: string
  preview: ReactNode
}

export function StepPlaceholder({
  step,
  kicker,
  title,
  description,
  items,
  previewLabel,
  preview,
}: StepPlaceholderProps) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14 lg:py-14">
      <section className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-[0.25em] text-mark">
            STEP {step}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
            {kicker}
          </span>
        </div>

        <h2 className="mt-5 font-display text-4xl tracking-tight text-ink sm:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-9">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
            包含項目
          </p>
          <ul className="mt-3 space-y-2.5">
            {items.map((item) => (
              <li className="flex items-start gap-3 text-sm text-ink" key={item}>
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 bg-mark"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside aria-label={previewLabel} className="min-w-0 self-start">
        <div className="border border-line bg-surface shadow-[6px_6px_0_rgb(216_213_199_/_0.55)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
              {previewLabel}
            </span>
            <span className="border border-line px-2 py-0.5 text-[10px] text-muted">
              示意
            </span>
          </div>
          <div aria-hidden="true" className="p-4">
            {preview}
          </div>
        </div>
      </aside>
    </div>
  )
}
