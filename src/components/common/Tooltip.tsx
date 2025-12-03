import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  placement?: TooltipPlacement;
  fullHeight?: boolean;
  fullWidth?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 200,
  placement = 'top',
  fullHeight = false,
  fullWidth = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 4;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - tooltipRect.height - gap;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + gap;
        break;
      case 'top-left':
        top = rect.top - tooltipRect.height - gap;
        left = rect.left;
        break;
      case 'top-right':
        top = rect.top - tooltipRect.height - gap;
        left = rect.right - tooltipRect.width;
        break;
      case 'bottom-left':
        top = rect.bottom + gap;
        left = rect.left;
        break;
      case 'bottom-right':
        top = rect.bottom + gap;
        left = rect.right - tooltipRect.width;
        break;
    }

    setPosition({ top, left });
  }, [placement]);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getTransformOrigin = () => {
    switch (placement) {
      case 'top':
      case 'top-left':
      case 'top-right':
        return 'bottom';
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return 'top';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
      default:
        return 'bottom';
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : 'auto',
          height: fullHeight ? '100%' : 'auto',
          verticalAlign: 'middle',
        }}
      >
        {children}
      </span>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--fg-primary)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 99999, // Portal renders outside sidebar stacking context
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border)',
            animation: 'tooltipFadeIn 0.15s ease-out',
            transformOrigin: getTransformOrigin(),
          }}
        >
          {content}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default Tooltip;
