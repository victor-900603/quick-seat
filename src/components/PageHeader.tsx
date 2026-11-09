import type { ReactNode } from 'react'

export interface PageStat {
  label: string
  value: ReactNode
}

interface PageHeaderProps {
  step: string
  kicker: string
  title: string
  description: string
  stats?: PageStat[]
  statsLabel?: string
  actions?: ReactNode
}

export function PageHeader({
  step,
  kicker,
  title,
  description,
  stats,
  statsLabel,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[9px] tracking-[0.24em] text-muted">
          STEP {step} / {kicker}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-wide text-ink sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>

      {stats || actions ? (
        <div className="flex flex-wrap items-end justify-end gap-3">
          {actions}
          {stats ? (
            <dl
              aria-label={statsLabel}
              className="grid grid-cols-2 gap-x-6 gap-y-2 text-right sm:grid-cols-4"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-muted">
                    {stat.label}
                  </dt>
                  <dd className="font-display text-xl leading-tight text-ink">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
