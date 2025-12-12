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

export class ReadingBehaviorTracker {
  private sessionStartTime: number;
  private currentDocumentStartTime?: number;
  private currentPageStartTime?: number;
  private currentPageNumber?: number;
  private pageVisits: PageVisit[] = [];
  private highlightEvents: HighlightEvent[] = [];
  private visitedPages: Set<number> = new Set();

  private documentsOpenedCount = 0;
  private highlightsCreatedCount = 0;
  private notesCreatedCount = 0;

  constructor() {
    this.sessionStartTime = Date.now();
  }

  // Document tracking
  startDocument(documentId: string) {
    this.currentDocumentStartTime = Date.now();
    this.documentsOpenedCount++;
  }

  endDocument() {
    this.currentDocumentStartTime = undefined;
    this.currentPageStartTime = undefined;
    this.currentPageNumber = undefined;
  }

  // Page tracking
  changePage(pageNumber: number) {
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
    const now = Date.now();
    const totalReadingTime = now - this.sessionStartTime;

    const currentDocumentTime = this.currentDocumentStartTime
      ? now - this.currentDocumentStartTime
      : undefined;

    const currentPageTime = this.currentPageStartTime
      ? now - this.currentPageStartTime
      : undefined;

    // Calculate average time per page
    const completedVisits = this.pageVisits.filter((v) => v.endTime);
    const avgTimePerPage =
      completedVisits.length > 0
        ? completedVisits.reduce((sum, v) => sum + (v.endTime! - v.startTime), 0) /
          completedVisits.length
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

    // Detect slow progress (current page > 5 minutes)
    const currentPageTime = this.currentPageStartTime
      ? now - this.currentPageStartTime
      : 0;
    const slowProgress = currentPageTime > 5 * 60 * 1000; // 5 minutes

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
    this.currentDocumentStartTime = undefined;
    this.currentPageStartTime = undefined;
    this.currentPageNumber = undefined;
    this.pageVisits = [];
    this.highlightEvents = [];
    this.visitedPages.clear();
    this.documentsOpenedCount = 0;
    this.highlightsCreatedCount = 0;
    this.notesCreatedCount = 0;
  }
}

export const readingBehaviorTracker = new ReadingBehaviorTracker();
