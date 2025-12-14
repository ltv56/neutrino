import { invoke } from '@tauri-apps/api/core';
import { phaseDetectionService } from './phaseDetection';
import { readingBehaviorTracker } from './readingBehaviorTracker';
import type { ResearchPhase } from '@/types';

/**
 * Phase Persistence Service - Session End Save Strategy
 * 
 * Saves phase data ONLY when the session ends (app close/background).
 * Includes smart conditions to avoid unnecessary or unreliable saves.
 * 
 * Save Conditions:
 * 1. Confidence threshold: Skip if confidence < 50%
 * 2. Minimum activity: Skip if session < 1 min AND no highlights/notes
 * 3. Same phase skip: Skip if phase unchanged from last save
 * 4. Idle session skip: Skip if user was idle > 80% of time
 */
class PhasePersistenceService {
    // Current session
    private currentSessionId: string | null = null;
    private isInitialized: boolean = false;
    private lastSavedPhase: ResearchPhase | null = null;
    private sessionStartTime: number = 0;

    // Configuration thresholds
    private readonly MIN_CONFIDENCE = 0.5; // 50% minimum confidence
    private readonly MIN_SESSION_DURATION_MS = 60 * 1000; // 1 minute
    private readonly MAX_IDLE_RATIO = 0.8; // 80% idle = skip

    /**
     * Initialize the service for a session
     */
    init(sessionId: string): void {
        if (this.isInitialized && this.currentSessionId === sessionId) {
            return;
        }

        this.cleanup();
        this.currentSessionId = sessionId;
        this.isInitialized = true;
        this.sessionStartTime = Date.now();

        // Setup handlers for session end events
        this.setupSessionEndHandlers();
    }

    /**
     * Setup handlers for session end events (app close, background, etc.)
     */
    private setupSessionEndHandlers(): void {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleWindowBlur);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * Handle visibility change - SAVE when app goes to background
     */
    private handleVisibilityChange = async (): Promise<void> => {
        if (document.hidden && this.currentSessionId) {
            await this.saveCurrentPhase();
        }
    };

    /**
     * Handle window blur - SAVE when window loses focus
     */
    private handleWindowBlur = async (): Promise<void> => {
        if (this.currentSessionId) {
            await this.saveCurrentPhase();
        }
    };

    /**
     * Handle before unload - SAVE when app is closing
     */
    private handleBeforeUnload = (): void => {
        if (this.currentSessionId) {
            this.saveCurrentPhaseSync();
        }
    };

    /**
     * Check all conditions before saving
     * Returns { shouldSave: boolean, reason: string }
     */
    private checkSaveConditions(
        phase: ResearchPhase,
        confidence: number,
        sessionStats: {
            highlights_created_count: number;
            notes_created_count: number;
        },
        readingBehavior: {
            total_reading_time_ms: number;
        },
        isPaused: boolean
    ): { shouldSave: boolean; reason: string } {

        // Condition 1: Confidence threshold
        if (confidence < this.MIN_CONFIDENCE) {
            return {
                shouldSave: false,
                reason: `Low confidence (${Math.round(confidence * 100)}% < ${this.MIN_CONFIDENCE * 100}%)`
            };
        }

        // Condition 2: Minimum activity check
        const sessionDuration = Date.now() - this.sessionStartTime;
        const hasActivity = sessionStats.highlights_created_count > 0 || sessionStats.notes_created_count > 0;

        if (sessionDuration < this.MIN_SESSION_DURATION_MS && !hasActivity) {
            return {
                shouldSave: false,
                reason: `Short session (${Math.round(sessionDuration / 1000)}s) with no activity`
            };
        }

        // Condition 3: Same phase skip
        if (phase === this.lastSavedPhase) {
            return {
                shouldSave: false,
                reason: `Phase unchanged (${phase})`
            };
        }

        // Condition 4: Idle session skip
        const totalTime = Date.now() - this.sessionStartTime;
        const activeTime = readingBehavior.total_reading_time_ms;
        const idleRatio = totalTime > 0 ? 1 - (activeTime / totalTime) : 0;

        if (idleRatio > this.MAX_IDLE_RATIO) {
            return {
                shouldSave: false,
                reason: `High idle ratio (${Math.round(idleRatio * 100)}% > ${this.MAX_IDLE_RATIO * 100}%)`
            };
        }

        return { shouldSave: true, reason: 'All conditions passed' };
    }

