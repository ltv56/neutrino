import { invoke } from '@tauri-apps/api/core';
import type { ContextSnapshot } from '@/types';

export const contextService = {
  async saveSnapshot(
    sessionId: string,
    snapshot: ContextSnapshot
  ): Promise<void> {
    return await invoke('save_context_snapshot', { sessionId, snapshot });
  },

  async getSnapshot(sessionId: string): Promise<ContextSnapshot | null> {
    return await invoke('get_context_snapshot', { sessionId });
  },

  buildSnapshot(params: {
    activeSessionId: string | null;
    sessionGoal?: string;
    lastDocumentId?: string;
    lastDocumentTitle?: string;
    pageNumber?: number;
    scrollPosition?: number;
    lastHighlight?: {
      id: string;
      content: string;
      note?: string;
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
    openNotes?: Array<{ id: string; title: string }>;
  }): ContextSnapshot {
    const snapshot: ContextSnapshot = {
      timestamp: new Date().toISOString(),
      active_session_id: params.activeSessionId,
      session_goal: params.sessionGoal,
    };

    if (
      params.lastDocumentId &&
      params.lastDocumentTitle &&
      params.pageNumber !== undefined
    ) {
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
        note: params.lastHighlight.note,
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

    if (params.openNotes) {
      snapshot.open_notes = params.openNotes;
    }

    return snapshot;
  },
};
