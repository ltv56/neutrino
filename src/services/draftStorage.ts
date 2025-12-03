/**
 * Service for managing draft notes in localStorage
 * Supports multiple drafts - preserve unsaved content when creating new notes
 */

const DRAFT_KEY = 'floating-note-draft';
const DRAFTS_KEY = 'floating-note-drafts';

export interface Draft {
  id: string;
  content: string;
  title: string;
  timestamp: number;
}

class DraftStorageService {
  /**
   * Save current draft content to localStorage (single active draft)
   */
  saveDraft(content: string): void {
    const draft = {
      content,
      timestamp: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  /**
   * Get current draft content from localStorage
   */
  getDraft(): { content: string; timestamp: number } | null {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Clear current draft from localStorage
   */
  clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }

  /**
   * Add a draft to the drafts list (for recent notes)
   */
  addDraft(content: string, title: string): void {
    const drafts = this.getDrafts();
    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      content,
      title,
      timestamp: Date.now(),
    };

    // Add to beginning of array
    drafts.unshift(newDraft);

    // Keep only last 10 drafts
    const limited = drafts.slice(0, 10);

    localStorage.setItem(DRAFTS_KEY, JSON.stringify(limited));
  }

  /**
   * Get all saved drafts (auto-delete drafts older than 30 days)
   */
  getDrafts(): Draft[] {
    const stored = localStorage.getItem(DRAFTS_KEY);
    if (!stored) return [];

    try {
      const drafts = JSON.parse(stored) as Draft[];
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      // Filter out drafts older than 30 days
      const validDrafts = drafts.filter(draft => {
        return (now - draft.timestamp) < thirtyDaysMs;
      });

      // Update localStorage if any drafts were removed
      if (validDrafts.length !== drafts.length) {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(validDrafts));
      }

      return validDrafts;
    } catch {
      return [];
    }
  }

  /**
   * Remove a draft by ID
   */
  removeDraft(id: string): void {
    const drafts = this.getDrafts();
    const filtered = drafts.filter(d => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
  }

  /**
   * Remove a draft by content (when saving to database)
   */
  removeDraftByContent(content: string): void {
    const drafts = this.getDrafts();
    const filtered = drafts.filter(d => d.content !== content);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
  }
}

export const draftStorage = new DraftStorageService();
