import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, Edit, AlertCircle, X } from 'lucide-react';
import { noteService, type Note } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';
import './markdown.css';

interface NoteEditorProps {
  noteId?: string;
  sessionId?: string;
  documentId?: string;
  onClose: () => void;
  onSave?: (noteId: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  sessionId,
  documentId,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<'reading' | 'edit'>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(noteId);
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [errorTitleRef, setErrorTitleRef] = useState<string | null>(null);
  const [invalidCharWarning, setInvalidCharWarning] = useState<string | null>(null);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasAutoFocusedRef = useRef(false);

  const loadNote = useCallback(async () => {
    if (!noteId) return;

    setIsLoading(true);
    try {
      const note = await noteService.getById(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setCurrentNoteId(note.id);
        setLastSavedTitle(note.title);

        // Clear warnings when loading note from DB
        // DB value is always valid (no special chars)
        setInvalidCharWarning(null);
        setTitleError(null);
        setErrorTitleRef(null);
      }
    } catch (err) {
      console.error('Failed to load note:', err);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  // Load note on mount
  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId, loadNote]);

  // Auto-focus and select title after loading (only once)
  useEffect(() => {
    if (!isLoading && title && title.startsWith('Untitled') && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true;
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 100);
    }
  }, [isLoading, title]);

  // Auto-save with debounce
  const autoSave = useCallback(async (newTitle: string, newContent: string, titleChanged: boolean) => {
    // Check for invalid characters in title directly (don't rely on state)
    const invalidCharsPattern = /[/\\:*?"<>|]/;
    const hasInvalidChars = invalidCharsPattern.test(newTitle);

    // Don't save if there's a title error or invalid characters
    if ((titleError || hasInvalidChars) && titleChanged) {
      console.log('[AutoSave] Skipped due to title error or invalid characters');
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce 500ms for title, 1s for content
    const debounceTime = titleChanged ? 500 : 1000;
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentNoteId) {
          // Update existing note
          await noteService.update(currentNoteId, newTitle, newContent);
          console.log('[AutoSave] Note updated');

          // Clear error on successful save
          if (titleError) {
            setTitleError(null);
            setErrorTitleRef(null);
          }

          // Update lastSavedTitle and dispatch events if title changed
          if (titleChanged && newTitle !== lastSavedTitle) {
            setLastSavedTitle(newTitle);

            // Update tab title and sidebar
            window.dispatchEvent(new CustomEvent('note-title-changed', {
              detail: { noteId: currentNoteId, title: newTitle }
            }));
          }
        } else {
          // Create new note
          // Don't save if both title and content are empty/whitespace
          if (!newTitle.trim() && !newContent.trim()) return;

          // Don't save if title is empty (even if content exists)
          // User must provide a title to create a note
          if (!newTitle.trim()) return;

          const newNote = await noteService.create(
            sessionId || null,
            documentId || null,
            newTitle || 'Untitled',
            newContent,
            'concept'
          );
          setCurrentNoteId(newNote.id);
          setLastSavedTitle(newTitle);
          onSave?.(newNote.id);
          console.log('[AutoSave] Note created:', newNote.id);

          // Clear error on successful save
          if (titleError) {
            setTitleError(null);
            setErrorTitleRef(null);
          }

          // Notify sidebar to select the new note
          window.dispatchEvent(new CustomEvent('note-created', {
            detail: { noteId: newNote.id }
          }));
          // Update tab title for newly created note
          window.dispatchEvent(new CustomEvent('note-title-changed', {
            detail: { noteId: newNote.id, title: newTitle }
          }));
        }
      } catch (err) {
        console.error('[AutoSave] Failed:', err);

        // Check if it's a unique constraint error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate')) {
          setTitleError(`A note with the title "${newTitle}" already exists in this session`);
          setErrorTitleRef(newTitle);
        } else {
          toast.error('Failed to save note');
        }
      }
    }, debounceTime);
  }, [currentNoteId, sessionId, documentId, onSave, lastSavedTitle, toast, titleError]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTitle = e.target.value;

    // Trim leading spaces only (like file explorer)
    newTitle = newTitle.replace(/^\s+/, '');

    setTitle(newTitle);

    // Check for invalid filename characters: / \ : * ? " < > |
    const invalidChars = /[/\\:*?"<>|]/;
    if (invalidChars.test(newTitle)) {
      // Show persistent warning (like duplicate title error)
      setInvalidCharWarning('Invalid characters: / \\ : * ? " < > |');
    } else {
      // Clear warning when no invalid characters
      setInvalidCharWarning(null);
    }

    // Auto-clear duplicate error if user changes to a different title
    if (errorTitleRef && newTitle !== errorTitleRef) {
      setTitleError(null);
      setErrorTitleRef(null);
    }

    // Auto-save immediately while typing (will skip if invalid characters present)
    autoSave(newTitle, content, true);
  };

  const handleTitleBlur = () => {
    // Check for invalid characters in title directly (don't rely on state)
    const invalidCharsPattern = /[/\\:*?"<>|]/;
    const hasInvalidChars = invalidCharsPattern.test(title);

    // Update sidebar and tabbar when blur
    // Don't update if there's an error or invalid characters
    if (currentNoteId && title !== lastSavedTitle && !titleError && !hasInvalidChars) {
      // Update tab title and sidebar with optimistic update
      window.dispatchEvent(new CustomEvent('note-title-changed', {
        detail: { noteId: currentNoteId, title: title }
      }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    autoSave(title, newContent, false); // Content changed, title same
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-end gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>Auto-saved</span>

        <Tooltip content={mode === 'edit' ? 'Reading Mode' : 'Edit Mode'} placement="bottom-right">
          <button
            onClick={() => setMode(mode === 'edit' ? 'reading' : 'edit')}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            {mode === 'edit' ? <Book size={14} /> : <Edit size={14} />}
          </button>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex justify-center px-4">
        {mode === 'edit' ? (
          <div className="h-full flex flex-col overflow-y-auto w-full" style={{ maxWidth: '800px' }}>
            {/* Title input */}
            <div className="px-8 pt-12 pb-4 relative">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Untitled"
                className="text-xl font-semibold outline-none border-none w-full"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--fg-primary)',
                  lineHeight: '1.3',
                  margin: 0,
                  padding: 0,
                }}
              />

              {/* Floating error tooltip */}
              {titleError && (
                <div
                  className="absolute rounded z-50 flex items-center gap-2"
                  style={{
                    right: '160px',
                    top: 'calc(50% + 2px)',
                    backgroundColor: 'var(--danger)',
                    padding: '6px 10px',
                    maxWidth: '500px',
                  }}
                >
                  {/* Error Icon */}
                  <AlertCircle
                    size={14}
                    style={{
                      color: 'white',
                      flexShrink: 0
                    }}
                  />

                  {/* Error Message */}
                  <p
                    className="text-xs"
                    style={{
                      color: 'white',
                      fontWeight: 500,
                      lineHeight: '1.4',
                      margin: 0
                    }}
                  >
                    {titleError}
                  </p>
                </div>
              )}

              {/* Floating warning tooltip for invalid characters */}
              {invalidCharWarning && (
                <div
                  className="absolute rounded z-50 flex items-center gap-2"
                  style={{
                    right: '160px',
                    top: 'calc(50% + 2px)',
                    backgroundColor: 'var(--warning)',
                    padding: '6px 10px',
                    maxWidth: '500px',
                  }}
                >
                  {/* Warning Icon */}
                  <AlertCircle
                    size={14}
                    style={{
                      color: 'white',
                      flexShrink: 0
                    }}
                  />

                  {/* Warning Message */}
                  <p
                    className="text-xs"
                    style={{
                      color: 'white',
                      fontWeight: 500,
                      lineHeight: '1.4',
                      margin: 0
                    }}
                  >
                    {invalidCharWarning}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px mt-3" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Content textarea */}
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing..."
              className="flex-1 px-8 pb-8 resize-none outline-none border-none text-sm"
              style={{
                color: 'var(--fg-primary)',
                lineHeight: '1.7',
              }}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-y-auto w-full" style={{ maxWidth: '800px' }}>
            {/* Title preview */}
            <div className="px-8 pt-12 pb-4">
              <h1
                className="text-xl font-semibold"
                style={{
                  color: 'var(--fg-primary)',
                  lineHeight: '1.3',
                  margin: 0,
                  padding: 0,
                }}
              >
                {title || 'Untitled'}
              </h1>
              {/* Divider */}
              <div className="h-px mt-3" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Content preview */}
            <div className="flex-1 px-8 pb-8">
              {content ? (
                <div className="markdown-preview prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--fg-tertiary)' }}>
                  No content yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
