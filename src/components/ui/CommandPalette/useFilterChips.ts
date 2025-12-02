import { useMemo } from 'react';
import { parseSearchQuery } from '@/utils/searchParser';
import type { FilterChip } from './types';

export const useFilterChips = (query: string): FilterChip[] => {
  return useMemo(() => {
    const parsed = parseSearchQuery(query);
    const chips: FilterChip[] = [];

    if (parsed.typeFilter === 'doc' && query.match(/@doc\s+/)) {
      chips.push({ key: 'type', label: '@doc' });
    } else if (parsed.typeFilter === 'note' && query.match(/@note\s+/)) {
      chips.push({ key: 'type', label: '@note' });
    } else if (parsed.typeFilter === 'session' && query.match(/@session\s+/)) {
      chips.push({ key: 'type', label: '@session' });
    }

    Object.entries(parsed.filters).forEach(([key, filterValue]) => {
      if (filterValue && query.match(new RegExp(`${filterValue.negate ? '-' : ''}${key}:\\S+\\s+`))) {
        chips.push({
          key,
          label: `${filterValue.negate ? '-' : ''}${key}:`,
          value: filterValue.value,
          negate: filterValue.negate
        });
      }
    });

    return chips;
  }, [query]);
};
