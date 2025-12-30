import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter } from 'lucide-react';
import { FilterBadge } from './FilterBadge';
import { FilterDropdown } from './FilterDropdown';
import { ResultsSection } from './ResultsSection';
import { useSuggestions } from './useSuggestions';
import { useStaticCommands } from './useStaticCommands';
import { useSearch } from './useSearch';
import { useFilterChips } from './useFilterChips';
import { useCommands } from './useCommands';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { getDisplayValue, rebuildQueryWithFilters, buildFilterQuery, deleteBadgeFromQuery } from './utils';
import type { CommandPaletteProps } from './types';

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  initialPrefix = '',
  actions,
  currentSessionId,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDropdownPosition, setFilterDropdownPosition] = useState({ top: 0, right: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const suggestions = useSuggestions(query);
  const staticCommands = useStaticCommands(actions, onClose, setQuery, inputRef);
  const { isSearching, searchResults } = useSearch(query, currentSessionId);
  const filterChips = useFilterChips(query);
  const { groupedDocuments, filteredCommands, filteredStaticCommands, parsed } = useCommands(
    query,
    searchResults,
    currentSessionId,
    staticCommands,
    suggestions,
    actions,
    onClose,
    setQuery,
    inputRef
  );

  useKeyboardNavigation(isOpen, selectedIndex, setSelectedIndex, filteredCommands, inputRef);

  useEffect(() => {
    if (showFilters && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showFilters]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery(initialPrefix);
      setSelectedIndex(0);
      setShowFilters(false);
    }
  }, [isOpen, initialPrefix]);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (filterButtonRef.current && !filterButtonRef.current.contains(target) &&
          !target.closest('.fixed.w-64.rounded-lg.overflow-auto')) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const handleDeleteBadge = (chipKey: string, chipNegate?: boolean) => {
    setQuery(deleteBadgeFromQuery(query, chipKey, chipNegate));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && e.currentTarget.selectionStart === 0 && filterChips.length > 0) {
      e.preventDefault();
      const lastChip = filterChips[filterChips.length - 1];
      handleDeleteBadge(lastChip.key, lastChip.negate);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(rebuildQueryWithFilters(query, e.target.value));
  };

  const handleInsertFilter = (filterValue: string) => {
    setQuery(buildFilterQuery(query, filterValue));
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const displayValue = getDisplayValue(query);

  return (
    <>
      <div className="command-palette-backdrop fixed inset-0 z-50"
           style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
           onClick={onClose} />
      <div className="command-palette-content fixed top-24 left-1/2 z-50 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
           style={{ transform: 'translateX(-50%) translateY(0) scale(1)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-4 py-3 relative" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={20} style={{ color: isSearching ? 'var(--accent)' : 'var(--fg-secondary)' }}
                  className={isSearching ? 'animate-pulse' : ''} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterChips.map((chip, index) => (
              <FilterBadge
                key={`${chip.key}-${index}`}
                label={chip.label}
                value={chip.value}
                chipKey={chip.key}
                negate={chip.negate}
                onDelete={handleDeleteBadge}
              />
            ))}
          </div>
          <input ref={inputRef} type="text" value={displayValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
                 placeholder="Search documents, notes, or type a command..."
                 className="flex-1 bg-transparent outline-none text-sm border-none min-w-0"
                 style={{ color: 'var(--fg-primary)' }} />
          <button ref={filterButtonRef} onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
            <Filter size={14} />
            <span>Filters</span>
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <ResultsSection
            query={query}
            suggestions={suggestions}
            documents={groupedDocuments}
            notes={searchResults.notes}
            sessions={searchResults.sessions || []}
            staticCommands={filteredStaticCommands}
            selectedIndex={selectedIndex}
            filteredCommands={filteredCommands}
            onDocumentClick={(id, title) => {
              actions.onOpenDocument(id, title);
              onClose();
            }}
            onNoteClick={(id, title) => {
              actions.onOpenNote(id, title);
              onClose();
            }}
            isSearching={isSearching}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs"
             style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--fg-secondary)' }}>
          <div className="flex items-center gap-4">
            {[['↑↓', 'Navigate'], ['↵', 'Select'], ['ESC', 'Close']].map(([key, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded text-xs font-medium"
                     style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
                  {key}
                </kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {['Ctrl', 'K'].map((key) => (
              <kbd key={key} className="px-1.5 py-0.5 rounded text-xs font-medium"
                   style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
                {key}
              </kbd>
            ))}
          </div>
        </div>
      </div>
      {showFilters && <FilterDropdown position={filterDropdownPosition} onInsertFilter={handleInsertFilter} onClose={() => setShowFilters(false)} />}
    </>
  );
};

export default CommandPalette;
