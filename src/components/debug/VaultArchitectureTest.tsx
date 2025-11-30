import { useState } from 'react';
import { documentService } from '@/services';
import { useSessionsContext } from '@/hooks/sessions';
import type { Document } from '@/types';

const VaultArchitectureTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const { currentSession } = useSessionsContext();

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      const docs = await documentService.getAll();
      setDocuments(docs);
      setResult(
        `📚 All Documents:\n` +
        docs.map(d => `- ${d.title} (${d.id.substring(0, 8)}...)`).join('\n') +
        `\n\nTotal: ${docs.length} documents`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const loadSessionDocuments = async () => {
    if (!currentSession) {
      setResult('❌ No session selected');
      return;
    }

    setLoading(true);
    try {
      const docs = await documentService.getBySession(currentSession.id);
      setDocuments(docs);
      setResult(
        `📁 Documents in "${currentSession.title}":\n` +
        docs.map(d => `- ${d.title} (${d.id.substring(0, 8)}...)`).join('\n') +
        `\n\nTotal: ${docs.length} documents`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testAddToSession = async () => {
    if (!currentSession) {
      setResult('❌ No session selected');
      return;
    }
    if (!selectedDocId) {
      setResult('❌ No document selected');
      return;
    }

    setLoading(true);
    try {
      await documentService.addToSession(currentSession.id, selectedDocId, 'Test note');
      setResult(
        `✅ Document added to session!\n` +
        `Session: ${currentSession.title}\n` +
        `Document ID: ${selectedDocId.substring(0, 8)}...`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testRemoveFromSession = async () => {
    if (!currentSession) {
      setResult('❌ No session selected');
      return;
    }
    if (!selectedDocId) {
      setResult('❌ No document selected');
      return;
    }

    setLoading(true);
    try {
      const removed = await documentService.removeFromSession(currentSession.id, selectedDocId);
      if (removed) {
        setResult(
          `✅ Document removed from session!\n` +
          `Session: ${currentSession.title}\n` +
          `Document ID: ${selectedDocId.substring(0, 8)}...`
        );
      } else {
        setResult('⚠️ Document was not in the session');
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testUpdateNotes = async () => {
    if (!currentSession) {
      setResult('❌ No session selected');
      return;
    }
    if (!selectedDocId) {
      setResult('❌ No document selected');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toLocaleString();
      await documentService.updateSessionNotes(
        currentSession.id,
        selectedDocId,
        `Updated at ${now}\nThis is a test note for vault-first architecture.`
      );
      setResult(
        `✅ Session notes updated!\n` +
        `Session: ${currentSession.title}\n` +
        `Document ID: ${selectedDocId.substring(0, 8)}...`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
          📋 How to Test:
        </p>
        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-decimal">
          <li>Select a session from titlebar</li>
          <li>Click "Load All Documents"</li>
          <li>Select a document from dropdown</li>
          <li>Test the 4 buttons below</li>
        </ol>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Current Session: <span className="font-semibold">{currentSession?.title || '❌ None (select one first!)'}</span>
        </p>
        {documents.length > 0 && (
          <div className="mb-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Select Document:
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value="">-- Select a document --</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.id.substring(0, 8)}...)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={loadAllDocuments}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📚'} Load All Documents
        </button>

        <button
          onClick={loadSessionDocuments}
          disabled={loading || !currentSession}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📁'} Load Session Documents
        </button>

        <button
          onClick={testAddToSession}
          disabled={loading || !currentSession || !selectedDocId}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '➕'} Add Document to Session
        </button>

        <button
          onClick={testRemoveFromSession}
          disabled={loading || !currentSession || !selectedDocId}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '➖'} Remove Document from Session
        </button>

        <button
          onClick={testUpdateNotes}
          disabled={loading || !currentSession || !selectedDocId}
          className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📝'} Update Session Notes
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

export default VaultArchitectureTest;
