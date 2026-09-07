import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Tailwind max-width class for the dialog on larger screens, e.g. 'max-w-lg' (default), 'max-w-3xl'. */
  maxWidthClassName?: string;
  /** Sticky footer content (e.g. Save/Cancel buttons). Renders below a divider, outside the scroll area. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Disable the backdrop/Escape close (e.g. while a save request is in flight). */
  closeDisabled?: boolean;
}

/**
 * Shared mobile-safe modal shell. At any viewport (including sub-320px):
 * - never exceeds the viewport width (`w-[calc(100%-24px)]`, capped by
 *   `maxWidthClassName` on larger screens)
 * - never exceeds the viewport height — header/footer stay put, only the
 *   body scrolls (`max-h-[calc(100dvh-2rem)]`, `100dvh` so mobile browser
 *   chrome showing/hiding never clips the dialog)
 * - the close button is always visible, and Escape/backdrop-click close it
 *
 * Not a forced migration for every existing modal — use this for new ones
 * and for ad hoc `fixed inset-0` modals as they're touched for mobile work.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  maxWidthClassName = 'max-w-lg',
  footer,
  children,
  closeDisabled = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => !closeDisabled && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative flex w-[calc(100%-24px)] ${maxWidthClassName} flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900 max-h-[calc(100dvh-2rem)]`}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
