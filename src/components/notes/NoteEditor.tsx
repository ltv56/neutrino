import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Book, Edit, Palette } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import { noteService, documentService, type Note } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { MarkdownToolbar } from '@/components/ui/MarkdownToolbar';
import { useEditorInsert } from '@/hooks/useEditorInsert';
import NoteAutocomplete from './NoteAutocomplete';
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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(noteId);
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [errorTitleRef, setErrorTitleRef] = useState<string | null>(null);
  const [invalidCharWarning, setInvalidCharWarning] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [readingMode, setReadingMode] = useState(false);
  const [toolbarClosing, setToolbarClosing] = useState(false);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasAutoFocusedRef = useRef(false);

  // Editor insert hook for toolbar
  const { editorViewRef, handleInsert } = useEditorInsert();

  // Handle toolbar toggle with animation
  const handleToolbarToggle = () => {
    if (showToolbar) {
      // Hide: set both states immediately for instant animation start
      setShowToolbar(false);
      setToolbarClosing(true);
      setTimeout(() => {
        setToolbarClosing(false);
      }, 400); // Match animation duration
    } else {
      // Show: just set state
      setShowToolbar(true);
    }
  };

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

        // Detailed error logging
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        console.error('[AutoSave] Error details:', {
          error: errorMessage,
          stack: errorStack,
          noteId: currentNoteId,
          titleLength: newTitle.length,
          contentLength: newContent.length,
          titlePreview: newTitle.substring(0, 50),
          contentPreview: newContent.substring(0, 100),
          errorType: err?.constructor?.name,
          fullError: err,
        });

        // Check error types
        if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate')) {
          setTitleError(`A note with the title "${newTitle}" already exists in this session`);
          setErrorTitleRef(newTitle);
        } else if (errorMessage.includes('malformed') || errorMessage.includes('corrupt')) {
          console.error('[AutoSave] DATABASE CORRUPTION DETECTED!');
          console.error('[AutoSave] Content that caused error:', {
            title: newTitle,
            content: newContent,
            titleHex: Array.from(newTitle).map(c => c.charCodeAt(0).toString(16)).join(' '),
            contentHex: Array.from(newContent.substring(0, 100)).map(c => c.charCodeAt(0).toString(16)).join(' '),
          });
          toast.error('Database error - please check console for details');
        } else {
          toast.error(`Failed to save note: ${errorMessage}`);
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

  const handleContentChange = (newContent: string) => {
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

        <Tooltip content={showToolbar ? 'Hide Toolbar' : 'Show Toolbar'} placement="bottom-right">
          <button
            onClick={handleToolbarToggle}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <Palette size={14} />
          </button>
        </Tooltip>

        <Tooltip content={readingMode ? 'Edit Mode' : 'Reading Mode'} placement="bottom-right">
          <button
            onClick={() => setReadingMode(!readingMode)}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            {readingMode ? <Edit size={14} /> : <Book size={14} />}
          </button>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex justify-center px-4">
        <div className="h-full flex flex-col w-full" style={{ maxWidth: '800px' }}>
          {/* Toolbar - above title - Always render but control visibility with CSS */}
          {!readingMode && (
            <div
              className="px-8"
              style={{
                paddingTop: showToolbar ? '2rem' : '0',
                transition: 'padding-top 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div
                style={{
                  overflow: 'hidden',
                  animation: !showToolbar && toolbarClosing
                    ? 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                    : showToolbar ? 'slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                  maxHeight: (showToolbar || toolbarClosing) ? '200px' : '0',
                  opacity: showToolbar ? 1 : 0,
                }}
              >
                <div
                  className="overflow-hidden "
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <MarkdownToolbar onInsert={handleInsert} />
                </div>
              </div>
            </div>
          )}

          {/* Title input */}
          <div className="px-8 pt-8 pb-4 relative">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
              className="font-bold outline-none border-none w-full"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--fg-primary)',
                fontSize: '2rem',
                lineHeight: '1.2',
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

          {/* Editor - No shadow, no toolbar */}
          <div className="flex-1 px-8 pb-8 overflow-hidden">
            <div className="h-full rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <MarkdownEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                autoFocus={false}
                readOnly={readingMode}
                onEditorReady={(view) => { editorViewRef.current = view; }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            max-height: 200px;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 1;
            max-height: 200px;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            max-height: 0;
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default NoteEditor;
