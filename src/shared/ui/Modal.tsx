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
  dialogClassName?: string;
  contentClassName?: string;
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
  dialogClassName,
  contentClassName,
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-modal-backdrop"
          aria-hidden="true"
        />
        <div
          ref={modalRef}
          tabIndex={-1}
          className={classNames(
            'relative w-full bg-white dark:bg-[#0B192C] rounded-2xl shadow-2xl overflow-hidden text-left border border-slate-200 dark:border-slate-700/80 animate-modal-content',
            dialogClassName ?? sizeStyles[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className={headerClassName ?? 'flex items-center justify-between border-b border-[#172a45] dark:border-white/10 px-6 py-4.5 bg-[#0B192C] dark:bg-black'}>
              <div>
                {title && (
                  <h2 id="modal-title" className={titleClassName ?? 'text-lg font-semibold text-emerald-400 tracking-tight'}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className={descriptionClassName ?? 'mt-0.5 text-xs text-emerald-300/80 dark:text-emerald-400/70'}>
                    {description}
                  </p>
                )}
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={closeButtonClassName ?? 'p-1.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-white/10 dark:hover:bg-white/10 rounded-lg transition-colors'}
                  aria-label="Cerrar modal"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className={contentClassName ?? 'p-5 sm:p-6'}>{children}</div>
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
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-5 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
            variant === 'danger'
              ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-400 shadow-sm'
              : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm'
          }`}
        >
          {loading ? 'Procesando...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}