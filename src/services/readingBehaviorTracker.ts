import type {
  ReadingBehavior,
  StruggleSignals,
  SessionStatistics,
} from '@/types';

interface PageVisit {
  pageNumber: number;
  startTime: number;
  endTime?: number;
}

interface HighlightEvent {
  timestamp: number;
  hasNote: boolean;
}

interface DocumentTimer {
  startTime: number;
  startPausedTime: number;
}

export class ReadingBehaviorTracker {
  private sessionStartTime: number;
  private currentPageStartTime?: number;
  private currentPageNumber?: number;
  private pageVisits: PageVisit[] = [];
  private highlightEvents: HighlightEvent[] = [];
  private visitedPages: Set<number> = new Set();

  private documentsOpenedCount = 0;
  private highlightsCreatedCount = 0;
  private notesCreatedCount = 0;

  // Per-document time tracking
  private activeDocumentId?: string;
  private documentTimers: Map<string, DocumentTimer> = new Map();
  private pageStartPausedTime = 0; // Paused time at page start

  // Accurate time tracking
  private isPaused = false;
  private pausedAt?: number;
  private totalPausedTime = 0;
  private lastActivityTime: number;
  private idleThresholdMs = 30 * 1000; // 30 seconds idle = pause

  constructor() {
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.setupActivityTracking();
    this.setupVisibilityTracking();
  }

