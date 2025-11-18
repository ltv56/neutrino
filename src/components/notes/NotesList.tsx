import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { noteService, type Note } from '@/services';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    noteId: string;
    noteTitle: string;
  }>({ isOpen: false, noteId: '', noteTitle: '' });

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await noteService.getAll(sessionId);
      setNotes(result);
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
      // Reload list when new note is created
      loadNotes();
    };

    window.addEventListener('note-created', handleNoteCreated as EventListener);
    return () => window.removeEventListener('note-created', handleNoteCreated as EventListener);
  }, [loadNotes]);

  const handleNoteClick = (noteId: string, title: string) => {
    setSelectedNoteId(noteId);
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
      <div className="px-2 py-2 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-secondary)'
        }}>
        <button
          onClick={onCreateNote}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          title="New Note"
        >
          <Plus size={14} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center px-2">
            <FileText size={20} style={{ color: 'var(--fg-tertiary)', marginBottom: '4px' }} />
            <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
              No notes yet
            </p>
          </div>
        ) : (
          <div className="px-1.5 py-1">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note.id, note.title)}
                className={`group px-2 py-1 mx-1 cursor-pointer rounded flex items-center justify-between gap-1.5 hover:bg-[var(--bg-active)] ${!isInitialLoad ? 'transition-all' : ''}`}
                style={{
                  backgroundColor: selectedNoteId === note.id ? 'var(--bg-active)' : 'transparent',
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
                  <Tooltip content={`${note.title || 'Untitled'}.md`} placement="right">
                    <div style={{ maxWidth: '150px', minWidth: 0, flex: 1 }}>
                      <span
                        className="text-sm truncate block"
                        style={{
                          color: selectedNoteId === note.id ? 'var(--accent)' : 'var(--fg-primary)',
                        }}
                      >
                        {note.title || 'Untitled'}.md
                      </span>
                    </div>
                  </Tooltip>
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

      {/* Confirm Delete Dialog */}
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
    </div>
  );
};

export default NotesList;
