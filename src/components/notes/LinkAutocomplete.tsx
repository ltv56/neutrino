import React, { useState, useEffect, useRef } from 'react';
import { FileText, StickyNote } from 'lucide-react';
import { noteLinkService } from '@/services';
import type { LinkTarget } from '@/types';
import { useSessionsContext } from '@/hooks';

interface LinkAutocompleteProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (linkText: string) => void;
  onClose: () => void;
}

export const LinkAutocomplete: React.FC<LinkAutocompleteProps> = ({
  query,
  position,
  onSelect,
  onClose,
}) => {
  const { currentSession } = useSessionsContext();
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'note' | 'doc'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse query for prefix (note:, doc:)
  useEffect(() => {
    let parsedQuery = query;
    let type: 'all' | 'note' | 'doc' = 'all';

    if (query.startsWith('note:')) {
      type = 'note';
      parsedQuery = query.substring(5);
    } else if (query.startsWith('doc:')) {
      type = 'doc';
      parsedQuery = query.substring(4);
    }

    setFilterType(type);
    setSearchQuery(parsedQuery);
  }, [query]);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const results = await noteLinkService.searchTargets(searchQuery || '', currentSession?.id);

        // Filter by type
        const filtered = filterType === 'all'
          ? results
          : results.filter(r => r.target_type === filterType);

        setTargets(filtered);
        setSelectedIndex(0); // Reset selection when results change
      } catch (err) {
        console.error('[LinkAutocomplete] Failed to search:', err);
        setTargets([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search - show all if empty query
    if (searchQuery.length === 0 && filterType === 'all') {
      setTargets([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, currentSession?.id]);

  const handleSelect = (target: LinkTarget) => {
    const isDoc = target.target_type === 'doc';
    const prefix = filterType === 'note' ? 'note:' : (filterType === 'doc' ? 'doc:' : '');

    // Format: [[prefix:Title]] or [[Title]]
    // For documents, user can add #page after selecting
    const linkText = prefix + target.title;
    onSelect(linkText);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, targets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (targets[selectedIndex]) {
          handleSelect(targets[selectedIndex]);
        } else if (query.length > 0) {
          // No selection, just use the typed query
          onSelect(query);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targets, selectedIndex, query, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && targets.length > 0) {
      const selected = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, targets.length]);

  if (query.length === 0) {
    return null;
  }

  // Helper text based on filter type
  const getHelperText = () => {
    if (filterType === 'note') return 'Type to search notes...';
    if (filterType === 'doc') return 'Type to search documents... (add #page after selecting)';
    return 'Type to search notes & documents... (use "note:" or "doc:" to filter)';
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxHeight: '300px',
        overflowY: 'auto',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {loading ? (
        <div className="p-3 text-xs" style={{ color: 'var(--fg-secondary)' }}>
          Searching...
        </div>
      ) : targets.length === 0 ? (
        <div className="p-3 text-xs" style={{ color: 'var(--fg-tertiary)' }}>
          {searchQuery.length === 0 ? (
            <div>{getHelperText()}</div>
          ) : (
            <div>No matches found. Press Enter to use &quot;{query}&quot;</div>
          )}
        </div>
      ) : (
        targets.map((target, index) => {
          const isSelected = index === selectedIndex;
          const isNote = target.target_type === 'note';

          return (
            <div
              key={target.id}
              onClick={() => handleSelect(target)}
              className={`p-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-active' : 'hover:bg-tertiary'
              }`}
              style={{
                borderBottom:
                  index < targets.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}
            >
              <div className="flex items-start gap-2">
                {isNote ? (
                  <StickyNote
                    size={16}
                    style={{ color: 'var(--fg-tertiary)', marginTop: '2px', flexShrink: 0 }}
                  />
                ) : (
                  <FileText
                    size={16}
                    style={{ color: 'var(--fg-tertiary)', marginTop: '2px', flexShrink: 0 }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--fg-primary)' }}
                  >
                    {target.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>
                    {isNote ? 'Note' : 'Document' + (filterType === 'doc' ? ' (add #page after)' : '')}
                  </div>
                  {target.content_preview && (
                    <div
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      {target.content_preview}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default LinkAutocomplete;
