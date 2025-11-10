import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, Upload } from 'lucide-react';
import { documentService, pdfService } from '@/services';
import type { Document } from '@/types';

interface VaultPanelProps {
  onSelectDocument?: (docId: string) => void;
}

const VaultPanel: React.FC<VaultPanelProps> = ({ onSelectDocument }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.getAll();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (docId: string) => {
    navigate(`/documents/${docId}`);
    onSelectDocument?.(docId);
  };

  const handleImport = async () => {
    try {
      const selected = await pdfService.openFilePicker(false);

      if (!selected || Array.isArray(selected)) {
        return; // User cancelled
      }

      // Import PDF without session (vault-first approach)
      await documentService.importPDF(selected, null);

      // Reload documents to show the new import
      await loadDocuments();
    } catch (error) {
      console.error('Failed to import PDF:', error);
      alert(`Failed to import PDF: ${error}`);
    }
  };

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
        {loading ? (
          <div className="flex items-center justify-center h-full px-4 text-sm" style={{ color: 'var(--fg-secondary)' }}>
            Loading...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-2">
            <FileText size={32} style={{ color: 'var(--fg-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
              No documents yet
            </p>
            <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
              Import PDFs to get started
            </p>
          </div>
        ) : (
          <div className="py-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleDocumentClick(doc.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-active)] transition-colors text-left group"
                title={doc.title}
              >
                <FileText size={14} style={{ color: 'var(--fg-secondary)', flexShrink: 0 }} />
                <span className="text-xs truncate" style={{ color: 'var(--fg-primary)' }}>
                  {doc.title}
                </span>
                {doc.reading_progress > 0 && (
                  <span className="ml-auto text-xs shrink-0" style={{ color: 'var(--fg-tertiary)' }}>
                    p.{doc.reading_progress}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleImport}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded hover:bg-[var(--bg-active)] transition-colors"
          style={{ color: 'var(--fg-secondary)' }}
          title="Import PDF"
        >
          <Upload size={14} />
          <span className="text-xs">Import PDF</span>
        </button>
      </div>
    </div>
  );
};

export default VaultPanel;
