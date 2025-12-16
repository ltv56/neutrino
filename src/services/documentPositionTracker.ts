/**
 * Centralized tracker for document reading positions.
 * 
 * This is the SINGLE SOURCE OF TRUTH for current page numbers.
 * - PDFViewer writes here immediately (no debounce)
 * - All readers (Sidebar, Snapshot, Tab) read from here
 * - PDFViewer also persists to DB with debounce for next app launch
 */

class DocumentPositionTracker {
    private positions = new Map<string, number>();
    private listeners = new Set<() => void>();

    /**
     * Set current page for a document (called by PDFViewer immediately on page change)
     */
    setPage(documentId: string, page: number): void {
        this.positions.set(documentId, page);
        this.notifyListeners();
    }

    /**
     * Get current page for a document
     * Returns undefined if document hasn't been opened this session
     */
    getPage(documentId: string): number | undefined {
        return this.positions.get(documentId);
    }

    /**
     * Initialize from DB on app start (for documents that were opened in previous session)
     */
    initFromDB(documentId: string, page: number): void {
        // Only set if not already tracked (current session takes precedence)
        if (!this.positions.has(documentId)) {
            this.positions.set(documentId, page);
        }
    }

    /**
     * Subscribe to position changes (for components that need to react)
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Clear all positions (on logout or session change)
     */
    clearAll(): void {
        this.positions.clear();
        this.notifyListeners();
    }

    /**
     * Debug: get all tracked positions
     */
    getAllPositions(): Map<string, number> {
        return new Map(this.positions);
    }
}

export const documentPositionTracker = new DocumentPositionTracker();
