import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Book, Edit, Palette, Link2 } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import Tooltip from '@/components/common/Tooltip';
import { noteService, documentService, noteLinkService, type Note } from '@/services';
import { smartCaptureService } from '@/services/smartCapture';
import { useToast } from '@/contexts/ToastContext';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { MarkdownToolbar } from '@/components/ui/MarkdownToolbar';
import { useEditorInsert } from '@/hooks/useEditorInsert';
import { useToolbarPreference } from '@/hooks';
import NoteAutocomplete from './NoteAutocomplete';
import SmartCaptureCard from '@/components/smartcapture/SmartCaptureCard';
import BacklinksSlidePanel from '@/components/links/BacklinksSlidePanel';
import type { ClipboardContent } from '@/types';
import './markdown.css';
import { log } from '../../lib/logger';

// Global tracker for auto-focused notes (shared across all NoteEditor instances)
const autoFocusedNotes = new Set<string>();

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
  const [readingMode, setReadingMode] = useState(false);
  const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);

  // Smart capture state
  const [latestClipboard, setLatestClipboard] = useState<ClipboardContent | null>(null);
  const [showSmartCapture, setShowSmartCapture] = useState(false);
  const [captureCardDismissing, setCaptureCardDismissing] = useState(false);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noteCreatedAtRef = useRef<string | null>(null);
  const prevLinksRef = useRef<string>('[]'); // Track previous links as JSON string
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9)); // Unique instance ID

  // Editor insert hook for toolbar
  const { editorViewRef, handleInsert } = useEditorInsert();

  // Toolbar preference (global, persisted in localStorage)
  const { showToolbar, toolbarClosing, toggleToolbar, hasUserToggled } = useToolbarPreference();

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
        noteCreatedAtRef.current = note.created_at;

        // Initialize prevLinks for tracking changes
        const initialLinks = noteLinkService.parseLinks(note.content);
        prevLinksRef.current = JSON.stringify(initialLinks.map(l => l.text).sort());

        // Clear warnings when loading note from DB
        // DB value is always valid (no special chars)
        setInvalidCharWarning(null);
        setTitleError(null);
        setErrorTitleRef(null);

        // Dispatch note-activated event for links panel
        const eventDetail = { noteId: note.id, title: note.title };
        log.debug('[NoteEditor] Dispatching note-activated event:', eventDetail);

        // Set global state immediately (for LinksPanel to check on mount)
        (window as any).__lastNoteActivated = eventDetail;
        (window as any).__lastDocumentActivated = null;

        window.dispatchEvent(new CustomEvent('note-activated', {
          detail: eventDetail
        }));
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

  // Auto-focus and select title after loading (only for newly created notes)
  useEffect(() => {
    // Skip if already auto-focused this specific note (check global Set)
    if (currentNoteId && autoFocusedNotes.has(currentNoteId)) {
      return;
    }

    if (!isLoading && title && title.startsWith('Untitled')) {
      // Auto-focus for:
      // 1. New unsaved notes (no noteId, no timestamp)
      // 2. Newly created notes (noteId exists, created < 5 seconds ago)
      // Skip for existing "Untitled" notes opened in split view (created > 5 seconds ago)

      const isNewNote = !currentNoteId || !noteCreatedAtRef.current ||
        (Date.now() - new Date(noteCreatedAtRef.current).getTime()) < 5000;

      if (isNewNote) {
        // Mark this note as auto-focused in global Set
        if (currentNoteId) {
          autoFocusedNotes.add(currentNoteId);
        }

        setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
          }
        }, 100);
      }
    }
  }, [isLoading, title, currentNoteId]);

  // Listen for updates from other NoteEditor instances (split view sync)
  useEffect(() => {
    const handleNoteUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ noteId: string; title: string; content: string; instanceId?: string }>;
      const { noteId: updatedNoteId, title: newTitle, content: newContent, instanceId } = customEvent.detail;

      // Ignore if this event came from this same instance
      if (instanceId === instanceIdRef.current) {
        return;
      }

      // Only update if this is the same note but different instance
      if (currentNoteId && updatedNoteId === currentNoteId) {
        // Update state without triggering auto-save (already saved by other instance)
        setTitle(newTitle);
        setContent(newContent);
        setLastSavedTitle(newTitle);
      }
    };

    window.addEventListener('note-updated', handleNoteUpdate);
    return () => window.removeEventListener('note-updated', handleNoteUpdate);
  }, [currentNoteId]);

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

    // Debounce 300ms for both title and content
    const debounceTime = 300;
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentNoteId) {
          // Update existing note
          await noteService.update(currentNoteId, newTitle, newContent);
          log.debug('[NoteEditor] ✅ Note saved:', { noteId: currentNoteId, title: newTitle });

          // Sync links after save
          try {
            const parsedLinks = noteLinkService.parseLinks(newContent);
            const currentLinksJson = JSON.stringify(parsedLinks.map(l => l.text).sort());
            const hasLinksChanged = currentLinksJson !== prevLinksRef.current;

            await noteLinkService.syncLinks(currentNoteId, parsedLinks);

            // Dispatch links-updated event if links changed
            if (hasLinksChanged) {
              prevLinksRef.current = currentLinksJson;
              window.dispatchEvent(new CustomEvent('links-updated', {
                detail: { noteId: currentNoteId }
              }));
            }
          } catch (err) {
            console.error('[NoteEditor] Failed to sync links:', err);
          }

          // Dispatch note-saved event for snapshot tracking
          window.dispatchEvent(new CustomEvent('note-saved', {
            detail: { noteId: currentNoteId, title: newTitle }
          }));

          // Dispatch note-updated event for syncing other instances
          window.dispatchEvent(new CustomEvent('note-updated', {
            detail: { noteId: currentNoteId, title: newTitle, content: newContent, instanceId: instanceIdRef.current }
          }));

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
            null, // folder_id - will be added in future
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

  // Smart capture: dismiss card
  const dismissSmartCapture = useCallback(() => {
    setCaptureCardDismissing(true);
    setTimeout(() => {
      setShowSmartCapture(false);
      setCaptureCardDismissing(false);
      setLatestClipboard(null);
    }, 400);
  }, []);

  // Smart capture: insert content
  const handleInsertClipboard = useCallback(() => {
    if (!latestClipboard) return;

    let formattedContent = latestClipboard.content;
    if (latestClipboard.content_type === 'Code') {
      formattedContent = `\`\`\`\n${formattedContent}\n\`\`\``;
    } else if (latestClipboard.content_type === 'Url') {
      formattedContent = `[${formattedContent}](${formattedContent})`;
    }

    if (latestClipboard.context) {
      const { app_name, window_title } = latestClipboard.context;
      const tags = smartCaptureService.generateTags(latestClipboard.context);
      const contextLine = `\n> Captured from **${app_name}** - ${window_title}${tags.length > 0 ? ' ' + tags.join(' ') : ''}\n\n`;
      formattedContent = contextLine + formattedContent;
    }

    setContent(content.trim() ? content + '\n' + formattedContent : formattedContent);
    setReadingMode(false); // Switch to edit mode
    dismissSmartCapture();
  }, [latestClipboard, content, dismissSmartCapture]);



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Cancel dismiss timer (for expand)
  const cancelDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = undefined;
    }
  }, []);

  // Restart dismiss timer (for collapse)
  const restartDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => dismissSmartCapture(), 10000);
  }, [dismissSmartCapture]);

  // Listen for clipboard changes
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<ClipboardContent>('clipboard-changed', (event) => {
        if (event.payload.context?.app_name.toLowerCase().includes('neutrino')) return;

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

        setLatestClipboard(event.payload);
        setShowSmartCapture(true);
        setCaptureCardDismissing(false);

        dismissTimerRef.current = setTimeout(() => dismissSmartCapture(), 10000);
      });
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [dismissSmartCapture]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ position: 'relative' }}>
      {/* Header */}
      <div
        className="flex items-center justify-end gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>Auto-saved</span>

        <Tooltip content={showToolbar ? 'Hide Toolbar' : 'Show Toolbar'} placement="bottom-right">
          <button
            onClick={toggleToolbar}
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

        <Tooltip content="Backlinks" placement="bottom-right">
          <button
            onClick={() => setIsBacklinksPanelOpen(!isBacklinksPanelOpen)}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{ color: isBacklinksPanelOpen ? 'var(--accent)' : 'var(--fg-secondary)' }}
          >
            <Link2 size={14} />
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
                  animation: hasUserToggled
                    ? (!showToolbar && toolbarClosing
                      ? 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                      : showToolbar ? 'slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none')
                    : 'none',
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
            <div
              className="h-full rounded-lg overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              onFocus={() => {
                if (showSmartCapture) dismissSmartCapture();
              }}
            >
              <MarkdownEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                autoFocus={false}
                readOnly={readingMode}
                onEditorReady={(view) => { editorViewRef.current = view; }}
                sessionId={sessionId}
                noteId={currentNoteId}
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

      {/* Smart Capture Card */}
      {showSmartCapture && latestClipboard && (
        <SmartCaptureCard
          clipboardData={latestClipboard}
          onInsert={handleInsertClipboard}
          onDismiss={dismissSmartCapture}
          isDismissing={captureCardDismissing}
          onExpand={cancelDismissTimer}
          onCollapse={restartDismissTimer}
        />
      )}

      {/* Backlinks Slide Panel */}
      <BacklinksSlidePanel
        isOpen={isBacklinksPanelOpen}
        onClose={() => setIsBacklinksPanelOpen(false)}
        onNoteSelect={(noteId, title) => {
          window.dispatchEvent(new CustomEvent('open-note-split-view', {
            detail: { noteId, title }
          }));
        }}
        onDocumentSelect={(documentId, title) => {
          window.dispatchEvent(new CustomEvent('open-document-split-view', {
            detail: { documentId, title }
          }));
        }}
      />
    </div>
  );
};

export default NoteEditor;
