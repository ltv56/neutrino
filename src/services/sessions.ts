import { invoke } from '@tauri-apps/api/core';
import type { ResearchSession } from '@/types';

const QUICK_NOTES_SESSION_TITLE = 'Quick Notes';

export const sessionService = {
  async create(title: string, goal?: string): Promise<ResearchSession> {
    return await invoke('create_research_session', { title, goal });
  },

  async getAll(): Promise<ResearchSession[]> {
    return await invoke('get_research_sessions');
  },

  async delete(sessionId: string): Promise<void> {
    return await invoke('delete_research_session', { sessionId });
  },

  async update(sessionId: string, title: string, goal?: string): Promise<void> {
    return await invoke('update_research_session', { sessionId, title, goal });
  },

  /**
   * Get or create the default "Quick Notes" session
   * This session is used for standalone notes that don't belong to a specific research session
   */
  async getOrCreateQuickNotesSession(): Promise<ResearchSession> {
    const sessions = await this.getAll();
    const quickNotesSession = sessions.find(s => s.title === QUICK_NOTES_SESSION_TITLE);

    if (quickNotesSession) {
      return quickNotesSession;
    }

    // Create Quick Notes session if it doesn't exist
    return await this.create(
      QUICK_NOTES_SESSION_TITLE,
      'Default session for quick notes and standalone notes'
    );
  },
};
