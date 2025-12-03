import React from 'react';
import { Check } from 'lucide-react';

interface FloatingNoteBottomBarProps {
  content: string;
  saveSuccess: boolean;
  isSaving: boolean;
  onClear: () => void;
  onSave: () => void;
}

export const FloatingNoteBottomBar: React.FC<FloatingNoteBottomBarProps> = ({
  content,
  saveSuccess,
  isSaving,
  onClear,
  onSave,
}) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}
      >
        {saveSuccess ? (
          <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={12} />
            Saved!
          </span>
        ) : (
          <span>{content.length} chars</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="px-2.5 py-1 rounded transition-colors"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
          onClick={onClear}
          disabled={!content.trim()}
        >
          Clear
        </button>
        <button
          className="px-3 py-1 rounded transition-colors"
          style={{
            fontSize: '12px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            opacity: !content.trim() || isSaving ? 0.5 : 1,
            cursor: !content.trim() || isSaving ? 'not-allowed' : 'pointer',
          }}
          onClick={onSave}
          disabled={!content.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};
