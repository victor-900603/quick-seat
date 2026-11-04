import { TabPlaceholder } from '../components/TabPlaceholder'

const rules = [
  {
    type: '分開',
    detail: '標籤「學習扶助」彼此不相鄰',
    strength: '硬約束',
    tone: 'border-mark/30 bg-mark/10 text-mark',
  },
  {
    type: '位置',
    detail: '標籤「視力需求」安排在前 2 排',
    strength: '軟約束',
    tone: 'border-accent/30 bg-accent-soft text-accent',
  },
  {
    type: '固定',
    detail: '王小明固定在座位 A03',
    strength: '硬約束',
    tone: 'border-mark/30 bg-mark/10 text-mark',
  },
]

function RulesPreview() {
  return (
    <div className="space-y-2.5">
      {rules.map((rule) => (
        <div className="border border-line bg-paper/70 p-3" key={rule.detail}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm text-ink">{rule.type}</span>
            <span
              className={`border px-1.5 py-0.5 text-[9px] ${rule.tone}`}
            >
              {rule.strength}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
            {rule.detail}
          </p>
        </div>
      ))}
    </div>
  )
}

export function RulesPage() {
  return <TabPlaceholder id="rules" preview={<RulesPreview />} />
}
