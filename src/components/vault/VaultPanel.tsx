import React, { useEffect, useState, useRef } from 'react';
import { FolderOpen, FileText, Upload, FolderPlus, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { documentService, pdfService } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';
import type { Document } from '@/types';

interface VaultPanelProps {
  onOpenDocument?: (documentId: string, title: string) => void;
}

const VaultPanel: React.FC<VaultPanelProps> = ({ onOpenDocument }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocId(doc.id);
    onOpenDocument?.(doc.id, doc.title);
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
      toast.success('PDF imported successfully');
    } catch (error) {
      console.error('Failed to import PDF:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to import PDF: ${errorMessage}`);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center">
          <span className="text-xs font-medium" style={{ color: 'var(--fg-primary)' }}>Vault</span>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip content="Import PDF" placement="bottom">
            <button
              onClick={handleImport}
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            >
              <Upload size={14} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>

          <Tooltip content="New Folder" placement="bottom">
            <button
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
              disabled
            >
              <FolderPlus size={14} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>

          <Tooltip content="Sort" placement="bottom">
            <button
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
              disabled
            >
              <ArrowUpDown size={14} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>
          <Tooltip content={isCollapsed ? "Expand" : "Collapse"} placement="right">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            >
              {isCollapsed ? (
                <ChevronDown size={14} style={{ color: 'var(--fg-secondary)' }} />
              ) : (
                <ChevronUp size={14} style={{ color: 'var(--fg-secondary)' }} />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Document List */}
      {!isCollapsed && (
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
            <div className="px-1.5 py-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className="group px-2 py-1.5 mx-1 cursor-pointer rounded flex items-center justify-between gap-2 transition-colors"
                  style={{
                    backgroundColor: selectedDocId === doc.id ? 'var(--bg-active)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDocId !== doc.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDocId !== doc.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText
                      size={14}
                      style={{
                        color: selectedDocId === doc.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                        flexShrink: 0
                      }}
                    />
                    <DocTooltip title={doc.title}>
                      <div style={{ maxWidth: '160px', minWidth: 0, flex: 1 }}>
                        <span
                          className="text-xs truncate block"
                          style={{
                            color: selectedDocId === doc.id ? 'var(--accent)' : 'var(--fg-primary)',
                          }}
                        >
                          {doc.title}
                        </span>
                      </div>
                    </DocTooltip>
                  </div>
                  {doc.reading_progress > 0 && (
                    <span className="text-[11px] shrink-0" style={{ color: 'var(--fg-tertiary)' }}>
                      p.{doc.reading_progress}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Tooltip component that only shows when text is truncated
const DocTooltip: React.FC<{ title: string; children: React.ReactElement; }> = ({ title, children }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (containerRef.current) {
        const span = containerRef.current.querySelector('span');
        if (span) {
          setIsTruncated(span.scrollWidth > span.clientWidth);
        }
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [title]);

  const wrapper = <div ref={containerRef} style={{ display: 'contents' }}>{children}</div>;

  if (isTruncated) {
    return <Tooltip content={title} placement="right">{wrapper}</Tooltip>;
  }

  return wrapper;
};

export default VaultPanel;
