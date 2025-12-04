import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sessionService } from '@/services/sessions';
import { noteService } from '@/services/notes';
import { draftStorage, type Draft } from '@/services/draftStorage';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { MarkdownToolbar } from '@/components/ui/MarkdownToolbar';
import { FloatingNoteTitleBar } from './FloatingNoteTitleBar';
import { FloatingNoteBottomBar } from './FloatingNoteBottomBar';
import { RecentDraftsDropdown } from './RecentDraftsDropdown';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { useEditorInsert } from '@/hooks/useEditorInsert';
import { listen } from '@tauri-apps/api/event';
import { smartCaptureService, type WindowContext } from '@/services/smartCapture';

export const FloatingNote: React.FC = () => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showRecentMenu, setShowRecentMenu] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [detectedContext, setDetectedContext] = useState<WindowContext | null>(null);
  const recentMenuRef = useRef<HTMLDivElement>(null);
  const recentButtonRef = useRef<HTMLButtonElement>(null);

  // Custom hooks
  const { editorViewRef, handleInsert } = useEditorInsert();
  useAutoSaveDraft(content, currentNoteId, currentDraftId);

  // Listen for context detection when floating note opens
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupContextListener = async () => {
      unlisten = await listen<WindowContext>('floating-note-context', (event) => {
        const context = event.payload;
        setDetectedContext(context);

        // Generate tags
        const tags = smartCaptureService.generateTags(context);

        console.log('[FloatingNote] Context detected:', {
          app: context.app_name,
          window: context.window_title,
          tags,
        });
      });
    };

    setupContextListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);


  const generateTitle = (text: string): string => {
    if (!text.trim()) {
      const now = new Date();
      return `Quick Note - ${now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Use first line or first 50 characters
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 50
      ? firstLine.substring(0, 50) + '...'
      : firstLine;
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Get or create Quick Notes session
      const quickNotesSession = await sessionService.getOrCreateQuickNotesSession();

      // Generate title from content
      const title = generateTitle(content);

      // Create note in Quick Notes session
      await noteService.create(
        quickNotesSession.id,
        null,
        title,
        content,
        'quick-capture'
      );

      // Clear draft after successful save
      draftStorage.clearDraft();

      // Remove from saved drafts if it was a saved draft
      if (currentDraftId) {
        draftStorage.removeDraft(currentDraftId);
      } else {
        // Remove by content if it matches any saved draft
        draftStorage.removeDraftByContent(content);
      }

      // Reload drafts
      loadSavedDrafts();

      // Show success and clear
      setSaveSuccess(true);
      setContent('');
      setCurrentNoteId(null);
      setCurrentDraftId(null);

      // Hide success indicator after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved drafts from localStorage
  const loadSavedDrafts = useCallback(() => {
    const drafts = draftStorage.getDrafts();
    setSavedDrafts(drafts);
  }, []);

  // Load a draft into the editor
  const loadDraft = useCallback((draft: Draft) => {
    // Save current content as draft before switching if has unsaved changes
    const hasUnsaved = !currentNoteId && !currentDraftId && content.trim().length > 0;
    if (hasUnsaved) {
      const title = generateTitle(content);
      draftStorage.addDraft(content, title);
      loadSavedDrafts();
    }

    setContent(draft.content);
    setCurrentNoteId(null);
    setCurrentDraftId(draft.id);
    draftStorage.clearDraft(); // Clear current draft
    setShowRecentMenu(false); // Close menu after loading
  }, [content, currentNoteId, currentDraftId, loadSavedDrafts]);

  // Start new note (clear editor)
  const startNewNote = useCallback(() => {
    // Save current content as draft if not empty and not already a saved note/draft
    if (content.trim() && !currentNoteId && !currentDraftId) {
      const title = generateTitle(content);
      draftStorage.addDraft(content, title);
      loadSavedDrafts();
    }

    setContent('');
    setCurrentNoteId(null);
    setCurrentDraftId(null);
    draftStorage.clearDraft();
    setShowRecentMenu(false); // Close menu
  }, [content, currentNoteId, currentDraftId, loadSavedDrafts]);

  // Load draft and saved drafts on mount
  useEffect(() => {
    const draft = draftStorage.getDraft();
    if (draft && draft.content.trim()) {
      setContent(draft.content);
      setCurrentNoteId(null); // Draft has no ID
      setCurrentDraftId(null);
    }
    loadSavedDrafts();

    // Listen for new note event from title bar
    const handleNewNote = () => {
      startNewNote();
    };
    window.addEventListener('floating-note-new', handleNewNote);

    return () => {
      window.removeEventListener('floating-note-new', handleNewNote);
    };
  }, [loadSavedDrafts, startNewNote]);

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Custom Title Bar */}
      <FloatingNoteTitleBar
        showRecentMenu={showRecentMenu}
        setShowRecentMenu={setShowRecentMenu}
        recentButtonRef={recentButtonRef}
      >
        <RecentDraftsDropdown
          showRecentMenu={showRecentMenu}
          recentMenuRef={recentMenuRef}
          recentButtonRef={recentButtonRef}
          content={content}
          currentDraftId={currentDraftId}
          currentNoteId={currentNoteId}
          savedDrafts={savedDrafts}
          generateTitle={generateTitle}
          loadDraft={loadDraft}
          loadSavedDrafts={loadSavedDrafts}
          setContent={setContent}
          setCurrentDraftId={setCurrentDraftId}
          setShowRecentMenu={setShowRecentMenu}
        />
      </FloatingNoteTitleBar>

      {/* Main Content - Editor Only */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        <div
          className="flex-1 flex flex-col rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Toolbar */}
          <MarkdownToolbar onInsert={handleInsert} />

          {/* Editor */}
          <MarkdownEditor
            content={content}
            onChange={setContent}
            placeholder="Capture your thoughts..."
            autoFocus={true}
            onEditorReady={(view) => { editorViewRef.current = view; }}
          />

          {/* Bottom Bar with Actions */}
          <FloatingNoteBottomBar
            content={content}
            saveSuccess={saveSuccess}
            isSaving={isSaving}
            onClear={startNewNote}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default FloatingNote;
