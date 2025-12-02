import { invoke } from '@tauri-apps/api/core';
import type { Document, PDFMetadata, SessionDocument } from '@/types';
import { pdfService, type SavedFileInfo } from './pdf';

export interface DocumentSearchResult {
  id: string;
  title: string;
  content_type: string;
  session_id?: string;
  session_name?: string;
  created_at: string;
}

/**
 * Document Service - Database Layer
 * Handles all document database operations.
 */
export const documentService = {
  /**
   * Create document record in database
   * NOTE: Documents are now independent entities. Use addToSession() to link to a session.
   */
  async create(
    title: string,
    filePath: string,
    contentType: string,
    metadata?: string
  ): Promise<Document> {
    return await invoke('create_document', {
      title,
      filePath,
      contentType,
      metadata,
    });
  },

  /**
   * Transaction: Create session with documents
   */
  async createWithSession(
    title: string,
    goal: string | undefined,
    documents: Array<{ title: string; file_path: string; content_type: string }>
  ) {
    return await invoke('create_session_with_documents', {
      title,
      goal,
      documents,
    });
  },

  /**
   * Check for duplicate documents by title
   */
  async checkDuplicate(title: string): Promise<Document[]> {
    return await invoke('check_duplicate_document', { title });
  },

  /**
   * Delete all documents from database
   */
  async deleteAll(): Promise<number> {
    return await invoke('delete_all_documents');
  },

  /**
   * Delete specific document by ID
   */
  async delete(id: string): Promise<boolean> {
    return await invoke('delete_document', { id });
  },

  /**
   * Get all documents
   */
  async getAll(): Promise<Document[]> {
    return await invoke('get_all_documents');
  },

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<Document> {
    return await invoke('get_document_by_id', { id });
  },

  /**
   * Get documents by session ID
   */
  async getBySession(sessionId: string): Promise<Document[]> {
    return await invoke('get_documents_by_session', { sessionId });
  },

  /**
   * Complete PDF import workflow: file + metadata + database
   * This orchestrates both file layer (pdfService) and database layer
   * NOTE: Documents are created independently. Use addToSession() to link them after creation.
   */
  async importPDF(
    sourcePath: string,
    sessionId?: string
  ): Promise<{ document: Document; metadata: PDFMetadata; savedInfo: SavedFileInfo }> {
    // 1. Import file to storage (file layer)
    const savedInfo = await pdfService.importFromPath(sourcePath);

    // 2. Extract metadata (file layer)
    const metadata = await pdfService.extractMetadata(savedInfo.path);

    // 3. Get filename
    const fileName = pdfService.getFileName(sourcePath);
    const title = metadata.title || fileName;

    // 4. Check for duplicates (database layer)
    const duplicates = await this.checkDuplicate(title);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate document: "${title}" already exists`);
    }

    // 5. Create document record (database layer)
    const document = await this.create(
      title,
      savedInfo.path,
      'pdf',
      JSON.stringify(metadata)
    );

    // 6. Link to session if provided
    if (sessionId) {
      await this.addToSession(sessionId, document.id);
    }

    return { document, metadata, savedInfo };
  },

  /**
   * Update reading progress (page number) for a document
   */
  async updateReadingProgress(id: string, pageNum: number): Promise<void> {
    return await invoke('update_document_reading_progress', {
      id,
      progress: pageNum,
    });
  },

  /**
   * Search documents using Full-Text Search (FTS5)
   * Query syntax supports: "word", "phrase in quotes", word*, -exclude, column:word
   */
  async search(query: string): Promise<Document[]> {
    return await invoke('search_documents', { query });
  },

  /**
   * Search documents with session context (for command palette)
   * Returns documents with session information for grouping
   * Supports filtering by: file_filter, path_filter, type_filter, in_filter
   * Supports negation for all filters
   */
  async searchWithContext(
    query: string,
    fileFilter?: string,
    fileNegate?: boolean,
    pathFilter?: string,
    pathNegate?: boolean,
    typeFilter?: string,
    typeNegate?: boolean,
    inFilter?: string,
    inNegate?: boolean,
    currentSessionId?: string
  ): Promise<DocumentSearchResult[]> {
    return await invoke('search_documents_with_context', {
      query,
      fileFilter,
      fileNegate,
      pathFilter,
      pathNegate,
      typeFilter,
      typeNegate,
      inFilter,
      inNegate,
      currentSessionId,
    });
  },

  // ========== Session-Document Relationship Methods ==========

  /**
   * Add a document to a session
   */
  async addToSession(
    sessionId: string,
    documentId: string,
    notes?: string
  ): Promise<SessionDocument> {
    return await invoke('add_document_to_session', {
      sessionId,
      documentId,
      notes,
    });
  },

  /**
   * Remove a document from a session
   */
  async removeFromSession(sessionId: string, documentId: string): Promise<boolean> {
    return await invoke('remove_document_from_session', {
      sessionId,
      documentId,
    });
  },

  /**
   * Update notes for a document in a session
   */
  async updateSessionNotes(
    sessionId: string,
    documentId: string,
    notes: string | null
  ): Promise<boolean> {
    return await invoke('update_session_document_notes', {
      sessionId,
      documentId,
      notes,
    });
  },
};
