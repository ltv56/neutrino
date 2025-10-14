import { invoke } from '@tauri-apps/api/core';
import type { Document } from '@/types';

export const documentService = {
  async create(
    sessionId: string,
    title: string,
    filePath: string,
    contentType: string
  ): Promise<Document> {
    return await invoke('create_document', {
      sessionId,
      title,
      filePath,
      contentType,
    });
  },

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
};
