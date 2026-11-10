import { useState } from 'react';
import DatabaseTest from './DatabaseTest';
import DatabaseDebug from './DatabaseDebug';
import PDFImportTest from './PDFImportTest';
import NoteTest from './NoteTest';
import VaultArchitectureTest from './VaultArchitectureTest';
import FTSDebug from './FTSDebug';
import ContextMonitorDebug from './ContextMonitorDebug';
import ClipboardDebug from './ClipboardDebug';
import GeminiDebug from './GeminiDebug';
import TimeTrackingDebug from './TimeTrackingDebug';
import SnapshotDebug from './SnapshotDebug';
import AIContextDebug from './AIContextDebug';
import ConceptsDebug from './ConceptsDebug';
import { Bug } from 'lucide-react';

type DebugOption = 'database' | 'pdf' | 'notes' | 'integrity' | 'vault' | 'fts' | 'context' | 'clipboard' | 'ai' | 'time' | 'snapshot' | 'aicontext' | 'concepts' | null;

const DebugOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeOption, setActiveOption] = useState<DebugOption>(null);

  const debugOptions = [
    { id: 'aicontext' as const, label: '🎨 AI Context', description: 'Full AI context + prompt' },
    { id: 'concepts' as const, label: '🔗 Concepts', description: 'Cross-reference & concepts' },
    { id: 'snapshot' as const, label: '📸 Snapshot', description: 'View current snapshot' },
    { id: 'time' as const, label: '⏱️ Time Track', description: 'Reading time tracking' },
    { id: 'ai' as const, label: '🧠 Gemini AI', description: 'Test AI connection' },
    { id: 'context' as const, label: '🎯 Context', description: 'Window context tracking' },
    { id: 'clipboard' as const, label: '📋 Clipboard', description: 'Clipboard monitoring' },
    { id: 'fts' as const, label: '🔎 FTS', description: 'Full-text search' },
    { id: 'database' as const, label: '🗄️ Database', description: 'DB operations' },
    { id: 'integrity' as const, label: '🔍 Integrity', description: 'Check DB health' },
    { id: 'vault' as const, label: '📂 Vault', description: 'Session relationships' },
    { id: 'pdf' as const, label: '📄 PDF', description: 'PDF import & metadata' },
    { id: 'notes' as const, label: '📝 Notes', description: 'Note creation' },
  ];

  const renderActiveOption = () => {
    switch (activeOption) {
      case 'aicontext':
        return <AIContextDebug />;
      case 'concepts':
        return <ConceptsDebug />;
      case 'snapshot':
        return <SnapshotDebug />;
      case 'time':
        return <TimeTrackingDebug />;
      case 'ai':
        return <GeminiDebug />;
      case 'database':
        return <DatabaseTest />;
      case 'integrity':
        return <DatabaseDebug />;
      case 'fts':
        return <FTSDebug />;
      case 'context':
        return <ContextMonitorDebug />;
      case 'clipboard':
        return <ClipboardDebug />;
      case 'vault':
        return <VaultArchitectureTest />;
      case 'pdf':
        return <PDFImportTest />;
      case 'notes':
        return <NoteTest />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating debug button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl drop-shadow-lg z-50 transition-colors"
        title="Debug Tools"
      >
        <Bug size={20} />
      </button>

      {/* Main debug overlay - Grid layout */}
      {isOpen && !activeOption && (
        <div className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 w-56 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Debug</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {debugOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setActiveOption(option.id)}
                className="flex flex-col items-center justify-center p-3 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={option.description}
              >
                <div className="text-2xl mb-1">
                  {option.label.split(' ')[0]}
                </div>
                <div className="text-xs text-gray-900 dark:text-white font-medium text-center">
                  {option.label.split(' ').slice(1).join(' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active option UI */}
      {activeOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${activeOption === 'concepts' ? 'max-w-4xl' : 'max-w-md'} w-full mx-4 max-h-[80vh] overflow-y-auto`}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {debugOptions.find(opt => opt.id === activeOption)?.label}
              </h3>
              <button
                onClick={() => setActiveOption(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {renderActiveOption()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugOverlay;