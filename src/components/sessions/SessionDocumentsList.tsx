import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, X } from 'lucide-react';
import { documentService } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import { useSessionsContext } from '@/hooks';
import Tooltip from '@/components/common/Tooltip';
import type { Document } from '@/types';

interface SessionDocumentsListProps {
  onDocumentSelect?: (documentId: string, title: string) => void;
}

const SessionDocumentsList: React.FC<SessionDocumentsListProps> = ({
  onDocumentSelect,
}) => {
  const toast = useToast();
  const { currentSession } = useSessionsContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);


  const loadDocuments = useCallback(async () => {
    if (!currentSession?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const docs = await documentService.getBySession(currentSession.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load session documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentSession?.id, toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Listen for document drops from Tauri (since Tauri intercepts drag events)
  useEffect(() => {
    const handleDocumentDrop = async (e: Event) => {
      const event = e as CustomEvent<{ documentId: string; title: string }>;
      const { documentId, title } = event.detail;

      if (!currentSession?.id) {
        toast.error('No active session');
        return;
      }

      try {
        // Check if already in session
        if (documents.some(doc => doc.id === documentId)) {
          toast.info('Document already in this session');
          return;
        }

        // Add to session
        await documentService.addToSession(currentSession.id, documentId);
        await loadDocuments();
        toast.success(`Added "${title}" to session`);
      } catch (error) {
        console.error('Failed to add document to session:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to add document: ${errorMessage}`);
      }
    };

    window.addEventListener('session:document-drop', handleDocumentDrop);
    return () => window.removeEventListener('session:document-drop', handleDocumentDrop);
  }, [currentSession, documents, loadDocuments, toast]);

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocId(doc.id);
    onDocumentSelect?.(doc.id, doc.title);
  };

  const handleRemoveDocument = async (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();

    if (!currentSession?.id) return;

    try {
      await documentService.removeFromSession(currentSession.id, documentId);
      await loadDocuments();
      toast.success('Document removed from session');
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast.error('Failed to remove document');
    }
  };


  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <FileText size={32} style={{ color: 'var(--fg-tertiary)' }} />
        <p className="text-sm mt-2" style={{ color: 'var(--fg-secondary)' }}>
          No active session
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-tertiary)' }}>
          Create or select a session
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full px-4 text-sm" style={{ color: 'var(--fg-secondary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-full relative"
    >
      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
          <FileText size={32} style={{ color: 'var(--fg-tertiary)' }} />
          <p className="text-sm mt-2" style={{ color: 'var(--fg-secondary)' }}>
            No documents yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-tertiary)' }}>
            Drag documents from vault
          </p>
        </div>
      ) : (
        <div className="px-1.5 py-1 overflow-y-auto">
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

              {/* Remove button */}
              <Tooltip content="Remove from session" placement="left">
                <button
                  onClick={(e) => handleRemoveDocument(e, doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--bg-hover)] transition-opacity"
                  style={{ color: 'var(--fg-tertiary)' }}
                >
                  <X size={12} />
                </button>
              </Tooltip>

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

export default SessionDocumentsList;
