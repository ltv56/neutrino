import { useState, useEffect } from 'react';
import { readingBehaviorTracker, phaseDetectionService, phasePersistenceService } from '@/services';
import type { ResearchPhase } from '@/types';

const TimeTrackingDebug = () => {
  const [metrics, setMetrics] = useState({
    // Time metrics
    totalTime: 0,
    documentTime: 0,
    pageTime: 0,
    avgTimePerPage: 0,
    // Activity stats
    documentsOpened: 0,
    pageChanges: 0,
    highlightsCreated: 0,
    notesCreated: 0,
    highlightNoteRatio: 0,
    // Behavior signals
    reReadingDetected: false,
    rapidHighlighting: false,
    slowProgress: false,
    highlightsWithoutNotes: 0,
    // Status
    isPaused: false,
  });

  const [phaseDebug, setPhaseDebug] = useState<{
    currentPhase: ResearchPhase;
    confidence: number;
    reasoning: string;
    scores: { phase: ResearchPhase; score: number; reasons: string[] }[];
  } | null>(null);

  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = readingBehaviorTracker.getSnapshot();
      const behavior = snapshot.reading_behavior;
      const stats = snapshot.session_statistics;
      const signals = snapshot.struggle_signals;

      const trackerInternal = readingBehaviorTracker as any;
      const isPaused = trackerInternal.isPaused || false;

      setMetrics({
        // Time metrics
        totalTime: behavior.total_reading_time_ms,
        documentTime: behavior.current_document_time_ms || 0,
        pageTime: behavior.current_page_time_ms || 0,
        avgTimePerPage: behavior.avg_time_per_page_ms || 0,
        // Activity stats
        documentsOpened: stats.documents_opened_count,
        pageChanges: behavior.page_changes_count,
        highlightsCreated: stats.highlights_created_count,
        notesCreated: stats.notes_created_count,
        highlightNoteRatio: stats.highlight_note_ratio || 0,
        // Behavior signals
        reReadingDetected: signals.re_reading_detected,
        rapidHighlighting: signals.rapid_highlighting,
        slowProgress: signals.slow_progress,
        highlightsWithoutNotes: signals.highlights_without_notes,
        // Status
        isPaused: isPaused,
      });

      // Calculate phase detection scores
      const service = phaseDetectionService as any;
      const scores = [
        service.scoreExploration(behavior, signals, stats),
        service.scoreDeepDive(behavior, signals, stats),
        service.scoreSynthesis(behavior, signals, stats),
        service.scoreValidation(behavior, signals, stats),
      ];

      // Detect current phase
      const phaseResult = phaseDetectionService.detectPhase(behavior, signals, stats, isPaused);

      setPhaseDebug({
        currentPhase: phaseResult.phase,
        confidence: phaseResult.confidence,
        reasoning: phaseResult.reasoning,
        scores: scores.sort((a, b) => b.score - a.score),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatAvgTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleReset = () => {
    readingBehaviorTracker.reset();
    console.log('[TimeTracking] Manual reset');
  };

  const handleForceSavePhase = async () => {
    await phasePersistenceService.forceSave();
    console.log('[TimeTracking] Force saved phase');
  };

  const phaseEmoji: Record<string, string> = {
    'exploration': '🔍',
    'deep-dive': '📖',
    'synthesis': '✍️',
    'validation': '✓'
  };

  const phaseColor: Record<string, string> = {
    'exploration': 'bg-blue-500',
    'deep-dive': 'bg-purple-500',
    'synthesis': 'bg-orange-500',
    'validation': 'bg-green-500'
  };

  return (
    <div className="space-y-5 bg-gray-900 p-4 rounded">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-white">📊 Session Analytics</h3>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${metrics.isPaused
          ? 'bg-amber-900/40 text-amber-300'
          : 'bg-emerald-900/40 text-emerald-300'
          }`}>
          {metrics.isPaused ? '⏸ Idle' : '▶ Active'}
        </span>
      </div>

      {/* Current Phase - Prominent Display */}
      {phaseDebug && (
        <div className={`p-4 rounded-xl ${phaseColor[phaseDebug.currentPhase]} bg-opacity-20 border border-current border-opacity-20`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{phaseEmoji[phaseDebug.currentPhase]}</span>
              <div>
                <div className="font-bold text-lg capitalize text-white">
                  {phaseDebug.currentPhase.replace('-', ' ')}
                </div>
                <div className="text-xs opacity-70 text-gray-300">Current Phase</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{Math.round(phaseDebug.confidence * 100)}%</div>
              <div className="text-xs opacity-70 text-gray-300">Confidence</div>
            </div>
          </div>
          {/* Confidence bar */}
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className={`${phaseColor[phaseDebug.currentPhase]} h-1.5 rounded-full transition-all duration-300`}
              style={{ width: `${phaseDebug.confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics Grid - Compact 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time Metrics */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-gray-700">
          <div className="text-sm font-medium text-slate-400 mb-3">⏱ Time</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Session</span>
              <span className="font-mono text-xs font-medium text-white">{formatTime(metrics.totalTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Document</span>
              <span className="font-mono text-xs font-medium text-white">{formatTime(metrics.documentTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Page</span>
              <span className="font-mono text-xs font-medium text-white">{formatTime(metrics.pageTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Avg/Page</span>
              <span className="font-mono text-xs font-medium text-white">{formatAvgTime(metrics.avgTimePerPage)}</span>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-gray-700">
          <div className="text-sm font-medium text-slate-400 mb-3">📈 Activity</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Documents</span>
              <span className="font-mono text-xs font-medium text-white">{metrics.documentsOpened}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Pages</span>
              <span className="font-mono text-xs font-medium text-white">{metrics.pageChanges}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Highlights</span>
              <span className="font-mono text-xs font-medium text-white">{metrics.highlightsCreated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-300">Notes</span>
              <span className="font-mono text-xs font-medium text-white">{metrics.notesCreated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Signals - Compact Tags */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-gray-700">
        <div className="text-sm font-medium text-slate-400 mb-3">🧠 Behavior Signals</div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${metrics.reReadingDetected
            ? 'bg-green-900/40 text-green-300'
            : 'bg-slate-700 text-slate-400'
            }`}>
            🔄 Re-reading {metrics.reReadingDetected ? '✓' : '✗'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${metrics.rapidHighlighting
            ? 'bg-amber-900/40 text-amber-300'
            : 'bg-slate-700 text-slate-400'
            }`}>
            ⚡ Rapid HL {metrics.rapidHighlighting ? '✓' : '✗'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${metrics.slowProgress
            ? 'bg-purple-900/40 text-purple-300'
            : 'bg-slate-700 text-slate-400'
            }`}>
            🐢 Slow {metrics.slowProgress ? '✓' : '✗'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            📝 HL w/o Notes: {metrics.highlightsWithoutNotes}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            📊 Note Ratio: {metrics.highlightNoteRatio > 0 ? `${Math.round(metrics.highlightNoteRatio * 100)}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Phase Scores - Compact Bars */}
      {phaseDebug && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-gray-700">
          <div className="text-sm font-medium text-slate-400 mb-3">🎯 Phase Scores</div>
          <div className="space-y-2">
            {phaseDebug.scores.map((scoreData, index) => {
              const isWinner = scoreData.phase === phaseDebug.currentPhase;
              const maxScore = Math.max(...phaseDebug.scores.map(s => s.score), 1);
              const percentage = (scoreData.score / maxScore) * 100;

              return (
                <div key={scoreData.phase} className="flex items-center gap-2">
                  <span className="w-16 text-xs truncate text-gray-300">
                    {phaseEmoji[scoreData.phase]} {scoreData.phase.split('-')[0]}
                  </span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isWinner ? phaseColor[scoreData.phase] : 'bg-slate-500'
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right font-mono text-xs ${isWinner ? 'font-bold text-white' : 'text-slate-400'
                    }`}>
                    {scoreData.score}
                  </span>
                  {index === 0 && <span className="text-xs">🏆</span>}
                </div>
              );
            })}
          </div>
          {/* Reasoning */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-400 italic leading-relaxed">
              💡 {phaseDebug.reasoning}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleForceSavePhase}
          className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          💾 Save Phase Now
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
};

export default TimeTrackingDebug;
