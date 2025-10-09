import { useState } from 'react';
import { DatabaseTester } from './DatabaseTestFunctions';

const DatabaseTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const dbTester = new DatabaseTester();

  const testCreateSession = async () => {
    setLoading(true);
    try {
      const session = await dbTester.createSession('Test Session', 'Testing database connection');
      setResult(`✅ Session created: ${session.title} (ID: ${session.id})`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testGetSessions = async () => {
    setLoading(true);
    try {
      const sessions = await dbTester.getSessions();
      setResult(`✅ Found ${sessions.length} sessions:\n${sessions.map(s => `- ${s.title} (${s.id})`).join('\n')}`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testQuickAll = async () => {
    setLoading(true);
    try {
      const result = await dbTester.runQuickTest();
      setResult(result);
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