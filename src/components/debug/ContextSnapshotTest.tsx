import { useState } from 'react';
import { sessionService, contextService } from '@/services';
import type { ContextSnapshot } from '@/types';

const ContextSnapshotTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  const testSaveSnapshot = async () => {
    if (!sessionId) {
      setResult('❌ Please create/select a session first');
      return;
    }

    setLoading(true);
    try {
      const snapshot = contextService.buildSnapshot({
        activeSessionId: sessionId,
        lastDocumentId: 'test-doc-123',
        lastDocumentTitle: 'Test Document.pdf',
        pageNumber: 5,
        scrollPosition: 0.3,
        lastHighlight: {
          id: 'highlight-1',
          content: 'This is a test highlight',
          pageNumber: 5,
          createdAt: new Date().toISOString(),
        },
        lastNote: {
          id: 'note-1',
          title: 'Test Note',
          contentPreview: 'This is a test note content...',
          createdAt: new Date().toISOString(),
        },
        researchQuestions: [
          'How does this feature work?',
          'What are the performance implications?',
        ],
        openDocuments: ['doc-1', 'doc-2', 'doc-3'],
      });

      await contextService.saveSnapshot(sessionId, snapshot);
      setResult(`✅ Context snapshot saved successfully!\nSession ID: ${sessionId}`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGetSnapshot = async () => {
    if (!sessionId) {
      setResult('❌ Please create/select a session first');
      return;
    }

    setLoading(true);
    try {
      const snapshot = await contextService.getSnapshot(sessionId);

      if (!snapshot) {
        setResult('⚠️ No snapshot found for this session');
      } else {
        setResult(
          `✅ Context Snapshot Retrieved:\n\n` +
          `Timestamp: ${new Date(snapshot.timestamp).toLocaleString()}\n` +
          `Session ID: ${snapshot.active_session_id || 'None'}\n\n` +
          `Last Document:\n` +
          `  - Title: ${snapshot.last_document?.document_title || 'N/A'}\n` +
          `  - Page: ${snapshot.last_document?.page_number || 'N/A'}\n` +
          `  - Scroll: ${snapshot.last_document?.scroll_position || 'N/A'}\n\n` +
          `Last Highlight:\n` +
          `  - Content: ${snapshot.last_highlight?.content || 'N/A'}\n` +
          `  - Page: ${snapshot.last_highlight?.page_number || 'N/A'}\n\n` +
          `Last Note:\n` +
          `  - Title: ${snapshot.last_note?.title || 'N/A'}\n` +
          `  - Preview: ${snapshot.last_note?.content_preview || 'N/A'}\n\n` +
          `Research Questions: ${snapshot.research_questions?.length || 0}\n` +
          `Open Documents: ${snapshot.open_documents?.length || 0}`
        );
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testQuickTest = async () => {
    setLoading(true);
    try {
      // Create a test session
      const session = await sessionService.create('Context Test Session', 'Testing context snapshots');
      setSessionId(session.id);

      // Build and save snapshot
      const snapshot = contextService.buildSnapshot({
        activeSessionId: session.id,
        lastDocumentId: 'doc-123',
        lastDocumentTitle: 'Research Paper.pdf',
        pageNumber: 10,
        scrollPosition: 0.5,
        researchQuestions: ['What is context awareness?'],
        openDocuments: ['doc-1', 'doc-2'],
      });

      await contextService.saveSnapshot(session.id, snapshot);

      // Retrieve snapshot
      const retrieved = await contextService.getSnapshot(session.id);

      setResult(
        `✅ Quick test passed!\n\n` +
        `1. Created session: ${session.title}\n` +
        `2. Saved context snapshot\n` +
        `3. Retrieved snapshot: ${retrieved ? '✓' : '✗'}\n\n` +
        `Session ID: ${session.id}`
      );
    } catch (error) {
      setResult(`❌ Test failed: ${error}`);
    }
    setLoading(false);
  };

  const testGetSessions = async () => {
    setLoading(true);
    try {
      const sessions = await sessionService.getAll();
      if (sessions.length === 0) {
        setResult('⚠️ No sessions found. Create one first!');
      } else {
        setResult(
          `✅ Found ${sessions.length} sessions:\n\n` +
          sessions.map(s => `${s.title}\nID: ${s.id}`).join('\n\n')
        );
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      {/* Session ID Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Session ID (optional - will auto-create if empty)
        </label>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Leave empty for quick test"
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={testQuickTest}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '🚀'} Quick Test (Create + Save + Get)
        </button>

        <button
          onClick={testGetSessions}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📋'} List Sessions
        </button>

        <button
          onClick={testSaveSnapshot}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '💾'} Save Snapshot
        </button>

        <button
          onClick={testGetSnapshot}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '🔍'} Get Snapshot
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
          {result}
        </div>
      )}
    </div>
  );
};

export default ContextSnapshotTest;
