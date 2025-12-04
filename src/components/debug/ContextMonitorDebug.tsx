import { useState, useEffect } from 'react';
import { smartCaptureService, type WindowContext } from '@/services/smartCapture';
import { Play, Pause, Trash2 } from 'lucide-react';

const ContextMonitorDebug = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentContext, setCurrentContext] = useState<WindowContext | null>(null);
  const [contextHistory, setContextHistory] = useState<WindowContext[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await smartCaptureService.onContextChange((context) => {
        setCurrentContext(context);
        setContextHistory((prev) => [context, ...prev].slice(0, 10)); // Keep last 10
      });
    };

    if (isMonitoring) {
      setupListener();
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, [isMonitoring]);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      // Stop monitoring
      await smartCaptureService.stopContextMonitor();
      setIsMonitoring(false);
    } else {
      // Start monitoring
      await smartCaptureService.startContextMonitor(1000);
      setIsMonitoring(true);
    }
  };

  const handleClearHistory = () => {
    setContextHistory([]);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleMonitoring}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
            isMonitoring
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isMonitoring ? (
            <>
              <Pause size={16} />
              Stop Monitoring
            </>
          ) : (
            <>
              <Play size={16} />
              Start Monitoring
            </>
          )}
        </button>

        <button
          onClick={handleClearHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-colors"
        >
          <Trash2 size={16} />
          Clear History
        </button>
      </div>

      {/* Current Context */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
          Current Context
        </h4>
        {currentContext ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">App:</span>{' '}
              <span className="text-gray-900 dark:text-white">{currentContext.app_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Window:</span>{' '}
              <span className="text-gray-900 dark:text-white">{currentContext.window_title}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Time:</span>{' '}
              <span className="text-gray-900 dark:text-white">
                {formatTimestamp(currentContext.timestamp)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Tags:</span>{' '}
              <span className="text-gray-900 dark:text-white">
                {smartCaptureService.generateTags(currentContext).join(', ') || 'None'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isMonitoring ? 'Waiting for context changes...' : 'Start monitoring to see context'}
          </p>
        )}
      </div>

      {/* Context History */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
          Context History (Last 10)
        </h4>
        {contextHistory.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {contextHistory.map((context, index) => (
              <div
                key={`${context.timestamp}-${index}`}
                className="text-xs border-l-2 border-blue-500 pl-2 py-1"
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {context.app_name}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {formatTimestamp(context.timestamp)}
                  </div>
                </div>
                <div className="text-gray-600 dark:text-gray-400 truncate">
                  {context.window_title || '(no title)'}
                </div>
                <div className="text-blue-600 dark:text-blue-400">
                  {smartCaptureService.generateTags(context).join(', ') || 'No tags'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No history yet</p>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
        <p className="text-blue-800 dark:text-blue-200">
          <strong>ℹ️ Debug Mode:</strong> Real-time context monitoring is for debugging only.
          In production, context is captured when copying or opening floating note.
        </p>
      </div>
    </div>
  );
};

export default ContextMonitorDebug;
