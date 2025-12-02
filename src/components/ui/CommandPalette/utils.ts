import { parseSearchQuery } from '@/utils/searchParser';

export const getDisplayValue = (query: string): string => {
  const parsed = parseSearchQuery(query);
  let display = query;

  if (parsed.typeFilter && query.match(/@(doc|note|session)\s+/)) {
    display = display.replace(/@(doc|note|session)\s+/, '');
  }

  Object.keys(parsed.filters).forEach(key => {
    display = display.replace(new RegExp(`-?${key}:\\S+\\s+`, 'g'), '');
  });

  return display.replace(/__QUOTED_\d+__/g, "''").trimStart();
};

export const rebuildQueryWithFilters = (query: string, inputValue: string): string => {
  const currentParsed = parseSearchQuery(query);
  let newQuery = '';

  if (!inputValue.match(/^@(doc|note|session)/) && currentParsed.typeFilter && query.match(/@(doc|note|session)\s+/)) {
    newQuery += `@${currentParsed.typeFilter} `;
  }

  Object.entries(currentParsed.filters).forEach(([key, filterVal]) => {
    if (filterVal && query.match(new RegExp(`${filterVal.negate ? '-' : ''}${key}:\\S+\\s+`))) {
      newQuery += `${filterVal.negate ? '-' : ''}${key}:${filterVal.value} `;
    }
  });

  newQuery += inputValue;
  return newQuery;
};

export const buildFilterQuery = (query: string, filterValue: string): string => {
  const parsed = parseSearchQuery(query);
  let newQuery = '';

  if (parsed.mode === 'command') newQuery += '> ';
  if (parsed.typeFilter === 'doc') newQuery += '@doc ';
  if (parsed.typeFilter === 'note') newQuery += '@note ';
  if (parsed.typeFilter === 'session') newQuery += '@session ';

  Object.entries(parsed.filters).forEach(([key, filterVal]) => {
    if (filterVal) {
      newQuery += `${filterVal.negate ? '-' : ''}${key}:${filterVal.value} `;
    }
  });

  newQuery += filterValue;
  return newQuery;
};

export const deleteBadgeFromQuery = (query: string, chipKey: string, chipNegate?: boolean): string => {
  let newQuery = query;

  if (chipKey === 'type') {
    newQuery = query.replace(/@(doc|note|session)\s*/g, '');
  } else {
    const prefix = chipNegate ? '-' : '';
    newQuery = query.replace(new RegExp(`${prefix}${chipKey}:\\S+\\s*`, 'g'), '');
  }

  return newQuery.trim();
};
