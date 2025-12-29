import { invoke } from '@tauri-apps/api/core';
import type { Highlight, HighlightPosition, HighlightMetadata } from '@/types';

export const highlightService = {
  /**
   * Create a new highlight
   */
  async create(
    documentId: string,
    pageNumber: number,
    position: HighlightPosition,
    content?: string,
    color?: string
  ): Promise<Highlight> {
    const positionJson = JSON.stringify(position);

    const result = await invoke<Highlight>('create_highlight', {
      documentId,
      pageNumber,
      positionData: positionJson,
      content,
      color,
    });

    // Parse JSON fields
    if (result.position_data) {
      result.position_data = JSON.parse(result.position_data as unknown as string);
    }
    if (result.metadata) {
      result.metadata = JSON.parse(result.metadata as unknown as string);
    }

    return result;
  },

  /**
   * Get highlights for a specific page
   */
  async getByPage(documentId: string, pageNumber: number): Promise<Highlight[]> {
    const results = await invoke<Highlight[]>('get_highlights_by_page', {
      documentId,
      pageNumber,
    });

    // Parse JSON fields for each highlight
    return results.map((h) => ({
      ...h,
      position_data: typeof h.position_data === 'string' ? JSON.parse(h.position_data) : h.position_data,
      metadata: h.metadata && typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata,
    }));
  },

  /**
   * Get all highlights for a document
   */
  async getByDocument(documentId: string): Promise<Highlight[]> {
    const results = await invoke<Highlight[]>('get_highlights_by_document', {
      documentId,
    });

    // Parse JSON fields for each highlight
    return results.map((h) => ({
      ...h,
      position_data: typeof h.position_data === 'string' ? JSON.parse(h.position_data) : h.position_data,
      metadata: h.metadata && typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata,
    }));
  },

  /**
   * Update the note on a highlight
   */
  async updateNote(id: string, note: string): Promise<void> {
    await invoke('update_highlight_note', { id, note });
  },

  /**
   * Delete a highlight
   */
  async delete(id: string): Promise<boolean> {
    return await invoke<boolean>('delete_highlight', { id });
  },

  /**
   * Get recent highlights for a session
   */
  async getRecentBySession(sessionId: string, limit: number = 1): Promise<Highlight[]> {
    const results = await invoke<Highlight[]>('get_recent_highlights_by_session', {
      sessionId,
      limit,
    });

    // Parse JSON fields for each highlight
    return results.map((h) => ({
      ...h,
      position_data: typeof h.position_data === 'string' ? JSON.parse(h.position_data) : h.position_data,
      metadata: h.metadata && typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata,
    }));
  },

  /**
   * Link a highlight to a note
   */
  async linkToNote(highlightId: string, noteId: string): Promise<void> {
    await invoke('link_highlight_to_note', { highlightId, noteId });
  },

  /**
   * Unlink a highlight from a note
   */
  async unlinkFromNote(highlightId: string): Promise<void> {
    await invoke('unlink_highlight_from_note', { highlightId });
  },

  /**
   * Get all highlights linked to a note
   */
  async getByLinkedNote(noteId: string): Promise<Highlight[]> {
    const results = await invoke<Highlight[]>('get_highlights_by_linked_note', {
      noteId,
    });

    // Parse JSON fields for each highlight
    return results.map((h) => ({
      ...h,
      position_data: typeof h.position_data === 'string' ? JSON.parse(h.position_data) : h.position_data,
      metadata: h.metadata && typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata,
    }));
  },
};
