import React, { useRef, useState, useEffect, useCallback } from 'react';
import ContentPanel from '@/components/layout/ContentPanel';
import SplitView from '@/components/layout/SplitView';
import type { Tab } from '@/components/layout/TabBar';
import { WELCOME_TAB, createNewChatTab, createDocumentTab, createNoteTab } from '@/constants/tabs';
import { useSessionsContext } from '@/hooks';
import { noteService, sessionService, documentService, contextService, highlightService, readingBehaviorTracker, autoContextCapture } from '@/services';
import { tabStateService, type WorkspaceState, type TabState } from '@/services/tabState';
import { tabPositionTracker } from '@/services/tabPositionTracker';
import { useTabStatePersistence } from '@/hooks/useTabStatePersistence';
import { useToast } from '@/contexts/ToastContext';
import WelcomeBackBanner from '@/components/welcome/WelcomeBackBanner';
import type { ContextSnapshot } from '@/types';

interface WorkspacePageProps {
  isVaultOpen: boolean;
  splitViewOpen: boolean;
  onSplitViewChange: (isOpen: boolean) => void;
}

const WorkspacePage: React.FC<WorkspacePageProps> = ({
  isVaultOpen,
  splitViewOpen,
  onSplitViewChange,
}) => {
  const { refetch, selectSession, currentSession } = useSessionsContext();
  const toast = useToast();

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Welcome back banner
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const hasNewActivitySinceLoad = useRef(false);

  // Activity tracking for auto-capture (Tier 2)
  const activityCountRef = useRef({ highlights: 0, notes: 0 });

  // Build workspace state with fresh positions
  const getWorkspaceState = React.useCallback((): WorkspaceState => {
    return {
      tabs: tabs
        .filter(tab => tab.type !== undefined)
        .map(tab => {
          const position = tabPositionTracker.getPosition(tab.id);
          return {
            id: tab.id,
            type: tab.type!,
            title: tab.title,
            documentId: tab.documentId,
            noteId: tab.noteId,
            // Include position data if available (PDF only)
            currentPage: position?.currentPage,
            scrollPosition: position?.scrollPosition,
          };
        }),
      activeTabId,
      sessionId: currentSession?.id,
    };
  }, [tabs, activeTabId, currentSession]);

  const { saveNow } = useTabStatePersistence(getWorkspaceState);

  // Auto-save workspace state when active tab changes or tabs array changes
  useEffect(() => {
    // Debounce to avoid too many saves
    const timer = setTimeout(() => {
      saveNow();
    }, 500); // Save 500ms after change

    return () => clearTimeout(timer);
  }, [activeTabId, tabs.length, saveNow]);


  // Listen for activity events and update only the relevant part of snapshot
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let pendingSave: (() => Promise<void>) | null = null;

    const updateSnapshotIncremental = async (eventType: string, detail?: any) => {
      console.log('[ContextSnapshot] Event triggered:', eventType, detail);
      if (!currentSession) {
        console.log('[ContextSnapshot] No current session, skipping');
        return;
      }

      // Debounce to avoid too many writes
      clearTimeout(timer);

      const doSave = async () => {
        try {
          let existingSnapshot = await contextService.getSnapshot(currentSession.id);
          let shouldReset = false;

          if (!hasNewActivitySinceLoad.current && existingSnapshot) {
            // First activity after load → reset old snapshot
            if (existingSnapshot.last_document || existingSnapshot.last_highlight || existingSnapshot.last_note) {
              shouldReset = true;
            }
          }

          let snapshot;
          if (shouldReset || !existingSnapshot) {
            // Reset: create fresh snapshot but PRESERVE AI insights if they exist
            console.log('[ContextSnapshot] Resetting snapshot, preserving AI insights');
            console.log('[ContextSnapshot] Existing snapshot has AI insights?', !!existingSnapshot?.ai_insights);
            console.log('[ContextSnapshot] Existing AI insights:', existingSnapshot?.ai_insights);

            snapshot = contextService.buildSnapshot({
              activeSessionId: currentSession.id,
              sessionGoal: currentSession.goal,
            });

            // Preserve AI insights from old snapshot (they don't change with activity)
            if (existingSnapshot?.ai_insights) {
              snapshot.ai_insights = existingSnapshot.ai_insights;
              console.log('[ContextSnapshot] AI insights preserved!');
            } else {
              console.log('[ContextSnapshot] No AI insights to preserve');
            }
          } else {
            // Preserve existing snapshot, will update/add activity below
            console.log('[ContextSnapshot] Preserving full existing snapshot');
            snapshot = existingSnapshot;
          }

          // Mark that we now have new activity
          hasNewActivitySinceLoad.current = true;

          // Add the new activity data
          if (eventType === 'note-saved') {
            const { noteId, title } = detail;
            const note = await noteService.getById(noteId);
            if (note) {
              snapshot.last_note = {
                id: note.id,
                title: note.title,
                content_preview: note.content.substring(0, 100),
                created_at: note.created_at,
              };
            }
          } else if (eventType === 'highlight-created') {
            const { highlightId, pageNumber, content } = detail;
            snapshot.last_highlight = {
              id: highlightId,
              content: content || '',
              note: '',
              page_number: pageNumber,
              created_at: new Date().toISOString(),
            };
          } else if (eventType === 'pdf:page-change') {
            const { documentId, pageNumber, documentTitle } = detail;
            snapshot.last_document = {
              document_id: documentId,
              document_title: documentTitle,
              page_number: pageNumber,
              scroll_position: 0,
            };
          }

          // Save updated snapshot (but DON'T update banner - it should only show on load/refresh)
          await contextService.saveSnapshot(currentSession.id, snapshot);
        } catch (error) {
          console.error('[ContextSnapshot] Failed to update incrementally:', error);
        } finally {
          pendingSave = null;
        }
      };

      pendingSave = doSave;
      timer = setTimeout(doSave, 2000); // Wait 2s after last activity
    };

    const handleNoteSaved = (event: Event) => {
      readingBehaviorTracker.recordNote();
      updateSnapshotIncremental('note-saved', (event as CustomEvent).detail);

      // Track activity for auto-capture (Tier 2)
      activityCountRef.current.notes += 1;
      autoContextCapture.captureOnActivity(
        currentSession.id,
        currentSession.goal,
        activityCountRef.current.highlights,
        activityCountRef.current.notes
      ).then(captured => {
        if (captured) {
          // Reset counters after successful capture
          activityCountRef.current = { highlights: 0, notes: 0 };
        }
      });
    };

    const handleHighlightCreated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const hasNote = detail?.note && detail.note.length > 0;
      readingBehaviorTracker.recordHighlight(hasNote);
      updateSnapshotIncremental('highlight-created', detail);

      // Track activity for auto-capture (Tier 2)
      activityCountRef.current.highlights += 1;
      autoContextCapture.captureOnActivity(
        currentSession.id,
        currentSession.goal,
        activityCountRef.current.highlights,
        activityCountRef.current.notes
      ).then(captured => {
        if (captured) {
          // Reset counters after successful capture
          activityCountRef.current = { highlights: 0, notes: 0 };
        }
      });
    };

    const handlePageChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.pageNumber) {
        readingBehaviorTracker.changePage(detail.pageNumber);
      }
      updateSnapshotIncremental('pdf:page-change', detail);
    };

    window.addEventListener('note-saved', handleNoteSaved);
    window.addEventListener('highlight-created', handleHighlightCreated);
    window.addEventListener('pdf:page-change', handlePageChange);

    return () => {
      window.removeEventListener('note-saved', handleNoteSaved);
      window.removeEventListener('highlight-created', handleHighlightCreated);
      window.removeEventListener('pdf:page-change', handlePageChange);
      clearTimeout(timer);
    };
  }, [currentSession]);

  // Split view state
  const [secondaryTab, setSecondaryTab] = useState<Tab | null>(null);

  // Split view management
  const openInSplitView = useCallback((tab: Tab) => {
    setSecondaryTab(tab);
    onSplitViewChange(true);
  }, [onSplitViewChange]);

  const closeSplitView = useCallback(() => {
    onSplitViewChange(false);
    setSecondaryTab(null);
  }, [onSplitViewChange]);

  // Listen for note title changes
  useEffect(() => {
    const handleNoteTitleChange = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      setTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.noteId === noteId
            ? { ...tab, title: title.length > 30 ? `${title.substring(0, 30)}...` : title }
            : tab
        )
      );
    };

    window.addEventListener('note-title-changed', handleNoteTitleChange as EventListener);
    return () => window.removeEventListener('note-title-changed', handleNoteTitleChange as EventListener);
  }, []);

  // Listen for note deletion
  useEffect(() => {
    const handleNoteDeleted = (e: CustomEvent) => {
      const { noteId } = e.detail;

      setTabs(prevTabs => {
        const tabToClose = prevTabs.find(tab => tab.noteId === noteId);
        if (!tabToClose || prevTabs.length === 1) return prevTabs;

        const newTabs = prevTabs.filter(tab => tab.id !== tabToClose.id);
        setActiveTabId(prevActiveId =>
          prevActiveId === tabToClose.id ? newTabs[0].id : prevActiveId
        );
        return newTabs;
      });
    };

    window.addEventListener('note-deleted', handleNoteDeleted as EventListener);
    return () => window.removeEventListener('note-deleted', handleNoteDeleted as EventListener);
  }, []);

  // Track active document changes for behavior tracking
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab?.type === 'document' && activeTab.documentId) {
      // Document tab active → start/resume tracking
      readingBehaviorTracker.setActiveDocument(activeTab.documentId);
    } else {
      // Non-document tab active (Note, Welcome, etc.) → pause document tracking
      readingBehaviorTracker.endDocument();
    }
  }, [activeTabId, tabs]);

  // Listen for split view requests
  useEffect(() => {
    const handleOpenNoteSplitView = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      openInSplitView(createNoteTab(noteId, title));
    };

    const handleOpenDocumentSplitView = (e: CustomEvent) => {
      const { documentId, title } = e.detail;
      openInSplitView(createDocumentTab(documentId, title));
    };

    window.addEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
    window.addEventListener('open-document-split-view', handleOpenDocumentSplitView as EventListener);

    return () => {
      window.removeEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
      window.removeEventListener('open-document-split-view', handleOpenDocumentSplitView as EventListener);
    };
  }, [openInSplitView]);

  const addNewTab = () => {
    const newTab = createNewChatTab();
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    // Clear position tracking for closed tab
    tabPositionTracker.clearPosition(tabId);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const openDocumentTab = useCallback((documentId: string, title: string) => {
    const tabId = `doc-${documentId}`;

    setTabs(prevTabs => {
      const existingTab = prevTabs.find(tab => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab = createDocumentTab(documentId, title);
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);

  const openNoteTab = useCallback((noteId: string, title?: string) => {
    const tabId = `note-${noteId}`;

    setTabs(prevTabs => {
      const existingTab = prevTabs.find(tab => tab.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab = createNoteTab(noteId, title || 'Untitled');
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);

  const createNewNote = useCallback(async () => {
    try {
      let targetSession = currentSession;

      if (!targetSession) {
        targetSession = await sessionService.getOrCreateQuickNotesSession();
        await refetch();
        selectSession(targetSession);
      }

      const allNotes = await noteService.getAll();
      const sessionNotes = allNotes.filter(n => n.session_id === targetSession.id);
      const untitledPattern = /^Untitled( \d+)?$/;
      const untitledNotes = sessionNotes.filter(n => untitledPattern.test(n.title));

      let newTitle = 'Untitled';
      if (untitledNotes.length > 0) {
        const numbers = untitledNotes
          .map(n => {
            const match = n.title.match(/^Untitled(?: (\d+))?$/);
            return match ? (match[1] ? parseInt(match[1]) : 0) : -1;
          })
          .filter(n => n >= 0);

        const maxNum = Math.max(...numbers);
        newTitle = `Untitled ${maxNum + 1}`;
      }

      const newNote = await noteService.create(
        targetSession.id,
        null,
        newTitle,
        '',
        'concept'
      );

      const newTab = createNoteTab(newNote.id, newTitle);
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(newTab.id);

      window.dispatchEvent(new CustomEvent('note-created', {
        detail: { noteId: newNote.id }
      }));
    } catch (err) {
      console.error('Failed to create new note:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('UNIQUE constraint failed') || errorMessage.includes('duplicate')) {
        toast.error('A note with this title already exists in this session');
      } else {
        toast.error(`Failed to create note: ${errorMessage}`);
      }
    }
  }, [currentSession, refetch, selectSession, toast]);

  // Expose handlers via window events
  useEffect(() => {
    const handleOpenDocument = (e: CustomEvent) => {
      const { documentId, title } = e.detail;
      openDocumentTab(documentId, title);
    };

    const handleOpenNote = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      openNoteTab(noteId, title);
    };

    const handleCreateNote = () => {
      createNewNote();
    };

    window.addEventListener('workspace:open-document', handleOpenDocument as EventListener);
    window.addEventListener('workspace:open-note', handleOpenNote as EventListener);
    window.addEventListener('workspace:create-note', handleCreateNote);

    return () => {
      window.removeEventListener('workspace:open-document', handleOpenDocument as EventListener);
      window.removeEventListener('workspace:open-note', handleOpenNote as EventListener);
      window.removeEventListener('workspace:create-note', handleCreateNote);
    };
  }, [openDocumentTab, openNoteTab, createNewNote]);

  // Restore tabs from localStorage on mount
  useEffect(() => {
    const restoreTabs = async () => {
      const saved = tabStateService.loadState();
      if (!saved || saved.tabs.length === 0) {
        console.log('[TabRestore] No saved state, starting fresh');
        return;
      }

      console.log('[TabRestore] Restoring workspace state:', saved);

      try {
        const restoredTabs: Tab[] = [];

        // Restore each tab with position data
        for (const tabState of saved.tabs) {
          if (tabState.type === 'document' && tabState.documentId) {
            try {
              const doc = await documentService.getById(tabState.documentId);
              const tab = createDocumentTab(tabState.documentId, doc.title);
              // Restore position data
              tab.page = tabState.currentPage;
              tab.scrollPosition = tabState.scrollPosition;
              console.log('[TabRestore] Document:', doc.title, 'page:', tab.page);

              // Populate tracker immediately so it persists across refreshes
              if (tabState.currentPage) {
                tabPositionTracker.updatePosition(tab.id, {
                  currentPage: tabState.currentPage,
                  scrollPosition: tabState.scrollPosition,
                });
              }

              restoredTabs.push(tab);
            } catch (error) {
              console.error('[TabRestore] Failed to restore document:', tabState.documentId, error);
            }
          } else if (tabState.type === 'note' && tabState.noteId) {
            const tab = createNoteTab(tabState.noteId, tabState.title);
            restoredTabs.push(tab);
          } else if (tabState.type === 'welcome') {
            restoredTabs.push(WELCOME_TAB);
          }
        }

        if (restoredTabs.length > 0) {
          setTabs(restoredTabs);
          const activeTab = restoredTabs.find(t => t.id === saved.activeTabId);
          setActiveTabId(activeTab ? saved.activeTabId : restoredTabs[0].id);
          console.log('[TabRestore] Restored', restoredTabs.length, 'tabs');
        }
      } catch (error) {
        console.error('[TabRestore] Failed to restore tabs:', error);
      }
    };

    restoreTabs();
  }, []);

  // Expose manual save for debugging
  useEffect(() => {
    (window as any).__debugSaveTabState = saveNow;
  }, [saveNow]);

  // Auto-capture context on app close (Tier 1 - Primary)
  useEffect(() => {
    if (!currentSession) return;

    // Cleanup function runs when component unmounts (app closes)
    return () => {
      console.log('[AutoCapture] App closing, triggering auto-capture...');
      // Use void to ignore promise - this is fire-and-forget on unmount
      void autoContextCapture.captureOnClose(currentSession.id, currentSession.goal);
    };
  }, [currentSession]);

  // Load snapshot on mount to show banner with previous activities
  useEffect(() => {
    const loadSnapshot = async () => {
      if (!currentSession) return;

      // Clear dismissed flag to allow banner to show on fresh app start
      sessionStorage.removeItem('welcomeBannerDismissed');

      const dismissed = sessionStorage.getItem('welcomeBannerDismissed');
      if (dismissed === 'true') return;

      try {
        const snapshot = await contextService.getSnapshot(currentSession.id);

        // Reset flag - this is old snapshot from previous session
        hasNewActivitySinceLoad.current = false;

        // Show banner if there's any meaningful context (document, note, or highlight)
        if (snapshot && (snapshot.last_document || snapshot.last_note || snapshot.last_highlight)) {
          console.log('[WelcomeBanner] ========================================');
          console.log('[WelcomeBanner] 📋 Loaded context snapshot from previous session');
          console.log('[WelcomeBanner] Snapshot:', snapshot);

          if (snapshot.ai_insights) {
            console.log('[WelcomeBanner] 🤖 AI Insights generated at:', snapshot.ai_insights.generated_at);
            console.log('[WelcomeBanner] 📝 Summary:', snapshot.ai_insights.summary);
            console.log('[WelcomeBanner] ⚠️  Struggle areas:', snapshot.ai_insights.struggle_areas);
            console.log('[WelcomeBanner] 💡 Suggestions:', snapshot.ai_insights.suggestions);
            console.log('[WelcomeBanner] 🧠 Learning pattern:', snapshot.ai_insights.learning_pattern);
          } else {
            console.log('[WelcomeBanner] ℹ️  No AI insights in snapshot');
          }
          console.log('[WelcomeBanner] ========================================');

          setContextSnapshot(snapshot);
          setShowWelcomeBanner(true);
        }
      } catch (error) {
        console.error('[WelcomeBanner] Failed to load snapshot:', error);
      }
    };

    loadSnapshot();
  }, [currentSession]);

  // Handle continue document - open at last reading position
  const handleContinueDocument = useCallback(async () => {
    if (!contextSnapshot?.last_document) return;

    try {
      const { document_id, document_title, page_number } = contextSnapshot.last_document;
      openDocumentTab(document_id, document_title);

      // Set the page to last reading position
      setTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.id === `doc-${document_id}`
            ? { ...tab, page: page_number }
            : tab
        )
      );
    } catch (error) {
      console.error('[Continue Document] Failed:', error);
    }

    setShowWelcomeBanner(false);
    sessionStorage.setItem('welcomeBannerDismissed', 'true');
  }, [contextSnapshot, openDocumentTab]);

  // Handle continue highlight - open document at highlight page
  const handleContinueHighlight = useCallback(async () => {
    if (!contextSnapshot?.last_highlight) return;

    try {
      const { id: highlightId, page_number } = contextSnapshot.last_highlight;

      // Fetch highlight to get document_id
      const allHighlights = await highlightService.getAll();
      const highlight = allHighlights.find(h => h.id === highlightId);

      if (highlight) {
        const doc = await documentService.getById(highlight.document_id);
        if (doc) {
          openDocumentTab(doc.id, doc.title);
          // Open at highlight page (may be different from last reading page!)
          setTabs(prevTabs =>
            prevTabs.map(tab =>
              tab.id === `doc-${doc.id}`
                ? { ...tab, page: page_number }
                : tab
            )
          );
        }
      }
    } catch (error) {
      console.error('[Continue Highlight] Failed:', error);
    }

    setShowWelcomeBanner(false);
    sessionStorage.setItem('welcomeBannerDismissed', 'true');
  }, [contextSnapshot, openDocumentTab]);

  // Handle continue note - open last note
  const handleContinueNote = useCallback(async () => {
    if (!contextSnapshot?.last_note) return;

    try {
      const { id, title } = contextSnapshot.last_note;
      openNoteTab(id, title);
    } catch (error) {
      console.error('[Continue Note] Failed:', error);
    }

    setShowWelcomeBanner(false);
    sessionStorage.setItem('welcomeBannerDismissed', 'true');
  }, [contextSnapshot, openNoteTab]);

  // Handle dismiss banner
  const handleDismissBanner = useCallback(() => {
    setShowWelcomeBanner(false);
    sessionStorage.setItem('welcomeBannerDismissed', 'true');
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ position: 'relative', minWidth: 0, overflow: 'hidden' }}>
      {/* Welcome back banner */}
      {showWelcomeBanner && contextSnapshot && (
        <WelcomeBackBanner
          snapshot={contextSnapshot}
          onContinueDocument={contextSnapshot.last_document ? handleContinueDocument : undefined}
          onContinueHighlight={contextSnapshot.last_highlight ? handleContinueHighlight : undefined}
          onContinueNote={contextSnapshot.last_note ? handleContinueNote : undefined}
          onDismiss={handleDismissBanner}
        />
      )}

      <div className="flex-1 min-h-0">
        {splitViewOpen && secondaryTab ? (
          <SplitView
            primaryContent={
              <ContentPanel
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={setActiveTabId}
                onTabClose={closeTab}
                onTabAdd={addNewTab}
              />
            }
            secondaryContent={
              <ContentPanel
                singleTab={secondaryTab}
                onCloseSingleTab={closeSplitView}
              />
            }
          />
        ) : (
          <ContentPanel
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabClose={closeTab}
            onTabAdd={addNewTab}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspacePage;
