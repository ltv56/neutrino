import React from 'react';
import { FolderOpen, File } from 'lucide-react';

interface VaultPanelProps {
  onSelectDocument?: (docId: string) => void;
}

const VaultPanel: React.FC<VaultPanelProps> = ({ onSelectDocument }) => {
  // Placeholder: This will be connected to actual document storage later
  const documents = [
    { id: '1', name: 'Research Paper 1.pdf', type: 'pdf' },
    { id: '2', name: 'Notes.md', type: 'markdown' },
    { id: '3', name: 'Dataset.csv', type: 'csv' },
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen size={16} style={{ color: 'var(--fg-primary)', flexShrink: 0 }} />
          <h2
            className="text-sm font-medium"
            style={{ color: 'var(--fg-primary)' }}
          >
            Document Vault
          </h2>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div
            className="flex items-center justify-center h-full px-4 text-center text-sm"
            style={{ color: 'var(--fg-secondary)' }}
          >
            No documents yet. Add documents to your vault to get started.
          </div>
        ) : (
          <div className="p-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDocument?.(doc.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-[var(--bg-active)] transition-colors text-left"
              >
                <File size={16} style={{ color: 'var(--fg-secondary)', flexShrink: 0 }} />
                <span
                  className="text-sm truncate"
                  style={{ color: 'var(--fg-primary)' }}
                >
                  {doc.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        className="shrink-0 p-1 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          className="w-full py-2 rounded hover:bg-[var(--bg-active)] transition-colors text-sm"
          style={{ color: 'var(--fg-secondary)' }}
        >
          + Add Document
        </button>
      </div>
    </div>
  );
};

export default VaultPanel;
