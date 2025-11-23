import { useState } from 'react';
import DatabaseTest from './DatabaseTest';
import DatabaseDebug from './DatabaseDebug';
import PDFImportTest from './PDFImportTest';
import NoteTest from './NoteTest';
import { Bug } from 'lucide-react';

type DebugOption = 'database' | 'pdf' | 'notes' | 'integrity' | 'api' | 'files' | null;

const DebugOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeOption, setActiveOption] = useState<DebugOption>(null);

  const debugOptions = [
    { id: 'database' as const, label: '🗄️ Database', description: 'Test database operations' },
    { id: 'integrity' as const, label: '🔍 DB Integrity', description: 'Check database integrity' },
    { id: 'pdf' as const, label: '📄 PDF Import', description: 'Test PDF import & metadata' },
    { id: 'notes' as const, label: '📝 Notes', description: 'Test note creation & markdown' },
    { id: 'api' as const, label: '🌐 API', description: 'Test API calls (coming soon)' },
    { id: 'files' as const, label: '📁 Files', description: 'Test file operations (coming soon)' }
  ];

  const renderActiveOption = () => {
    switch (activeOption) {
      case 'database':
        return <DatabaseTest />;
      case 'integrity':
        return <DatabaseDebug />;
      case 'pdf':
        return <PDFImportTest />;
      case 'notes':
        return <NoteTest />;
      case 'api':
        return (
          <div className="p-4 text-center text-gray-500">
            🌐 API Testing<br />
            <small>Coming soon...</small>
          </div>
        );
      case 'files':
        return (
          <div className="p-4 text-center text-gray-500">
            📁 File Testing<br />
            <small>Coming soon...</small>
          </div>
        );
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

      {/* Main debug overlay */}
      {isOpen && !activeOption && (
        <div className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Debug Tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {debugOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setActiveOption(option.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active option UI */}
      {activeOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
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

            {renderActiveOption()}
          </div>
        </div>
      )}
    </>
  );
};

export default DebugOverlay;