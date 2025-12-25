import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import LinksPanel from './LinksPanel';

interface BacklinksSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect?: (noteId: string, title: string) => void;
  onDocumentSelect?: (documentId: string, title: string) => void;
}

const BacklinksSlidePanel: React.FC<BacklinksSlidePanelProps> = ({
  isOpen,
  onClose,
  onNoteSelect,
  onDocumentSelect,
}) => {
  const [width, setWidth] = React.useState(280); // Default width
  const [isResizing, setIsResizing] = React.useState(false);
  const prevIsOpenRef = React.useRef(isOpen);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  // Track open/close transitions for animation
  useEffect(() => {
    // Only animate when transitioning from closed to open
    if (!prevIsOpenRef.current && isOpen) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(240, Math.min(480, newWidth))); // Min: 240px, Max: 480px
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Slide Panel */}
      <div
        className="absolute right-0 top-0 h-full z-50 select-none"
        style={{
          width: `${width}px`,
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.3), -4px 0 16px rgba(0, 0, 0, 0.2)',
          animation: shouldAnimate ? 'slideInRight 0.3s ease-out' : undefined,
        }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize transition-colors"
          onMouseDown={() => setIsResizing(true)}
          style={{
            zIndex: 100,
            backgroundColor: isResizing ? 'var(--accent)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
        >
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg-primary)' }}>
            Links
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-tertiary transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-57px)] overflow-hidden">
          <LinksPanel
            onNoteSelect={onNoteSelect}
            onDocumentSelect={onDocumentSelect}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
};

export default BacklinksSlidePanel;
