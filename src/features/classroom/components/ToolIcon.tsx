import type { EditorTool } from '../editorTypes'

interface ToolIconProps {
  tool: EditorTool
  className?: string
}

export function ToolIcon({ tool, className = 'h-4 w-4' }: ToolIconProps) {
  const shared = {
    className,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (tool) {
    case 'select':
      return (
        <svg {...shared}>
          <path d="M4 3.5 15 9l-4.7 1.4L8.2 15 4 3.5Z" />
        </svg>
      )
    case 'seat':
      return (
        <svg {...shared}>
          <rect height="11" rx="1" width="13" x="3.5" y="4.5" />
          <path d="M7 4.5v11" />
        </svg>
      )
    case 'aisle':
      return (
        <svg {...shared}>
          <rect
            height="11"
            rx="1"
            strokeDasharray="2.5 2.5"
            width="13"
            x="3.5"
            y="4.5"
          />
        </svg>
      )
    case 'blocked':
      return (
        <svg {...shared}>
          <rect fill="currentColor" height="11" rx="1" width="13" x="3.5" y="4.5" />
          <path d="m6.5 7.5 7 5M13.5 7.5l-7 5" stroke="var(--color-surface)" />
        </svg>
      )
    case 'empty':
      return (
        <svg {...shared}>
          <rect
            height="11"
            rx="1"
            strokeDasharray="1 3"
            width="13"
            x="3.5"
            y="4.5"
          />
        </svg>
      )
    case 'rect':
      return (
        <svg {...shared}>
          <path d="M3.5 7V4.5H6M14 4.5h2.5V7M16.5 13v2.5H14M6 15.5H3.5V13" />
          <path d="M7 10h6" strokeDasharray="2 2" />
        </svg>
      )
    default:
      return null
  }
}

export function UndoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 20 20"
    >
      <path d="M7 5 3.5 8.5 7 12" />
      <path d="M3.5 8.5H12a4.5 4.5 0 0 1 0 9H9" />
    </svg>
  )
}

export function RedoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 20 20"
    >
      <path d="m13 5 3.5 3.5L13 12" />
      <path d="M16.5 8.5H8a4.5 4.5 0 0 0 0 9h3" />
    </svg>
  )
}