    /**
     * Calculate and save current phase to database (async)
     */
    private async saveCurrentPhase(): Promise<void> {
        if (!this.currentSessionId) return;

        try {
            // Get current behavior snapshot
            const snapshot = readingBehaviorTracker.getSnapshot();

            // Calculate phase at session end
            const phaseResult = phaseDetectionService.detectPhase(
                snapshot.reading_behavior,
                snapshot.struggle_signals,
                snapshot.session_statistics,
                snapshot.is_paused
            );

            // Check save conditions
            const { shouldSave, reason } = this.checkSaveConditions(
                phaseResult.phase,
                phaseResult.confidence,
                snapshot.session_statistics,
                snapshot.reading_behavior,
                snapshot.is_paused
            );

            if (!shouldSave) {
                // Keep this log for long-term testing
                console.log(`[PhasePersistence] ⏭️ Skipped: ${reason}`);
                return;
            }

            // Save to database
            await invoke('update_session_phase', {
                sessionId: this.currentSessionId,
                phase: phaseResult.phase,
            });

            this.lastSavedPhase = phaseResult.phase;

            // Keep this log for long-term testing - shows successful save with details
            console.log(
                `[PhasePersistence] ✅ Saved: ${phaseResult.phase} (${Math.round(phaseResult.confidence * 100)}%)`
            );
        } catch (error) {
            console.error('[PhasePersistence] ❌ Failed:', error);
        }
    }

    /**
     * Calculate and save current phase synchronously (for beforeunload)
     * Uses fire-and-forget since async is unreliable in beforeunload
     */
    private saveCurrentPhaseSync(): void {
        if (!this.currentSessionId) return;

        // Get current behavior snapshot
        const snapshot = readingBehaviorTracker.getSnapshot();

        // Calculate phase at session end
        const phaseResult = phaseDetectionService.detectPhase(
            snapshot.reading_behavior,
            snapshot.struggle_signals,
            snapshot.session_statistics,
            snapshot.is_paused
        );

        // Check save conditions
        const { shouldSave, reason } = this.checkSaveConditions(
            phaseResult.phase,
            phaseResult.confidence,
            snapshot.session_statistics,
            snapshot.reading_behavior,
            snapshot.is_paused
        );

        if (!shouldSave) {
            console.log(`[PhasePersistence] ⏭️ Skipped: ${reason}`);
            return;
        }

        // Fire and forget - best effort in beforeunload
        invoke('update_session_phase', {
            sessionId: this.currentSessionId,
            phase: phaseResult.phase,
        }).catch((error) => {
            console.error('[PhasePersistence] ❌ Failed:', error);
        });

        console.log(`[PhasePersistence] ✅ Saved: ${phaseResult.phase}`);
    }

    /**
     * Force save phase now (for manual trigger if needed)
     * Bypasses conditions check
     */
    async forceSave(): Promise<void> {
        if (!this.currentSessionId) {
            return;
        }

        const snapshot = readingBehaviorTracker.getSnapshot();
        const phaseResult = phaseDetectionService.detectPhase(
            snapshot.reading_behavior,
            snapshot.struggle_signals,
            snapshot.session_statistics,
            snapshot.is_paused
        );

        await invoke('update_session_phase', {
            sessionId: this.currentSessionId,
            phase: phaseResult.phase,
        });

        this.lastSavedPhase = phaseResult.phase;
        console.log(`[PhasePersistence] ✅ Force saved: ${phaseResult.phase}`);
    }

    /**
     * Cleanup service
     */
    cleanup(): void {
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);

        // Reset state
        this.currentSessionId = null;
        this.isInitialized = false;
        this.lastSavedPhase = null;
        this.sessionStartTime = 0;
    }

    /**
     * Get current state (for debugging)
     */
    getDebugState(): {
        sessionId: string | null;
        isInitialized: boolean;
        lastSavedPhase: ResearchPhase | null;
        sessionDurationMs: number;
        thresholds: {
            minConfidence: number;
            minSessionDurationMs: number;
            maxIdleRatio: number;
        };
    } {
        return {
            sessionId: this.currentSessionId,
            isInitialized: this.isInitialized,
            lastSavedPhase: this.lastSavedPhase,
            sessionDurationMs: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0,
            thresholds: {
                minConfidence: this.MIN_CONFIDENCE,
                minSessionDurationMs: this.MIN_SESSION_DURATION_MS,
                maxIdleRatio: this.MAX_IDLE_RATIO,
            },
        };
    }
}

// Export singleton instance
export const phasePersistenceService = new PhasePersistenceService();

// Export class for testing
export { PhasePersistenceService };
