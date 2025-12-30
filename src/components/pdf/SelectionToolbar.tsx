import React from 'react';
import { Highlighter } from 'lucide-react';

interface SelectionToolbarProps {
  position: { x: number; y: number };
  onHighlight: () => void;
}

/**
 * Floating toolbar that appears when text is selected
 * Shows highlight button to save selected text for smart resume/snapshot context
 */
const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  position,
  onHighlight,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x + 8}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)',
        zIndex: 999,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        padding: '2px',
      }}
    >
      {/* Highlight button - saves text for smart resume/snapshot context */}
      <button
        onClick={onHighlight}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-accent/10 transition-colors"
        style={{ color: 'var(--accent)' }}
        title="Save highlight for context tracking"
      >
        <Highlighter size={14} />
        <span className="text-xs font-medium">Highlight</span>
      </button>
    </div>
  );
};

export default SelectionToolbar;
