import { invoke } from '@tauri-apps/api/core';
import type { Document, PDFMetadata } from '@/types';
import { pdfService, type SavedFileInfo } from './pdf';

/**
 * Document Service - Database Layer
 * Handles all document database operations.
 */
export const documentService = {
  /**
   * Create document record in database
   */
  async create(
    sessionId: string | null,
    title: string,
    filePath: string,
    contentType: string,
    metadata?: string
  ): Promise<Document> {
    return await invoke('create_document', {
      sessionId,
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
   */
  async importPDF(
    sourcePath: string,
    sessionId: string | null = null
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
      sessionId,
      title,
      savedInfo.path,
      'pdf',
      JSON.stringify(metadata)
    );

    return { document, metadata, savedInfo };
  },
};
