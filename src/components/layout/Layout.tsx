import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/debug/DebugOverlay';
import { ROUTES, SEARCH_CONTEXTS } from '@/constants/routes';
import type { SidebarTab } from '@/constants/sidebar';
import { useEdgeDetection, useSidebarMode, useSessionsContext } from '@/hooks';
import { useToast } from '@/contexts/ToastContext';
import { SessionForm } from '@/components/sessions/SessionForm';
import SessionsPage from '@/pages/SessionsPage';
import WorkspacePage from '@/pages/WorkspacePage';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refetch: refetchSessions, selectSession, createSession, updateSession, sessions, currentSession } = useSessionsContext();
  const toast = useToast();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
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

  // Handlers that dispatch events to WorkspacePage
  const openDocumentTab = (documentId: string, title: string) => {
    window.dispatchEvent(new CustomEvent('workspace:open-document', {
      detail: { documentId, title }
    }));
  };

  const openNoteTab = (noteId: string, title?: string) => {
    window.dispatchEvent(new CustomEvent('workspace:open-note', {
      detail: { noteId, title }
    }));
  };

  const createNewNote = () => {
    window.dispatchEvent(new Event('workspace:create-note'));
  };

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
          setSplitViewOpen(false);
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitViewOpen, commandPaletteOpen]);

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
        onCreateSession={() => setShowSessionForm(true)}
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
          {isFullPageRoute && location.pathname === ROUTES.SESSIONS ? (
            // Sessions Page
            <SessionsPage />
          ) : !isFullPageRoute ? (
            // Workspace Page
            <WorkspacePage
              isVaultOpen={isVaultOpen}
              splitViewOpen={splitViewOpen}
              onSplitViewChange={setSplitViewOpen}
            />
          ) : null}
        </div>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        initialPrefix={searchPrefix}
        currentSessionId={currentSession?.id}
        actions={{
          onCreateSession: () => setShowSessionForm(true),
          onCreateNote: createNewNote,
          onOpenSettings: () => toast.info('Settings page coming soon!'),
          onOpenDocument: openDocumentTab,
          onOpenNote: openNoteTab,
          onNavigateToSessions: () => navigate(ROUTES.SESSIONS),
        }}
      />

      {/* Session Form Modal */}
      <SessionForm
        isOpen={showSessionForm}
        onClose={() => setShowSessionForm(false)}
        onCreate={async (title, goal) => {
          const newSession = await createSession(title, goal);
          if (newSession) {
            selectSession(newSession);
            toast.success(`Session "${title}" created successfully`);
          }
          return newSession;
        }}
        onUpdate={updateSession}
      />

      <DebugOverlay />
    </div>
  );
};

export default Layout;
