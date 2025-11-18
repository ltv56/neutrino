/**
 * Highlight system constants
 */

export const HIGHLIGHT_COLORS = {
  YELLOW: '#ffff00', // Default yellow
  GREEN: '#00ff00', // Green
  BLUE: '#00bfff', // Light blue
  PINK: '#ff69b4', // Hot pink
  ORANGE: '#ffa500', // Orange
} as const;

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS.YELLOW;
export const DEFAULT_HIGHLIGHT_OPACITY = 1;

// Minimum selection size to avoid accidental clicks (in pixels)
export const MIN_SELECTION_SIZE = 5;
