/**
 * Route paths and search context configurations
 */

export interface SearchContext {
  prefix: string;
  placeholder: string;
}

// Route paths
export const ROUTES = {
  HOME: '/',
  SESSIONS: '/sessions',
  DOCUMENTS: '/documents',
  NOTES: '/notes',
} as const;

// Search context configurations for each route
export const SEARCH_CONTEXTS: Record<string, SearchContext> = {
  [ROUTES.SESSIONS]: {
    prefix: '@session ',
    placeholder: 'Search sessions...',
  },
  [ROUTES.DOCUMENTS]: {
    prefix: '@doc ',
    placeholder: 'Search documents...',
  },
  [ROUTES.NOTES]: {
    prefix: '@note ',
    placeholder: 'Search notes...',
  },
};

// Default search context (for routes without specific context)
export const DEFAULT_SEARCH_CONTEXT: SearchContext = {
  prefix: '',
  placeholder: 'Search...',
};
