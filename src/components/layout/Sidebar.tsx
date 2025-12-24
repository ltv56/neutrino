import React, { useState, useEffect } from 'react';
import { FolderOpen, Settings, Link2 } from 'lucide-react';
import { type SidebarTab, SIDEBAR_TABS } from '@/constants/sidebar';
import EdgeIndicator from './sidebar/EdgeIndicator';
import SidebarBackdrop from './sidebar/SidebarBackdrop';
import SidebarPanel from './sidebar/SidebarPanel';
import LinksPanel from '@/components/links/LinksPanel';
import VaultPanel from '@/components/vault/VaultPanel';
import ThemeToggle from './titlebar/ThemeToggle';
import Tooltip from '@/components/common/Tooltip';
import { useSidebarAnimation } from '@/hooks';
import { useSessionsContext } from '@/hooks';
import SessionSelector from '@/components/sessions/SessionSelector';
import { SessionForm } from '@/components/sessions/SessionForm';
import type { ResearchSession } from '@/types';

interface SidebarProps {
  mode: 'floating' | 'pinned';
  isVisible: boolean;
  activeTab: SidebarTab; // Always has an active tab
  onTogglePin: () => void;
  onTabClick: (tab: SidebarTab) => void;
  onTabHover: (tab: SidebarTab) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onIndicatorClick?: () => void;
  isVaultOpen?: boolean;
  onToggleVault?: () => void;
  onOpenDocument?: (documentId: string, title: string) => void;
  onNoteSelect?: (noteId: string, title: string) => void;
  onCreateNote?: () => void;
  isDraggingFiles?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  mode,
  isVisible,
  activeTab,
  onTogglePin,
  onTabClick,
  onTabHover,
  onMouseEnter,
  onMouseLeave,
  onIndicatorClick,
  isVaultOpen,
  onToggleVault,
  onOpenDocument,
  onNoteSelect,
  onCreateNote,
  isDraggingFiles,
}) => {
  const isFloating = mode === 'floating';
  const showBackdrop = isFloating && isVisible;

  // Session management
  const { sessions, createSession, updateSession, currentSession, selectSession } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

  // Theme management
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Links panel toggle
  const [showLinksPanel, setShowLinksPanel] = useState(false);

  useEffect(() => {
    // Check initial theme from localStorage first, then document
    const savedTheme = localStorage.getItem('neutrino-theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } else {
      const isDark = !document.documentElement.hasAttribute('data-theme');
      setIsDarkMode(isDark);
    }

    // Listen for theme changes from other windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'neutrino-theme' && e.newValue) {
        const isDark = e.newValue === 'dark';
        setIsDarkMode(isDark);
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    // Apply theme to document root and persist to localStorage
    if (newTheme) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('neutrino-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('neutrino-theme', 'light');
    }
  };

  // Handle sidebar animation state
  const { animationClass, shouldRender } = useSidebarAnimation({
    isVisible,
    isFloating,
  });

  const handleNewClick = () => {
    if (activeTab === 'papers' && onCreateNote) {
      onCreateNote();
    }
    // TODO: Handle other tab types (documents, etc.)
  };

  const handleSettingsClick = () => {
    // TODO: Implement settings
  };

  return (
    <>
      {/* Edge indicator (floating mode only) */}
      {isFloating && !shouldRender && (
        <EdgeIndicator onIndicatorClick={onIndicatorClick} />
      )}

      {/* Backdrop (floating mode only) */}
      {showBackdrop && <SidebarBackdrop onClick={(e) => onMouseLeave?.(e)} />}

      {/* Session Form Modal - Portal renders to document.body */}
      <SessionForm
        isOpen={showSessionForm}
        onClose={() => {
          setShowSessionForm(false);
          setEditingSession(null);
        }}
        onCreate={async (title, goal) => {
          const newSession = await createSession(title, goal);
          if (newSession) {
            selectSession(newSession);
          }
          return newSession;
        }}
        onUpdate={updateSession}
        editSession={editingSession}
      />

      {/* Sidebar Container */}
      {(isFloating ? shouldRender : true) && (
        <div
          data-sidebar="true"
          className={`${isFloating ? 'fixed' : 'relative'} ${isFloating ? animationClass : ''}`}
          style={{
            ...(isFloating ? {
              left: '6px',
              top: 'calc(var(--titlebar-height) + 6px)',
              height: 'calc(100vh - var(--titlebar-height) - 12px)',
              zIndex: 100,
            } : {
              height: '100%',
            }),
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="flex"
            style={{
              height: '100%',
              width: isVaultOpen ? 'calc(240px + var(--sidebar-width))' : 'var(--sidebar-width)',
              backgroundColor: 'var(--bg-background)',
              border: isFloating ? '1px solid var(--border)' : 'none',
              borderRadius: isFloating ? '8px' : '0',
              boxShadow: isFloating ? '0 8px 32px rgba(0, 0, 0, 0.5)' : 'none',
              overflow: 'hidden',
              // Smooth transition for pin/unpin and vault toggle
              transition: animationClass ? 'none' : 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), border 0.5s ease, border-radius 0.5s ease, box-shadow 0.5s ease',
              // GPU acceleration to prevent flicker
              transform: 'translateZ(0)',
              willChange: isFloating && isVisible ? 'transform, opacity' : 'auto',
            }}
          >
            {/* Unified Card: Vault + Tabs + Content + Footer */}
            <div
              className='flex flex-1 min-h-0'
              style={{
                margin: isFloating ? '0' : '8px 0 8px 8px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              {/* Vault Panel */}
              {isVaultOpen && (
                <div style={{ width: '240px', flexShrink: 0, borderRight: '2px solid var(--border-light)' }}>
                  <VaultPanel onOpenDocument={onOpenDocument} isDraggingFiles={isDraggingFiles} />
                </div>
              )}

              {/* Right Side: Tabs + Content + Footer */}
              <div className="flex flex-col flex-1 min-h-0">
                {/* Horizontal Tabs */}
                <div className="flex items-center gap-2 p-1">
                  {SIDEBAR_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        onMouseEnter={() => onTabHover(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-tertiary)]'
                          }`}
                        style={{ color: isActive ? 'var(--accent)' : 'var(--fg-secondary)' }}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{tab.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Content Panel */}
                {showLinksPanel ? (
                  <LinksPanel
                    onNoteSelect={onNoteSelect}
                    onDocumentSelect={onOpenDocument}
                  />
                ) : (
                  <SidebarPanel
                    activeTab={activeTab}
                    mode={mode}
                    onNewClick={handleNewClick}
                    onNoteSelect={onNoteSelect}
                    onDocumentSelect={onOpenDocument}
                  />
                )}

                {/* Footer: Vault + Theme + Settings */}
                <div
                  className="shrink-0 flex items-center justify-between px-2 py-1"
                  style={{
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  <button
                    onClick={onToggleVault}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                    style={{ color: isVaultOpen ? 'var(--accent)' : 'var(--fg-secondary)' }}
                  >
                    <FolderOpen size={16} />
                    <span className="text-sm">Vault</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <Tooltip content="Backlinks" placement="top">
                      <button
                        onClick={() => setShowLinksPanel(!showLinksPanel)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        style={{ color: showLinksPanel ? 'var(--accent)' : 'var(--fg-secondary)' }}
                      >
                        <Link2 size={18} />
                      </button>
                    </Tooltip>
                    <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
                    <Tooltip content="Settings" placement="top">
                      <button
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        style={{ color: 'var(--fg-secondary)' }}
                      >
                        <Settings size={18} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
