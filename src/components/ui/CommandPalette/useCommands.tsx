import { useMemo } from 'react';
import { Search, FolderOpen } from 'lucide-react';
import { parseSearchQuery } from '@/utils/searchParser';
import type { DocumentSearchResult } from '@/services/documents';
import type { NoteSearchResult } from '@/services/notes';
import type { ResearchSession } from '@/types';
import type { CommandItem, CommandPaletteActions, Suggestion } from './types';
import type { ParsedQuery } from '@/utils/searchParser';

export const useCommands = (
  query: string,
  searchResults: { documents: DocumentSearchResult[]; notes: NoteSearchResult[]; sessions: ResearchSession[] },
  currentSessionId: string | null | undefined,
  staticCommands: CommandItem[],
  suggestions: Suggestion[],
  actions: CommandPaletteActions,
  onClose: () => void,
  setQuery: (query: string) => void,
  inputRef: React.RefObject<HTMLInputElement | null>
): {
  groupedDocuments: { currentSession: DocumentSearchResult[]; otherSessions: DocumentSearchResult[]; vault: DocumentSearchResult[] };
  filteredCommands: CommandItem[];
  filteredStaticCommands: CommandItem[];
  parsed: ParsedQuery;
} => {
  const parsed = useMemo(() => parseSearchQuery(query), [query]);

  const groupedDocuments = useMemo(() => {
    const currentSession: DocumentSearchResult[] = [];
    const otherSessions: DocumentSearchResult[] = [];
    const vault: DocumentSearchResult[] = [];

    searchResults.documents.forEach(doc => {
      if (doc.session_id === currentSessionId) currentSession.push(doc);
      else if (doc.session_id) otherSessions.push(doc);
      else vault.push(doc);
    });

    return { currentSession, otherSessions, vault };
  }, [searchResults.documents, currentSessionId]);

  const searchCommands: CommandItem[] = useMemo(() => {
    const commands: CommandItem[] = [];

    [...groupedDocuments.currentSession, ...groupedDocuments.otherSessions, ...groupedDocuments.vault].forEach(doc => {
      const location = doc.session_id === currentSessionId ? 'Current Session' :
                       doc.session_id ? `Session: ${doc.session_name || 'Unknown'}` : 'Vault';
      commands.push({
        id: `doc-${doc.id}`,
        title: doc.title,
        subtitle: `Document • ${doc.content_type.toUpperCase()} • ${location}`,
        icon: <Search size={18} />,
        category: 'document',
        action: () => {
          actions.onOpenDocument(doc.id, doc.title);
          onClose();
        },
      });
    });

    searchResults.notes.forEach(note => {
      commands.push({
        id: `note-${note.id}`,
        title: note.title,
        subtitle: note.content_preview || '',
        icon: <Search size={18} />,
        category: 'note',
        action: () => {
          actions.onOpenNote(note.id, note.title);
          onClose();
        },
      });
    });

    // Sort sessions: current session first
    const sortedSessions = [...(searchResults.sessions || [])].sort((a, b) => {
      if (a.id === currentSessionId) return -1;
      if (b.id === currentSessionId) return 1;
      return 0;
    });

    sortedSessions.forEach(session => {
      const isCurrent = session.id === currentSessionId;
      commands.push({
        id: `session-${session.id}`,
        title: session.title,
        subtitle: isCurrent
          ? `${session.goal || 'Research session'} • Current Session`
          : session.goal || 'Research session',
        icon: <FolderOpen size={18} />,
        category: 'session' as const,
        action: () => {
          actions.onNavigate?.(`/sessions`);
          onClose();
        },
      });
    });

    return commands;
  }, [groupedDocuments, searchResults.notes, searchResults.sessions, actions, onClose, currentSessionId]);

  const filteredStaticCommands = useMemo(() => {
    const searchText = parsed.searchText.toLowerCase();
    if (searchText.length === 0) {
      return parsed.mode === 'command' ? staticCommands : [];
    }
    return staticCommands.filter(cmd => {
      const lowerTitle = cmd.title.toLowerCase();
      const lowerSubtitle = cmd.subtitle?.toLowerCase() || '';
      return lowerTitle.includes(searchText) || lowerSubtitle.includes(searchText) ||
             lowerTitle.split(/\s+/).some(word => word.startsWith(searchText));
    });
  }, [parsed, staticCommands]);

  const filteredCommands = useMemo(() => {
    const suggestionCommands: CommandItem[] = suggestions.map(sugg => ({
      id: `suggestion-${sugg.value}`,
      title: sugg.label,
      subtitle: sugg.description,
      icon: <Search size={18} />,
      category: 'action' as const,
      action: () => {
        let newQuery = '';
        if (parsed.mode === 'command') newQuery += '> ';
        if (parsed.typeFilter && !sugg.label.startsWith('@')) newQuery += `@${parsed.typeFilter} `;
        Object.entries(parsed.filters).forEach(([key, filterVal]) => {
          if (filterVal) {
            newQuery += `${filterVal.negate ? '-' : ''}${key}:${filterVal.value} `;
          }
        });
        const cleaned = parsed.searchText.replace(/@\w*$/, '').replace(/\b\w+:?$/, '').trim();
        const hasCursor = sugg.value.includes('__CURSOR__');
        const finalValue = hasCursor ? sugg.value.replace('__CURSOR__', '') : sugg.value;
        newQuery += cleaned ? cleaned + ' ' + finalValue : finalValue;
        setQuery(newQuery);
        if (hasCursor && inputRef.current) {
          const displayBeforeCursor = cleaned ? cleaned + ' ' : '';
          const cursorPosition = displayBeforeCursor.length + sugg.value.indexOf('__CURSOR__');
          setTimeout(() => {
            inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
            inputRef.current?.focus();
          }, 0);
        }
      },
    }));

    if (parsed.mode === 'command') {
      return [...suggestionCommands, ...filteredStaticCommands];
    }
    if (query.trim().length >= 1) {
      return [...suggestionCommands, ...searchCommands, ...filteredStaticCommands];
    }
    return filteredStaticCommands;
  }, [query, searchCommands, filteredStaticCommands, suggestions, parsed, setQuery, inputRef]);

  return { groupedDocuments, filteredCommands, filteredStaticCommands, parsed };
};
