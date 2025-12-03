import React, { type ReactNode, type RefObject } from 'react';
import { X, Minimize2, Clock, Plus } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface FloatingNoteTitleBarProps {
  showRecentMenu: boolean;
  setShowRecentMenu: (show: boolean) => void;
  recentButtonRef: RefObject<HTMLButtonElement | null>;
  children?: ReactNode; // For dropdown menu
}

export const FloatingNoteTitleBar: React.FC<FloatingNoteTitleBarProps> = ({
  showRecentMenu,
  setShowRecentMenu,
  recentButtonRef,
  children,
}) => {
  const handleNewNote = () => {
    // Trigger custom event for parent to handle
    window.dispatchEvent(new CustomEvent('floating-note-new'));
  };

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.hide();
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between px-3 py-2 select-none"
      style={{
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Quick Capture
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* New Note Button */}
        <Tooltip content="New note" placement="bottom">
          <button
            onClick={handleNewNote}
            className="p-1 rounded hover:bg-(--bg-secondary) transition-colors"
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <Plus size={13} />
          </button>
        </Tooltip>

        {/* Recent Notes Dropdown */}
        <div className="relative" style={{ marginRight: '4px' }}>
          <Tooltip content="Recent notes" placement="bottom">
            <button
              ref={recentButtonRef}
              onClick={() => setShowRecentMenu(!showRecentMenu)}
              className="p-1 rounded hover:bg-(--bg-secondary) transition-colors"
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock size={13} />
            </button>
          </Tooltip>

          {children}
        </div>

        <button
          onClick={handleMinimize}
          className="p-1 rounded hover:bg-(--bg-secondary) transition-colors"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <Minimize2 size={13} />
        </button>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-(--bg-secondary) transition-colors"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
