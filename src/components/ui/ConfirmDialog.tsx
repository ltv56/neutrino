import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
  variant?: 'danger' | 'warning' | 'info';
  dismissible?: boolean;
  showDontAskAgain?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
  variant = 'danger',
  dismissible = true,
  showDontAskAgain = false,
}) => {
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dontAskAgain, setDontAskAgain] = React.useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel, dismissible]);

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
      onClick={dismissible ? onCancel : undefined}
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
        className="rounded-lg shadow-xl mx-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '460px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between mb-2">
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--fg-primary)' }}
            >
              {title}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors -mt-1 -mr-1"
                style={{ color: 'var(--fg-tertiary)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p
            style={{
              color: 'var(--fg-secondary)',
              lineHeight: '1.4',
              fontSize: '13px'
            }}
          >
            {message}
          </p>

          {showDontAskAgain && (
            <label
              className="flex items-center gap-2 mt-3 cursor-pointer group"
              style={{ fontSize: '12px', color: 'var(--fg-tertiary)' }}
            >
              <div
                className="relative flex items-center justify-center rounded transition-colors"
                style={{
                  width: '16px',
                  height: '16px',
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: dontAskAgain ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: dontAskAgain ? 'var(--accent)' : 'var(--bg-tertiary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {dontAskAgain && (
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                    style={{ color: 'white' }}
                  >
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="group-hover:text-[var(--fg-secondary)] transition-colors">
                Don't ask again
              </span>
            </label>
          )}
        </div>

        {/* Actions */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-2 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded transition-colors"
            style={{
              color: 'white',
              backgroundColor: getColor(),
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '13px'
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
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-3 py-1.5 rounded transition-colors"
            style={{
              color: 'var(--fg-primary)',
              backgroundColor: 'var(--bg-tertiary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '13px'
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
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default ConfirmDialog;
