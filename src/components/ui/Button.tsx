import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  children: ReactNode
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-forest-800 text-canvas-50 hover:bg-forest-700 shadow-soft hover:shadow-lifted hover:-translate-y-px',
  secondary:
    'bg-white/70 text-forest-800 ring-1 ring-forest-800/15 hover:bg-white hover:ring-forest-800/30 shadow-soft hover:-translate-y-px backdrop-blur-sm',
  ghost:
    'text-forest-800 hover:bg-forest-50 hover:text-forest-900',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold',
        'transition-all duration-200 ease-out',
        'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
