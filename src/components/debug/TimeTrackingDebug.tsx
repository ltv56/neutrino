import { useState, useEffect } from 'react';
import { readingBehaviorTracker } from '@/services';

const TimeTrackingDebug = () => {
  const [metrics, setMetrics] = useState({
    totalTime: 0,
    documentTime: 0,
    pageTime: 0,
    pageChanges: 0,
    avgTimePerPage: 0,
    documentsOpened: 0,
    highlightsCreated: 0,
    notesCreated: 0,
    isPaused: false,
  });

  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = readingBehaviorTracker.getSnapshot();
      const behavior = snapshot.reading_behavior;
      const stats = snapshot.session_statistics;

      const trackerInternal = readingBehaviorTracker as any;
      const isPaused = trackerInternal.isPaused || false;

      // Debug logging
      console.log('[TimeDebug] isPaused:', isPaused);
      console.log('[TimeDebug] totalPausedTime:', trackerInternal.totalPausedTime);
      console.log('[TimeDebug] lastActivityTime:', trackerInternal.lastActivityTime);
      console.log('[TimeDebug] timeSinceActivity:', Date.now() - trackerInternal.lastActivityTime);
      console.log('[TimeDebug] totalTime:', behavior.total_reading_time_ms);

      setMetrics({
        totalTime: behavior.total_reading_time_ms,
        documentTime: behavior.current_document_time_ms || 0,
        pageTime: behavior.current_page_time_ms || 0,
        pageChanges: behavior.page_changes_count,
        avgTimePerPage: behavior.avg_time_per_page_ms || 0,
        documentsOpened: stats.documents_opened_count,
        highlightsCreated: stats.highlights_created_count,
        notesCreated: stats.notes_created_count,
        isPaused: isPaused,
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
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleReset = () => {
    readingBehaviorTracker.reset();
    console.log('[TimeTracking] Manual reset');
  };

  const handleSimulateActivity = () => {
    // Trigger activity event
    window.dispatchEvent(new MouseEvent('mousemove'));
    console.log('[TimeTracking] Simulated activity');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">⏱️ Time Tracking Debug</h3>
        <div className="flex items-center gap-2">
          {metrics.isPaused && (
            <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
              ⏸️ PAUSED
            </span>
          )}
          {!metrics.isPaused && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
              ▶️ ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Time Metrics */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          ⏲️ Active Time (excludes idle/hidden)
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-blue-600 dark:text-blue-300">Total Session:</span>
            <div className="font-mono font-medium text-blue-900 dark:text-blue-100">
              {formatTime(metrics.totalTime)}
            </div>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-300">Current Document:</span>
            <div className="font-mono font-medium text-blue-900 dark:text-blue-100">
              {formatTime(metrics.documentTime)}
            </div>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-300">Current Page:</span>
            <div className="font-mono font-medium text-blue-900 dark:text-blue-100">
              {formatTime(metrics.pageTime)}
            </div>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-300">Avg per Page:</span>
            <div className="font-mono font-medium text-blue-900 dark:text-blue-100">
              {formatAvgTime(metrics.avgTimePerPage)}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-2">
        <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
          📊 Activity Stats
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-purple-600 dark:text-purple-300">Documents Opened:</span>
            <div className="font-mono font-medium text-purple-900 dark:text-purple-100">
              {metrics.documentsOpened}
            </div>
          </div>
          <div>
            <span className="text-purple-600 dark:text-purple-300">Page Changes:</span>
            <div className="font-mono font-medium text-purple-900 dark:text-purple-100">
              {metrics.pageChanges}
            </div>
          </div>
          <div>
            <span className="text-purple-600 dark:text-purple-300">Highlights:</span>
            <div className="font-mono font-medium text-purple-900 dark:text-purple-100">
              {metrics.highlightsCreated}
            </div>
          </div>
          <div>
            <span className="text-purple-600 dark:text-purple-300">Notes:</span>
            <div className="font-mono font-medium text-purple-900 dark:text-purple-100">
              {metrics.notesCreated}
            </div>
          </div>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium mb-2">🧪 How to Test:</h4>
        <ol className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
          <li>1. ⏱️ Watch timers update every second (only when active)</li>
          <li>2. 🐭 Stop moving mouse for 30s → Should see "⏸️ PAUSED"</li>
          <li>3. 👆 Move mouse → Should resume to "▶️ ACTIVE"</li>
          <li>4. 🪟 Switch to another app (Cmd+Tab) → Should pause</li>
          <li>5. 🔙 Switch back → Should resume</li>
          <li>6. 📄 Change page → "Current Page" resets</li>
          <li>7. 📊 Check console logs for pause/resume events</li>
        </ol>
      </div>

      {/* Manual Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleSimulateActivity}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          🐭 Simulate Activity (Resume if Paused)
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
        >
          🔄 Reset Tracker
        </button>
      </div>

      {/* Status Indicators */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <h4 className="text-sm font-medium mb-2 text-green-800 dark:text-green-200">
          ✅ Accuracy Features
        </h4>
        <ul className="text-xs space-y-1 text-green-700 dark:text-green-300">
          <li>✅ Auto-pause after 30s idle</li>
          <li>✅ Pause on tab hidden (Cmd+Tab)</li>
          <li>✅ Pause on window blur</li>
          <li>✅ Resume on activity detected</li>
          <li>✅ Excludes all paused time from metrics</li>
        </ul>
      </div>
    </div>
  );
};

export default TimeTrackingDebug;
