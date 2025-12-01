import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FolderOpen, FileText, Upload, FolderPlus, ArrowUpDown, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { documentService, pdfService } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';
import type { Document } from '@/types';

type SortType = 'name' | 'date' | 'type' | 'progress';
type SortOrder = 'asc' | 'desc';

interface VaultPanelProps {
  onOpenDocument?: (documentId: string, title: string) => void;
  isDraggingFiles?: boolean;
}

const VaultPanel: React.FC<VaultPanelProps> = ({ onOpenDocument, isDraggingFiles = false }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortType, setSortType] = useState<SortType>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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
      await documentService.importPDF(selected, undefined);

      // Reload documents to show the new import
      await loadDocuments();
      toast.success('PDF imported successfully');
    } catch (error) {
      console.error('Failed to import PDF:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to import PDF: ${errorMessage}`);
    }
  };

  // Handle drag start for documents
  const handleDocumentDragStart = (e: React.DragEvent, doc: Document) => {
    // Set custom data type for neutrino documents
    e.dataTransfer.setData('application/x-neutrino-document', doc.id);
    e.dataTransfer.setData('text/plain', doc.title);
    e.dataTransfer.effectAllowed = 'copy'; // Allow both copy and link (reference)

    // Dispatch custom event to signal internal drag start
    // This tells Layout to handle the drop via Tauri (since Tauri intercepts all drags)
    window.dispatchEvent(new CustomEvent('neutrino:internal-drag-start', {
      detail: { documentId: doc.id, title: doc.title }
    }));
  };

  const handleDocumentDragEnd = () => {
    // Dispatch custom event to signal internal drag end
    window.dispatchEvent(new Event('neutrino:internal-drag-end'));
  };

  // Sort documents based on selected criteria
  const sortedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let comparison = 0;

      switch (sortType) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'type':
          comparison = a.content_type.localeCompare(b.content_type);
          break;
        case 'progress':
          comparison = a.reading_progress - b.reading_progress;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [documents, sortType, sortOrder]);

  const handleSort = (type: SortType) => {
    if (sortType === type) {
      // Toggle order if same type
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortType(type);
      setSortOrder('desc'); // Default to descending for new sort type
    }
    setShowSortMenu(false);
  };

  // Close sort menu when clicking outside
  useEffect(() => {
    if (!showSortMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortButtonRef.current &&
        !sortButtonRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.sort-menu')
      ) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  // Listen for document reload event from Layout (after drag & drop import)
  useEffect(() => {
    const handleReload = () => {
      loadDocuments();
    };

    window.addEventListener('vault:reload-documents', handleReload);
    return () => window.removeEventListener('vault:reload-documents', handleReload);
  }, []);

  // Auto-expand vault when dragging files
  useEffect(() => {
    if (isDraggingFiles && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isDraggingFiles, isCollapsed]);

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: isDraggingFiles ? '1px dashed var(--accent)' : '1px solid transparent',
        transition: 'border-color 0.2s, opacity 0.2s',
      }}
    >
      {/* Drop Zone Overlay */}
      {isDraggingFiles && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="px-5 py-3 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--accent)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            <Upload size={28} style={{ color: 'var(--accent)', margin: '0 auto', display: 'block' }} />
            <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--accent)' }}>
              Drop PDF files here
            </p>
          </div>
        </div>
      )}

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

          <div className="relative">
            <Tooltip content="Sort" placement="bottom">
              <button
                ref={sortButtonRef}
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
              >
                <ArrowUpDown size={14} style={{ color: 'var(--fg-secondary)' }} />
              </button>
            </Tooltip>

            {/* Sort Menu */}
            {showSortMenu && (
              <div
                className="sort-menu absolute top-full right-0 mt-1 w-40 rounded-lg shadow-xl overflow-hidden z-10"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="py-1">
                  <button
                    onClick={() => handleSort('name')}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-active)] flex items-center justify-between"
                    style={{ color: 'var(--fg-primary)' }}
                  >
                    <span>Name</span>
                    {sortType === 'name' && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </button>
                  <button
                    onClick={() => handleSort('date')}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-active)] flex items-center justify-between"
                    style={{ color: 'var(--fg-primary)' }}
                  >
                    <span>Date</span>
                    {sortType === 'date' && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </button>
                  <button
                    onClick={() => handleSort('type')}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-active)] flex items-center justify-between"
                    style={{ color: 'var(--fg-primary)' }}
                  >
                    <span>Type</span>
                    {sortType === 'type' && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </button>
                  <button
                    onClick={() => handleSort('progress')}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-active)] flex items-center justify-between"
                    style={{ color: 'var(--fg-primary)' }}
                  >
                    <span>Progress</span>
                    {sortType === 'progress' && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </button>
                  <div className="border-t my-1" style={{ borderColor: 'var(--border)' }}></div>
                  <button
                    onClick={() => {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      setShowSortMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-active)]"
                    style={{ color: 'var(--fg-secondary)' }}
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
              {sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  draggable="true"
                  onDragStart={(e) => handleDocumentDragStart(e, doc)}
                  onDragEnd={handleDocumentDragEnd}
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
