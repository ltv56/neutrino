import { invoke } from '@tauri-apps/api/core';
import type { ContextSnapshot } from '@/types';

export const contextService = {
  async saveSnapshot(sessionId: string, snapshot: ContextSnapshot): Promise<void> {
    return await invoke('save_context_snapshot', { sessionId, snapshot });
  },

  async getSnapshot(sessionId: string): Promise<ContextSnapshot | null> {
    return await invoke('get_context_snapshot', { sessionId });
  },

  buildSnapshot(params: {
    activeSessionId: string | null;
    lastDocumentId?: string;
    lastDocumentTitle?: string;
    pageNumber?: number;
    scrollPosition?: number;
    lastHighlight?: {
      id: string;
      content: string;
      pageNumber: number;
      createdAt: string;
    };
    lastNote?: {
      id: string;
      title: string;
      contentPreview: string;
      createdAt: string;
    };
    researchQuestions?: string[];
    openDocuments?: string[];
  }): ContextSnapshot {
    const snapshot: ContextSnapshot = {
      timestamp: new Date().toISOString(),
      active_session_id: params.activeSessionId,
    };

    if (params.lastDocumentId && params.lastDocumentTitle && params.pageNumber !== undefined) {
      snapshot.last_document = {
        document_id: params.lastDocumentId,
        document_title: params.lastDocumentTitle,
        page_number: params.pageNumber,
        scroll_position: params.scrollPosition,
      };
    }

    if (params.lastHighlight) {
      snapshot.last_highlight = {
        id: params.lastHighlight.id,
        content: params.lastHighlight.content,
        page_number: params.lastHighlight.pageNumber,
        created_at: params.lastHighlight.createdAt,
      };
    }

    if (params.lastNote) {
      snapshot.last_note = {
        id: params.lastNote.id,
        title: params.lastNote.title,
        content_preview: params.lastNote.contentPreview,
        created_at: params.lastNote.createdAt,
      };
    }

    if (params.researchQuestions) {
      snapshot.research_questions = params.researchQuestions;
    }

    if (params.openDocuments) {
      snapshot.open_documents = params.openDocuments;
    }

    return snapshot;
  },
};
