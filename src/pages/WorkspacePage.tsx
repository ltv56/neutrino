import React, { useState, useEffect, useCallback } from 'react';
import ContentPanel from '@/components/layout/ContentPanel';
import SplitView from '@/components/layout/SplitView';
import type { Tab } from '@/components/layout/TabBar';
import { WELCOME_TAB, createNewChatTab, createDocumentTab, createNoteTab } from '@/constants/tabs';
import { useSessionsContext } from '@/hooks';
import { noteService, sessionService } from '@/services';
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
  const { refetch, selectSession } = useSessionsContext();
  const toast = useToast();

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');

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
    try {
      const quickNotesSession = await sessionService.getOrCreateQuickNotesSession();
      await refetch();
      selectSession(quickNotesSession);

      const allNotes = await noteService.getAll();
      const quickNotes = allNotes.filter(n => n.session_id === quickNotesSession.id);
      const untitledPattern = /^Untitled( \d+)?$/;
      const untitledNotes = quickNotes.filter(n => untitledPattern.test(n.title));

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
        quickNotesSession.id,
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
