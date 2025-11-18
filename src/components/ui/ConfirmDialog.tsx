import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  // Auto-focus cancel button when dialog opens (safe default)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure animation starts first
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getColor = () => {
    switch (variant) {
      case 'danger':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--accent)';
    }
  };

  const getBgColor = () => {
    switch (variant) {
      case 'danger':
        return 'var(--danger-bg)';
      case 'warning':
        return 'var(--warning-bg)';
      default:
        return 'var(--accent-bg)';
    }
  };

  const getRingColor = () => {
    switch (variant) {
      case 'danger':
        return 'var(--danger-ring)';
      case 'warning':
        return 'var(--warning-ring)';
      default:
        return 'var(--accent-bg)';
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        animation: 'fadeIn 0.15s ease-out',
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        className="rounded-lg shadow-xl max-w-md w-full mx-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded"
              style={{
                backgroundColor: getBgColor(),
              }}
            >
              <AlertTriangle
                size={20}
                style={{
                  color: getColor(),
                }}
              />
            </div>
            <div className="flex-1">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--fg-primary)' }}
              >
                {title}
              </h3>
              <p
                className="text-sm mt-2"
                style={{ color: 'var(--fg-secondary)', lineHeight: '1.5' }}
              >
                {message}
              </p>
              <p
                className="text-xs mt-3"
                style={{ color: 'var(--fg-tertiary)', fontStyle: 'italic' }}
              >
                Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--fg-secondary)' }}>ESC</kbd> to cancel or{' '}
                <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--fg-secondary)' }}>Ctrl+Enter</kbd> to confirm
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              color: 'var(--fg-primary)',
              backgroundColor: 'var(--bg-tertiary)',
              outline: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--bg-active)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              color: 'white',
              backgroundColor: getColor(),
              outline: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = `0 0 0 2px ${getRingColor()}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default ConfirmDialog;
