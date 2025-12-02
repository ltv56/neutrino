import { useState, useEffect } from 'react';
import { parseSearchQuery } from '@/utils/searchParser';
import { documentService, noteService, sessionService } from '@/services';
import type { DocumentSearchResult } from '@/services/documents';
import type { NoteSearchResult } from '@/services/notes';
import type { ResearchSession } from '@/types';

export const useSearch = (query: string, currentSessionId?: string | null) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    documents: DocumentSearchResult[];
    notes: NoteSearchResult[];
    sessions: ResearchSession[];
  }>({ documents: [], notes: [], sessions: [] });

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) {
      setIsSearching(false);
      setSearchResults({ documents: [], notes: [], sessions: [] });
      return;
    }

    setIsSearching(true);
    const performSearch = async () => {
      try {
        const parsed = parseSearchQuery(query);
        const shouldSearchDocs = parsed.mode !== 'command' && (!parsed.typeFilter || parsed.typeFilter === 'doc');
        const shouldSearchNotes = parsed.mode !== 'command' && (!parsed.typeFilter || parsed.typeFilter === 'note');
        const shouldSearchSessions = parsed.mode !== 'command' && (!parsed.typeFilter || parsed.typeFilter === 'session');

        const [documents, notes, allSessions] = await Promise.all([
          shouldSearchDocs ? documentService.searchWithContext(
            parsed.searchText,
            undefined, undefined, // removed file filter
            parsed.filters.path?.value, parsed.filters.path?.negate,
            parsed.filters.type?.value, parsed.filters.type?.negate,
            parsed.filters.in?.value, parsed.filters.in?.negate,
            currentSessionId || undefined
          ) : [],
          shouldSearchNotes ? noteService.search(
            parsed.searchText,
            parsed.filters.type?.value, parsed.filters.type?.negate,
            parsed.filters.in?.value, parsed.filters.in?.negate,
            currentSessionId || undefined
          ) : [],
          shouldSearchSessions ? sessionService.getAll() : []
        ]);

        // Client-side session filtering by title
        // If @session with no search text, show all sessions
        const sessions = shouldSearchSessions
          ? (parsed.searchText
              ? allSessions.filter(s => s.title.toLowerCase().includes(parsed.searchText.toLowerCase()))
              : allSessions)
          : [];

        setSearchResults({ documents, notes, sessions });
      } catch (error) {
        console.error('[CommandPalette] Search failed:', error);
        setSearchResults({ documents: [], notes: [], sessions: [] });
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, currentSessionId]);

  return { isSearching, searchResults };
};
