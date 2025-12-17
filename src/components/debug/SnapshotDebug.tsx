import { useState, useEffect } from 'react';
import { contextService } from '@/services';
import { useSessionsContext } from '@/hooks';
import type { ContextSnapshot } from '@/types';

const SnapshotDebug = () => {
    const { currentSession } = useSessionsContext();
    const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const loadSnapshot = async () => {
        if (!currentSession?.id) return;

        setLoading(true);
        try {
            const data = await contextService.getSnapshot(currentSession.id);
            setSnapshot(data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to load snapshot:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSnapshot();
        // Auto-refresh every 3 seconds
        const interval = setInterval(loadSnapshot, 3000);
        return () => clearInterval(interval);
    }, [currentSession?.id]);

    if (!currentSession) {
        return <div className="text-gray-500 text-sm">No session selected</div>;
    }

    return (
        <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Last refresh: {lastUpdated}</span>
                <button
                    onClick={loadSnapshot}
                    disabled={loading}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? '...' : 'Refresh'}
                </button>
            </div>

            {/* Last Document */}
            <div className="border rounded p-3 dark:border-gray-600">
                <div className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    📄 Last Document
                </div>
                {snapshot?.last_document ? (
                    <div className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                        <div><span className="text-gray-500">Title:</span> {snapshot.last_document.document_title}</div>
                        <div><span className="text-gray-500">Page:</span> {snapshot.last_document.page_number}</div>
                        <div className="text-xs text-gray-400 truncate">ID: {snapshot.last_document.document_id}</div>
                    </div>
                ) : (
                    <div className="mt-2 text-gray-400 italic">None</div>
                )}
            </div>

            {/* Last Highlight */}
            <div className="border rounded p-3 dark:border-gray-600">
                <div className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    ✨ Last Highlight
                </div>
                {snapshot?.last_highlight ? (
                    <div className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                        <div><span className="text-gray-500">Content:</span> {snapshot.last_highlight.content.substring(0, 50)}...</div>
                        <div><span className="text-gray-500">Page:</span> {snapshot.last_highlight.page_number}</div>
                        <div className="text-xs text-gray-400 truncate">ID: {snapshot.last_highlight.id}</div>
                    </div>
                ) : (
                    <div className="mt-2 text-gray-400 italic">None</div>
                )}
            </div>

            {/* Last Note */}
            <div className="border rounded p-3 dark:border-gray-600">
                <div className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    📝 Last Note
                </div>
                {snapshot?.last_note ? (
                    <div className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                        <div><span className="text-gray-500">Title:</span> {snapshot.last_note.title}</div>
                        <div><span className="text-gray-500">Preview:</span> {snapshot.last_note.content_preview}</div>
                        <div className="text-xs text-gray-400 truncate">ID: {snapshot.last_note.id}</div>
                    </div>
                ) : (
                    <div className="mt-2 text-gray-400 italic">None</div>
                )}
            </div>

            {/* AI Insights Status */}
            <div className="border rounded p-3 dark:border-gray-600">
                <div className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    🧠 AI Insights
                </div>
                {snapshot?.ai_insights ? (
                    <div className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                        <div><span className="text-gray-500">Summary:</span> {snapshot.ai_insights.summary?.substring(0, 60)}...</div>
                        <div><span className="text-gray-500">Generated:</span> {snapshot.ai_insights.generated_at}</div>
                    </div>
                ) : (
                    <div className="mt-2 text-gray-400 italic">None</div>
                )}
            </div>
        </div>
    );
};

export default SnapshotDebug;
