import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../utils/helpers';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  closeButtonClassName?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  hideCloseButton = false,
  headerClassName,
  titleClassName,
  descriptionClassName,
  closeButtonClassName,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !closeOnEscape) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div
          onClick={closeOnOverlayClick ? onClose : undefined}
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-modal-backdrop"
          aria-hidden="true"
        />
        <div
          ref={modalRef}
          tabIndex={-1}
          className={classNames(
            'relative w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-left border border-slate-200/50 dark:border-white/10 animate-modal-content',
            sizeStyles[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className={headerClassName ?? 'flex items-center justify-between rounded-t-3xl bg-navy-900 px-6 py-4'}>
              <div>
                {title && (
                  <h2 id="modal-title" className={titleClassName ?? 'text-lg font-semibold text-white tracking-tight'}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className={descriptionClassName ?? 'mt-0.5 text-xs text-slate-300'}>
                    {description}
                  </p>
                )}
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={closeButtonClassName ?? 'rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60 transition-colors'}
                  aria-label="Cerrar modal"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200/90 dark:hover:bg-white/15 border border-slate-200/60 dark:border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
            variant === 'danger'
              ? 'bg-rose-700/85 hover:bg-rose-800 text-rose-50 focus:ring-rose-400 shadow-xs'
              : 'bg-navy-900 hover:bg-navy-800 text-white focus:ring-navy-900 shadow-xs'
          }`}
        >
          {loading ? 'Procesando...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}