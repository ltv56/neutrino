import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Plus, Trash2, FolderPlus, ArrowUpDown, ChevronUp, ChevronDown, Folder as FolderIcon, FolderOpen, ChevronRight, MoreVertical, Edit2 } from 'lucide-react';
import { noteService, folderService, type Note, type Folder } from '@/services';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';

interface NotesListProps {
  sessionId?: string;
  onNoteSelect?: (noteId: string, title: string) => void;
  onCreateNote?: () => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  sessionId,
  onNoteSelect,
  onCreateNote
}) => {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [originalFolderName, setOriginalFolderName] = useState('');
  const renameFolderInputRef = useRef<HTMLInputElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    noteId: string;
    noteTitle: string;
  }>({ isOpen: false, noteId: '', noteTitle: '' });
  const [confirmFolderDelete, setConfirmFolderDelete] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({ isOpen: false, folderId: '', folderName: '' });

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notesResult, foldersResult] = await Promise.all([
        noteService.getAll(sessionId),
        folderService.getAll()
      ]);
      setNotes(notesResult);
      setFolders(foldersResult);
      // Disable initial load flag after first load to enable smooth transitions
      if (isInitialLoad) {
        setTimeout(() => setIsInitialLoad(false), 100);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isInitialLoad]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Listen for note title changes (optimistic update - no DB reload)
  useEffect(() => {
    const handleNoteTitleChanged = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      // Update title in local state without reloading from DB
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId ? { ...note, title } : note
        )
      );
    };

    window.addEventListener('note-title-changed', handleNoteTitleChanged as EventListener);
    return () => window.removeEventListener('note-title-changed', handleNoteTitleChanged as EventListener);
  }, []);

  // Listen for note creation to auto-select and reload list
  useEffect(() => {
    const handleNoteCreated = (e: CustomEvent) => {
      const { noteId } = e.detail;
      setSelectedNoteId(noteId);
      setSelectedFolderId(null); // Clear folder selection after creating note
      // Reload list when new note is created
      loadNotes();
    };

    window.addEventListener('note-created', handleNoteCreated as EventListener);
    return () => window.removeEventListener('note-created', handleNoteCreated as EventListener);
  }, [loadNotes]);

  const handleNoteClick = (noteId: string, title: string) => {
    setSelectedNoteId(noteId);
    setSelectedFolderId(null); // Clear folder selection when a note is clicked
    onNoteSelect?.(noteId, title);
  };

  const handleDeleteNote = (e: React.MouseEvent, noteId: string, noteTitle: string) => {
    e.stopPropagation();
    setConfirmDialog({ isOpen: true, noteId, noteTitle });
  };

  const confirmDelete = async () => {
    const { noteId } = confirmDialog;

    try {
      await noteService.delete(noteId);
      loadNotes();

      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }

      // Notify to close the tab
      window.dispatchEvent(new CustomEvent('note-deleted', {
        detail: { noteId }
      }));

      setConfirmDialog({ isOpen: false, noteId: '', noteTitle: '' });
      toast.success('Note deleted successfully');
    } catch (err) {
      console.error('Failed to delete note:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete note: ${errorMessage}`);
      setConfirmDialog({ isOpen: false, noteId: '', noteTitle: '' });
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, noteId: '', noteTitle: '' });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      setNewFolderName('');
      return;
    }

    try {
      await folderService.create(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
      loadNotes();
      toast.success('Folder created successfully');
    } catch (err) {
      console.error('Failed to create folder:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create folder: ${errorMessage}`);
    }
  };

  const handleCancelCreateFolder = () => {
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  // Focus input when creating folder
  useEffect(() => {
    if (isCreatingFolder && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [isCreatingFolder]);

  // Focus input when renaming folder
  useEffect(() => {
    if (renamingFolderId && renameFolderInputRef.current) {
      renameFolderInputRef.current.focus();
      renameFolderInputRef.current.select();
    }
  }, [renamingFolderId]);

  // Close folder menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setOpenFolderMenu(null);
      }
    };

    if (openFolderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openFolderMenu]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleFolderClick = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolderId(folderId);
    setSelectedNoteId(null); // Clear note selection
    toggleFolder(folderId);
  };

  const handleRootClick = () => {
    setSelectedFolderId(null);
  };

  const handleRenameFolder = async () => {
    if (!renamingFolderId || !renameFolderName.trim()) {
      setRenamingFolderId(null);
      setRenameFolderName('');
      setOriginalFolderName('');
      return;
    }

    // Check if name actually changed
    if (renameFolderName.trim() === originalFolderName.trim()) {
      setRenamingFolderId(null);
      setRenameFolderName('');
      setOriginalFolderName('');
      return;
    }

    try {
      await folderService.update(renamingFolderId, renameFolderName.trim());
      setRenamingFolderId(null);
      setRenameFolderName('');
      setOriginalFolderName('');
      loadNotes();
      toast.success('Folder renamed successfully');
    } catch (err) {
      console.error('Failed to rename folder:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to rename folder: ${errorMessage}`);
    }
  };

  const handleDeleteFolder = async () => {
    const { folderId } = confirmFolderDelete;

    try {
      await folderService.delete(folderId);
      loadNotes();
      setConfirmFolderDelete({ isOpen: false, folderId: '', folderName: '' });
      toast.success('Folder deleted successfully');
    } catch (err) {
      console.error('Failed to delete folder:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete folder: ${errorMessage}`);
      setConfirmFolderDelete({ isOpen: false, folderId: '', folderName: '' });
    }
  };

  const cancelFolderDelete = () => {
    setConfirmFolderDelete({ isOpen: false, folderId: '', folderName: '' });
  };

  // Group notes by folder
  const notesByFolder = notes.reduce((acc, note) => {
    const folderId = note.folder_id || 'root';
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-start px-2 py-1">
        {/* <div className="flex items-center">          
          <span className="text-xs font-medium" style={{ color: 'var(--fg-primary)' }}>Papers</span>
        </div> */}

        <div className="flex items-center gap-0.5">
          <Tooltip content="New Note" placement="bottom">
            <button
              onClick={() => {
                // Dispatch create note event with folder context
                window.dispatchEvent(new CustomEvent('workspace:create-note', {
                  detail: { folderId: selectedFolderId }
                }));
              }}
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            >
              <Plus size={14} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>

          <Tooltip content="New Folder" placement="bottom">
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
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
              onClick={() => {
                const newCollapsedState = !isCollapsed;
                setIsCollapsed(newCollapsedState);
                // When collapsing, also collapse all folders
                if (newCollapsedState) {
                  setExpandedFolders(new Set());
                } else {
                  // When expanding, expand all folders
                  setExpandedFolders(new Set(folders.map(f => f.id)));
                }
              }}
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

      {/* Notes and Folders list */}
      {!isCollapsed && (
        <div
          className="flex-1 overflow-y-auto"
          onClick={() => setSelectedFolderId(null)}
        >
          {notes.length === 0 && folders.length === 0 && !isCreatingFolder ? (
            <div className="flex flex-col items-center justify-center h-24 text-center px-2">
              <FileText size={20} style={{ color: 'var(--fg-tertiary)', marginBottom: '4px' }} />
              <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                No notes yet
              </p>
            </div>
          ) : (
            <div
              className="px-1.5 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Inline folder creation input */}
              {isCreatingFolder && (
                <div className="px-2 py-1.5 mx-1 rounded flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <FolderIcon size={14} style={{ color: 'var(--fg-tertiary)' }} />
                  <input
                    ref={folderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder();
                      } else if (e.key === 'Escape') {
                        handleCancelCreateFolder();
                      }
                    }}
                    onBlur={handleCreateFolder}
                    placeholder="Folder name"
                    className="flex-1 bg-transparent outline-none text-xs"
                    style={{
                      color: 'var(--fg-primary)',
                      border: 'none',
                      padding: 0,
                    }}
                  />
                </div>
              )}

              {/* Render folders */}
              {folders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.id);
                const folderNotes = notesByFolder[folder.id] || [];

                return (
                  <div key={folder.id}>
                    {/* Folder header */}
                    {renamingFolderId === folder.id ? (
                      // Rename input
                      <div className="px-2 py-1.5 mx-1 rounded flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <FolderIcon size={14} style={{ color: 'var(--fg-tertiary)' }} />
                        <input
                          ref={renameFolderInputRef}
                          type="text"
                          value={renameFolderName}
                          onChange={(e) => setRenameFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameFolder();
                            } else if (e.key === 'Escape') {
                              setRenamingFolderId(null);
                              setRenameFolderName('');
                              setOriginalFolderName('');
                            }
                          }}
                          onBlur={handleRenameFolder}
                          className="flex-1 bg-transparent outline-none text-xs"
                          style={{
                            color: 'var(--fg-primary)',
                            border: 'none',
                            padding: 0,
                          }}
                        />
                      </div>
                    ) : (
                      // Normal folder display
                      <div
                        onClick={(e) => handleFolderClick(folder.id, e)}
                        className={`group px-2 py-1.5 mx-1 cursor-pointer rounded flex items-center gap-1.5 ${!isInitialLoad ? 'transition-colors' : ''}`}
                        style={{
                          backgroundColor: selectedFolderId === folder.id ? 'var(--bg-active)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFolderId !== folder.id) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFolderId !== folder.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <ChevronRight
                          size={14}
                          style={{
                            color: 'var(--fg-tertiary)',
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        />
                        {isExpanded ? (
                          <FolderOpen size={14} style={{ color: selectedFolderId === folder.id ? 'var(--accent)' : 'var(--accent)' }} />
                        ) : (
                          <FolderIcon size={14} style={{ color: selectedFolderId === folder.id ? 'var(--accent)' : 'var(--fg-tertiary)' }} />
                        )}
                        <span className="text-xs flex-1" style={{ color: selectedFolderId === folder.id ? 'var(--accent)' : 'var(--fg-primary)' }}>
                          {folder.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                          {folderNotes.length}
                        </span>

                        {/* Folder options menu */}
                        <div className="relative" ref={openFolderMenu === folder.id ? folderMenuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-opacity"
                          >
                            <MoreVertical size={12} style={{ color: 'var(--fg-tertiary)' }} />
                          </button>

                          {/* Dropdown menu */}
                          {openFolderMenu === folder.id && (
                            <div
                              className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-50"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                minWidth: '120px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setRenamingFolderId(folder.id);
                                  setRenameFolderName(folder.name);
                                  setOriginalFolderName(folder.name);
                                  setOpenFolderMenu(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                                style={{ color: 'var(--fg-primary)' }}
                              >
                                <Edit2 size={12} />
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmFolderDelete({ isOpen: true, folderId: folder.id, folderName: folder.name });
                                  setOpenFolderMenu(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                                style={{ color: 'var(--fg-error)' }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Folder notes (when expanded) */}
                    {isExpanded && folderNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => handleNoteClick(note.id, note.title)}
                        className={`group px-2 py-1.5 ml-7 mr-1 cursor-pointer rounded flex items-center justify-between gap-1.5 ${!isInitialLoad ? 'transition-colors' : ''}`}
                        style={{
                          backgroundColor: selectedNoteId === note.id ? 'var(--bg-active)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedNoteId !== note.id) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedNoteId !== note.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText
                            size={14}
                            style={{
                              color: selectedNoteId === note.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                              flexShrink: 0
                            }}
                          />
                          <NoteTooltip title={`${note.title || 'Untitled'}.md`}>
                            <div style={{ maxWidth: '150px', minWidth: 0, flex: 1 }}>
                              <span
                                className="text-xs truncate block"
                                style={{
                                  color: selectedNoteId === note.id ? 'var(--accent)' : 'var(--fg-primary)',
                                }}
                              >
                                {note.title || 'Untitled'}.md
                              </span>
                            </div>
                          </NoteTooltip>
                        </div>

                        <button
                          onClick={(e) => handleDeleteNote(e, note.id, note.title)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 size={14} style={{ color: 'var(--fg-tertiary)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Root notes (notes without folder) */}
              {(notesByFolder['root'] || []).length > 0 && (
                <div
                  onClick={() => setSelectedFolderId(null)}
                  className="mt-1"
                >
                  {(notesByFolder['root'] || []).map((note) => (
                    <div
                      key={note.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNoteClick(note.id, note.title);
                      }}
                      className={`group px-2 py-1.5 mx-1 cursor-pointer rounded flex items-center justify-between gap-1.5 ${!isInitialLoad ? 'transition-colors' : ''}`}
                      style={{
                        backgroundColor: selectedNoteId === note.id ? 'var(--bg-active)' : 'transparent',
                      }}
                  onMouseEnter={(e) => {
                    if (selectedNoteId !== note.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedNoteId !== note.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText
                      size={14}
                      style={{
                        color: selectedNoteId === note.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                        flexShrink: 0
                      }}
                    />
                    <NoteTooltip title={`${note.title || 'Untitled'}.md`}>
                      <div style={{ maxWidth: '180px', minWidth: 0, flex: 1 }}>
                        <span
                          className="text-xs truncate block"
                          style={{
                            color: selectedNoteId === note.id ? 'var(--accent)' : 'var(--fg-primary)',
                          }}
                        >
                          {note.title || 'Untitled'}.md
                        </span>
                      </div>
                    </NoteTooltip>
                  </div>

                  <button
                    onClick={(e) => handleDeleteNote(e, note.id, note.title)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-opacity"
                    title="Delete note"
                  >
                    <Trash2 size={14} style={{ color: 'var(--fg-tertiary)' }} />
                  </button>
                </div>
              ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Note Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${confirmDialog.noteTitle}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />

      {/* Confirm Delete Folder Dialog */}
      <ConfirmDialog
        isOpen={confirmFolderDelete.isOpen}
        title="Delete Folder"
        message={`Are you sure you want to delete "${confirmFolderDelete.folderName}"? All notes in this folder will be moved to root. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteFolder}
        onCancel={cancelFolderDelete}
        variant="danger"
      />
    </div>
  );
};

// Tooltip component that only shows when text is truncated
const NoteTooltip: React.FC<{ title: string; children: React.ReactElement; }> = ({ title, children }) => {
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

export default NotesList;
