import { describe, expect, it } from 'vitest';
import { PhaseDetectionService } from './phaseDetection';
import type { ReadingBehavior, SessionStatistics, StruggleSignals } from '@/types';

const service = new PhaseDetectionService();

const behavior = (o: Partial<ReadingBehavior> = {}): ReadingBehavior => ({
  total_reading_time_ms: 0,
  page_changes_count: 0,
  ...o,
});
const signals = (o: Partial<StruggleSignals> = {}): StruggleSignals => ({
  highlights_without_notes: 0,
  slow_progress: false,
  rapid_highlighting: false,
  re_reading_detected: false,
  ...o,
});
const stats = (o: Partial<SessionStatistics> = {}): SessionStatistics => ({
  documents_opened_count: 0,
  highlights_created_count: 0,
  notes_created_count: 0,
  ...o,
});

const MIN = 60 * 1000;

describe('detectPhase', () => {
  it('idle user keeps a low-confidence default', () => {
    const r = service.detectPhase(behavior(), signals(), stats(), true);
    expect(r.phase).toBe('exploration');
    expect(r.confidence).toBe(0.3);
  });

  it('no signal falls back to exploration with low confidence', () => {
    const r = service.detectPhase(behavior(), signals(), stats());
    expect(r.phase).toBe('exploration');
    expect(r.confidence).toBe(0.4);
  });

  it('note creation with highlights is synthesis', () => {
    const r = service.detectPhase(
      behavior(),
      signals(),
      stats({ documents_opened_count: 1, highlights_created_count: 5, notes_created_count: 3 })
    );
    expect(r.phase).toBe('synthesis');
    expect(r.confidence).toBe(1);
  });

  it('long focused reading on one document is deep-dive', () => {
    const r = service.detectPhase(
      behavior({ total_reading_time_ms: 10 * MIN, current_document_time_ms: 6 * MIN, avg_time_per_page_ms: 3 * MIN, page_changes_count: 3 }),
      signals({ slow_progress: true }),
      stats({ documents_opened_count: 1, highlights_created_count: 2, highlight_note_ratio: 0.4 })
    );
    expect(r.phase).toBe('deep-dive');
  });

  it('re-reading with quick page flips is validation', () => {
    const r = service.detectPhase(
      behavior({ avg_time_per_page_ms: 30 * 1000, page_changes_count: 10 }),
      signals({ re_reading_detected: true }),
      stats({ documents_opened_count: 1 })
    );
    expect(r.phase).toBe('validation');
  });

  it('many documents scanned quickly is exploration', () => {
    const r = service.detectPhase(
      behavior({ avg_time_per_page_ms: 30 * 1000, current_document_time_ms: 1 * MIN }),
      signals({ rapid_highlighting: true }),
      stats({ documents_opened_count: 4, highlights_created_count: 2 })
    );
    expect(r.phase).toBe('exploration');
  });

  it('a close call lowers confidence and says so', () => {
    const r = service.detectPhase(
      behavior(),
      signals({ re_reading_detected: true }),
      stats({ documents_opened_count: 2, notes_created_count: 1 })
    );
    expect(r.phase).toBe('validation');
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.reasoning).toMatch(/^Ambiguous/);
  });

  it('confidence stays within 0..1', () => {
    const r = service.detectPhase(
      behavior({ avg_time_per_page_ms: 10, page_changes_count: 50 }),
      signals({ re_reading_detected: true }),
      stats()
    );
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

describe('phase helpers', () => {
  it('have text for every phase', () => {
    for (const p of ['exploration', 'deep-dive', 'synthesis', 'validation'] as const) {
      expect(service.getPhaseName(p)).toBeTruthy();
      expect(service.getPhaseDescription(p)).toBeTruthy();
      expect(service.getPhaseSuggestions(p).length).toBeGreaterThan(0);
    }
  });
});
