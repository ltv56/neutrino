/**
 * Centralized tracker for tab positions (scroll, cursor, page)
 * Components report their state here, WorkspacePage reads it when saving
 */

export interface TabPosition {
  // Document position
  currentPage?: number;
  scrollPosition?: number;
}

class TabPositionTracker {
  private positions = new Map<string, TabPosition>();

  /**
   * Update position for a specific tab
   */
  updatePosition(tabId: string, position: Partial<TabPosition>): void {
    const current = this.positions.get(tabId) || {};
    const updated = { ...current, ...position };
    this.positions.set(tabId, updated);
  }

  /**
   * Get position for a specific tab
   */
  getPosition(tabId: string): TabPosition | undefined {
    return this.positions.get(tabId);
  }

  /**
   * Get all positions
   */
  getAllPositions(): Map<string, TabPosition> {
    return new Map(this.positions);
  }

  /**
   * Clear position for a tab (when tab is closed)
   */
  clearPosition(tabId: string): void {
    this.positions.delete(tabId);
  }

  /**
   * Clear all positions
   */
  clearAll(): void {
    this.positions.clear();
  }
}

export const tabPositionTracker = new TabPositionTracker();
