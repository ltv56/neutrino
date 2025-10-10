import { useState } from 'react';
import { databaseService } from '@/services/database';
import { generateMockData } from '@/utils/mockData';

const DatabaseTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testCreateSession = async () => {
    setLoading(true);
    try {
      const session = await databaseService.createSession('Test Session', 'Testing database connection');
      setResult(`✅ Session created: ${session.title} (ID: ${session.id})`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGetSessions = async () => {
    setLoading(true);
    try {
      const sessions = await databaseService.getSessions();
      setResult(`✅ Found ${sessions.length} sessions:\n${sessions.map(s => `- ${s.title} (${s.id})`).join('\n')}`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testQuickAll = async () => {
    setLoading(true);
    try {
      const result = await databaseService.runQuickTest();
      setResult(result);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testClearDatabase = async () => {
    if (!confirm('⚠️ Clear ALL data? This cannot be undone!')) return;

    setLoading(true);
    try {
      await databaseService.clearAllData();
      setResult('✅ Database cleared successfully!');
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGetStats = async () => {
    setLoading(true);
    try {
      const stats = await databaseService.getDatabaseStats();
      setResult(
        `📊 Database Statistics:\n` +
        `- Sessions: ${stats.sessions_count}\n` +
        `- Documents: ${stats.documents_count}\n` +
        `- Notes: ${stats.notes_count}`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGenerateMockData = async () => {
    setLoading(true);
    try {
      const results = await generateMockData();
      setResult(
        `✅ Mock data generated!\n` +
        `- Sessions created: ${results.sessionsCreated}\n` +
        `- Documents created: ${results.documentsCreated}\n` +
        (results.errors.length > 0 ? `- Errors: ${results.errors.length}` : '')
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <div className="space-y-2 mb-4">
        <button
          onClick={testQuickAll}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '🚀'} Quick Test All
        </button>

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

        <button
          onClick={testGenerateMockData}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '🎲'} Generate Mock Data
        </button>

        <button
          onClick={testGetStats}
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📊'} Database Stats
        </button>

        <button
          onClick={testClearDatabase}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '⚠️'} Clear Database
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {result}
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;