import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, MessageSquare, Settings, Clock, File, StickyNote } from 'lucide-react';
import { documentService, noteService } from '@/services';
import type { Document } from '@/types';
import type { NoteSearchResult } from '@/services/notes';
import type { DocumentSearchResult } from '@/services/documents';

export interface CommandPaletteActions {
  onCreateSession: () => void;
  onCreateNote: () => void;
  onOpenSettings: () => void;
  onOpenDocument: (documentId: string, title: string) => void;
  onOpenNote: (noteId: string, title: string) => void;
  onNavigateToSessions: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrefix?: string;
  actions: CommandPaletteActions;
  currentSessionId?: string | null;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'action' | 'document' | 'note' | 'navigate';
  action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  initialPrefix = '',
  actions,
  currentSessionId,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    documents: DocumentSearchResult[];
    notes: NoteSearchResult[];
  }>({ documents: [], notes: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  const staticCommands: CommandItem[] = useMemo(() => [
    {
      id: 'new-session',
      title: 'New Session',
      icon: <MessageSquare size={18} />,
      category: 'action',
      action: () => {
        actions.onCreateSession();
        onClose();
      },
    },
    {
      id: 'new-note',
      title: 'New Note',
      icon: <FileText size={18} />,
      category: 'action',
      action: () => {
        actions.onCreateNote();
        onClose();
      },
    },
    {
      id: 'view-sessions',
      title: 'View All Sessions',
      icon: <MessageSquare size={18} />,
      category: 'navigate',
      action: () => {
        actions.onNavigateToSessions();
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings size={18} />,
      category: 'navigate',
      action: () => {
        actions.onOpenSettings();
        onClose();
      },
    },
  ], [actions, onClose]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length >= 1) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchResults({ documents: [], notes: [] });
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      console.log('[CommandPalette] Searching for:', query);
      try {
        // Backend handles FTS5 wildcard transformation
        // Use searchWithContext to get session information for grouping
        const [documents, notes] = await Promise.all([
          documentService.searchWithContext(query),
          noteService.search(query),
        ]);
        console.log('[CommandPalette] Search results:', { documents, notes });
        setSearchResults({ documents, notes });
      } catch (error) {
        console.error('[CommandPalette] Search failed:', error);
        setSearchResults({ documents: [], notes: [] });
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const groupedDocuments = useMemo(() => {
    const currentSessionDocs: DocumentSearchResult[] = [];
    const otherSessionDocs: DocumentSearchResult[] = [];
    const vaultDocs: DocumentSearchResult[] = [];

    searchResults.documents.forEach(doc => {
      if (doc.session_id === currentSessionId) {
        currentSessionDocs.push(doc);
      } else if (doc.session_id) {
        otherSessionDocs.push(doc);
      } else {
        vaultDocs.push(doc);
      }
    });

    return { currentSessionDocs, otherSessionDocs, vaultDocs };
  }, [searchResults.documents, currentSessionId]);

  // Convert search results to command items with grouping
  const searchCommands: CommandItem[] = useMemo(() => {
    const commands: CommandItem[] = [];

    // Add current session documents first
    groupedDocuments.currentSessionDocs.forEach(doc => {
      commands.push({
        id: `doc-${doc.id}`,
        title: doc.title,
        subtitle: `Document • ${doc.content_type.toUpperCase()} • Current Session`,
        icon: <File size={18} />,
        category: 'document',
        action: () => {
          actions.onOpenDocument(doc.id, doc.title);
          onClose();
        },
      });
    });

    // Add other session documents
    groupedDocuments.otherSessionDocs.forEach(doc => {
      const sessionName = doc.session_name || 'Unknown Session';
      commands.push({
        id: `doc-${doc.id}`,
        title: doc.title,
        subtitle: `Document • ${doc.content_type.toUpperCase()} • Session: ${sessionName}`,
        icon: <File size={18} />,
        category: 'document',
        action: () => {
          actions.onOpenDocument(doc.id, doc.title);
          onClose();
        },
      });
    });

    // Add vault documents (no session)
    groupedDocuments.vaultDocs.forEach(doc => {
      commands.push({
        id: `doc-${doc.id}`,
        title: doc.title,
        subtitle: `Document • ${doc.content_type.toUpperCase()} • Vault`,
        icon: <File size={18} />,
        category: 'document',
        action: () => {
          actions.onOpenDocument(doc.id, doc.title);
          onClose();
        },
      });
    });

    // Add note results (backend provides content_preview)
    searchResults.notes.forEach(note => {
      const subtitle = note.content_preview ? `Note • ${note.content_preview}` : 'Note';

      commands.push({
        id: `note-${note.id}`,
        title: note.title,
        subtitle,
        icon: <StickyNote size={18} />,
        category: 'note',
        action: () => {
          actions.onOpenNote(note.id, note.title);
          onClose();
        },
      });
    });

    return commands;
  }, [groupedDocuments, searchResults.notes, actions, onClose]);

  const filteredStaticCommands = useMemo(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      return staticCommands;
    }

    const lowerQuery = trimmedQuery.toLowerCase();

    return staticCommands.filter(cmd => {
      const lowerTitle = cmd.title.toLowerCase();

      if (lowerQuery.length === 1) {
        return lowerTitle.includes(lowerQuery);
      }

      const words = lowerTitle.split(/\s+/);
      const queryChars = lowerQuery.split('');

      let queryIndex = 0;
      for (const word of words) {
        if (queryIndex < queryChars.length && word.startsWith(queryChars[queryIndex])) {
          queryIndex++;
        }
      }
      if (queryIndex === queryChars.length) {
        return true;
      }

      return words.some(word => word.includes(lowerQuery));
    });
  }, [query, staticCommands]);

  const filteredCommands = useMemo(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length >= 1) {
      return [...searchCommands, ...filteredStaticCommands];
    }

    return filteredStaticCommands;
  }, [query, searchCommands, filteredStaticCommands]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery(initialPrefix);
      setSelectedIndex(0);
      setSearchResults({ documents: [], notes: [] });
    }
  }, [isOpen, initialPrefix]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const isInputFocused = document.activeElement === inputRef.current;
      if (isInputFocused && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return;
      }

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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

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
          <Search size={20} style={{ color: isSearching ? 'var(--accent)' : 'var(--fg-secondary)' }} className={isSearching ? 'animate-pulse' : ''} />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, notes, or type a command..."
            className="flex-1 bg-transparent outline-none text-sm border-none"
            style={{ color: 'var(--fg-primary)' }}
          />

          <kbd
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--fg-secondary)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--fg-secondary)' }}
            >
              {isSearching ? 'Searching...' : query.trim().length === 0 ? 'Type to search...' : 'No results found'}
            </div>
          ) : (
            <div className="py-2">
              {/* Current Session Documents */}
              {query.trim().length >= 1 && groupedDocuments.currentSessionDocs.length > 0 && (
                <>
                  <div className="mb-1">
                    <div
                      className="px-4 py-1 text-xs font-semibold"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      Current Session ({groupedDocuments.currentSessionDocs.length})
                    </div>
                  </div>
                  {groupedDocuments.currentSessionDocs.map((doc) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
                    return (
                      <div
                        key={`doc-${doc.id}`}
                        onClick={() => {
                          actions.onOpenDocument(doc.id, doc.title);
                          onClose();
                        }}
                        className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            globalIndex === selectedIndex
                              ? 'var(--bg-active)'
                              : 'transparent',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        <div
                          className="flex-shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          <File size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--fg-primary)' }}
                          >
                            {doc.title}
                          </div>
                          <div
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--fg-secondary)' }}
                          >
                            {doc.content_type.toUpperCase()}
                          </div>
                        </div>
                        <kbd
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg-secondary)',
                            opacity: globalIndex === selectedIndex ? 1 : 0,
                          }}
                        >
                          ↵
                        </kbd>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Other Documents (Vault + Other Sessions) */}
              {query.trim().length >= 1 && (groupedDocuments.vaultDocs.length > 0 || groupedDocuments.otherSessionDocs.length > 0) && (
                <>
                  <div className="mb-1 mt-2">
                    <div
                      className="px-4 py-1 text-xs font-semibold"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      Other Documents ({groupedDocuments.vaultDocs.length + groupedDocuments.otherSessionDocs.length})
                    </div>
                  </div>
                  {groupedDocuments.vaultDocs.map((doc) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
                    return (
                      <div
                        key={`doc-${doc.id}`}
                        onClick={() => {
                          actions.onOpenDocument(doc.id, doc.title);
                          onClose();
                        }}
                        className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            globalIndex === selectedIndex
                              ? 'var(--bg-active)'
                              : 'transparent',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        <div
                          className="flex-shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          <File size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--fg-primary)' }}
                          >
                            {doc.title}
                          </div>
                          <div
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--fg-secondary)' }}
                          >
                            {doc.content_type.toUpperCase()} • Vault
                          </div>
                        </div>
                        <kbd
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg-secondary)',
                            opacity: globalIndex === selectedIndex ? 1 : 0,
                          }}
                        >
                          ↵
                        </kbd>
                      </div>
                    );
                  })}
                  {groupedDocuments.otherSessionDocs.map((doc) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
                    const sessionName = doc.session_name || 'Unknown Session';
                    return (
                      <div
                        key={`doc-${doc.id}`}
                        onClick={() => {
                          actions.onOpenDocument(doc.id, doc.title);
                          onClose();
                        }}
                        className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            globalIndex === selectedIndex
                              ? 'var(--bg-active)'
                              : 'transparent',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        <div
                          className="flex-shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          <File size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--fg-primary)' }}
                          >
                            {doc.title}
                          </div>
                          <div
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--fg-secondary)' }}
                          >
                            {doc.content_type.toUpperCase()} • {sessionName}
                          </div>
                        </div>
                        <kbd
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg-secondary)',
                            opacity: globalIndex === selectedIndex ? 1 : 0,
                          }}
                        >
                          ↵
                        </kbd>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Notes */}
              {query.trim().length >= 1 && searchResults.notes.length > 0 && (
                <>
                  <div className="mb-1 mt-2">
                    <div
                      className="px-4 py-1 text-xs font-semibold"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      Notes ({searchResults.notes.length})
                    </div>
                  </div>
                  {searchResults.notes.map((note) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === `note-${note.id}`);
                    const subtitle = note.content_preview || '';
                    return (
                      <div
                        key={`note-${note.id}`}
                        onClick={() => {
                          actions.onOpenNote(note.id, note.title);
                          onClose();
                        }}
                        className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            globalIndex === selectedIndex
                              ? 'var(--bg-active)'
                              : 'transparent',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        <div
                          className="flex-shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          <StickyNote size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--fg-primary)' }}
                          >
                            {note.title}
                          </div>
                          {subtitle && (
                            <div
                              className="text-xs truncate mt-0.5"
                              style={{ color: 'var(--fg-secondary)' }}
                            >
                              {subtitle}
                            </div>
                          )}
                        </div>
                        <kbd
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg-secondary)',
                            opacity: globalIndex === selectedIndex ? 1 : 0,
                          }}
                        >
                          ↵
                        </kbd>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Commands Group */}
              {filteredStaticCommands.length > 0 && (
                <>
                  {query.trim().length >= 1 && (
                    <div className="mb-1 mt-2">
                      <div
                        className="px-4 py-1 text-xs font-semibold"
                        style={{ color: 'var(--fg-secondary)' }}
                      >
                        Commands ({filteredStaticCommands.length})
                      </div>
                    </div>
                  )}
                  {filteredStaticCommands.map((cmd, index) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                    return (
                      <div
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            globalIndex === selectedIndex
                              ? 'var(--bg-active)'
                              : 'transparent',
                          paddingTop: cmd.subtitle ? '6px' : '15px',
                          paddingBottom: cmd.subtitle ? '6px' : '15px',
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
                        <kbd
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg-secondary)',
                            opacity: globalIndex === selectedIndex ? 1 : 0,
                          }}
                        >
                          ↵
                        </kbd>
                      </div>
                    );
                  })}
                </>
              )}
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
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-secondary)'
                }}
              >
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-secondary)'
                }}
              >
                ↵
              </kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-secondary)'
                }}
              >
                ESC
              </kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--fg-secondary)'
              }}
            >
              Ctrl
            </kbd>
            <kbd
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--fg-secondary)'
              }}
            >
              K
            </kbd>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
