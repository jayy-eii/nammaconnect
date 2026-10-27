import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type IconButtonProps = {
  label: string
  icon: LucideIcon
  onClick?: () => void
  disabled?: boolean
  className?: string
}

/**
 * Small round icon-only button. `label` is required so every
 * icon control stays accessible to screen readers.
 */
export function IconButton({
  label,
  icon: IconComponent,
  onClick,
  disabled,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full',
        'bg-canvas-50 text-ink-700 ring-1 ring-ink-900/8',
        'transition-all duration-200 ease-out',
        'hover:bg-forest-50 hover:text-forest-800 hover:ring-forest-800/20',
        'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-canvas-50 disabled:hover:text-ink-700 disabled:hover:ring-ink-900/8',
        className,
      )}
    >
      <IconComponent className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
    </button>
  )
}
