import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton.jsx'

function Modal({ isOpen, onClose, title, description, children, footer }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')?.focus(), 0)

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('input, select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        if (!focusable.length) return
        const first = focusable[0]; const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => { window.clearTimeout(focusTimer); window.removeEventListener('keydown', handleEscape); document.body.style.overflow = previousOverflow; previousFocus?.focus?.() }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-canvas/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-describedby={description ? 'modal-description' : undefined}
        aria-labelledby="modal-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-elevated shadow-panel"
        role="dialog"
        ref={dialogRef}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton
            aria-label="Close dialog"
            className="-mr-2 -mt-1"
            icon={X}
            onClick={onClose}
            title="Close dialog"
          />
        </header>
        <div className="p-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}

export default Modal