  // Activity & Visibility tracking
  private setupActivityTracking() {
    if (typeof window === 'undefined') return;

    // Track user activity (mouse, keyboard, scroll)
    const recordActivity = () => {
      this.lastActivityTime = Date.now();
      if (this.isPaused) {
        this.resume();
      }
    };

    window.addEventListener('mousemove', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('scroll', recordActivity, { passive: true });
    window.addEventListener('click', recordActivity, { passive: true });

    // Check for idle every 5 seconds
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      if (timeSinceActivity > this.idleThresholdMs && !this.isPaused) {
        this.pause();
      }
    }, 5000);
  }

  private setupVisibilityTracking() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.lastActivityTime = Date.now();
        this.resume();
      }
    });

    // Also track window focus
    window.addEventListener('blur', () => {
      this.pause();
    });

    window.addEventListener('focus', () => {
      this.lastActivityTime = Date.now();
      this.resume();
    });
  }

  private pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.pausedAt = Date.now();
  }

  private resume() {
    if (!this.isPaused || !this.pausedAt) return;
    this.isPaused = false;
    const pauseDuration = Date.now() - this.pausedAt;
    this.totalPausedTime += pauseDuration;
    this.pausedAt = undefined;
  }

  private getActiveTime(startTime: number, startPausedTime: number = 0): number {
    if (!startTime || startTime <= 0) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - startTime;
    const currentPauseDuration = this.isPaused && this.pausedAt ? now - this.pausedAt : 0;

    // Calculate paused time since startTime
    const pausedSinceStart = this.totalPausedTime - startPausedTime + currentPauseDuration;

    // Calculate active time = total elapsed - paused time since start
    const activeTime = elapsed - pausedSinceStart;

    // Never return negative time (safety check for edge cases)
    return Math.max(0, activeTime);
  }

  // Document tracking (tab-aware)
  setActiveDocument(documentId: string | undefined) {
    // If switching to a different document or clearing active document
    if (this.activeDocumentId !== documentId) {
      // Clear page tracking when switching documents
      this.currentPageStartTime = undefined;
      this.currentPageNumber = undefined;
      this.pageVisits = []; // Reset page visits for new document
      this.visitedPages.clear();
    }

    this.activeDocumentId = documentId;

    // If setting a document (not clearing)
    if (documentId) {
      // Check if this is first time opening this document
      if (!this.documentTimers.has(documentId)) {
        // First time → create new timer
        this.documentTimers.set(documentId, {
          startTime: Date.now(),
          startPausedTime: this.totalPausedTime,
        });
        this.documentsOpenedCount++;
        console.log(`[ReadingBehavior] Started tracking document: ${documentId}`);
      } else {
        console.log(`[ReadingBehavior] Resumed tracking document: ${documentId}`);
      }
    } else {
      console.log('[ReadingBehavior] No active document (switched to non-document tab)');
    }
  }

  // Legacy compatibility
  startDocument(documentId: string) {
    this.setActiveDocument(documentId);
  }

  endDocument() {
    this.setActiveDocument(undefined);
  }

  // Page tracking
  changePage(pageNumber: number) {
    // Ignore duplicate consecutive page changes (prevents StrictMode double-counting)
    if (this.currentPageNumber === pageNumber && this.currentPageStartTime) {
      console.log(`[ReadingBehavior] Ignoring duplicate page change to page ${pageNumber}`);
      return;
    }

    // End previous page visit
    if (this.currentPageNumber !== undefined && this.currentPageStartTime) {
      const currentVisit = this.pageVisits.find(
        (v) => v.pageNumber === this.currentPageNumber && !v.endTime
      );
      if (currentVisit) {
        currentVisit.endTime = Date.now();
      }
    }

    // Detect re-reading
    if (this.visitedPages.has(pageNumber)) {
      // Re-visiting a page
    }
    this.visitedPages.add(pageNumber);

    // Start new page visit
    this.currentPageNumber = pageNumber;
    this.currentPageStartTime = Date.now();
    this.pageStartPausedTime = this.totalPausedTime; // Snapshot current paused time
    this.pageVisits.push({
      pageNumber,
      startTime: this.currentPageStartTime,
    });
  }

  // Event tracking
  recordHighlight(hasNote: boolean) {
    this.highlightEvents.push({
      timestamp: Date.now(),
      hasNote,
    });
    this.highlightsCreatedCount++;
    if (hasNote) {
      this.notesCreatedCount++;
    }
  }

  recordNote() {
    this.notesCreatedCount++;
  }

  // Analysis methods
  getReadingBehavior(): ReadingBehavior {
    // Use active time (excluding pauses) with correct start paused time snapshots
    const totalReadingTime = this.getActiveTime(this.sessionStartTime, 0);

    // Get current document time from timer map
    let currentDocumentTime: number | undefined = undefined;
    if (this.activeDocumentId) {
      const timer = this.documentTimers.get(this.activeDocumentId);
      if (timer) {
        currentDocumentTime = this.getActiveTime(timer.startTime, timer.startPausedTime);
      }
    }

    const currentPageTime = this.currentPageStartTime
      ? this.getActiveTime(this.currentPageStartTime, this.pageStartPausedTime)
      : undefined;

    // Calculate average time per page (using active time only)
    const completedVisits = this.pageVisits.filter((v) => v.endTime);
    const avgTimePerPage =
      completedVisits.length > 0
        ? completedVisits.reduce((sum, v) => {
            // Calculate active time for each page visit
            const pageActiveTime = v.endTime! - v.startTime;
            return sum + pageActiveTime;
          }, 0) / completedVisits.length
        : undefined;

    return {
      total_reading_time_ms: totalReadingTime,
      current_document_time_ms: currentDocumentTime,
      current_page_time_ms: currentPageTime,
      page_changes_count: this.pageVisits.length,
      avg_time_per_page_ms: avgTimePerPage,
    };
  }

  getStruggleSignals(): StruggleSignals {
    const now = Date.now();

    // Count highlights without notes
    const highlightsWithoutNotes = this.highlightEvents.filter(
      (e) => !e.hasNote
    ).length;

    // Detect slow progress (current page active time > 5 minutes)
    const currentPageTime = this.currentPageStartTime
      ? this.getActiveTime(this.currentPageStartTime, this.pageStartPausedTime)
      : 0;
    const slowProgress = currentPageTime > 5 * 60 * 1000; // 5 minutes active time

    // Detect rapid highlighting (3+ highlights in last 2 minutes)
    const twoMinutesAgo = now - 2 * 60 * 1000;
    const recentHighlights = this.highlightEvents.filter(
      (e) => e.timestamp > twoMinutesAgo
    );
    const rapidHighlighting = recentHighlights.length >= 3;

    // Detect re-reading (visiting same page multiple times)
    const uniquePages = new Set(this.pageVisits.map((v) => v.pageNumber));
    const reReadingDetected = this.pageVisits.length > uniquePages.size;

    return {
      highlights_without_notes: highlightsWithoutNotes,
      slow_progress: slowProgress,
      rapid_highlighting: rapidHighlighting,
      re_reading_detected: reReadingDetected,
    };
  }

  getSessionStatistics(): SessionStatistics {
    const highlightNoteRatio =
      this.highlightsCreatedCount > 0
        ? this.notesCreatedCount / this.highlightsCreatedCount
        : undefined;

    return {
      documents_opened_count: this.documentsOpenedCount,
      highlights_created_count: this.highlightsCreatedCount,
      notes_created_count: this.notesCreatedCount,
      highlight_note_ratio: highlightNoteRatio,
    };
  }

  // Get comprehensive snapshot data
  getSnapshot() {
    return {
      reading_behavior: this.getReadingBehavior(),
      struggle_signals: this.getStruggleSignals(),
      session_statistics: this.getSessionStatistics(),
    };
  }

  // Reset for new session
  reset() {
    this.sessionStartTime = Date.now();
    this.activeDocumentId = undefined;
    this.documentTimers.clear();
    this.currentPageStartTime = undefined;
    this.currentPageNumber = undefined;
    this.pageVisits = [];
    this.highlightEvents = [];
    this.visitedPages.clear();
    this.documentsOpenedCount = 0;
    this.highlightsCreatedCount = 0;
    this.notesCreatedCount = 0;
    this.isPaused = false;
    this.pausedAt = undefined;
    this.totalPausedTime = 0;
    this.pageStartPausedTime = 0;
    this.lastActivityTime = Date.now();
  }
}

export const readingBehaviorTracker = new ReadingBehaviorTracker();
