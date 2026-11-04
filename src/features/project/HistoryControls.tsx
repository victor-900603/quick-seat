import { useHistoryControls } from './projectStore'

interface HistoryControlsProps {
  disabled?: boolean
}

function UndoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
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

function RedoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
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

export function HistoryControls({ disabled = false }: HistoryControlsProps) {
  const { canUndo, canRedo, undo, redo } = useHistoryControls()

  return (
    <div
      aria-label="全域復原與重做"
      className="flex shrink-0 items-center gap-1"
      role="group"
    >
      <button
        aria-label="復原"
        className="border border-chalk/25 p-1.5 text-chalk/60 transition-colors hover:border-chalk/50 hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk-accent disabled:cursor-not-allowed disabled:opacity-30"
        disabled={disabled || !canUndo}
        onClick={undo}
        title="復原（Ctrl+Z）"
        type="button"
      >
        <UndoIcon />
      </button>
      <button
        aria-label="重做"
        className="border border-chalk/25 p-1.5 text-chalk/60 transition-colors hover:border-chalk/50 hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk-accent disabled:cursor-not-allowed disabled:opacity-30"
        disabled={disabled || !canRedo}
        onClick={redo}
        title="重做（Ctrl+Shift+Z）"
        type="button"
      >
        <RedoIcon />
      </button>
    </div>
  )
}
