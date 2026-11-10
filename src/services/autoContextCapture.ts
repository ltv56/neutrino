import { contextService } from './context';
import { geminiAIService } from './geminiAI';
import { highlightService } from './highlights';
import { noteService } from './notes';
import { readingBehaviorTracker } from './readingBehaviorTracker';
import { phaseDetectionService } from './phaseDetection';
import { researchQuestionsService } from './researchQuestions';
import type { ContextSnapshot } from '@/types';
import { log } from '../lib/logger';

// DISABLE AI auto-capture (set to false to stop Gemini from running on every hot reload)
const ENABLE_AUTO_CAPTURE = false;

export const autoContextCapture = {
  /**
   * Auto-capture context with AI insights on app close
   * This is the primary method for Smart Resume feature
   */
  async captureOnClose(sessionId: string, sessionGoal?: string): Promise<boolean> {
    if (!ENABLE_AUTO_CAPTURE) {
      log.debug('[AutoCapture] Auto-capture is disabled');
      return false;
    }

    try {
      log.debug('[AutoCapture] Starting auto-capture on app close...');

      // Get existing snapshot to preserve last_document
      const existingSnapshot = await contextService.getSnapshot(sessionId).catch(() => null);

      // Get recent highlights and notes
      const [recentHighlights, recentNotes] = await Promise.all([
        highlightService.getRecentBySession(sessionId, 1).catch(() => []),
        noteService.getAll(sessionId).catch(() => []),
      ]);

      const lastHighlight = recentHighlights[0];
      const sortedNotes = recentNotes.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const lastNote = sortedNotes[0];

      // Get behavior data
      const behaviorData = readingBehaviorTracker.getSnapshot();

      // Detect research phase (with idle detection)
      const phaseDetection = phaseDetectionService.detectPhase(
        behaviorData.reading_behavior,
        behaviorData.struggle_signals,
        behaviorData.session_statistics,
        behaviorData.is_paused // Pass idle state
      );
      log.debug('[AutoCapture] Phase detected:', phaseDetection.phase,
        `(${Math.round(phaseDetection.confidence * 100)}% confidence)`,
        '- Reasoning:', phaseDetection.reasoning,
        '- Idle:', behaviorData.is_paused);

      // Extract research questions from notes
      const researchQuestions = researchQuestionsService.extractQuestionsAsStrings(recentNotes);
      log.debug('[AutoCapture] Extracted research questions:', researchQuestions.length);

      // Build snapshot
      const snapshot = contextService.buildSnapshot({
        activeSessionId: sessionId,
        sessionGoal: sessionGoal,
        readingBehavior: behaviorData.reading_behavior,
        struggleSignals: behaviorData.struggle_signals,
        sessionStatistics: behaviorData.session_statistics,
        researchPhase: phaseDetection,
        researchQuestions: researchQuestions.length > 0 ? researchQuestions : undefined,
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
      });

      // Preserve last_document from existing snapshot
      if (existingSnapshot?.last_document) {
        snapshot.last_document = existingSnapshot.last_document;
      }

      log.debug('[AutoCapture] Built snapshot:', snapshot);

      // Generate AI insights if there's meaningful activity
      const hasActivity = snapshot.last_document || snapshot.last_highlight || snapshot.last_note;

      if (hasActivity) {
        log.debug('[AutoCapture] Generating AI insights...');
        try {
          const aiInsights = await geminiAIService.analyzeSession(snapshot);
          snapshot.ai_insights = aiInsights;
          log.debug('[AutoCapture] ✅ AI insights generated successfully:', aiInsights);
        } catch (error) {
          console.error('[AutoCapture] ⚠️ AI insights generation failed:', error);
          // Continue without AI insights - don't fail the entire capture
        }
      } else {
        log.debug('[AutoCapture] No activity, skipping AI insights generation');
      }

      // Save snapshot
      await contextService.saveSnapshot(sessionId, snapshot);
      log.debug('[AutoCapture] ✅ Context snapshot saved successfully');

      return true;
    } catch (error) {
      console.error('[AutoCapture] ❌ Auto-capture failed:', error);
      return false;
    }
  },

  /**
   * Activity-based auto-capture (Tier 2)
   * Triggered after N highlights or notes
   */
  async captureOnActivity(
    sessionId: string,
    sessionGoal: string | undefined,
    highlightCount: number,
    noteCount: number
  ): Promise<boolean> {
    if (!ENABLE_AUTO_CAPTURE) {
      return false;
    }

    const HIGHLIGHT_THRESHOLD = 10;
    const NOTE_THRESHOLD = 5;

    // Check if thresholds are met
    const shouldCapture = highlightCount >= HIGHLIGHT_THRESHOLD || noteCount >= NOTE_THRESHOLD;

    if (!shouldCapture) {
      return false;
    }

    // Check if last capture was at least 15 minutes ago
    try {
      const existingSnapshot = await contextService.getSnapshot(sessionId);
      if (existingSnapshot?.timestamp) {
        const lastCaptureTime = new Date(existingSnapshot.timestamp).getTime();
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        if (now - lastCaptureTime < fifteenMinutes) {
          log.debug('[AutoCapture] Activity threshold met, but last capture was < 15 min ago. Skipping.');
          return false;
        }
      }

      log.debug('[AutoCapture] Activity threshold met! Triggering auto-capture...');
      return await this.captureOnClose(sessionId, sessionGoal);
    } catch (error) {
      console.error('[AutoCapture] Activity-based capture failed:', error);
      return false;
    }
  },
};
