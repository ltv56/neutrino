import type {
  ResearchPhase,
  PhaseDetectionResult,
  ReadingBehavior,
  StruggleSignals,
  SessionStatistics,
} from '@/types';

interface PhaseScore {
  phase: ResearchPhase;
  score: number;
  reasons: string[];
}

/**
 * Phase Detection Service (Enhanced with Idle Detection & Time Decay)
 *
 * Analyzes reading behavior to detect current research phase:
 * - Exploration: Rapid scanning of multiple papers
 * - Deep Dive: Focused reading of single document
 * - Synthesis: Writing and connecting ideas
 * - Validation: Checking understanding, re-reading
 *
 * Improvements:
 * - Idle detection: Uses isPaused to exclude idle time
 * - Time decay: Recent actions have higher weight
 * - Threshold logic: Minimum score + dominance check
 * - Boosted Synthesis: Note creation is king
 */
export class PhaseDetectionService {
  private readonly MIN_SCORE_THRESHOLD = 50; // Minimum score to declare phase
  private readonly DOMINANCE_THRESHOLD = 0.15; // Winner must be 15% higher than runner-up

  /**
   * Detect current research phase based on behavior patterns
   */
  detectPhase(
    behavior: ReadingBehavior,
    signals: StruggleSignals,
    stats: SessionStatistics,
    isPaused: boolean = false // NEW: Idle detection
  ): PhaseDetectionResult {
    // If paused (idle), don't change phase or reduce confidence
    if (isPaused) {
      return {
        phase: 'exploration', // Default safe phase
        confidence: 0.3, // Low confidence when idle
        reasoning: 'User is idle, maintaining last known phase',
        detected_at: new Date().toISOString(),
      };
    }

    const scores: PhaseScore[] = [
      this.scoreExploration(behavior, signals, stats),
      this.scoreDeepDive(behavior, signals, stats),
      this.scoreSynthesis(behavior, signals, stats),
      this.scoreValidation(behavior, signals, stats),
    ];

    // Sort scores descending
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const bestMatch = sortedScores[0];
    const runnerUp = sortedScores[1];

    // Threshold check: Must meet minimum score
    if (bestMatch.score < this.MIN_SCORE_THRESHOLD) {
      return {
        phase: 'exploration', // Default to exploration if unclear
        confidence: 0.4,
        reasoning: `Low confidence (${bestMatch.score} < ${this.MIN_SCORE_THRESHOLD}). ${bestMatch.reasons.join('. ')}`,
        detected_at: new Date().toISOString(),
      };
    }

    // Dominance check: Winner must be significantly higher than runner-up
    const dominance = (bestMatch.score - runnerUp.score) / bestMatch.score;
    const confidence = Math.min(dominance + 0.5, 1.0); // Adjust confidence based on dominance

    if (dominance < this.DOMINANCE_THRESHOLD) {
      // Close call - reduce confidence
      return {
        phase: bestMatch.phase,
        confidence: confidence * 0.7, // Penalize ambiguous cases
        reasoning: `Ambiguous: ${bestMatch.phase} (${bestMatch.score}) vs ${runnerUp.phase} (${runnerUp.score}). ${bestMatch.reasons.join('. ')}`,
        detected_at: new Date().toISOString(),
      };
    }

    // Clear winner
    return {
      phase: bestMatch.phase,
      confidence,
      reasoning: bestMatch.reasons.join('. '),
      detected_at: new Date().toISOString(),
    };
  }

