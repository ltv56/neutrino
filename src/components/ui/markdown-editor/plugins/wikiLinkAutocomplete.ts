import { autocompletion } from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { noteLinkService } from '@/services';
import type { LinkTarget } from '@/types';

let currentSessionId: string | undefined;
let currentNoteId: string | undefined;
let cachedResults: LinkTarget[] = [];
let cacheTime = 0;

export function setWikiLinkSession(sessionId: string | undefined) {
  currentSessionId = sessionId;
  if (sessionId) {
    // Pre-fetch all notes for instant autocomplete
    noteLinkService.searchTargets('', sessionId).then(results => {
      cachedResults = results;
      cacheTime = Date.now();
    });
  } else {
    cachedResults = [];
  }
}

export function setCurrentNote(noteId: string | undefined) {
  currentNoteId = noteId;
}

function wikiLinkCompletions(context: CompletionContext): CompletionResult | Promise<CompletionResult | null> | null {
  const before = context.matchBefore(/\[\[([^\]]*)/);
  if (!before) return null;

  const fullQuery = before.text.substring(2);

  // Parse prefix (note:, doc:, or plain)
  let searchQuery = fullQuery;
  let filterType: 'all' | 'note' | 'doc' = 'all';

  if (fullQuery.startsWith('note:')) {
    filterType = 'note';
    searchQuery = fullQuery.substring(5);
  } else if (fullQuery.startsWith('doc:')) {
    filterType = 'doc';
    searchQuery = fullQuery.substring(4);
  }

  const createOptions = (targets: LinkTarget[]): Completion[] => {
    let filtered = targets;

    // Filter by type if specified
    if (filterType === 'note') {
      filtered = filtered.filter(r => r.target_type === 'note');
    } else if (filterType === 'doc') {
      filtered = filtered.filter(r => r.target_type === 'document');
    }

    // Exclude current note
    if (currentNoteId) {
      filtered = filtered.filter(r => r.id !== currentNoteId);
    }

    return filtered.map((target: LinkTarget) => {
      const isNote = target.target_type === 'note';
      const prefix = filterType === 'note' ? 'note:' : (filterType === 'doc' ? 'doc:' : '');
      const linkText = prefix + target.title;
      const icon = isNote ? '📝' : '📄';

      return {
        label: `${icon} ${target.title}`,
        detail: isNote ? 'Note' : (filterType === 'doc' ? 'Document • Add #page' : 'Document'),
        info: target.content_preview || undefined,
        apply: linkText + ']]',
        type: isNote ? 'text' : 'keyword',
      };
    });
  };

  // Use cached results if available
  if (cachedResults.length > 0) {
    const options = createOptions(cachedResults);

    // Filter by search query (includes matching)
    const filtered = searchQuery.length > 0
      ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options.slice(0, 10);

    if (filtered.length === 0) {
      return {
        from: before.from + 2,
        options: [{ label: 'No matches found', detail: 'Try a different search', apply: () => {} }],
        filter: false,
      };
    }

    return {
      from: before.from + 2,
      options: filtered,
      filter: false, // We already filtered - don't let CodeMirror filter again
    };
  }

  // No cache yet - show loading
  return {
    from: before.from + 2,
    options: [{ label: 'Loading...', detail: 'Fetching notes and documents', apply: () => {} }],
    filter: false,
  };
}

export const wikiLinkAutocomplete = autocompletion({
  override: [wikiLinkCompletions],
  activateOnTyping: true,
  maxRenderedOptions: 10,
  closeOnBlur: true,
  icons: false,
});
