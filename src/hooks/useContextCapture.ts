import { useEffect, useCallback } from 'react';
import { useSessionsContext } from './sessions/useSessionsContext';
import {
  contextService,
  highlightService,
  noteService,
  readingBehaviorTracker,
  geminiAIService,
} from '@/services';

interface AppState {
  currentDocumentId?: string;
  currentDocumentTitle?: string;
  currentPage?: number;
  scrollPosition?: number;
  openDocuments?: string[];
  openNotes?: Array<{ id: string; title: string }>;
}

export const useContextCapture = (appState: AppState) => {
  const { currentSession } = useSessionsContext();

  const captureAndSaveContext = useCallback(async () => {
    if (!currentSession) {
      console.log('[ContextCapture] No active session, skipping capture');
      return;
    }

    try {
      console.log('[ContextCapture] Capturing context...', appState);
      console.log('[ContextCapture] Current session:', currentSession);
      console.log('[ContextCapture] Open notes being captured:', appState.openNotes);

      // Query for additional context data
      const [recentHighlights, recentNotes] = await Promise.all([
        highlightService.getRecentBySession(currentSession.id, 1).catch((e) => {
          console.log('[ContextCapture] Failed to get highlights:', e);
          return [];
        }),
        noteService.getAll(currentSession.id).catch((e) => {
          console.log('[ContextCapture] Failed to get notes:', e);
          return [];
        }),
      ]);

      console.log('[ContextCapture] Recent highlights:', recentHighlights);
      console.log('[ContextCapture] Recent notes:', recentNotes);

      // Get last highlight (most recent)
      const lastHighlight = recentHighlights.length > 0 ? recentHighlights[0] : undefined;

      // Get last note (most recent by updated_at)
      const sortedNotes = recentNotes.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const lastNote = sortedNotes.length > 0 ? sortedNotes[0] : undefined;

      console.log('[ContextCapture] Last highlight:', lastHighlight);
      console.log('[ContextCapture] Last note:', lastNote);

      // Extract research questions from notes (simple pattern matching)
      const researchQuestions: string[] = [];
      for (const note of recentNotes) {
        // Look for TODO or QUESTION patterns first (higher priority)
        const todoMatches = note.content.match(/(?:TODO|QUESTION|Q):\s*([^\n]+)/gi);
        if (todoMatches) {
          researchQuestions.push(...todoMatches.map(q => q.replace(/(?:TODO|QUESTION|Q):\s*/i, '').trim()));
        }

        // Look for sentences ending with '?'
        const questionMatches = note.content.match(/[^.!?]*\?/g);
        if (questionMatches) {
          researchQuestions.push(
            ...questionMatches
              .map(q => q.trim())
              .filter(q => q.length > 10 && !q.startsWith('TODO') && !q.startsWith('QUESTION'))
          );
        }
      }

      // Remove duplicates, filter short questions, and limit to 5
      const uniqueQuestions = Array.from(new Set(researchQuestions))
        .filter(q => q.length > 10)
        .slice(0, 5);

      // Get behavior tracking data
      const behaviorData = readingBehaviorTracker.getSnapshot();

      const snapshot = contextService.buildSnapshot({
        activeSessionId: currentSession.id,
        sessionGoal: currentSession.goal,
        lastDocumentId: appState.currentDocumentId,
        lastDocumentTitle: appState.currentDocumentTitle,
        pageNumber: appState.currentPage,
        scrollPosition: appState.scrollPosition,
        lastHighlight: lastHighlight ? {
          id: lastHighlight.id,
          content: lastHighlight.content || '',
          note: lastHighlight.note,
          pageNumber: lastHighlight.page_number,
          createdAt: lastHighlight.created_at,
        } : undefined,
        lastNote: lastNote ? {
          id: lastNote.id,
          title: lastNote.title,
          contentPreview: lastNote.content.substring(0, 100),
          createdAt: lastNote.created_at,
        } : undefined,
        researchQuestions: uniqueQuestions.length > 0 ? uniqueQuestions : undefined,
        openDocuments: appState.openDocuments,
        openNotes: appState.openNotes,
        readingBehavior: behaviorData.reading_behavior,
        struggleSignals: behaviorData.struggle_signals,
        sessionStatistics: behaviorData.session_statistics,
      });

      console.log('[ContextCapture] Built snapshot:', snapshot);

      // Generate AI insights
      console.log('[ContextCapture] Generating AI insights...');
      try {
        const aiInsights = await geminiAIService.analyzeSession(snapshot);
        snapshot.ai_insights = aiInsights;
        console.log('[ContextCapture] AI insights generated:', aiInsights);
      } catch (error) {
        console.error('[ContextCapture] Failed to generate AI insights:', error);
      }

      await contextService.saveSnapshot(currentSession.id, snapshot);
      console.log('[ContextCapture] Context saved successfully');
    } catch (error) {
      console.error('[ContextCapture] Failed to save context:', error);
    }
  }, [currentSession, appState]);

  // Save context on window close/hide
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[ContextCapture] beforeunload event triggered!');
      captureAndSaveContext();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also listen for Tauri-specific close event
    const handleTauriClose = () => {
      console.log('[ContextCapture] Tauri close event triggered!');
      captureAndSaveContext();
    };

    // Expose manual capture for debugging
    (window as any).__debugCaptureContext = captureAndSaveContext;
    console.log('[ContextCapture] Manual capture available: window.__debugCaptureContext()');

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [captureAndSaveContext]);

  return {
    captureContext: captureAndSaveContext,
  };
};
