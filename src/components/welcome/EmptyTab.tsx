import React from 'react';
import { FileText, Upload, Search, X } from 'lucide-react';
import { pdfService, documentService } from '@/services';

const EmptyTab: React.FC = () => {
  const handleCreateNote = () => {
    window.dispatchEvent(new CustomEvent('workspace:create-note'));
  };

  const handleImportDocument = async () => {
    try {
      const selected = await pdfService.openFilePicker(false);

      if (!selected || Array.isArray(selected)) {
        return; // User cancelled
      }

      // Import PDF without session (vault-first approach)
      await documentService.importPDF(selected, undefined);
    } catch (error) {
      console.error('[EmptyTab] Failed to import document:', error);
    }
  };

  const handleGoToFile = () => {
    window.dispatchEvent(new CustomEvent('command-palette:toggle'));
  };

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('workspace:close-current-tab'));
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
          Neutrino
        </h1>
        <p className="mb-6" style={{ color: 'var(--fg-secondary)' }}>
          Context-Aware Research Intelligence Platform
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCreateNote}
            className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--fg-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            <FileText size={24} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Create Note</span>
          </button>

          <button
            onClick={handleImportDocument}
            className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--fg-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            <Upload size={24} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Import Document</span>
          </button>

          <button
            onClick={handleGoToFile}
            className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--fg-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            <Search size={24} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Go to File</span>
          </button>

          <button
            onClick={handleClose}
            className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--fg-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-active)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            <X size={24} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Close</span>
          </button>
        </div>

        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
            Use Cmd+P to quickly navigate • Cmd+N to create a note
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyTab;
