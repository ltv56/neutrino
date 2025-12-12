import React, { useState, useEffect, useCallback, useRef } from 'react';
import ContentPanel from '@/components/layout/ContentPanel';
import SplitView from '@/components/layout/SplitView';
import type { Tab } from '@/components/layout/TabBar';
import { WELCOME_TAB, createWelcomeBackTab, createNewChatTab, createDocumentTab, createNoteTab } from '@/constants/tabs';
import { useSessionsContext, useAppState, useContextCapture } from '@/hooks';
import { noteService, sessionService, contextService, documentService } from '@/services';
import { useToast } from '@/contexts/ToastContext';

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
  const { refetch, selectSession, currentSession, sessions } = useSessionsContext();
  const toast = useToast();

  // Track current app state for context capture
  const appState = useAppState();

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const hasLoadedSnapshotRef = useRef(false);

  // Get list of open documents from tabs
  const openDocuments = tabs
    .filter(tab => tab.type === 'document' && tab.documentId)
    .map(tab => tab.documentId!);

  // Get list of open notes from tabs
  const openNotes = tabs
    .filter(tab => tab.type === 'note' && tab.noteId)
    .map(tab => ({ id: tab.noteId!, title: tab.title }));

  // Auto-capture context on window close
  useContextCapture({
    currentDocumentId: appState.currentDocumentId,
    currentDocumentTitle: appState.currentDocumentTitle,
    currentPage: appState.currentPage,
    scrollPosition: appState.scrollPosition,
    openDocuments: openDocuments.length > 0 ? openDocuments : undefined,
    openNotes: openNotes.length > 0 ? openNotes : undefined,
  });

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

        if (!tabToClose) return prevTabs;
        if (prevTabs.length === 1) return prevTabs;

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

  // Listen for split view requests from note links
  useEffect(() => {
    const handleOpenNoteSplitView = (e: CustomEvent) => {
      const { noteId, title } = e.detail;
      const noteTab = createNoteTab(noteId, title);
      openInSplitView(noteTab);
    };

    window.addEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
    return () => window.removeEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
  }, [openInSplitView]);

  // Listen for split view requests from document links
  useEffect(() => {
    const handleOpenDocumentSplitView = (e: CustomEvent) => {
      const { documentId, title, page } = e.detail;
      const documentTab = createDocumentTab(documentId, title);
      // TODO: Store page number in tab metadata for PDF viewer to use
      openInSplitView(documentTab);
    };

    window.addEventListener('open-document-split-view', handleOpenDocumentSplitView as EventListener);
    return () => window.removeEventListener('open-document-split-view', handleOpenDocumentSplitView as EventListener);
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
    console.log('[DEBUG] createNewNote called');
    try {
      let targetSession = currentSession;

      // If no active session, use/create Quick Notes
      if (!targetSession) {
        console.log('[DEBUG] No active session, using Quick Notes...');
        targetSession = await sessionService.getOrCreateQuickNotesSession();
        await refetch();
        selectSession(targetSession);
      } else {
        console.log('[DEBUG] Using current session:', targetSession);
      }

      console.log('[DEBUG] Getting all notes...');
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

      console.log('[DEBUG] Creating new note with title:', newTitle);
      const newNote = await noteService.create(
        targetSession.id,
        null,
        newTitle,
        '',
        'concept'
      );
      console.log('[DEBUG] Note created:', newNote);

      const newTab = createNoteTab(newNote.id, newTitle);
      console.log('[DEBUG] Creating new note tab:', newTab);
      setTabs(prevTabs => {
        const newTabs = [...prevTabs, newTab];
        console.log('[DEBUG] Updated tabs:', newTabs);
        return newTabs;
      });
      setActiveTabId(newTab.id);
      console.log('[DEBUG] Set active tab ID to:', newTab.id);

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
  }, [refetch, selectSession, toast]);

  // Expose handlers to parent via window events or props
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

  // Check for context snapshot on mount
  useEffect(() => {
    const loadContextSnapshot = async () => {
      try {
        console.log('[DEBUG] Loading context snapshot...');
        console.log('[DEBUG] hasLoadedSnapshot:', hasLoadedSnapshotRef.current);
        console.log('[DEBUG] Sessions:', sessions);
        console.log('[DEBUG] Current tabs:', tabs);

        // Only load once per app session (mount + refresh)
        if (hasLoadedSnapshotRef.current) {
          console.log('[DEBUG] Already loaded snapshot, skipping');
          return;
        }

        if (sessions.length === 0) {
          console.log('[DEBUG] No sessions found, skipping snapshot load');
          setIsLoadingSnapshot(false);
          return;
        }

        // Skip if we already have tabs other than WELCOME_TAB
        if (tabs.length > 1 || (tabs.length === 1 && tabs[0].id !== WELCOME_TAB.id)) {
          console.log('[DEBUG] Already have active tabs, skipping snapshot load');
          setIsLoadingSnapshot(false);
          hasLoadedSnapshotRef.current = true;
          return;
        }

        const latestSession = sessions.reduce((latest, session) => {
          return new Date(session.updated_at) > new Date(latest.updated_at) ? session : latest;
        });
        console.log('[DEBUG] Latest session:', latestSession);

        const snapshot = await contextService.getSnapshot(latestSession.id);
        console.log('[DEBUG] Loaded snapshot:', snapshot);

        // Show WelcomeBack if there's any meaningful context
        const hasContext = snapshot && (
          snapshot.last_document ||
          snapshot.last_highlight ||
          snapshot.last_note ||
          snapshot.research_questions
        );

        if (hasContext) {
          // HYBRID APPROACH: Restore tabs + Welcome Back as first tab
          console.log('[DEBUG] Restoring session with context');
          selectSession(latestSession);

          // Build maps for quick lookup
          const docMap = new Map<string, any>();
          const noteMap = new Map<string, { id: string; title: string }>();

          // Fetch all documents
          if (snapshot.open_documents && snapshot.open_documents.length > 0) {
            console.log('[DEBUG] Fetching documents:', snapshot.open_documents);
            for (const docId of snapshot.open_documents) {
              try {
                const doc = await documentService.getById(docId);
                docMap.set(docId, doc);
              } catch (error) {
                console.error('[DEBUG] Failed to load document:', docId, error);
              }
            }
          }

          // Store note info
          if (snapshot.open_notes && snapshot.open_notes.length > 0) {
            console.log('[DEBUG] Preparing note tabs:', snapshot.open_notes);
            for (const noteInfo of snapshot.open_notes) {
              noteMap.set(noteInfo.id, noteInfo);
            }
          }

          // Restore tabs in original order by interleaving docs and notes
          // Strategy: Restore docs first, then notes (preserves relative order within each type)
          const restoredTabs: Tab[] = [];

          // Add document tabs in order
          if (snapshot.open_documents) {
            for (const docId of snapshot.open_documents) {
              if (docMap.has(docId)) {
                const doc = docMap.get(docId);
                const tab = createDocumentTab(docId, doc.title);
                restoredTabs.push(tab);
              }
            }
          }

          // Add note tabs in order
          if (snapshot.open_notes) {
            for (const noteInfo of snapshot.open_notes) {
              if (noteMap.has(noteInfo.id)) {
                const tab = createNoteTab(noteInfo.id, noteInfo.title);
                restoredTabs.push(tab);
              }
            }
          }

          // Create Welcome Back tab (always first)
          const welcomeBackTab = createWelcomeBackTab(
            snapshot,
            // onContinue: Jump to last document tab
            () => {
              if (snapshot.last_document) {
                const lastDocTabId = `doc-${snapshot.last_document.document_id}`;
                const tabExists = restoredTabs.some(t => t.id === lastDocTabId);

                if (tabExists) {
                  // Tab already restored, just switch to it
                  setActiveTabId(lastDocTabId);
                } else {
                  // Tab not restored (maybe was closed), open it
                  openDocumentTab(
                    snapshot.last_document.document_id,
                    snapshot.last_document.document_title
                  );
                }
              }
            },
            // onStartFresh: Clear context and close all tabs
            async () => {
              try {
                console.log('[DEBUG] Start Fresh clicked - clearing context');
                // Clear snapshot from database
                await contextService.saveSnapshot(latestSession.id, {
                  timestamp: new Date().toISOString(),
                  active_session_id: latestSession.id,
                });
                // Close all tabs, show clean WELCOME_TAB
                setTabs([WELCOME_TAB]);
                setActiveTabId(WELCOME_TAB.id);
              } catch (error) {
                console.error('[DEBUG] Failed to clear context:', error);
              }
            }
          );

          // Combine: Welcome Back first, then all restored tabs
          const allTabs = [welcomeBackTab, ...restoredTabs];
          setTabs(allTabs);
          setActiveTabId(welcomeBackTab.id); // Start at Welcome Back
        } else {
          console.log('[DEBUG] No meaningful context, showing default WELCOME_TAB');
          console.log('[DEBUG] snapshot:', snapshot);
          setTabs([WELCOME_TAB]);
        }

        hasLoadedSnapshotRef.current = true;
      } catch (error) {
        console.error('[DEBUG] Failed to load context snapshot:', error);
        setTabs([WELCOME_TAB]);
        hasLoadedSnapshotRef.current = true;
      } finally {
        setIsLoadingSnapshot(false);
      }
    };

    if (sessions.length > 0) {
      loadContextSnapshot();
    } else {
      console.log('[DEBUG] No sessions, skipping snapshot load');
      setIsLoadingSnapshot(false);
    }
  }, [sessions, selectSession, openDocumentTab]);

  return (
    <div className="flex-1 min-h-0" style={{ position: 'relative', minWidth: 0, overflow: 'hidden' }}>
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
  );
};

export default WorkspacePage;
