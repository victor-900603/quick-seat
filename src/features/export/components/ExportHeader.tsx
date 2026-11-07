export interface ExportStat {
  label: string
  value: string | number
}

export function ExportHeader({ stats }: { stats: ExportStat[] }) {
  return (
    <header className="mb-6 border-b border-line pb-5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.25em] text-mark">
            STEP 05 / EXPORT
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide text-ink">
            匯出與備份
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            先在左側確認列印結果，再輸出座位表或下載完整專案備份。
          </p>
        </div>

        <dl
          aria-label="匯出統計"
          className="grid grid-cols-2 gap-x-6 gap-y-3 border border-line bg-surface/75 px-5 py-3 sm:grid-cols-4"
        >
          {stats.map((stat) => (
            <div className="min-w-16" key={stat.label}>
              <dt className="font-mono text-[9px] tracking-[0.12em] text-muted">
                {stat.label}
              </dt>
              <dd className="mt-0.5 font-display text-xl leading-tight text-ink">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}
