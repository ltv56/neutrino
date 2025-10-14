import React from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const WindowControls: React.FC<WindowControlsProps> = ({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div className="flex items-center h-full" data-no-drag>
      <Tooltip content="Minimize" placement="bottom" fullHeight>
        <button
          onClick={onMinimize}
          className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
        >
          <Minus size={16} style={{ color: 'var(--fg-primary)' }} />
        </button>
      </Tooltip>
      <Tooltip content={isMaximized ? "Restore" : "Maximize"} placement="bottom" fullHeight>
        <button
          onClick={onMaximize}
          className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
        >
          {isMaximized ? (
            <Copy size={14} style={{ color: 'var(--fg-primary)', transform: 'scaleX(-1)' }} />
          ) : (
            <Square size={14} style={{ color: 'var(--fg-primary)' }} />
          )}
        </button>
      </Tooltip>
      <Tooltip content="Close" placement="bottom-left" fullHeight>
        <button
          onClick={onClose}
          className="h-full px-4 hover:bg-red-600 transition-colors"
        >
          <X size={16} style={{ color: 'var(--fg-primary)' }} />
        </button>
      </Tooltip>
    </div>
  );
};

export default WindowControls;
