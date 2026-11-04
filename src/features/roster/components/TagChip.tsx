import type { TagDef } from '../../../types/domain'
import { formatTagValue, type TagValue } from '../rosterOps'

interface TagChipProps {
  tag: TagDef
  value: TagValue
}

export function TagChip({ tag, value }: TagChipProps) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 border bg-surface px-1.5 py-0.5 text-[9px] leading-tight"
      style={{ borderColor: `${tag.color}66`, color: tag.color }}
      title={`${tag.name}：${formatTagValue(value)}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate">
        <span className="opacity-65">{tag.name}</span>{' '}
        <span className="font-medium">{formatTagValue(value)}</span>
      </span>
    </span>
  )
}
