import type { TabId } from '../app/tabs'

interface StepIconProps {
  id: TabId
  className?: string
}

const paths: Record<TabId, string[]> = {
  classroom: [
    'M4 4h16v16H4z',
    'M4 9.33h16',
    'M4 14.67h16',
    'M9.33 4v16',
    'M14.67 4v16',
  ],
  roster: [
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M3.5 19a5.5 5.5 0 0 1 11 0',
    'M16 6.5a2.5 2.5 0 0 1 0 5',
    'M17.5 14.2a4.5 4.5 0 0 1 3 4.3',
  ],
  rules: [
    'M4 7h6',
    'M14 7h6',
    'M4 17h10',
    'M18 17h2',
    'M12 4v6',
    'M16 14v6',
  ],
  seating: [
    'M5 4h14v10H5z',
    'M8 14v3',
    'M16 14v3',
    'M8 18.5h8',
    'M12 8.5h.01',
  ],
  export: [
    'M12 3v11',
    'M8 10l4 4 4-4',
    'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  ],
}

export function StepIcon({ id, className }: StepIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      {paths[id].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  )
}
