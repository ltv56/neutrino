import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface WindowContext {
  app_name: string;
  window_title: string;
}

interface ClipboardContent {
  content: string;
  content_type: 'Text' | 'Code' | 'Url' | 'FilePath' | 'Unknown';
  timestamp: number;
  context?: WindowContext;
}

const detectContentType = (text: string): ClipboardContent['content_type'] => {
  const trimmed = text.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return 'Url';
  }

  if (trimmed.includes(':\\') || trimmed.startsWith('/') || trimmed.startsWith('~/')) {
    return 'FilePath';
  }

  const codeIndicators = ['function ', 'const ', 'let ', 'var ', 'import ', 'export ', 'class ', 'def ', 'fn ', '=>', 'if (', 'for (', 'while ('];
  if (codeIndicators.some(indicator => trimmed.includes(indicator))) {
    return 'Code';
  }

  return 'Text';
};

const ClipboardDebug = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentContent, setCurrentContent] = useState<ClipboardContent | null>(null);
  const [history, setHistory] = useState<ClipboardContent[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const init = async () => {
      // Check if monitoring is enabled
      const isEnabled = await invoke<boolean>('is_clipboard_monitor_enabled');
      setIsMonitoring(isEnabled);

      // Always fetch current clipboard on mount (user might open UI after monitor started)
      try {
        const text = await invoke<string | null>('get_current_clipboard');
        if (text) {
          const content_type = detectContentType(text);
          const content: ClipboardContent = {
            content: text,
            content_type,
            timestamp: Date.now(),
            context: undefined,
          };
          setCurrentContent(content);
          setHistory([content]);
        }
      } catch (error) {
        console.error('Failed to fetch current clipboard:', error);
      }

      // Listen for NEW clipboard changes
      unlisten = await listen<ClipboardContent>('clipboard-changed', (event) => {
        const content = event.payload;
        // Only add if content is different from current
        setCurrentContent(content);
        setHistory(prev => {
          // Avoid duplicate if content is same as what we just fetched
          if (prev.length > 0 && prev[0].content === content.content) {
            return prev;
          }
          return [content, ...prev].slice(0, 10);
        });
      });
    };

    init();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleStart = async () => {
    try {
      await invoke('start_clipboard_monitor', { intervalMs: 1000 });
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start clipboard monitor:', error);
    }
  };

  const handleStop = async () => {
    try {
      await invoke('stop_clipboard_monitor');
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop clipboard monitor:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getContentTypeColor = (type: ClipboardContent['content_type']) => {
    switch (type) {
      case 'Code': return 'text-blue-600 dark:text-blue-400';
      case 'Url': return 'text-green-600 dark:text-green-400';
      case 'FilePath': return 'text-purple-600 dark:text-purple-400';
      case 'Text': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-500 dark:text-gray-500';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Control Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isMonitoring ? 'Monitoring' : 'Stopped'}
          </span>
        </div>
        <button
          onClick={isMonitoring ? handleStop : handleStart}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isMonitoring
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isMonitoring ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Current Content */}
      {currentContent && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              CURRENT
            </span>
            <span className={`text-xs font-medium ${getContentTypeColor(currentContent.content_type)}`}>
              {currentContent.content_type}
            </span>
          </div>

          {/* Context Info */}
          {currentContent.context && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              <div className="font-semibold text-blue-700 dark:text-blue-300">
                📍 {currentContent.context.app_name}
              </div>
              <div className="text-blue-600 dark:text-blue-400 truncate">
                {currentContent.context.window_title}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-900 dark:text-white font-mono break-all">
            {currentContent.content.length > 100
              ? currentContent.content.substring(0, 100) + '...'
              : currentContent.content}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatTime(currentContent.timestamp)}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            HISTORY ({history.length - 1})
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.slice(1).map((item, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${getContentTypeColor(item.content_type)}`}>
                    {item.content_type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                {item.context && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 truncate">
                    📍 {item.context.app_name}
                  </div>
                )}
                <div className="text-xs text-gray-900 dark:text-white font-mono break-all">
                  {item.content.length > 50
                    ? item.content.substring(0, 50) + '...'
                    : item.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentContent && !isMonitoring && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          Start monitoring to detect clipboard changes
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
        💡 Clipboard monitor auto-starts on app launch. All copy actions are tracked automatically.
      </div>
    </div>
  );
};

export default ClipboardDebug;
