import React, { useState, useEffect } from 'react';
import { ExternalLink, FileText, StickyNote } from 'lucide-react';
import { noteLinkService } from '@/services';
import type { BacklinksResult } from '@/types';

interface LinksPanelProps {
  onNoteSelect?: (noteId: string, title: string) => void;
  onDocumentSelect?: (documentId: string, title: string) => void;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({
  onNoteSelect,
  onDocumentSelect,
}) => {
  const [activeEntity, setActiveEntity] = useState<{ id: string; type: 'note' | 'document' } | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinksResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for already-active note/document on mount
  useEffect(() => {
    // Check if there's already an active note/document
    const checkCurrentActive = () => {
      const lastNoteEvent = (window as any).__lastNoteActivated;
      const lastDocEvent = (window as any).__lastDocumentActivated;

      console.log('[LinksPanel] Checking global state on mount:', {
        lastNoteEvent,
        lastDocEvent
      });

      if (lastNoteEvent) {
        console.log('[LinksPanel] Found active note on mount:', lastNoteEvent);
        setActiveEntity({ id: lastNoteEvent.noteId, type: 'note' });
      } else if (lastDocEvent) {
        console.log('[LinksPanel] Found active document on mount:', lastDocEvent);
        setActiveEntity({ id: lastDocEvent.documentId, type: 'document' });
      } else {
        console.log('[LinksPanel] No active entity found on mount');
      }
    };

    checkCurrentActive();
  }, []);

  // Listen for active note and document changes
  useEffect(() => {
    const handleNoteActivated = (e: CustomEvent) => {
      console.log('[LinksPanel] note-activated:', e.detail);
      (window as any).__lastNoteActivated = e.detail;
      (window as any).__lastDocumentActivated = null;
      setActiveEntity({ id: e.detail.noteId, type: 'note' });
    };

    const handleDocumentActivated = (e: CustomEvent) => {
      console.log('[LinksPanel] document-activated:', e.detail);
      (window as any).__lastDocumentActivated = e.detail;
      (window as any).__lastNoteActivated = null;
      setActiveEntity({ id: e.detail.documentId, type: 'document' });
    };

    window.addEventListener('note-activated', handleNoteActivated as EventListener);
    window.addEventListener('document-activated', handleDocumentActivated as EventListener);

    return () => {
      window.removeEventListener('note-activated', handleNoteActivated as EventListener);
      window.removeEventListener('document-activated', handleDocumentActivated as EventListener);
    };
  }, []);

  // Load backlinks when active entity changes
  useEffect(() => {
    if (!activeEntity) {
      setBacklinks(null);
      return;
    }

    console.log('[LinksPanel] Loading backlinks for:', activeEntity);

    const loadBacklinks = async () => {
      setLoading(true);
      try {
        const result = activeEntity.type === 'note'
          ? await noteLinkService.getBacklinks(activeEntity.id)
          : await noteLinkService.getDocumentBacklinks(activeEntity.id);
        console.log('[LinksPanel] Backlinks loaded:', result);
        setBacklinks(result);
      } catch (err) {
        console.error('[LinksPanel] Failed to load backlinks:', err);
        setBacklinks(null);
      } finally {
        setLoading(false);
      }
    };

    loadBacklinks();
  }, [activeEntity]);

  console.log('[LinksPanel] Render - activeEntity:', activeEntity, 'loading:', loading, 'backlinks:', backlinks);

  if (!activeEntity) {
    console.log('[LinksPanel] No active entity - showing empty state');
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <ExternalLink size={48} style={{ color: 'var(--fg-tertiary)', opacity: 0.5 }} />
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--fg-secondary)' }}>
          Open a note or document to see its links
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Loading links...
        </p>
      </div>
    );
  }

  const outgoingCount = backlinks?.outgoing.length || 0;
  const incomingCount = backlinks?.incoming.length || 0;
  const isNote = activeEntity.type === 'note';

  console.log('[LinksPanel] Rendering with data:', { outgoingCount, incomingCount, isNote });

  return (
    <div className="flex flex-col h-full">
      {/* Outgoing Links Section - Only for notes */}
      {isNote && (
        <div className="flex-1 flex flex-col min-h-0">
          <div
            className="px-3 py-1.5 font-medium"
            style={{
              color: 'var(--fg-primary)',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-light)',
              boxShadow: '0 3px 20px rgba(0, 0, 0, 0.18)',
              fontSize: '13px',
              zIndex: 10
            }}
          >
            Outgoing Links ({outgoingCount})
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scrollbar">
            {outgoingCount === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                  No outgoing links yet. Use [[...]] syntax to create links.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
              {backlinks?.outgoing.map((linkWithTarget) => {
                const isResolved = linkWithTarget.link.resolved;
                const isNoteLink = linkWithTarget.target_type === 'note';
                const isDocumentLink = linkWithTarget.target_type === 'document';

                return (
                  <div
                    key={linkWithTarget.link.id}
                    onClick={() => {
                      if (isNoteLink && linkWithTarget.link.target_note_id) {
                        onNoteSelect?.(linkWithTarget.link.target_note_id, linkWithTarget.target_title || '');
                      } else if (isDocumentLink && linkWithTarget.link.target_document_id) {
                        onDocumentSelect?.(linkWithTarget.link.target_document_id, linkWithTarget.target_title || '');
                      }
                    }}
                    className="px-2 py-1 rounded transition-colors cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  >
                    <div className="flex items-start gap-2">
                      {isNoteLink ? (
                        <StickyNote size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                      ) : isDocumentLink ? (
                        <FileText size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                      ) : (
                        <ExternalLink size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" style={{ color: 'var(--fg-primary)', fontSize: '13px' }}>
                          {linkWithTarget.target_title || linkWithTarget.link.link_text}
                        </div>
                        <div className="mt-0.5" style={{ color: 'var(--fg-tertiary)', fontSize: '11px' }}>
                          {linkWithTarget.link.link_type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incoming Links (Backlinks) Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="px-3 py-1.5 font-medium"
          style={{
            color: 'var(--fg-primary)',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
            boxShadow: '0 3px 20px rgba(0, 0, 0, 0.18)',
            fontSize: '13px',
            zIndex: 20
          }}
        >
          Backlinks ({incomingCount})
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scrollbar">
          {incomingCount === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                {isNote
                  ? 'No backlinks yet. Other notes will appear here when they link to this note.'
                  : 'No backlinks yet. Notes that link to this document will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
            {backlinks?.incoming.map((linkWithSource) => (
              <div
                key={linkWithSource.link.id}
                onClick={() => onNoteSelect?.(linkWithSource.link.source_note_id, linkWithSource.source_title)}
                className="px-2 py-1 rounded cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <StickyNote size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--fg-primary)', fontSize: '13px' }}>
                      {linkWithSource.source_title}
                    </div>
                    <div className="mt-1 line-clamp-2" style={{ color: 'var(--fg-secondary)', fontSize: '11px' }}>
                      {linkWithSource.source_content_preview}
                    </div>
                    <div className="mt-0.5" style={{ color: 'var(--fg-tertiary)', fontSize: '11px' }}>
                      {linkWithSource.link.link_type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinksPanel;
