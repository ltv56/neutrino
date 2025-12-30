import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} style={{ color: 'var(--accent)' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: 'rgb(239, 68, 68)' }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: 'var(--fg-secondary)' }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'var(--accent)';
      case 'error':
        return 'rgb(239, 68, 68)';
      case 'info':
      default:
        return 'var(--border)';
    }
  };

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: `1px solid ${getBorderColor()}`,
        minWidth: '300px',
        maxWidth: '400px',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>

      {getIcon()}

      <div className="flex-1 min-w-0">
        <p
          className="text-sm"
          style={{
            color: 'var(--fg-primary)',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-[var(--bg-active)] transition-colors flex-shrink-0"
        style={{ color: 'var(--fg-secondary)' }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
