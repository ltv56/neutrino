/**
 * Search Query Parser
 * Parses search queries to extract filters and search terms
 *
 * Supported syntax:
 * - Mode: > (command mode)
 * - Type shortcuts: @doc, @note, @session
 * - Property filters: path:, type:, in:
 * - Negation: -path:, -type:, -in:
 * - Literal escape: "quoted text"
 * - Badge trigger: space after filter value
 */

export interface FilterValue {
  value: string;
  negate: boolean;
}

export interface SearchFilter {
  path?: FilterValue;
  type?: FilterValue;
  in?: FilterValue;
}

export interface ParsedQuery {
  mode: 'search' | 'command';
  filters: SearchFilter;
  typeFilter?: 'doc' | 'note' | 'session';
  searchText: string;
  rawQuery: string;
}

/**
 * Parse search query into filters and search text
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    mode: 'search',
    filters: {},
    searchText: '',
    rawQuery: query,
  };

  let remaining = query.trimStart();

  // 1. Check for command mode prefix (>)
  if (remaining.startsWith('>')) {
    result.mode = 'command';
    remaining = remaining.slice(1).trim();
  }

  // 2. Extract quoted strings (preserve them as-is) - support both " and '
  const quotedStrings: string[] = [];
  remaining = remaining.replace(/"([^"]*)"|'([^']*)'/g, (match, doubleQuoted, singleQuoted) => {
    const placeholder = `__QUOTED_${quotedStrings.length}__`;
    quotedStrings.push(doubleQuoted !== undefined ? doubleQuoted : singleQuoted);
    return placeholder;
  });

  // 3. Extract type shortcuts (@doc, @note, @session) - only if followed by space
  const typeShortcutMatch = remaining.match(/@(doc|note|session)\s+/);
  if (typeShortcutMatch) {
    result.typeFilter = typeShortcutMatch[1] as 'doc' | 'note' | 'session';
    remaining = remaining.replace(/@(doc|note|session)\s+/g, '').trimStart();
  }

  // 4. Extract property filters with optional negation
  // Pattern matches: -?filter:value with optional space
  // Two patterns:
  // - With space (for badge): /(-?)(path|type|in):(\S+)\s/g
  // - Without space (for real-time filter): /(-?)(path|type|in):(\S+)/g

  // First, extract filters that have space (committed filters for badges)
  const committedFilterPattern = /(-?)(path|type|in):(\S+)\s/g;
  let match;

  while ((match = committedFilterPattern.exec(remaining)) !== null) {
    const [fullMatch, negatePrefix, key, value] = match;
    const negate = negatePrefix === '-';

    // Skip if value has incomplete quotes (starts with quote but not a placeholder)
    // This prevents partial quotes like 'a from being treated as valid values
    if (value && (value.startsWith("'") || value.startsWith('"')) && !value.startsWith('__QUOTED_')) {
      continue; // Skip this filter - quote not closed yet
    }

    // Restore quoted values if they were placeholders
    let actualValue = value;
    if (value && value.startsWith('__QUOTED_') && value.endsWith('__')) {
      const index = parseInt(value.match(/__QUOTED_(\d+)__/)?.[1] || '0', 10);
      actualValue = quotedStrings[index] || value;
    }

    // Store filter with negation flag
    const filterKey = key as keyof SearchFilter;
    result.filters[filterKey] = { value: actualValue, negate };
  }

  // Remove committed filter patterns from remaining text
  remaining = remaining.replace(/(-?)(path|type|in):\S+\s/g, '').trimStart();

  // Now extract uncommitted filters (without space) for real-time filtering
  // These won't show as badges but will apply to search
  const uncommittedFilterPattern = /(-?)(path|type|in):(\S+)/g;
  let uncommittedMatch;

  while ((uncommittedMatch = uncommittedFilterPattern.exec(remaining)) !== null) {
    const [fullMatch, negatePrefix, key, value] = uncommittedMatch;
    const negate = negatePrefix === '-';
    const filterKey = key as keyof SearchFilter;

    // Skip if value has incomplete quotes (starts with quote but not a placeholder)
    // This prevents partial quotes like 'a from being treated as valid values
    if (value && (value.startsWith("'") || value.startsWith('"')) && !value.startsWith('__QUOTED_')) {
      continue; // Skip this filter - quote not closed yet
    }

    // Only apply if not already set (committed filters take precedence)
    if (!result.filters[filterKey]) {
      // Restore quoted values if they were placeholders
      let actualValue = value;
      if (value && value.startsWith('__QUOTED_') && value.endsWith('__')) {
        const index = parseInt(value.match(/__QUOTED_(\d+)__/)?.[1] || '0', 10);
        actualValue = quotedStrings[index] || value;
      }

      result.filters[filterKey] = { value: actualValue, negate };
    }
  }

  // Remove uncommitted filter patterns from search text
  remaining = remaining.replace(/(-?)(path|type|in):\S+/g, '').trimStart();

  // 5. Restore quoted strings in search text
  remaining = remaining.replace(/__QUOTED_(\d+)__/g, (match, index) => {
    return quotedStrings[parseInt(index, 10)] || match;
  });

  result.searchText = remaining.trim();

  return result;
}

/**
 * Check if query has any active filters
 */
export function hasActiveFilters(parsed: ParsedQuery): boolean {
  return (
    parsed.mode === 'command' ||
    !!parsed.typeFilter ||
    Object.keys(parsed.filters).length > 0
  );
}

/**
 * Get human-readable filter descriptions
 */
export function getFilterDescriptions(parsed: ParsedQuery): string[] {
  const descriptions: string[] = [];

  if (parsed.mode === 'command') {
    descriptions.push('Commands only');
  }

  if (parsed.typeFilter === 'doc') {
    descriptions.push('Documents only');
  } else if (parsed.typeFilter === 'note') {
    descriptions.push('Notes only');
  } else if (parsed.typeFilter === 'session') {
    descriptions.push('Sessions only');
  }

  if (parsed.filters.path) {
    const prefix = parsed.filters.path.negate ? 'NOT ' : '';
    descriptions.push(`${prefix}Path: ${parsed.filters.path.value}`);
  }

  if (parsed.filters.type) {
    const prefix = parsed.filters.type.negate ? 'NOT ' : '';
    descriptions.push(`${prefix}Type: ${parsed.filters.type.value}`);
  }

  if (parsed.filters.in) {
    const prefix = parsed.filters.in.negate ? 'NOT in ' : 'In ';
    if (parsed.filters.in.value === 'current') {
      descriptions.push(`${prefix}current session`);
    } else if (parsed.filters.in.value === 'vault') {
      descriptions.push(`${prefix}vault`);
    } else if (parsed.filters.in.value === 'sessions') {
      descriptions.push(`${prefix}sessions`);
    } else if (parsed.filters.in.value === 'other') {
      descriptions.push(`${prefix}other sessions`);
    } else {
      descriptions.push(`${prefix}${parsed.filters.in.value}`);
    }
  }

  return descriptions;
}
