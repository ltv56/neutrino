import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { DEFAULT_COMMANDS, type Command } from '@/constants/commands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrefix?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, initialPrefix = '' }) => {
  const [prefix, setPrefix] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = DEFAULT_COMMANDS.map(cmd => ({
    ...cmd,
    action: () => console.log(`Action: ${cmd.title}`),
  }));

  const filteredCommands = query
    ? commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setPrefix(initialPrefix);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, initialPrefix]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Backspace' && query === '' && prefix) {
        // When backspace on empty query with prefix, remove prefix
        e.preventDefault();
        setPrefix('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose, query, prefix]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="command-palette-backdrop fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />

      {/* Command Palette */}
      <div
        className="command-palette-content fixed top-24 left-1/2 z-50 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
        style={{
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Search size={20} style={{ color: 'var(--fg-secondary)' }} />

          <div
            className="flex-1 flex items-center gap-1 px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Prefix Tag inside search bar */}
            {prefix && (
              <span
                className="px-1 py-0.5 rounded text-sm font-medium shrink-0"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                {prefix}
              </span>
            )}

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setSelectedIndex(0);

                // Auto-detect prefix patterns
                if (value.startsWith('/sessions') || value.startsWith('/documents') || value.startsWith('/notes')) {
                  const match = value.match(/^(\/\w+)\s*(.*)/);
                  if (match) {
                    setPrefix(match[1]);
                    setQuery(match[2]);
                  }
                }
              }}
              placeholder={prefix ? "Type to search..." : "Search or type a command..."}
              className="flex-1 bg-transparent outline-none text-sm border-none"
              style={{ color: 'var(--fg-primary)' }}
            />
          </div>

          <div
            className="text-xs p-1 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--fg-secondary)',
            }}
          >
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--fg-secondary)' }}
            >
              No results found
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((cmd, index) => (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      index === selectedIndex
                        ? 'var(--bg-active)'
                        : 'transparent',
                  }}
                >
                  <div
                    className="flex-shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--fg-primary)' }}
                    >
                      {cmd.title}
                    </div>
                    {cmd.subtitle && (
                      <div
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--fg-secondary)' }}
                      >
                        {cmd.subtitle}
                      </div>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <div
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--fg-secondary)',
                      }}
                    >
                      ↵
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs"
          style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--fg-secondary)',
          }}
        >
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              K
            </kbd>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
