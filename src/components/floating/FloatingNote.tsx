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

interface ClipboardContent {
  content: string;
  content_type: 'Text' | 'Code' | 'Url' | 'FilePath' | 'Unknown';
  timestamp: number;
  context?: WindowContext;
}

export const FloatingNote: React.FC = () => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showRecentMenu, setShowRecentMenu] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [detectedContext, setDetectedContext] = useState<WindowContext | null>(null);
  const [latestClipboard, setLatestClipboard] = useState<ClipboardContent | null>(null);
  const [showClipboardBanner, setShowClipboardBanner] = useState(false);
  const [bannerDismissing, setBannerDismissing] = useState(false);
  const recentMenuRef = useRef<HTMLDivElement>(null);
  const recentButtonRef = useRef<HTMLButtonElement>(null);
  const startNewNoteRef = useRef<(() => void) | null>(null);

  // Custom hooks
  const { editorViewRef, handleInsert } = useEditorInsert();
  useAutoSaveDraft(content, currentNoteId, currentDraftId);

  // Dismiss banner with animation
  const dismissBanner = useCallback(() => {
    setBannerDismissing(true);
    setTimeout(() => {
      setShowClipboardBanner(false);
      setBannerDismissing(false);
    }, 300); // Match animation duration
  }, []);

  // Listen for context detection when floating note opens
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupContextListener = async () => {
      unlisten = await listen<WindowContext>('floating-note-context', (event) => {
        setDetectedContext(event.payload);
      });
    };

    setupContextListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Listen for clipboard changes (smart capture)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    const setupClipboardListener = async () => {
      unlisten = await listen<ClipboardContent>('clipboard-changed', (event) => {
        const clipboardData = event.payload;

        // Ignore clipboard events from Neutrino itself (avoid capturing internal editor operations)
        if (clipboardData.context?.app_name.toLowerCase().includes('neutrino')) {
          return;
        }

        // Clear previous timer if exists (reset countdown on new clipboard)
        if (dismissTimer) {
          clearTimeout(dismissTimer);
        }

        setLatestClipboard(clipboardData);
        setShowClipboardBanner(true);
        setBannerDismissing(false);

        // Auto-hide banner after 5 seconds
        dismissTimer = setTimeout(() => dismissBanner(), 5000);
      });
    };

    setupClipboardListener();

    return () => {
      if (unlisten) unlisten();
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [dismissBanner]);

  // Insert clipboard content into editor
  const handleInsertClipboard = useCallback(() => {
    if (!latestClipboard) return;

    const clipboardText = latestClipboard.content;
    const contentType = latestClipboard.content_type;

    // Format based on content type
    let formattedContent = clipboardText;
    if (contentType === 'Code') {
      formattedContent = `\`\`\`\n${clipboardText}\n\`\`\``;
    } else if (contentType === 'Url') {
      formattedContent = `[${clipboardText}](${clipboardText})`;
    }

    // Add context as metadata if available
    if (latestClipboard.context) {
      const { app_name, window_title } = latestClipboard.context;
      const tags = smartCaptureService.generateTags(latestClipboard.context);
      const contextLine = `\n> Captured from **${app_name}** - ${window_title}${tags.length > 0 ? ' ' + tags.join(' ') : ''}\n\n`;
      formattedContent = contextLine + formattedContent;
    }

    // Insert at cursor or append
    if (content.trim()) {
      setContent(content + '\n' + formattedContent);
    } else {
      setContent(formattedContent);
    }

    dismissBanner();
  }, [latestClipboard, content, dismissBanner]);

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
      const drafts = draftStorage.getDrafts();
      setSavedDrafts(drafts);

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
    setContent(draft.content);
    setCurrentNoteId(null);
    setCurrentDraftId(draft.id);
    draftStorage.clearDraft();
    setShowRecentMenu(false);
  }, []);

  // Start new note (clear editor)
  const startNewNote = useCallback(() => {
    // Save current content as draft if not empty and not already a saved note/draft
    if (content.trim() && !currentNoteId && !currentDraftId) {
      const title = generateTitle(content);
      draftStorage.addDraft(content, title);
      const drafts = draftStorage.getDrafts();
      setSavedDrafts(drafts);
    }

    setContent('');
    setCurrentNoteId(null);
    setCurrentDraftId(null);
    draftStorage.clearDraft();
    setShowRecentMenu(false);
  }, [content, currentNoteId, currentDraftId]);

  // Update ref whenever startNewNote changes
  useEffect(() => {
    startNewNoteRef.current = startNewNote;
  }, [startNewNote]);

  // Load draft and saved drafts on mount
  useEffect(() => {
    const draft = draftStorage.getDraft();
    if (draft && draft.content.trim()) {
      setContent(draft.content);
      setCurrentNoteId(null);
      setCurrentDraftId(null);
    }

    // Load saved drafts
    const drafts = draftStorage.getDrafts();
    setSavedDrafts(drafts);

    // Listen for new note event from title bar (use ref to avoid stale closure)
    const handleNewNote = () => {
      if (startNewNoteRef.current) {
        startNewNoteRef.current();
      }
    };
    window.addEventListener('floating-note-new', handleNewNote);

    return () => {
      window.removeEventListener('floating-note-new', handleNewNote);
    };
  }, []);

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
          currentDraftId={currentDraftId}
          savedDrafts={savedDrafts}
          loadDraft={loadDraft}
          loadSavedDrafts={loadSavedDrafts}
          setShowRecentMenu={setShowRecentMenu}
        />
      </FloatingNoteTitleBar>

      {/* Main Content - Editor Only */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        <div
          className="relative flex-1 flex flex-col rounded-lg overflow-hidden"
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

          {/* Smart Capture Banner - Overlay above footer with gradient blur */}
          {showClipboardBanner && latestClipboard && (
            <div
              className="absolute left-0 right-0 border-t z-10"
              style={{
                bottom: '47px', // Position above footer
                background: 'linear-gradient(to top, rgba(32, 32, 32, 0.3) 0%, rgba(32, 32, 32, 0.5) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px) saturate(150%)',
                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.08)',
                animation: bannerDismissing
                  ? 'slideDown 0.3s cubic-bezier(0.4, 0, 1, 1) forwards'
                  : 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >

              {/* Progress Bar Container */}
              <div
                className="absolute top-0 left-0 right-0 overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  height: '2px',
                }}
              >
                <div
                  key={latestClipboard?.timestamp}
                  className="h-full"
                  style={{
                    backgroundColor: 'var(--accent)',
                    animation: 'shrinkProgress 5s linear forwards',
                    width: '100%',
                    boxShadow: '0 0 12px var(--accent)',
                  }}
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 relative">
                <span className="shrink-0" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', fontSize: '16px' }}>
                  {latestClipboard.content_type === 'Code' && '💻'}
                  {latestClipboard.content_type === 'Url' && '🔗'}
                  {latestClipboard.content_type === 'Text' && '📝'}
                  {latestClipboard.content_type === 'FilePath' && '📁'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 400 }}>
                    {latestClipboard.context ? (
                      <>Copied from <strong style={{ color: 'var(--accent)' }}>{latestClipboard.context.app_name}</strong></>
                    ) : (
                      'New clipboard content'
                    )}
                  </div>
                  <div className="truncate" style={{ color: 'var(--text-secondary)', opacity: 0.8, fontSize: '11px', fontWeight: 400 }}>
                    {latestClipboard.content.substring(0, 50)}
                    {latestClipboard.content.length > 50 && '...'}
                  </div>
                </div>
                <button
                  onClick={handleInsertClipboard}
                  className="px-3 py-1.5 font-semibold rounded transition-all hover:scale-105 hover:brightness-110 shrink-0"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                    fontSize: '11.5px',
                  }}
                >
                  Insert
                </button>
                <button
                  onClick={dismissBanner}
                  className="p-1 text-sm rounded transition-all hover:bg-white/10 hrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>

              <style>{`
                @keyframes slideUp {
                  from {
                    transform: translateY(100%);
                    opacity: 0;
                  }
                  to {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
                @keyframes slideDown {
                  from {
                    transform: translateY(0);
                    opacity: 1;
                  }
                  to {
                    transform: translateY(100%);
                    opacity: 0;
                  }
                }
                @keyframes shrinkProgress {
                  from {
                    width: 100%;
                  }
                  to {
                    width: 0%;
                  }
                }
              `}</style>
            </div>
          )}

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
