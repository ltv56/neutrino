import { useState } from 'react';
import { geminiAIService, contextService, highlightService, noteService, readingBehaviorTracker } from '@/services';
import { useSessionsContext } from '@/hooks/sessions/useSessionsContext';

const GeminiDebug = () => {
  const { currentSession } = useSessionsContext();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await geminiAIService.testConnection();
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCaptureContext = async () => {
    if (!currentSession) {
      setCaptureResult('❌ No active session. Create a session first.');
      return;
    }

    setCapturing(true);
    setCaptureResult(null);

    try {
      console.log('[GeminiDebug] Starting context capture...');

      // Get recent highlights and notes
      const [recentHighlights, recentNotes] = await Promise.all([
        highlightService.getRecentBySession(currentSession.id, 1).catch(() => []),
        noteService.getAll(currentSession.id).catch(() => []),
      ]);

      const lastHighlight = recentHighlights[0];
      const sortedNotes = recentNotes.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const lastNote = sortedNotes[0];

      // Get behavior data
      const behaviorData = readingBehaviorTracker.getSnapshot();

      // Build snapshot
      const snapshot = contextService.buildSnapshot({
        activeSessionId: currentSession.id,
        sessionGoal: currentSession.goal,
        readingBehavior: behaviorData.reading_behavior,
        struggleSignals: behaviorData.struggle_signals,
        sessionStatistics: behaviorData.session_statistics,
        lastHighlight: lastHighlight ? {
          id: lastHighlight.id,
          content: lastHighlight.content || '',
          note: lastHighlight.note,
          pageNumber: lastHighlight.page_number,
          createdAt: lastHighlight.created_at,
        } : undefined,
        lastNote: lastNote ? {
          id: lastNote.id,
          title: lastNote.title,
          contentPreview: lastNote.content.substring(0, 100),
          createdAt: lastNote.created_at,
        } : undefined,
      });

      console.log('[GeminiDebug] Built snapshot:', snapshot);

      // Generate AI insights
      console.log('[GeminiDebug] Generating AI insights...');
      const aiInsights = await geminiAIService.analyzeSession(snapshot);
      snapshot.ai_insights = aiInsights;

      console.log('[GeminiDebug] AI insights generated:', aiInsights);

      // Save snapshot
      await contextService.saveSnapshot(currentSession.id, snapshot);
      console.log('[GeminiDebug] Context saved successfully');

      setCaptureResult('✅ Context captured with AI insights! Check console for details.');
    } catch (error) {
      console.error('[GeminiDebug] Capture failed:', error);
      setCaptureResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">🧠 Gemini AI Test</h3>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Setup:</strong> Make sure <code>GEMINI_API_KEY</code> is set in <code>src-tauri/.env</code> file
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            API key is stored securely in backend (Rust), not exposed to browser
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={testing}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded transition-colors"
        >
          {testing ? 'Testing Connection...' : 'Test Gemini Connection'}
        </button>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium mb-2">Test AI Context Capture:</p>
          <button
            onClick={handleCaptureContext}
            disabled={capturing}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            {capturing ? 'Capturing Context...' : 'Capture Context & Generate AI Insights'}
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
              <div className="flex-1">
                <h4 className={`font-medium ${
                  result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {result.success ? 'Connection Successful!' : 'Connection Failed'}
                </h4>
                <p className={`text-sm mt-1 ${
                  result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {captureResult && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">{captureResult}</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">ℹ️ How it works:</h4>
          <ol className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
            <li>1. Frontend calls Tauri command: <code>test_gemini_connection</code></li>
            <li>2. Rust backend reads <code>GEMINI_API_KEY</code> from environment</li>
            <li>3. Sends REST request to Gemini API (gemini-2.5-flash)</li>
            <li>4. Returns response to frontend</li>
          </ol>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p><strong>Model:</strong> gemini-2.5-flash</p>
          <p><strong>Endpoint:</strong> generativelanguage.googleapis.com/v1beta</p>
          <p><strong>Security:</strong> API key never exposed to browser</p>
        </div>
      </div>
    </div>
  );
};

export default GeminiDebug;
