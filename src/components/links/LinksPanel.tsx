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
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinksResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for active note changes
  useEffect(() => {
    const handleNoteActivated = (e: CustomEvent) => {
      setActiveNoteId(e.detail.noteId);
    };

    window.addEventListener('note-activated', handleNoteActivated as EventListener);
    return () => window.removeEventListener('note-activated', handleNoteActivated as EventListener);
  }, []);

  // Load backlinks when active note changes
  useEffect(() => {
    if (!activeNoteId) {
      setBacklinks(null);
      return;
    }

    const loadBacklinks = async () => {
      setLoading(true);
      try {
        const result = await noteLinkService.getBacklinks(activeNoteId);
        setBacklinks(result);
      } catch (err) {
        console.error('[LinksPanel] Failed to load backlinks:', err);
        setBacklinks(null);
      } finally {
        setLoading(false);
      }
    };

    loadBacklinks();
  }, [activeNoteId]);

  if (!activeNoteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <ExternalLink size={48} style={{ color: 'var(--fg-tertiary)', opacity: 0.5 }} />
        <p className="mt-4 text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Open a note to see its links
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

  return (
    <div className="flex flex-col h-full">
      {/* Outgoing Links Section */}
      <div className="flex-1 overflow-y-auto border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div
          className="sticky top-0 px-3 py-2 font-medium text-sm backdrop-blur-sm"
          style={{ color: 'var(--fg-primary)', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}
        >
          Outgoing Links ({outgoingCount})
        </div>
        <div className="space-y-1 px-2 py-2">
          {outgoingCount === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
              No outgoing links yet. Use [[...]] syntax to create links.
            </div>
          ) : (
            backlinks?.outgoing.map((linkWithTarget) => {
              const isResolved = linkWithTarget.link.resolved;
              const isNote = linkWithTarget.target_type === 'note';
              const isDocument = linkWithTarget.target_type === 'document';

              return (
                <div
                  key={linkWithTarget.link.id}
                  onClick={() => {
                    if (isNote && linkWithTarget.link.target_note_id) {
                      onNoteSelect?.(linkWithTarget.link.target_note_id, linkWithTarget.target_title || '');
                    } else if (isDocument && linkWithTarget.link.target_document_id) {
                      onDocumentSelect?.(linkWithTarget.link.target_document_id, linkWithTarget.target_title || '');
                    }
                  }}
                  className={`p-2 rounded transition-colors ${
                    isResolved ? 'cursor-pointer hover:bg-tertiary' : 'opacity-50'
                  }`}
                  style={{ backgroundColor: isResolved ? 'transparent' : 'var(--bg-secondary)' }}
                >
                  <div className="flex items-start gap-2">
                    {isNote ? (
                      <StickyNote size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                    ) : isDocument ? (
                      <FileText size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                    ) : (
                      <ExternalLink size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
                        {linkWithTarget.target_title || linkWithTarget.link.link_text}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>
                        {linkWithTarget.link.link_type}
                        {!isResolved && ' • unresolved'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Incoming Links (Backlinks) Section */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="sticky top-0 px-3 py-2 font-medium text-sm backdrop-blur-sm"
          style={{ color: 'var(--fg-primary)', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}
        >
          Backlinks ({incomingCount})
        </div>
        <div className="space-y-1 px-2 py-2">
          {incomingCount === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
              No backlinks yet. Other notes will appear here when they link to this note.
            </div>
          ) : (
            backlinks?.incoming.map((linkWithSource) => (
              <div
                key={linkWithSource.link.id}
                onClick={() => onNoteSelect?.(linkWithSource.link.source_note_id, linkWithSource.source_title)}
                className="p-2 rounded cursor-pointer hover:bg-tertiary transition-colors"
              >
                <div className="flex items-start gap-2">
                  <StickyNote size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
                      {linkWithSource.source_title}
                    </div>
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--fg-secondary)' }}>
                      {linkWithSource.source_content_preview}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>
                      {linkWithSource.link.link_type}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LinksPanel;
