import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Columns2 } from 'lucide-react';
import ContentPanel from '@/components/layout/ContentPanel';
import SplitView from '@/components/layout/SplitView';
import type { Tab } from '@/components/layout/TabBar';
import { WELCOME_TAB, createNewChatTab, createDocumentTab, createNoteTab } from '@/constants/tabs';
import { useSessionsContext } from '@/hooks';
import { noteService, sessionService, documentService, contextService, highlightService, readingBehaviorTracker, autoContextCapture, phasePersistenceService, documentPositionTracker } from '@/services';
import { tabStateService, type WorkspaceState, type TabState } from '@/services/tabState';
import { tabPositionTracker } from '@/services/tabPositionTracker';
import { useTabStatePersistence } from '@/hooks/useTabStatePersistence';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';
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

  // Split view state
  const [secondaryTabs, setSecondaryTabs] = useState<Tab[]>([]);
  const [activeSecondaryTabId, setActiveSecondaryTabId] = useState<string>('');
  const [focusedPanel, setFocusedPanel] = useState<'primary' | 'secondary'>('primary');

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
      secondaryTabs: secondaryTabs
        .filter(tab => tab.type !== undefined)
        .map(tab => {
          const position = tabPositionTracker.getPosition(tab.id);
          return {
            id: tab.id,
            type: tab.type!,
            title: tab.title,
            documentId: tab.documentId,
            noteId: tab.noteId,
            currentPage: position?.currentPage,
            scrollPosition: position?.scrollPosition,
          };
        }),
      activeSecondaryTabId,
      splitViewOpen,
      sessionId: currentSession?.id,
    };
  }, [tabs, activeTabId, secondaryTabs, activeSecondaryTabId, splitViewOpen, currentSession]);

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
      if (!currentSession) {
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
            // Reset: create fresh snapshot (clears all old data including AI insights)
            snapshot = contextService.buildSnapshot({
              activeSessionId: currentSession.id,
              sessionGoal: currentSession.goal,
            });
            // NOTE: AI insights are intentionally NOT preserved
            // They will be regenerated on next app close/activity threshold
          } else {
            // Preserve existing snapshot, will update/add activity below
            snapshot = existingSnapshot;

            // Initialize recent arrays from last_* if empty (for backward compatibility)
            if (!snapshot.recent_notes?.length && snapshot.last_note) {
              snapshot.recent_notes = [snapshot.last_note];
            }
            if (!snapshot.recent_highlights?.length && snapshot.last_highlight) {
              snapshot.recent_highlights = [snapshot.last_highlight];
            }
          }

          // Mark that we now have new activity
          hasNewActivitySinceLoad.current = true;

          // Add the new activity data
          if (eventType === 'note-saved') {
            const { noteId } = detail;
            const note = await noteService.getById(noteId);
            if (note) {
              const noteInfo = {
                id: note.id,
                title: note.title,
                // Store more content for AI analysis (2000 chars)
                content_preview: note.content.substring(0, 2000),
                created_at: note.created_at,
              };

              // recent_notes is source of truth (keep last 5, avoid duplicates)
              const recentNotes = snapshot.recent_notes || [];
              const existingIndex = recentNotes.findIndex(n => n.id === note.id);
              if (existingIndex >= 0) {
                // Update existing and move to front
                recentNotes.splice(existingIndex, 1);
              }
              recentNotes.unshift(noteInfo);
              snapshot.recent_notes = recentNotes.slice(0, 5);

              // last_note = first element of recent_notes
              snapshot.last_note = snapshot.recent_notes[0];
            }
          } else if (eventType === 'highlight-created') {
            const { highlightId, pageNumber, content } = detail;
            const highlightInfo = {
              id: highlightId,
              content: content || '',
              note: '',
              page_number: pageNumber,
              created_at: new Date().toISOString(),
            };

            // recent_highlights is source of truth (keep last 5)
            const recentHighlights = snapshot.recent_highlights || [];
            recentHighlights.unshift(highlightInfo);
            snapshot.recent_highlights = recentHighlights.slice(0, 5);

            // last_highlight = first element of recent_highlights
            snapshot.last_highlight = snapshot.recent_highlights[0];
          } else if (eventType === 'pdf:page-change') {
            const { documentId, documentTitle } = detail;
            // Read from centralized tracker (single source of truth, updated immediately by PDFViewer)
            const pageNumber = documentPositionTracker.getPage(documentId) || detail.pageNumber || 1;
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
      if (!currentSession) return;
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
      if (!currentSession) return;
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

  // Track focused panel
  const handlePrimaryFocus = useCallback(() => {
    setFocusedPanel('primary');
  }, []);

  const handleSecondaryFocus = useCallback(() => {
    setFocusedPanel('secondary');
  }, []);

  // Wrapper to track focused panel when changing tabs
  const handlePrimaryTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setFocusedPanel('primary');
  }, []);

  const handleSecondaryTabChange = useCallback((tabId: string) => {
    setActiveSecondaryTabId(tabId);
    setFocusedPanel('secondary');
  }, []);

  // Split view management
  const openInSplitView = useCallback((tab: Tab) => {
    setSecondaryTabs(prevTabs => {
      const exists = prevTabs.find(t => t.id === tab.id);
      if (exists) {
        setActiveSecondaryTabId(tab.id);
        setFocusedPanel('secondary');
        return prevTabs;
      }
      setActiveSecondaryTabId(tab.id);
      setFocusedPanel('secondary');
      return [...prevTabs, tab];
    });
    onSplitViewChange(true);
  }, [onSplitViewChange]);

  const closeSecondaryTab = useCallback((tabId: string) => {
    setSecondaryTabs(prevTabs => {
      const newTabs = prevTabs.filter(t => t.id !== tabId);

      if (newTabs.length === 0) {
        onSplitViewChange(false);
        setActiveSecondaryTabId('');
      } else if (activeSecondaryTabId === tabId) {
        setActiveSecondaryTabId(newTabs[0].id);
      }

      return newTabs;
    });
  }, [activeSecondaryTabId, onSplitViewChange]);

  const closeSplitView = useCallback(() => {
    onSplitViewChange(false);
    setSecondaryTabs([]);
    setActiveSecondaryTabId('');
  }, [onSplitViewChange]);

  // Listen for note title changes
  useEffect(() => {
    const handleNoteTitleChange = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      const truncatedTitle = title.length > 30 ? `${title.substring(0, 30)}...` : title;

      setTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.noteId === noteId ? { ...tab, title: truncatedTitle } : tab
        )
      );

      setSecondaryTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.noteId === noteId ? { ...tab, title: truncatedTitle } : tab
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

      setSecondaryTabs(prevTabs => {
        const tabToClose = prevTabs.find(tab => tab.noteId === noteId);
        if (!tabToClose) return prevTabs;

        const newTabs = prevTabs.filter(tab => tab.id !== tabToClose.id);

        if (newTabs.length === 0) {
          onSplitViewChange(false);
          setActiveSecondaryTabId('');
        } else {
          setActiveSecondaryTabId(prevActiveId =>
            prevActiveId === tabToClose.id ? newTabs[0].id : prevActiveId
          );
        }

        return newTabs;
      });
    };

    window.addEventListener('note-deleted', handleNoteDeleted as EventListener);
    return () => window.removeEventListener('note-deleted', handleNoteDeleted as EventListener);
  }, [onSplitViewChange]);

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

  const addNewTab = useCallback(() => {
    const newTab = createNewChatTab();

    // Add to focused panel in split view
    if (splitViewOpen && focusedPanel === 'secondary') {
      setSecondaryTabs([...secondaryTabs, newTab]);
      setActiveSecondaryTabId(newTab.id);
    } else {
      // Default: add to primary panel
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
      setFocusedPanel('primary');
    }
  }, [tabs, secondaryTabs, splitViewOpen, focusedPanel]);

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

    // Open in focused panel when split view is active
    if (splitViewOpen && focusedPanel === 'secondary') {
      setSecondaryTabs(prevTabs => {
        const existingTab = prevTabs.find(tab => tab.id === tabId);
        if (existingTab) {
          setActiveSecondaryTabId(tabId);
          return prevTabs;
        }

        const newTab = createDocumentTab(documentId, title);
        setActiveSecondaryTabId(newTab.id);
        return [...prevTabs, newTab];
      });
    } else {
      setTabs(prevTabs => {
        const existingTab = prevTabs.find(tab => tab.id === tabId);
        if (existingTab) {
          setActiveTabId(tabId);
          setFocusedPanel('primary');
          return prevTabs;
        }

        const newTab = createDocumentTab(documentId, title);
        setActiveTabId(newTab.id);
        setFocusedPanel('primary');
        return [...prevTabs, newTab];
      });
    }
  }, [splitViewOpen, focusedPanel]);

  const openNoteTab = useCallback((noteId: string, title?: string) => {
    const tabId = `note-${noteId}`;

    // Open in focused panel when split view is active
    if (splitViewOpen && focusedPanel === 'secondary') {
      setSecondaryTabs(prevTabs => {
        const existingTab = prevTabs.find(tab => tab.id === tabId);
        if (existingTab) {
          setActiveSecondaryTabId(tabId);
          return prevTabs;
        }

        const newTab = createNoteTab(noteId, title || 'Untitled');
        setActiveSecondaryTabId(newTab.id);
        return [...prevTabs, newTab];
      });
    } else {
      setTabs(prevTabs => {
        const existingTab = prevTabs.find(tab => tab.id === tabId);
        if (existingTab) {
          setActiveTabId(tabId);
          setFocusedPanel('primary');
          return prevTabs;
        }

        const newTab = createNoteTab(noteId, title || 'Untitled');
        setActiveTabId(newTab.id);
        setFocusedPanel('primary');
        return [...prevTabs, newTab];
      });
    }
  }, [splitViewOpen, focusedPanel]);

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
        return;
      }

      // Get context snapshot to use its page_number for document tabs
      // This ensures consistency with WelcomeBackBanner
      let snapshot: ContextSnapshot | null = null;
      if (saved.sessionId) {
        try {
          snapshot = await contextService.getSnapshot(saved.sessionId);
        } catch (error) {
          console.warn('[TabRestore] Failed to load context snapshot:', error);
        }
      }

      try {
        const restoredTabs: Tab[] = [];

        // Restore each tab with position data
        for (const tabState of saved.tabs) {
          if (tabState.type === 'document' && tabState.documentId) {
            try {
              const doc = await documentService.getById(tabState.documentId);
              const tab = createDocumentTab(tabState.documentId, doc.title);

              // Use page_number from contextSnapshot if this is the last_document
              // to ensure consistency with WelcomeBackBanner
              const isLastDocument = snapshot?.last_document?.document_id === tabState.documentId;
              if (isLastDocument && snapshot?.last_document?.page_number) {
                tab.page = snapshot.last_document.page_number;
                tab.scrollPosition = snapshot.last_document.scroll_position;

                // Populate tracker with snapshot data
                tabPositionTracker.updatePosition(tab.id, {
                  currentPage: snapshot.last_document.page_number,
                  scrollPosition: snapshot.last_document.scroll_position,
                });
              } else {
                // Fallback to localStorage data for non-last documents
                tab.page = tabState.currentPage;
                tab.scrollPosition = tabState.scrollPosition;

                // Populate tracker with localStorage data
                if (tabState.currentPage) {
                  tabPositionTracker.updatePosition(tab.id, {
                    currentPage: tabState.currentPage,
                    scrollPosition: tabState.scrollPosition,
                  });
                }
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
        }

        // Restore secondary tabs if split view was open
        if (saved.splitViewOpen && saved.secondaryTabs && saved.secondaryTabs.length > 0) {
          const restoredSecondaryTabs: Tab[] = [];

          for (const tabState of saved.secondaryTabs) {
            if (tabState.type === 'document' && tabState.documentId) {
              try {
                const doc = await documentService.getById(tabState.documentId);
                const tab = createDocumentTab(tabState.documentId, doc.title);
                tab.page = tabState.currentPage;
                tab.scrollPosition = tabState.scrollPosition;

                if (tabState.currentPage) {
                  tabPositionTracker.updatePosition(tab.id, {
                    currentPage: tabState.currentPage,
                    scrollPosition: tabState.scrollPosition,
                  });
                }

                restoredSecondaryTabs.push(tab);
              } catch (error) {
                console.error('[TabRestore] Failed to restore secondary document:', tabState.documentId, error);
              }
            } else if (tabState.type === 'note' && tabState.noteId) {
              const tab = createNoteTab(tabState.noteId, tabState.title);
              restoredSecondaryTabs.push(tab);
            }
          }

          if (restoredSecondaryTabs.length > 0) {
            setSecondaryTabs(restoredSecondaryTabs);
            const activeSecondaryTab = restoredSecondaryTabs.find(t => t.id === saved.activeSecondaryTabId);
            setActiveSecondaryTabId(activeSecondaryTab ? saved.activeSecondaryTabId! : restoredSecondaryTabs[0].id);
            onSplitViewChange(true);
          }
        }
      } catch (error) {
        console.error('[TabRestore] Failed to restore tabs:', error);
      }
    };

    restoreTabs();
  }, [onSplitViewChange]);

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

  // Initialize Phase Persistence Service for offline-first phase saving
  useEffect(() => {
    if (currentSession) {
      phasePersistenceService.init(currentSession.id);
    }

    return () => {
      phasePersistenceService.cleanup();
    };
  }, [currentSession?.id]);

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
          // Show banner immediately (even without AI insights)
          setContextSnapshot(snapshot);
          setShowWelcomeBanner(true);

          // Build content signature to detect if context changed
          const buildSignature = (s: typeof snapshot) => {
            const parts: string[] = [];
            if (s.last_document) parts.push(`doc:${s.last_document.document_id}:${s.last_document.page_number}`);
            if (s.last_highlight) parts.push(`hl:${s.last_highlight.id}`);
            if (s.last_note) parts.push(`note:${s.last_note.id}`);
            return parts.sort().join('|');
          };

          const currentSignature = buildSignature(snapshot);

          // Check if we need to regenerate AI (new or context changed)
          const existingSignature = (snapshot.ai_insights as any)?._context_signature;
          const needsRegeneration = !snapshot.ai_insights || existingSignature !== currentSignature;

          if (needsRegeneration) {
            console.log('[WelcomeBanner] ⏳ Generating AI insights (context changed or missing)...');
            console.log('[WelcomeBanner] Signature:', currentSignature);

            // Import geminiAIService dynamically to avoid circular deps
            import('@/services').then(async ({ geminiAIService }) => {
              try {
                const aiInsights = await geminiAIService.analyzeSession(snapshot);
                if (aiInsights) {
                  console.log('[WelcomeBanner] ✅ AI insights generated:', aiInsights.summary);

                  // Store signature for future comparison
                  (aiInsights as any)._context_signature = currentSignature;

                  // Update snapshot with AI insights
                  snapshot.ai_insights = aiInsights;
                  await contextService.saveSnapshot(currentSession.id, snapshot);

                  // Update banner to show AI insights
                  setContextSnapshot({ ...snapshot });
                }
              } catch (error) {
                console.error('[WelcomeBanner] ⚠️ Failed to generate AI insights:', error);
              }
            });
          } else {
            console.log('[WelcomeBanner] 📝 AI insights up-to-date, skipping regeneration');
          }
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
    if (!contextSnapshot?.last_highlight || !currentSession) return;

    try {
      const { id: highlightId, page_number } = contextSnapshot.last_highlight;

      // Fetch recent highlights for this session to find the one with matching ID
      const recentHighlights = await highlightService.getRecentBySession(currentSession.id, 100);
      const highlight = recentHighlights.find((h) => h.id === highlightId);

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
  }, [contextSnapshot, currentSession, openDocumentTab]);

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

      <div className="flex-1 min-h-0 relative">
        {/* Fixed Toolbar (like VS Code - top right of tabbar area) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: 'var(--tabbar-height, 32px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            paddingRight: '8px',
            zIndex: 10,
            pointerEvents: 'none', // Allow clicks to pass through to tabs
          }}
        >
          {/* Split View button */}
          <Tooltip content="Open in Split View" placement='bottom-right'>
            <button
              onClick={() => {
                const activeTab = tabs.find(t => t.id === activeTabId);
                if (activeTab) openInSplitView(activeTab);
              }}
              className="p-0.5 rounded hover:bg-[var(--bg-active)] transition-colors"
              aria-label="Open in split view"
              style={{ pointerEvents: 'auto' }}
            >
              <Columns2 size={18} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>

          {/* Add tab button */}
          <Tooltip content="New Tab" placement='bottom-right'>
            <button
              onClick={addNewTab}
              className="p-0.5 rounded hover:bg-[var(--bg-active)] transition-colors"
              aria-label="Add new tab"
              style={{ pointerEvents: 'auto' }}
            >
              <Plus size={18} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>
        </div>

        {splitViewOpen && secondaryTabs.length > 0 ? (
          <SplitView
            primaryContent={
              <ContentPanel
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={handlePrimaryTabChange}
                onTabClose={closeTab}
                isRightmost={false}
                isFocused={focusedPanel === 'primary'}
                onFocus={handlePrimaryFocus}
              />
            }
            secondaryContent={
              <ContentPanel
                tabs={secondaryTabs}
                activeTabId={activeSecondaryTabId}
                onTabChange={handleSecondaryTabChange}
                onTabClose={closeSecondaryTab}
                showCloseOnSingleTab={true}
                isRightmost={true}
                isFocused={focusedPanel === 'secondary'}
                onFocus={handleSecondaryFocus}
              />
            }
          />
        ) : (
          <ContentPanel
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handlePrimaryTabChange}
            onTabClose={closeTab}
            isRightmost={true}
            isFocused={true}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspacePage;
