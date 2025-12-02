import { useEffect, useState } from 'react';
import { parseSearchQuery } from '@/utils/searchParser';
import type { Suggestion } from './types';

const TYPE_FILTERS: Suggestion[] = [
  { label: '@doc', value: '@doc ', description: 'Documents only' },
  { label: '@note', value: '@note ', description: 'Notes only' },
  { label: '@session', value: '@session ', description: 'Sessions only' },
];

const PROPERTY_FILTERS: Suggestion[] = [
  { label: 'path:', value: 'path:', description: 'Match path' },
  { label: 'type:', value: 'type:', description: 'Content/note type' },
  { label: 'in:', value: 'in:', description: 'Location filter' },
];

export const useSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const parsed = parseSearchQuery(query);
    const searchText = parsed.searchText;

    // Type filter suggestions (@doc, @note, @session)
    const atMatch = searchText.match(/@(\w*)$/i);
    if (atMatch) {
      const partial = atMatch[1].toLowerCase();
      const filtered = TYPE_FILTERS.filter(f =>
        f.label.toLowerCase().startsWith(`@${partial}`)
      );
      setSuggestions(filtered);
    } else if (query.match(/\bin:(?!\S)/)) {
      setSuggestions([
        { label: 'in:current', value: 'in:current ', description: 'Documents & notes in current session' },
        { label: 'in:other', value: 'in:other ', description: 'Documents & notes in other sessions' },
        { label: 'in:vault', value: 'in:vault ', description: 'Documents not in any session' },
        { label: 'in:sessions', value: 'in:sessions ', description: 'Documents & notes in any session' },
        { label: "in:'...'", value: "in:'__CURSOR__'", description: 'Documents & notes in specific session' },
      ]);
    } else if (query.match(/\b-in:(?!\S)/)) {
      setSuggestions([
        { label: '-in:current', value: '-in:current ', description: 'NOT in current session' },
        { label: '-in:vault', value: '-in:vault ', description: 'Must be in at least one session' },
      ]);
    } else if (query.match(/\b-path:(?!\S)/)) {
      setSuggestions([{ label: "-path:'...'", value: "-path:'__CURSOR__'", description: 'Exclude files in this path' }]);
    } else if (query.match(/\b-type:(?!\S)/)) {
      setSuggestions([
        { label: '-type:pdf', value: '-type:pdf ', description: 'Exclude PDF documents' },
        { label: '-type:md', value: '-type:md ', description: 'Exclude Markdown files' },
        { label: '-type:txt', value: '-type:txt ', description: 'Exclude text files' },
      ]);
    } else if (query.match(/\btype:(?!\S)/)) {
      setSuggestions([
        { label: 'type:pdf', value: 'type:pdf ', description: 'PDF documents' },
        { label: 'type:md', value: 'type:md ', description: 'Markdown files' },
        { label: 'type:txt', value: 'type:txt ', description: 'Text files' },
      ]);
    } else if (query.match(/\bpath:(?!\S)/)) {
      setSuggestions([{ label: "path:'...'", value: "path:'__CURSOR__'", description: 'Use quotes for paths with spaces' }]);
    } else {
      // Property filter autocomplete (path:, type:, in:)
      const filterMatch = searchText.match(/\b(\w+)$/i);
      if (filterMatch) {
        const partial = filterMatch[1].toLowerCase();
        const filtered = PROPERTY_FILTERS.filter(f =>
          f.label.toLowerCase().startsWith(partial)
        );
        if (filtered.length > 0) {
          setSuggestions(filtered);
          return;
        }
      }
      setSuggestions([]);
    }
  }, [query]);

  return suggestions;
};
