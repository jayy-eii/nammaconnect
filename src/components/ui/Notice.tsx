import type { ReactNode } from 'react'
import { Info, TriangleAlert, CircleX } from 'lucide-react'
import { cn } from '../../lib/cn'

type NoticeTone = 'default' | 'attention' | 'error'

type NoticeProps = {
  children: ReactNode
  className?: string
  tone?: NoticeTone
}

const toneStyles: Record<NoticeTone, { container: string; iconClass: string; Icon: typeof Info }> = {
  default: {
    container: 'bg-canvas-200/70 text-ink-500 ring-ink-900/6',
    iconClass: 'text-forest-500',
    Icon: Info,
  },
  attention: {
    container: 'bg-amber-50 text-amber-800 ring-amber-900/15',
    iconClass: 'text-amber-600',
    Icon: TriangleAlert,
  },
  error: {
    container: 'bg-rose-50 text-rose-800 ring-rose-900/15',
    iconClass: 'text-rose-600',
    Icon: CircleX,
  },
}

/**
 * Unobtrusive inline status message. Used to tell users honestly
 * when a capability (voice, playback, etc.) is not available yet.
 * Announced politely to screen readers.
 */
export function Notice({ children, className, tone = 'default' }: NoticeProps) {
  const styles = toneStyles[tone]
  const Icon = styles.Icon

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2',
        'text-[13px] font-medium',
        styles.container,
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', styles.iconClass)} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