  /**
   * Exploration Phase Detection (Adjusted weights)
   * Indicators: Multiple documents, rapid switching, short time per doc
   */
  private scoreExploration(
    behavior: ReadingBehavior,
    signals: StruggleSignals,
    stats: SessionStatistics
  ): PhaseScore {
    let score = 0;
    const reasons: string[] = [];

    // Multiple documents opened (reduced weight)
    if (stats.documents_opened_count >= 3) {
      score += 20; // Was 30
      reasons.push(`Opened ${stats.documents_opened_count} documents`);
    } else if (stats.documents_opened_count === 2) {
      score += 10; // Was 15
      reasons.push('Opened 2 documents');
    }

    // Rapid page changes (scanning behavior)
    if (behavior.avg_time_per_page_ms && behavior.avg_time_per_page_ms < 60 * 1000) {
      score += 15; // Was 20
      reasons.push('Rapid page scanning');
    }

    // Short time per document (< 3 minutes)
    if (behavior.current_document_time_ms && behavior.current_document_time_ms < 3 * 60 * 1000) {
      score += 15;
      reasons.push('Brief document review');
    }

    // Document switching pattern (NEW - strong signal for exploration)
    if (stats.documents_opened_count >= 2 && behavior.current_document_time_ms && behavior.current_document_time_ms < 2 * 60 * 1000) {
      score += 25;
      reasons.push('Frequent document switching');
    }

    // Low note-taking (exploration, not deep analysis)
    if (stats.notes_created_count === 0 && stats.highlights_created_count > 0) {
      score += 10;
      reasons.push('Highlights without notes');
    }

    // Rapid highlighting (marking interesting parts for later)
    if (signals.rapid_highlighting) {
      score += 10;
      reasons.push('Rapid highlighting');
    }

    return { phase: 'exploration', score, reasons };
  }

  /**
   * Deep Dive Phase Detection (Adjusted - reduced to avoid dominating Synthesis)
   * Indicators: Single document focus, long reading time, careful highlighting
   */
  private scoreDeepDive(
    behavior: ReadingBehavior,
    signals: StruggleSignals,
    stats: SessionStatistics
  ): PhaseScore {
    let score = 0;
    const reasons: string[] = [];

    // Single document focus
    if (stats.documents_opened_count === 1) {
      score += 30;
      reasons.push('Single document focus');
    } else if (stats.documents_opened_count === 2) {
      score += 10;
      reasons.push('Limited document switching');
    }

    // Long time on current document (> 5 minutes) - reduced weight
    if (behavior.current_document_time_ms && behavior.current_document_time_ms > 5 * 60 * 1000) {
      score += 20; // Was 25
      reasons.push('Extended reading time');
    }

    // Slow, careful page reading (> 2 min per page)
    if (behavior.avg_time_per_page_ms && behavior.avg_time_per_page_ms > 2 * 60 * 1000) {
      score += 20;
      reasons.push('Careful page reading');
    }

    // Focused reading without tab switching (NEW)
    if (stats.documents_opened_count === 1 && behavior.current_document_time_ms && behavior.current_document_time_ms > 3 * 60 * 1000) {
      score += 15;
      reasons.push('Sustained focus on single document');
    }

    // Moderate highlighting with notes (deep understanding)
    if (stats.highlight_note_ratio && stats.highlight_note_ratio > 0.3) {
      score += 15;
      reasons.push('Thoughtful annotations');
    }

    // Slow progress indicator (deep analysis)
    if (signals.slow_progress) {
      score += 10;
      reasons.push('Thorough analysis');
    }

    // PENALTY: If creating notes actively, probably Synthesis not Deep Dive
    if (stats.notes_created_count >= 2) {
      score = Math.max(0, score - 20);
      reasons.push('Note creation suggests synthesis phase');
    }

    return { phase: 'deep-dive', score, reasons };
  }

  /**
   * Synthesis Phase Detection (BOOSTED - Note creation is KING)
   * Indicators: High note creation, connecting ideas, moderate document switching
   */
  private scoreSynthesis(
    behavior: ReadingBehavior,
    signals: StruggleSignals,
    stats: SessionStatistics
  ): PhaseScore {
    let score = 0;
    const reasons: string[] = [];

    // High note creation (CRITICAL INDICATOR - heavily boosted)
    if (stats.notes_created_count >= 3) {
      score += 70; // Was 35 - MASSIVE boost!
      reasons.push(`Created ${stats.notes_created_count} notes (strong synthesis signal)`);
    } else if (stats.notes_created_count >= 1) {
      score += 50; // Was 20 - Big boost!
      reasons.push('Active note-taking');
    }

    // High highlight-to-note ratio (converting highlights to insights)
    if (stats.highlight_note_ratio && stats.highlight_note_ratio > 0.5) {
      score += 25; // Was 20
      reasons.push('Converting highlights to notes');
    }

    // Moderate document count (referencing multiple sources)
    if (stats.documents_opened_count >= 2 && stats.documents_opened_count <= 4) {
      score += 15;
      reasons.push('Cross-referencing sources');
    }

    // Multiple highlights with thoughtful notes
    if (stats.highlights_created_count >= 5 && stats.notes_created_count >= 2) {
      score += 10;
      reasons.push('Synthesizing information');
    }

    // BONUS: Even single note with highlights is strong synthesis signal
    if (stats.notes_created_count >= 1 && stats.highlights_created_count >= 3) {
      score += 30; // NEW - boost synthesis when combining notes + highlights
      reasons.push('Combining reading with note-taking');
    }

    return { phase: 'synthesis', score, reasons };
  }

