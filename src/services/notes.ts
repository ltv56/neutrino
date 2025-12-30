import { invoke } from '@tauri-apps/api/core';

export interface Note {
  id: string;
  title: string;
  content: string;
  session_id?: string;
  document_id?: string;
  folder_id?: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_folder_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteSearchResult {
  id: string;
  title: string;
  content_preview: string;
  session_id?: string;
  session_name?: string;
  document_id?: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseIntegrityCheck {
  is_ok: boolean;
  errors: string[];
  warnings: string[];
}

export const noteService = {
  /**
   * Create a new note
   */
  async create(
    sessionId: string | null,
    documentId: string | null,
    folderId: string | null,
    title: string,
    content: string,
    noteType: string = 'concept'
  ): Promise<Note> {
    return await invoke('create_note', {
      sessionId,
      documentId,
      folderId,
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
    try {
      return await invoke('update_note', { noteId, title, content });
    } catch (err) {
      // If database error, check integrity
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes('malformed') ||
        errorMessage.includes('corrupt')
      ) {
        console.error(
          '[noteService] Database corruption detected, running integrity check...'
        );
        try {
          const integrityCheck = await this.checkIntegrity();
          console.error(
            '[noteService] Integrity check result:',
            integrityCheck
          );
        } catch (integrityErr) {
          console.error(
            '[noteService] Failed to run integrity check:',
            integrityErr
          );
        }
      }
      throw err;
    }
  },

  /**
   * Delete note
   */
  async delete(noteId: string): Promise<boolean> {
    return await invoke('delete_note', { noteId });
  },

  /**
   * Check database integrity
   */
  async checkIntegrity(): Promise<DatabaseIntegrityCheck> {
    return await invoke('check_database_integrity');
  },

  /**
   * Search notes using Full-Text Search (FTS5)
   * Backend automatically transforms query for prefix matching
   * Returns NoteSearchResult with content_preview and session_name for UI
   * Supports filtering by: type_filter (note_type), in_filter (location filter)
   * Supports negation for all filters
   */
  async search(
    query: string,
    typeFilter?: string,
    typeNegate?: boolean,
    inFilter?: string,
    inNegate?: boolean,
    currentSessionId?: string
  ): Promise<NoteSearchResult[]> {
    return await invoke('search_notes', {
      query,
      typeFilter,
      typeNegate,
      inFilter,
      inNegate,
      currentSessionId,
    });
  },

};

export const folderService = {
  /**
   * Create a new folder
   */
  async create(name: string, parentFolderId?: string | null): Promise<Folder> {
    return await invoke('create_folder', {
      name,
      parentFolderId: parentFolderId || null,
    });
  },

  /**
   * Get all folders
   */
  async getAll(): Promise<Folder[]> {
    return await invoke('get_folders');
  },

  /**
   * Get folder by ID
   */
  async getById(folderId: string): Promise<Folder | null> {
    return await invoke('get_folder', { folderId });
  },

  /**
   * Update folder name
   */
  async update(folderId: string, name: string): Promise<void> {
    return await invoke('update_folder', { folderId, name });
  },

  /**
   * Delete folder
   */
  async delete(folderId: string): Promise<boolean> {
    return await invoke('delete_folder', { folderId });
  },
};
