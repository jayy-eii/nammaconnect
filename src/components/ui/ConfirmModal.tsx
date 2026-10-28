import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest-900/40 backdrop-blur-xs transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-canvas-50 p-6 shadow-lifted ring-1 ring-forest-900/10">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded-full p-1.5 text-ink-400 hover:bg-forest-900/5 hover:text-ink-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-600 ring-1 ring-rose-300'
                : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h3
              id="confirm-modal-title"
              className="text-lg font-semibold text-forest-900"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onCancel}>
            {cancelText}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 outline-offset-2 focus-visible:outline-2 ${
              variant === 'danger'
                ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 shadow-soft'
                : 'bg-forest-800 text-white hover:bg-forest-700 focus-visible:outline-forest-600 shadow-soft'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
