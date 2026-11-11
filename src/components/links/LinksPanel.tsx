import React, { useState, useEffect } from 'react';
import { ExternalLink, FileText, StickyNote, Highlighter, ChevronDown, ChevronRight } from 'lucide-react';
import { noteLinkService, highlightService, documentService } from '@/services';
import type { BacklinksResult, Highlight } from '@/types';

interface LinksPanelProps {
  onNoteSelect?: (noteId: string, title: string) => void;
  onDocumentSelect?: (documentId: string, title: string) => void;
}

// Strip .md extension from titles for clean display
const stripMdExtension = (title: string): string => {
  return title.endsWith('.md') ? title.slice(0, -3) : title;
};

export const LinksPanel: React.FC<LinksPanelProps> = ({
  onNoteSelect,
  onDocumentSelect,
}) => {
  const [activeEntity, setActiveEntity] = useState<{ id: string; type: 'note' | 'document' } | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinksResult | null>(null);
  const [linkedHighlights, setLinkedHighlights] = useState<Array<Highlight & { documentTitle?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isReferencedExpanded, setIsReferencedExpanded] = useState(true);
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(true);
  const [isBacklinksExpanded, setIsBacklinksExpanded] = useState(true);

  // Check for already-active note/document on mount
  useEffect(() => {
    const lastNoteEvent = window.__lastNoteActivated;
    const lastDocEvent = window.__lastDocumentActivated;

    if (lastNoteEvent) {
      setActiveEntity({ id: lastNoteEvent.noteId, type: 'note' });
    } else if (lastDocEvent) {
      setActiveEntity({ id: lastDocEvent.documentId, type: 'document' });
    }
  }, []);

  // Listen for active note and document changes
  useEffect(() => {
    const handleNoteActivated = (e: CustomEvent) => {
      window.__lastNoteActivated = e.detail;
      window.__lastDocumentActivated = null;
      setActiveEntity({ id: e.detail.noteId, type: 'note' });
    };

    const handleDocumentActivated = (e: CustomEvent) => {
      window.__lastDocumentActivated = e.detail;
      window.__lastNoteActivated = null;
      setActiveEntity({ id: e.detail.documentId, type: 'document' });
    };

    const handleLinksUpdated = (e: CustomEvent) => {
      if (activeEntity && activeEntity.type === 'note' && activeEntity.id === e.detail.noteId) {
        setActiveEntity({ ...activeEntity }); // Trigger re-fetch
      }
    };

    window.addEventListener('note-activated', handleNoteActivated as EventListener);
    window.addEventListener('document-activated', handleDocumentActivated as EventListener);
    window.addEventListener('links-updated', handleLinksUpdated as EventListener);

    return () => {
      window.removeEventListener('note-activated', handleNoteActivated as EventListener);
      window.removeEventListener('document-activated', handleDocumentActivated as EventListener);
      window.removeEventListener('links-updated', handleLinksUpdated as EventListener);
    };
  }, [activeEntity]);

  // Load backlinks when active entity changes
  useEffect(() => {
    if (!activeEntity) {
      setBacklinks(null);
      setLinkedHighlights([]);
      return;
    }

    const loadBacklinks = async () => {
      setLoading(true);
      try {
        const result = activeEntity.type === 'note'
          ? await noteLinkService.getBacklinks(activeEntity.id)
          : await noteLinkService.getDocumentBacklinks(activeEntity.id);
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

  // Load linked highlights for notes
  useEffect(() => {
    if (!activeEntity || activeEntity.type !== 'note') {
      setLinkedHighlights([]);
      return;
    }

    const loadLinkedHighlights = async () => {
      try {
        const highlights = await highlightService.getByLinkedNote(activeEntity.id);

        // Fetch document titles for each highlight
        const highlightsWithTitles = await Promise.all(
          highlights.map(async (h) => {
            try {
              const doc = await documentService.getById(h.document_id);
              return { ...h, documentTitle: doc?.title || 'Unknown Document' };
            } catch {
              return { ...h, documentTitle: 'Unknown Document' };
            }
          })
        );

        setLinkedHighlights(highlightsWithTitles);
      } catch (err) {
        console.error('[LinksPanel] Failed to load linked highlights:', err);
        setLinkedHighlights([]);
      }
    };

    loadLinkedHighlights();
  }, [activeEntity]);

  if (!activeEntity) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <ExternalLink size={40} style={{ color: 'var(--fg-tertiary)', opacity: 0.5 }} />
        <p className="mt-3 text-sm text-center" style={{ color: 'var(--fg-secondary)' }}>
          Open a note or document to see connections
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Loading...
        </p>
      </div>
    );
  }

  const outgoingCount = backlinks?.outgoing.length || 0;
  const incomingCount = backlinks?.incoming.length || 0;
  const linkedHighlightsCount = linkedHighlights.length;
  const isNote = activeEntity.type === 'note';

  return (
    <div className="flex flex-col">
      {/* Outgoing Links Section - Only for notes */}
      {isNote && (
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setIsReferencedExpanded(!isReferencedExpanded)}
            className="w-full px-3 py-2.5 flex items-center justify-between transition-colors"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--fg-primary)' }}>
                Referenced
              </span>
              {outgoingCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                  ({outgoingCount})
                </span>
              )}
            </div>
            {isReferencedExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--fg-tertiary)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--fg-tertiary)' }} />
            )}
          </button>
          {isReferencedExpanded && (
            <div className="px-2 pb-2 overflow-y-auto custom-scrollbar">
            {outgoingCount === 0 ? (
              <div className="py-6">
                <p className="text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                  No outgoing links. Use [[...]] to create links.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
              {backlinks?.outgoing.map((linkWithTarget) => {
                const isResolved = linkWithTarget.link.resolved;
                const isNoteLink = linkWithTarget.target_type === 'note';
                const isDocumentLink = linkWithTarget.target_type === 'document';

                const canClick = isNoteLink || isDocumentLink;

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
                    className={`px-2 py-1.5 rounded transition-colors ${canClick ? 'cursor-pointer' : ''}`}
                    style={{
                      cursor: canClick ? 'pointer' : 'default'
                    }}
                    onMouseEnter={(e) => {
                      if (canClick) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {isNoteLink ? (
                        <StickyNote size={14} style={{ color: 'var(--accent)', marginTop: '2px' }} />
                      ) : isDocumentLink ? (
                        <FileText size={14} style={{ color: 'var(--accent)', marginTop: '2px' }} />
                      ) : (
                        <ExternalLink size={14} style={{ color: 'var(--fg-tertiary)', marginTop: '2px', opacity: 0.5 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm" style={{
                          color: !isNoteLink && !isDocumentLink ? 'var(--fg-tertiary)' : 'var(--fg-primary)',
                          opacity: !isNoteLink && !isDocumentLink ? 0.6 : 1
                        }}>
                          {stripMdExtension(linkWithTarget.target_title || linkWithTarget.link.link_text)}
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                          {!isNoteLink && !isDocumentLink ? 'Not found' : linkWithTarget.link.link_type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* Linked Highlights Section - Only for notes */}
      {isNote && (
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
            className="w-full px-3 py-2.5 flex items-center justify-between transition-colors"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-2">
              <Highlighter size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--fg-primary)' }}>
                Linked Highlights
              </span>
              {linkedHighlightsCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                  ({linkedHighlightsCount})
                </span>
              )}
            </div>
            {isHighlightsExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--fg-tertiary)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--fg-tertiary)' }} />
            )}
          </button>
          {isHighlightsExpanded && (
            <div className="px-2 pb-2 overflow-y-auto custom-scrollbar">
            {linkedHighlightsCount === 0 ? (
              <div className="py-6">
                <p className="text-center text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                  No linked highlights yet.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {linkedHighlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    onClick={() => {
                      if (onDocumentSelect) {
                        window.dispatchEvent(new CustomEvent('jump-to-highlight', {
                          detail: {
                            documentId: highlight.document_id,
                            highlightId: highlight.id,
                            pageNumber: highlight.page_number,
                          }
                        }));
                        onDocumentSelect(highlight.document_id, highlight.documentTitle || 'Unknown');
                      }
                    }}
                    className="px-2 py-1.5 rounded cursor-pointer transition-colors"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Highlighter size={14} style={{ color: 'var(--accent)', marginTop: '2px' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm" style={{ color: 'var(--fg-primary)' }}>
                          {highlight.documentTitle}
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                          Page {highlight.page_number}
                        </div>
                        {highlight.content && (
                          <div className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                            "{highlight.content}"
                          </div>
                        )}
                        {highlight.note && (
                          <div className="mt-1 line-clamp-1 text-xs italic" style={{ color: 'var(--fg-tertiary)' }}>
                            Note: {highlight.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* Incoming Links (Backlinks) Section */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setIsBacklinksExpanded(!isBacklinksExpanded)}
          className="w-full px-3 py-2.5 flex items-center justify-between transition-colors"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div className="flex items-center gap-2">
            <StickyNote size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--fg-primary)' }}>
              Backlinks
            </span>
            {incomingCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                ({incomingCount})
              </span>
            )}
          </div>
          {isBacklinksExpanded ? (
            <ChevronDown size={16} style={{ color: 'var(--fg-tertiary)' }} />
          ) : (
            <ChevronRight size={16} style={{ color: 'var(--fg-tertiary)' }} />
          )}
        </button>
        {isBacklinksExpanded && (
          <div className="px-2 pb-2 overflow-y-auto custom-scrollbar">
          {incomingCount === 0 ? (
            <div className="py-6">
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
                className="px-2 py-1.5 rounded cursor-pointer transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-start gap-2">
                  <StickyNote size={14} style={{ color: 'var(--accent)', marginTop: '2px' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm" style={{ color: 'var(--fg-primary)' }}>
                      {stripMdExtension(linkWithSource.source_title)}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                      {linkWithSource.source_content_preview}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                      {linkWithSource.link.link_type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinksPanel;
