/**
 * Simple tab state persistence using localStorage
 * Similar to VSCode/Obsidian approach
 */

export interface TabState {
  id: string;
  type: 'document' | 'note' | 'chat' | 'welcome';
  title: string;
  documentId?: string;
  noteId?: string;
  // Document-specific state
  currentPage?: number;
  scrollPosition?: number;
}

export interface WorkspaceState {
  tabs: TabState[];
  activeTabId: string;
  sessionId?: string;
}

const STORAGE_KEY = 'neutrino_workspace_state';

export const tabStateService = {
  /**
   * Save current workspace state to localStorage
   */
  saveState(state: WorkspaceState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('[TabState] Saved', state.tabs.length, 'tabs');
    } catch (error) {
      console.error('[TabState] Failed to save state:', error);
    }
  },

  /**
   * Load workspace state from localStorage
   */
  loadState(): WorkspaceState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved) as WorkspaceState;
      console.log('[TabState] Loaded workspace state:', state);
      return state;
    } catch (error) {
      console.error('[TabState] Failed to load state:', error);
      return null;
    }
  },

  /**
   * Clear workspace state
   */
  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[TabState] Cleared workspace state');
    } catch (error) {
      console.error('[TabState] Failed to clear state:', error);
    }
  },
};
