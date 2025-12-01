import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/debug/DebugOverlay';
import { ROUTES, SEARCH_CONTEXTS } from '@/constants/routes';
import type { SidebarTab } from '@/constants/sidebar';
import { useEdgeDetection, useSidebarMode, useSessionsContext } from '@/hooks';
import { useToast } from '@/contexts/ToastContext';
import { documentService } from '@/services';
import { SessionForm } from '@/components/sessions/SessionForm';
import SessionsPage from '@/pages/SessionsPage';
import WorkspacePage from '@/pages/WorkspacePage';

// Module-level unlisten function to prevent duplicate listener registration
// (persists across component mount/unmount cycles and HMR reloads)
let globalDragUnlisten: (() => void) | undefined;
let setupInProgress = false;

// Module-level storage for internal drag data
// (needed because Tauri intercepts drag events before they reach DOM)
let internalDragData: { documentId: string; title: string } | null = null;

const Layout: React.FC = () => {
  const location = useLocation();
  const { refetch: refetchSessions, selectSession, createSession, updateSession, sessions } = useSessionsContext();
  const toast = useToast();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const isInternalDragRef = useRef(false);

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

  // Listen for vault open request (from drag & drop)
  useEffect(() => {
    const handleVaultOpenRequest = () => {
      console.log('[Layout] Received vault:request-open event');
      if (!isVaultOpen) {
        console.log('[Layout] Opening vault');
        setIsVaultOpen(true);
      }
    };

    window.addEventListener('vault:request-open', handleVaultOpenRequest);
    return () => window.removeEventListener('vault:request-open', handleVaultOpenRequest);
  }, [isVaultOpen]);

  // Listen for internal drag start/end
  useEffect(() => {
    const handleInternalDragStart = (e: Event) => {
      const event = e as CustomEvent<{ documentId: string; title: string }>;
      isInternalDragRef.current = true;
      internalDragData = event.detail; // Store drag data globally
    };

    const handleInternalDragEnd = () => {
      // Don't clear the flag here - it will be cleared in the Tauri drop handler
      // This is because dragend fires BEFORE Tauri's drop event
    };

    window.addEventListener('neutrino:internal-drag-start', handleInternalDragStart);
    window.addEventListener('neutrino:internal-drag-end', handleInternalDragEnd);

    return () => {
      window.removeEventListener('neutrino:internal-drag-start', handleInternalDragStart);
      window.removeEventListener('neutrino:internal-drag-end', handleInternalDragEnd);
    };
  }, []);

  // Global Tauri drag & drop listener (handles file import + auto-open vault)
  useEffect(() => {
    // Prevent concurrent setup (handles React StrictMode double mount)
    if (setupInProgress) {
      return;
    }

    // Clean up any existing listener first (handles HMR)
    if (globalDragUnlisten) {
      globalDragUnlisten();
      globalDragUnlisten = undefined;
    }

    // Set flag synchronously before async operation
    setupInProgress = true;

    const handleFileDrop = async (paths: string[]) => {
      const pdfFiles = paths.filter(path => path.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        toast.error('Please drop PDF files only');
        setIsDraggingFiles(false);
        return;
      }

      try {
        for (const path of pdfFiles) {
          await documentService.importPDF(path, undefined);
        }
        toast.success(`Imported ${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''} successfully`);

        // Dispatch event to reload vault documents
        window.dispatchEvent(new Event('vault:reload-documents'));
      } catch (error) {
        console.error('Failed to import PDFs:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to import: ${errorMessage}`);
      } finally {
        setIsDraggingFiles(false);
      }
    };

    const setupListener = async () => {
      try {
        const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          const payload = event.payload as {
            type: string;
            paths?: string[];
            position?: { x: number; y: number }
          };

          // Only handle if dragging actual files (has paths)
          // Ignore internal React HTML5 drags (no paths)
          const hasFiles = payload.paths && payload.paths.length > 0;

          // Handle internal drags (since Tauri intercepts them before DOM)
          if (isInternalDragRef.current) {
            if (payload.type === 'drop' && internalDragData) {
              // Dispatch event to SessionDocumentsList to handle the drop
              window.dispatchEvent(new CustomEvent('session:document-drop', {
                detail: internalDragData
              }));
              // Clear internal drag state after handling drop
              isInternalDragRef.current = false;
              internalDragData = null;
            }
            return; // Don't process as external file drop
          }

          if (payload.type === 'enter' || payload.type === 'over') {
            if (hasFiles) {
              setIsDraggingFiles(true);
              if (!isVaultOpen) {
                setIsVaultOpen(true);
              }
            }
          } else if (payload.type === 'drop') {
            if (hasFiles && payload.paths) {
              handleFileDrop(payload.paths);
            }
            setIsDraggingFiles(false);
          } else if (payload.type === 'leave' || payload.type === 'cancel') {
            setIsDraggingFiles(false);
          }
        });

        // Store in module-level variable
        globalDragUnlisten = unlisten;
        setupInProgress = false;
      } catch (err) {
        console.error('[Layout] Failed to setup drag & drop listener:', err);
        setupInProgress = false;
      }
    };

    setupListener();

    return () => {
      // Don't reset setupInProgress here - let the next mount handle cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only setup once, handleFileDrop uses current state via closure

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
            isDraggingFiles={isDraggingFiles}
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
