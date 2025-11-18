import { invoke } from '@tauri-apps/api/core';

export interface Note {
  id: string;
  title: string;
  content: string;
  session_id?: string;
  document_id?: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export const noteService = {
  /**
   * Create a new note
   */
  async create(
    sessionId: string | null,
    documentId: string | null,
    title: string,
    content: string,
    noteType: string = 'concept'
  ): Promise<Note> {
    return await invoke('create_note', {
      sessionId,
      documentId,
      title,
      content,
      noteType,
    });
  },

  /**
   * Get note by ID
   */
  async getById(noteId: string): Promise<Note | null> {
    return await invoke('get_note', { noteId });
  },

  /**
   * Get all notes (optionally filtered by session)
   */
  async getAll(sessionId?: string | null): Promise<Note[]> {
    return await invoke('get_notes', { sessionId: sessionId || null });
  },

  /**
   * Update note
   */
  async update(noteId: string, title: string, content: string): Promise<void> {
    return await invoke('update_note', { noteId, title, content });
  },

  /**
   * Delete note
   */
  async delete(noteId: string): Promise<boolean> {
    return await invoke('delete_note', { noteId });
  },
};