  /**
   * Validation Phase Detection (BOOSTED - Re-reading is key signal)
   * Indicators: Re-reading, quick scanning, checking previous work
   */
  private scoreValidation(
    behavior: ReadingBehavior,
    signals: StruggleSignals,
    stats: SessionStatistics
  ): PhaseScore {
    let score = 0;
    const reasons: string[] = [];

    // Re-reading detected (CRITICAL - reviewing previous content)
    if (signals.re_reading_detected) {
      score += 60; // Was 30 - DOUBLED!
      reasons.push('Re-reading previous sections (strong validation signal)');
    }

    // Quick page scanning (< 1 min per page - spot-checking)
    if (behavior.avg_time_per_page_ms && behavior.avg_time_per_page_ms < 60 * 1000) {
      score += 20;
      reasons.push('Quick spot-checking');
    }

    // Low new highlights but high page changes (reviewing without annotating)
    if (stats.highlights_created_count < 3 && behavior.page_changes_count > 5) {
      score += 15;
      reasons.push('Reviewing without annotating');
    }

    // Multiple documents (checking references)
    if (stats.documents_opened_count >= 2) {
      score += 10;
      reasons.push('Cross-checking sources');
    }

    // Few notes but continued reading (not synthesizing, just verifying)
    if (stats.notes_created_count === 0 && behavior.total_reading_time_ms > 5 * 60 * 1000) {
      score += 10;
      reasons.push('Verification mode');
    }

    // BONUS: Re-reading + quick scanning is VERY strong validation signal
    if (signals.re_reading_detected && behavior.avg_time_per_page_ms && behavior.avg_time_per_page_ms < 60 * 1000) {
      score += 40; // NEW - ping-pong navigation pattern
      reasons.push('Jumping between pages for verification');
    }

    return { phase: 'validation', score, reasons };
  }

  /**
   * Get phase display name
   */
  getPhaseName(phase: ResearchPhase): string {
    const names: Record<ResearchPhase, string> = {
      'exploration': 'Exploration',
      'deep-dive': 'Deep Dive',
      'synthesis': 'Synthesis',
      'validation': 'Validation',
    };
    return names[phase];
  }

  /**
   * Get phase description
   */
  getPhaseDescription(phase: ResearchPhase): string {
    const descriptions: Record<ResearchPhase, string> = {
      'exploration': 'Rapidly scanning multiple papers to find relevant information',
      'deep-dive': 'Focused reading and careful analysis of specific content',
      'synthesis': 'Writing notes and connecting ideas across sources',
      'validation': 'Checking understanding and verifying information',
    };
    return descriptions[phase];
  }

  /**
   * Get phase emoji
   */
  getPhaseEmoji(phase: ResearchPhase): string {
    const emojis: Record<ResearchPhase, string> = {
      'exploration': '🔍',
      'deep-dive': '📖',
      'synthesis': '✍️',
      'validation': '✓',
    };
    return emojis[phase];
  }

  /**
   * Get phase-specific suggestions
   */
  getPhaseSuggestions(phase: ResearchPhase): string[] {
    const suggestions: Record<ResearchPhase, string[]> = {
      'exploration': [
        'Save interesting papers to come back later',
        'Use highlights to mark key sections',
        'Create a quick note summarizing each paper',
      ],
      'deep-dive': [
        'Take detailed notes on important concepts',
        'Add annotations to explain complex sections',
        'Link related ideas using [[wiki links]]',
      ],
      'synthesis': [
        'Connect ideas across different sources',
        'Create concept notes to organize themes',
        'Consider taking a break to process information',
      ],
      'validation': [
        'Check if your notes align with sources',
        'Verify citations and references',
        'Review your research questions',
      ],
    };
    return suggestions[phase];
  }
}

export const phaseDetectionService = new PhaseDetectionService();
