import React, { useEffect, useRef } from 'react';
import { FileText, FileIcon } from 'lucide-react';

interface NoteOrDocument {
  id: string;
  title: string;
  content?: string;
}

interface AutocompleteItem {
  item: NoteOrDocument;
  type: 'note' | 'document';
}

interface NoteAutocompleteProps {
  items: AutocompleteItem[];
  position: { top: number; left: number };
  selectedIndex: number;
  onSelect: (item: NoteOrDocument, type: 'note' | 'document') => void;
  onClose: () => void;
}

export const NoteAutocomplete: React.FC<NoteAutocompleteProps> = ({
  items,
  position,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current && selectedIndex >= 0) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="note-autocomplete"
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          minWidth: '250px',
          maxWidth: '400px',
          maxHeight: '300px',
          overflow: 'auto',
          zIndex: 1000,
          padding: '4px',
        }}
      >
        <div
          className="px-3 py-2 text-xs"
          style={{ color: 'var(--fg-tertiary)' }}
        >
          No items found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="note-autocomplete"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '250px',
        maxWidth: '400px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 1000,
        padding: '4px',
      }}
    >
      {items.map(({ item, type }, index) => {
        const isNote = type === 'note';
        const Icon = isNote ? FileText : FileIcon;

        return (
          <div
            key={`${type}-${item.id}`}
            onClick={() => onSelect(item, type)}
            className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm"
            style={{
              backgroundColor: index === selectedIndex ? 'var(--bg-active)' : 'transparent',
              color: 'var(--fg-primary)',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => {
              // Visual feedback on hover
              if (index !== selectedIndex) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }
            }}
            onMouseLeave={(e) => {
              if (index !== selectedIndex) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon size={14} style={{ color: 'var(--fg-secondary)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {isNote ? `${item.title}.md` : item.title}
                <span className="text-xs ml-2" style={{ color: 'var(--fg-tertiary)' }}>
                  {isNote ? '(note)' : '(doc)'}
                </span>
              </div>
              {isNote && item.content && (
                <div
                  className="text-xs truncate mt-0.5"
                  style={{ color: 'var(--fg-tertiary)' }}
                >
                  {item.content.substring(0, 60)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NoteAutocomplete;
