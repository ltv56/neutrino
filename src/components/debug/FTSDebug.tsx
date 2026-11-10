import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface FTSDebugInfo {
  documents_count: number;
  documents_fts_count: number;
  notes_count: number;
  notes_fts_count: number;
  sample_documents: string[];
}

const FTSDebug = () => {
  const [loading, setLoading] = useState(false);
  const [ftsInfo, setFtsInfo] = useState<FTSDebugInfo | null>(null);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFTSInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await invoke<FTSDebugInfo>('get_fts_debug_info');
      setFtsInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const rebuildFTS = async () => {
    setLoading(true);
    setError(null);
    setRebuildStatus(null);
    try {
      const result = await invoke<string>('rebuild_fts_index');
      setRebuildStatus(result);
      // Reload info after rebuild
      await loadFTSInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <button
          onClick={loadFTSInfo}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Check FTS Status'}
        </button>

        {ftsInfo && (
          <button
            onClick={rebuildFTS}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Rebuilding...' : 'Rebuild FTS Index'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {rebuildStatus && (
        <div className="p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-200 text-sm">
          ✅ {rebuildStatus}
        </div>
      )}

      {ftsInfo && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">FTS Index Status</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {ftsInfo.documents_count}
              </div>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Documents FTS</div>
              <div className={`text-2xl font-bold ${
                ftsInfo.documents_fts_count === ftsInfo.documents_count
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {ftsInfo.documents_fts_count}
              </div>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Notes</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {ftsInfo.notes_count}
              </div>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Notes FTS</div>
              <div className={`text-2xl font-bold ${
                ftsInfo.notes_fts_count === ftsInfo.notes_count
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {ftsInfo.notes_fts_count}
              </div>
            </div>
          </div>

          {ftsInfo.documents_fts_count !== ftsInfo.documents_count && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-200 text-sm">
              ⚠️ FTS index is out of sync! Click "Rebuild FTS Index" to fix.
            </div>
          )}

          {ftsInfo.sample_documents.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sample Documents ({ftsInfo.sample_documents.length})
              </h5>
              <div className="space-y-1">
                {ftsInfo.sample_documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-900 dark:text-white truncate"
                  >
                    📄 {doc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ftsInfo.documents_count === 0 && (
            <div className="p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-200 text-sm">
              ℹ️ No documents in database. Import a PDF to test search.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FTSDebug;
