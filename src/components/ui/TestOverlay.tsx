import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ResearchSession {
  id: string;
  title: string;
  goal?: string;
  phase: string;
  created_at: string;
  updated_at: string;
}

const TestOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testCreateSession = async () => {
    setLoading(true);
    try {
      const session: ResearchSession = await invoke('create_research_session', {
        title: 'Test Session',
        goal: 'Testing database connection'
      });
      setResult(`✅ Session created: ${session.title} (ID: ${session.id})`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGetSessions = async () => {
    setLoading(true);
    try {
      const sessions: ResearchSession[] = await invoke('get_research_sessions');
      setResult(`✅ Found ${sessions.length} sessions:\n${sessions.map(s => `- ${s.title} (${s.id})`).join('\n')}`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-50 transition-colors"
        title="Test Database"
      >
        🧪
      </button>

      {/* Overlay panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Database Test</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <button
              onClick={testCreateSession}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              {loading ? '⏳' : '📝'} Create Session
            </button>

            <button
              onClick={testGetSessions}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              {loading ? '⏳' : '📋'} Get Sessions
            </button>
          </div>

          {result && (
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {result}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TestOverlay;