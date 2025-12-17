import { useState, useEffect, useCallback } from 'react';
import { contextService, geminiAIService } from '@/services';
import { useSessionsContext } from '@/hooks';
import type { ContextSnapshot } from '@/types';

const AIContextDebug = () => {
    const { currentSession } = useSessionsContext();
    const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
    const [aiPrompt, setAiPrompt] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'data' | 'prompt'>('data');

    const loadAllData = useCallback(async () => {
        if (!currentSession?.id) return;

        setLoading(true);
        try {
            // Load snapshot (contains recent_highlights and recent_notes from session events)
            const snap = await contextService.getSnapshot(currentSession.id);
            setSnapshot(snap);

            // Generate AI prompt preview
            if (snap) {
                const prompt = geminiAIService.buildAnalysisPrompt(snap);
                setAiPrompt(prompt);
            }
        } catch (error) {
            console.error('Failed to load AI context:', error);
        } finally {
            setLoading(false);
        }
    }, [currentSession?.id]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    if (!currentSession) {
        return <div className="text-gray-500 text-sm">No session selected</div>;
    }

    return (
        <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            {/* Tab switcher */}
            <div className="flex gap-2 border-b pb-2 dark:border-gray-600">
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-3 py-1 rounded text-xs ${activeTab === 'data' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                    📊 Context Data
                </button>
                <button
                    onClick={() => setActiveTab('prompt')}
                    className={`px-3 py-1 rounded text-xs ${activeTab === 'prompt' ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                    🤖 AI Prompt
                </button>
                <button
                    onClick={loadAllData}
                    disabled={loading}
                    className="ml-auto px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? '...' : '🔄'}
                </button>
            </div>

            {activeTab === 'data' ? (
                <div className="space-y-3">

                    {/* Snapshot Data */}
                    <Section title="📷 Snapshot" status={!!snapshot}>
                        {snapshot ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                <div><strong>Goal:</strong> {snapshot.session_goal || 'None'}</div>
                                <div><strong>Last Doc:</strong> {snapshot.last_document?.document_title || 'None'} (p.{snapshot.last_document?.page_number || '-'})</div>
                                <div><strong>Last Note:</strong> {snapshot.last_note?.title || 'None'}</div>
                                <div><strong>Last Highlight:</strong> {snapshot.last_highlight?.content?.substring(0, 50) || 'None'}...</div>
                            </div>
                        ) : <div className="text-gray-400">No snapshot</div>}
                    </Section>

                    {/* Reading Behavior */}
                    <Section title="📖 Reading Behavior" status={!!snapshot?.reading_behavior}>
                        {snapshot?.reading_behavior ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                <div><strong>Total Time:</strong> {Math.floor(snapshot.reading_behavior.total_reading_time_ms / 60000)} mins</div>
                                <div><strong>Page Changes:</strong> {snapshot.reading_behavior.page_changes_count}</div>
                                <div><strong>Avg Per Page:</strong> {Math.floor((snapshot.reading_behavior.avg_time_per_page_ms || 0) / 1000)}s</div>
                            </div>
                        ) : <div className="text-gray-400">No data</div>}
                    </Section>

                    {/* Struggle Signals */}
                    <Section title="⚠️ Struggle Signals" status={!!snapshot?.struggle_signals}>
                        {snapshot?.struggle_signals ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                <div>Highlights w/o notes: {snapshot.struggle_signals.highlights_without_notes}</div>
                                <div>Slow progress: {snapshot.struggle_signals.slow_progress ? '✅' : '❌'}</div>
                                <div>Rapid highlighting: {snapshot.struggle_signals.rapid_highlighting ? '✅' : '❌'}</div>
                                <div>Re-reading: {snapshot.struggle_signals.re_reading_detected ? '✅' : '❌'}</div>
                            </div>
                        ) : <div className="text-gray-400">No data</div>}
                    </Section>

                    {/* Session Stats */}
                    <Section title="📊 Session Stats" status={!!snapshot?.session_statistics}>
                        {snapshot?.session_statistics ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                <div>Docs opened: {snapshot.session_statistics.documents_opened_count}</div>
                                <div>Highlights: {snapshot.session_statistics.highlights_created_count}</div>
                                <div>Notes: {snapshot.session_statistics.notes_created_count}</div>
                                <div>Note ratio: {((snapshot.session_statistics.highlight_note_ratio || 0) * 100).toFixed(0)}%</div>
                            </div>
                        ) : <div className="text-gray-400">No data</div>}
                    </Section>

                    {/* Recent Highlights (5) - from session events */}
                    <Section title="✨ Recent Highlights" status={(snapshot?.recent_highlights?.length || 0) > 0}>
                        {snapshot?.recent_highlights && snapshot.recent_highlights.length > 0 ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                {snapshot.recent_highlights.map((h, i: number) => (
                                    <div key={i} className="border-l-2 border-yellow-400 pl-2 mb-1">
                                        <div>p.{h.page_number}: {h.content?.substring(0, 80)}...</div>
                                        {h.note && <div className="text-green-600">Note: {h.note.substring(0, 40)}...</div>}
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-gray-400">No highlights in session</div>}
                    </Section>

                    {/* Recent Notes (5) - from session events */}
                    <Section title="📝 Recent Notes" status={(snapshot?.recent_notes?.length || 0) > 0}>
                        {snapshot?.recent_notes && snapshot.recent_notes.length > 0 ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                {snapshot.recent_notes.map((n, i: number) => (
                                    <div key={i} className="border-l-2 border-green-400 pl-2 mb-1">
                                        <div className="font-medium">{n.title}</div>
                                        <div>{n.content_preview?.substring(0, 80)}...</div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-gray-400">No notes in session</div>}
                    </Section>

                    {/* Research Questions */}
                    <Section title="❓ Research Questions" status={(snapshot?.research_questions?.length || 0) > 0}>
                        {snapshot?.research_questions && snapshot.research_questions.length > 0 ? (
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                {snapshot.research_questions.map((q, i: number) => (
                                    <div key={i}>• {q}</div>
                                ))}
                            </div>
                        ) : <div className="text-gray-400">No questions</div>}
                    </Section>

                    {/* Research Phase */}
                    <Section title="🎯 Research Phase" status={!!snapshot?.research_phase}>
                        {snapshot?.research_phase ? (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                <div><strong>Phase:</strong> {snapshot.research_phase.phase}</div>
                                <div><strong>Confidence:</strong> {(snapshot.research_phase.confidence * 100).toFixed(0)}%</div>
                                <div><strong>Reason:</strong> {snapshot.research_phase.reasoning}</div>
                            </div>
                        ) : <div className="text-gray-400">Not detected</div>}
                    </Section>

                    {/* AI Insights */}
                    <Section title="🧠 AI Insights" status={!!snapshot?.ai_insights}>
                        {snapshot?.ai_insights ? (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                <div><strong>Summary:</strong> {snapshot.ai_insights.summary}</div>
                                <div><strong>Generated:</strong> {new Date(snapshot.ai_insights.generated_at).toLocaleString()}</div>
                            </div>
                        ) : <div className="text-gray-400">Not generated</div>}
                    </Section>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                        Prompt length: {aiPrompt.length} chars (~{Math.ceil(aiPrompt.length / 4)} tokens)
                    </div>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-[50vh] whitespace-pre-wrap">
                        {aiPrompt || 'No prompt generated'}
                    </pre>
                </div>
            )}
        </div>
    );
};

// Helper component for sections
const Section = ({ title, status, children }: { title: string; status: boolean; children: React.ReactNode }) => (
    <div className="border rounded p-2 dark:border-gray-600">
        <div className="font-medium text-xs flex items-center gap-2 mb-1">
            {title}
            <span className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
        {children}
    </div>
);

export default AIContextDebug;
