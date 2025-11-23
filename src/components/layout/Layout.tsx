import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TitleBar from './TitleBar';
import type { Tab } from './TabBar';
import Sidebar from './Sidebar';
import ContentPanel from './ContentPanel';
import SplitView from './SplitView';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/debug/DebugOverlay';
import { WELCOME_TAB, createNewChatTab, createDocumentTab, createNoteTab } from '@/constants/tabs';
import { ROUTES, SEARCH_CONTEXTS } from '@/constants/routes';
import type { SidebarTab } from '@/constants/sidebar';
import { useEdgeDetection, useSidebarMode, useSessionsContext } from '@/hooks';
import { noteService, sessionService } from '@/services';
import { useToast } from '@/contexts/ToastContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { refetch: refetchSessions, selectSession } = useSessionsContext();
  const toast = useToast();

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Split view state
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [secondaryTab, setSecondaryTab] = useState<Tab | null>(null);

  // Vault panel state
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Check if we're on a full-page route (like /sessions)
  const isFullPageRoute = location.pathname === ROUTES.SESSIONS;

  // Sidebar mode management
  const {
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    handleTogglePin,
    handleRibbonClick,
    setSidebarVisible,
  } = useSidebarMode({
    isFullPageRoute,
  });

  // Edge detection with centralized timer management
  const { scheduleSidebarHide, cancelSidebarHide } = useEdgeDetection({
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    isFullPageRoute,
    setSidebarVisible,
  });

  // Ribbon icon hover handler
  const handleRibbonHover = (tab: SidebarTab) => {
    if (sidebarMode === 'floating' && activeRibbonTab === tab) {
      cancelSidebarHide();
    }
  };

  // Split view management
  const openInSplitView = useCallback((tab: Tab) => {
    setSecondaryTab(tab);
    setSplitViewOpen(true);
  }, []);

  const closeSplitView = useCallback(() => {
    setSplitViewOpen(false);
    setSecondaryTab(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux - Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }

      // ESC key - close what's open (priority order)
      if (e.key === 'Escape') {
        if (splitViewOpen) {
          closeSplitView();
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitViewOpen, commandPaletteOpen, closeSplitView]);

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

      // Use functional update to avoid stale closure
      setTabs(prevTabs => {
        const tabToClose = prevTabs.find(tab => tab.noteId === noteId);

        if (!tabToClose) return prevTabs;

        // If only one tab, don't close
        if (prevTabs.length === 1) return prevTabs;

        // Close the tab
        const newTabs = prevTabs.filter(tab => tab.id !== tabToClose.id);

        // Update active tab if needed
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

      // Create a tab for the note
      const noteTab = createNoteTab(noteId, title);

      // Open in split view
      openInSplitView(noteTab);
    };

    window.addEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
    return () => window.removeEventListener('open-note-split-view', handleOpenNoteSplitView as EventListener);
  }, [openInSplitView]);

  // Listen for split view requests from document links
  useEffect(() => {
    const handleOpenDocumentSplitView = (e: CustomEvent) => {
      const { documentId, title, page } = e.detail;

      // Create a tab for the document (with page info)
      const documentTab = createDocumentTab(documentId, title);

      // TODO: Store page number in tab metadata for PDF viewer to use
      // For now, PDF viewer will default to page 1
      // Future: Add `page` to Tab interface and pass to PDF viewer

      // Open in split view
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

  const openDocumentTab = (documentId: string, title: string) => {
    const tabId = `doc-${documentId}`;

    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === tabId);
    if (existingTab) {
      // Just activate the existing tab
      setActiveTabId(tabId);
      return;
    }

    // Create new tab
    const newTab = createDocumentTab(documentId, title);
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const openNoteTab = (noteId: string, title?: string) => {
    const tabId = `note-${noteId}`;

    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === tabId);
    if (existingTab) {
      // Just activate the existing tab
      setActiveTabId(tabId);
      return;
    }

    // Create new tab
    const newTab = createNoteTab(noteId, title || 'Untitled');
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const createNewNote = async () => {
    try {
      // Get or create the default "Quick Notes" session
      const quickNotesSession = await sessionService.getOrCreateQuickNotesSession();

      // Refresh sessions list to show Quick Notes in sidebar if it was just created
      await refetchSessions();

      // Auto-select Quick Notes session
      selectSession(quickNotesSession);

      // Get all notes in Quick Notes session to check for Untitled duplicates
      const allNotes = await noteService.getAll();
      const quickNotes = allNotes.filter(n => n.session_id === quickNotesSession.id);
      const untitledPattern = /^Untitled( \d+)?$/;
      const untitledNotes = quickNotes.filter(n => untitledPattern.test(n.title));

      // Generate unique Untitled title for Quick Notes session
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

      // Create note in Quick Notes session
      const newNote = await noteService.create(
        quickNotesSession.id, // Use Quick Notes session instead of null
        null, // documentId
        newTitle,
        '', // empty content
        'concept'
      );

      // Create and open tab
      const newTab = createNoteTab(newNote.id, newTitle);
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);

      // Notify sidebar to select the new note and reload list
      window.dispatchEvent(new CustomEvent('note-created', {
        detail: { noteId: newNote.id }
      }));
    } catch (err) {
      console.error('Failed to create new note:', err);

      // Handle unique constraint error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('UNIQUE constraint failed') || errorMessage.includes('duplicate')) {
        toast.error('A note with this title already exists in this session');
      } else {
        toast.error(`Failed to create note: ${errorMessage}`);
      }
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Get search prefix for command palette
  const searchPrefix = SEARCH_CONTEXTS[location.pathname]?.prefix || '';

  // Sidebar mouse enter handler (cancel hide timer)
  const handleSidebarEnter = () => {
    cancelSidebarHide();
  };

  // Sidebar mouse leave handler (floating mode only)
  const handleSidebarLeave = (e: React.MouseEvent) => {
    if (sidebarMode === 'floating') {
      scheduleSidebarHide();
    }
  };

  // Edge indicator click - show sidebar instantly
  const handleIndicatorClick = () => {
    setSidebarVisible(true);
    cancelSidebarHide();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{
      backgroundColor: 'var(--bg-background)',
      color: 'var(--fg-primary)'
    }}>
      <TitleBar
        sidebarMode={sidebarMode}
        onToggleSidebarPin={handleTogglePin}
        onCreateSession={() => {
          // TODO: Open session form modal
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (includes Vault + Session panels) */}
        {!isFullPageRoute && (
          <Sidebar
            mode={sidebarMode}
            isVisible={sidebarVisible}
            activeTab={activeRibbonTab}
            onTogglePin={handleTogglePin}
            onTabClick={handleRibbonClick}
            onTabHover={handleRibbonHover}
            onMouseEnter={handleSidebarEnter}
            onMouseLeave={handleSidebarLeave}
            onIndicatorClick={handleIndicatorClick}
            isVaultOpen={isVaultOpen}
            onToggleVault={() => setIsVaultOpen(!isVaultOpen)}
            onOpenDocument={openDocumentTab}
            onNoteSelect={openNoteTab}
            onCreateNote={createNewNote}
          />
        )}

        {/* Main Content Area */}
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{
            margin: '8px 20px 8px 20px',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {!isFullPageRoute && (
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
          )}
        </div>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        initialPrefix={searchPrefix}
      />
      <DebugOverlay />
    </div>
  );
};

export default Layout;
